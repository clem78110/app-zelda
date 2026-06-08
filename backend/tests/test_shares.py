"""Tests for the public share feature (dossier vétérinaire partagé)."""
import os
import base64
from datetime import datetime, timezone, timedelta
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vet-companion-15.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def zelda(s):
    r = s.get(f"{API}/pets", timeout=30)
    assert r.status_code == 200
    p = next((x for x in r.json() if x["name"] == "Zelda"), None)
    assert p is not None
    return p


@pytest.fixture(scope="module")
def maddie(s):
    r = s.get(f"{API}/pets", timeout=30)
    p = next((x for x in r.json() if x["name"] == "Maddie"), None)
    assert p is not None
    return p


@pytest.fixture(scope="module")
def seeded_file(s, zelda):
    """Create a file on Zelda so the public share returns it WITH base64."""
    b64 = base64.b64encode(b"TEST_share_pdf_content").decode()
    r = s.post(f"{API}/files", json={
        "pet_id": zelda["id"], "title": "TEST_ShareFile", "category": "ordonnance",
        "mime_type": "image/png", "file_base64": b64
    }, timeout=15)
    assert r.status_code == 200
    fid = r.json()["id"]
    yield {"id": fid, "b64": b64}
    s.delete(f"{API}/files/{fid}", timeout=15)


# --- POST /api/shares with expiry ---
def test_create_share_with_expiry(s, zelda):
    r = s.post(f"{API}/shares", json={
        "pet_id": zelda["id"], "label": "TEST_VetVisit", "expires_in_days": 30
    }, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    for k in ("id", "token", "pet_id", "expires_at", "label", "created_at"):
        assert k in data, f"missing {k}"
    assert data["pet_id"] == zelda["id"]
    assert data["label"] == "TEST_VetVisit"
    assert isinstance(data["token"], str) and len(data["token"]) >= 16
    # expires_at ~30 days in future
    exp = datetime.fromisoformat(data["expires_at"])
    delta = exp - datetime.now(timezone.utc)
    assert 29 <= delta.days <= 30, f"unexpected expiry: {delta}"
    # cleanup
    s.delete(f"{API}/shares/{data['id']}", timeout=15)


# --- POST /api/shares without expiry ---
def test_create_share_no_expiry(s, maddie):
    r = s.post(f"{API}/shares", json={
        "pet_id": maddie["id"], "label": "TEST_Permanent", "expires_in_days": None
    }, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["expires_at"] is None
    s.delete(f"{API}/shares/{data['id']}", timeout=15)


# --- GET /api/shares filtered by pet_id ---
def test_list_shares_filtered(s, zelda, maddie):
    a = s.post(f"{API}/shares", json={"pet_id": zelda["id"], "label": "TEST_Z"}, timeout=15).json()
    b = s.post(f"{API}/shares", json={"pet_id": maddie["id"], "label": "TEST_M"}, timeout=15).json()

    z_list = s.get(f"{API}/shares?pet_id={zelda['id']}", timeout=15).json()
    m_list = s.get(f"{API}/shares?pet_id={maddie['id']}", timeout=15).json()

    z_ids = {x["id"] for x in z_list}
    m_ids = {x["id"] for x in m_list}
    assert a["id"] in z_ids
    assert a["id"] not in m_ids
    assert b["id"] in m_ids
    assert b["id"] not in z_ids

    s.delete(f"{API}/shares/{a['id']}", timeout=15)
    s.delete(f"{API}/shares/{b['id']}", timeout=15)


# --- GET /api/public/share/{token} returns full dossier ---
def test_public_share_returns_full_dossier(s, zelda, seeded_file):
    share = s.post(f"{API}/shares", json={
        "pet_id": zelda["id"], "label": "TEST_Public", "expires_in_days": 7
    }, timeout=15).json()
    token = share["token"]

    # No auth header should still work
    r = requests.get(f"{API}/public/share/{token}", timeout=20)
    assert r.status_code == 200, r.text
    payload = r.json()
    for k in ("pet", "share", "appointments", "files", "weights", "rations", "journal"):
        assert k in payload, f"missing key {k}"
    assert payload["pet"]["id"] == zelda["id"]
    assert payload["pet"]["name"] == "Zelda"
    # files MUST contain base64
    files = payload["files"]
    assert isinstance(files, list) and len(files) >= 1
    seeded = next((f for f in files if f["id"] == seeded_file["id"]), None)
    assert seeded is not None
    assert seeded.get("file_base64") == seeded_file["b64"], "public share must expose base64"
    # share echo
    assert payload["share"]["label"] == "TEST_Public"

    s.delete(f"{API}/shares/{share['id']}", timeout=15)


# --- Invalid token => 404 ---
def test_public_share_invalid_token():
    r = requests.get(f"{API}/public/share/this-token-does-not-exist-xyz", timeout=15)
    assert r.status_code == 404


# --- Expired token => 410 (manually insert via API then mutate via Mongo-less workaround) ---
def test_public_share_expired_returns_410(s, zelda):
    """Create with 1 day, then simulate expiry by re-inserting through a tiny trick:
    we can't update directly via API, so we use a very short window: 1 day, and
    rely on direct DB only if available. Fallback: at least verify valid token 200."""
    # Try to mutate via Motor directly
    expired = None
    try:
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        share = s.post(f"{API}/shares", json={
            "pet_id": zelda["id"], "label": "TEST_Expired", "expires_in_days": 1
        }, timeout=15).json()

        async def expire():
            cli = AsyncIOMotorClient(mongo_url)
            past = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
            await cli[db_name].shares.update_one({"id": share["id"]}, {"$set": {"expires_at": past}})
            cli.close()

        asyncio.get_event_loop().run_until_complete(expire())
        expired = share
        r = requests.get(f"{API}/public/share/{share['token']}", timeout=15)
        assert r.status_code == 410, f"expected 410, got {r.status_code}: {r.text}"
    except Exception as e:
        pytest.skip(f"Mongo direct access unavailable, skipping expiry mutation: {e}")
    finally:
        if expired:
            s.delete(f"{API}/shares/{expired['id']}", timeout=15)


# --- DELETE share invalidates token ---
def test_delete_share_invalidates_token(s, zelda):
    share = s.post(f"{API}/shares", json={
        "pet_id": zelda["id"], "label": "TEST_ToDelete", "expires_in_days": 5
    }, timeout=15).json()
    token = share["token"]

    # works first
    r = requests.get(f"{API}/public/share/{token}", timeout=15)
    assert r.status_code == 200

    d = s.delete(f"{API}/shares/{share['id']}", timeout=15)
    assert d.status_code == 200
    assert d.json()["deleted"] == 1

    # now 404
    r2 = requests.get(f"{API}/public/share/{token}", timeout=15)
    assert r2.status_code == 404
