"""Backend tests for Compagnons (Zelda & Maddie tracking app)."""
import os
import io
import base64
import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vet-companion-15.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def pets(s):
    r = s.get(f"{API}/pets", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list) and len(data) >= 2
    return data


@pytest.fixture(scope="session")
def zelda(pets):
    p = next((x for x in pets if x["name"] == "Zelda"), None)
    assert p and p["species"] == "dog" and p.get("avatar_url")
    return p


@pytest.fixture(scope="session")
def maddie(pets):
    p = next((x for x in pets if x["name"] == "Maddie"), None)
    assert p and p["species"] == "cat" and p.get("avatar_url")
    return p


# ============ Pets ============
def test_pets_seeded(zelda, maddie):
    for p in (zelda, maddie):
        for k in ("id", "name", "species", "avatar_url"):
            assert p.get(k)


def test_get_pet_by_id(s, zelda):
    r = s.get(f"{API}/pets/{zelda['id']}", timeout=15)
    assert r.status_code == 200
    assert r.json()["name"] == "Zelda"


def test_get_pet_404(s):
    r = s.get(f"{API}/pets/nonexistent-id-xyz", timeout=15)
    assert r.status_code == 404


# ============ Rations ============
def test_rations_crud(s, zelda):
    pid = zelda["id"]
    # Create first
    r1 = s.post(f"{API}/rations", json={
        "pet_id": pid, "brand": "TEST_BrandA", "food_type": "croquettes",
        "daily_grams": 250.0, "meals_per_day": 2, "notes": "TEST"
    }, timeout=15)
    assert r1.status_code == 200, r1.text
    rid1 = r1.json()["id"]
    assert r1.json()["is_current"] is True

    # Create second -> should unset first
    r2 = s.post(f"{API}/rations", json={
        "pet_id": pid, "brand": "TEST_BrandB", "food_type": "mixte",
        "daily_grams": 300.0, "meals_per_day": 3
    }, timeout=15)
    assert r2.status_code == 200
    rid2 = r2.json()["id"]
    assert r2.json()["is_current"] is True

    # List
    lst = s.get(f"{API}/rations?pet_id={pid}", timeout=15).json()
    by_id = {x["id"]: x for x in lst}
    assert by_id[rid1]["is_current"] is False
    assert by_id[rid2]["is_current"] is True

    # Delete
    for rid in (rid1, rid2):
        d = s.delete(f"{API}/rations/{rid}", timeout=15)
        assert d.status_code == 200
        assert d.json()["deleted"] == 1


# ============ Appointments ============
def test_appointments_crud(s, zelda, maddie):
    pid = zelda["id"]
    r = s.post(f"{API}/appointments", json={
        "pet_id": pid, "title": "TEST_Vaccin", "date": "2026-02-15",
        "category": "vaccin", "vet_name": "Dr Test"
    }, timeout=15)
    assert r.status_code == 200
    aid = r.json()["id"]
    assert r.json()["done"] is False

    # Filter by pet
    lst = s.get(f"{API}/appointments?pet_id={pid}", timeout=15).json()
    assert any(x["id"] == aid for x in lst)
    lst_other = s.get(f"{API}/appointments?pet_id={maddie['id']}", timeout=15).json()
    assert not any(x["id"] == aid for x in lst_other)

    # PATCH (done=True)
    upd = s.patch(f"{API}/appointments/{aid}", json={
        "pet_id": pid, "title": "TEST_Vaccin", "date": "2026-02-15",
        "category": "vaccin", "vet_name": "Dr Test", "done": True
    }, timeout=15)
    assert upd.status_code == 200
    assert upd.json()["done"] is True

    # Delete
    d = s.delete(f"{API}/appointments/{aid}", timeout=15)
    assert d.status_code == 200 and d.json()["deleted"] == 1


# ============ Vet Files ============
def test_files_crud(s, maddie):
    pid = maddie["id"]
    # small valid base64
    b64 = base64.b64encode(b"hello-doc-content").decode()
    r = s.post(f"{API}/files", json={
        "pet_id": pid, "title": "TEST_Ordonnance", "category": "ordonnance",
        "mime_type": "image/jpeg", "file_base64": b64, "notes": "TEST"
    }, timeout=15)
    assert r.status_code == 200
    fid = r.json()["id"]

    # LIST must not include file_base64
    lst = s.get(f"{API}/files?pet_id={pid}", timeout=15).json()
    item = next((x for x in lst if x["id"] == fid), None)
    assert item is not None
    assert "file_base64" not in item

    # GET by id must include file_base64
    full = s.get(f"{API}/files/{fid}", timeout=15).json()
    assert full["file_base64"] == b64

    # Delete
    d = s.delete(f"{API}/files/{fid}", timeout=15)
    assert d.status_code == 200 and d.json()["deleted"] == 1


# ============ Weights ============
def test_weights_crud(s, zelda):
    pid = zelda["id"]
    ids = []
    for kg, dt in [(20.0, "2026-01-01"), (19.5, "2025-12-01"), (20.5, "2026-01-15")]:
        r = s.post(f"{API}/weights", json={"pet_id": pid, "kg": kg, "date": dt}, timeout=15)
        assert r.status_code == 200
        ids.append(r.json()["id"])

    lst = s.get(f"{API}/weights?pet_id={pid}", timeout=15).json()
    mine = [x for x in lst if x["id"] in ids]
    dates = [x["date"] for x in mine]
    assert dates == sorted(dates), f"expected ascending, got {dates}"

    for wid in ids:
        d = s.delete(f"{API}/weights/{wid}", timeout=15)
        assert d.status_code == 200


# ============ Journal ============
def test_journal_crud(s, maddie):
    pid = maddie["id"]
    r = s.post(f"{API}/journal", json={
        "pet_id": pid, "mood": "super", "title": "TEST_Bon jour", "body": "ronronne"
    }, timeout=15)
    assert r.status_code == 200
    jid = r.json()["id"]
    assert r.json()["mood"] == "super"

    lst = s.get(f"{API}/journal?pet_id={pid}", timeout=15).json()
    assert any(x["id"] == jid for x in lst)

    d = s.delete(f"{API}/journal/{jid}", timeout=15)
    assert d.status_code == 200 and d.json()["deleted"] == 1


# ============ Walks ============
def test_walks_crud(s, zelda):
    pid = zelda["id"]
    r = s.post(f"{API}/walks", json={
        "pet_id": pid, "distance_km": 2.5, "duration_seconds": 1800, "notes": "TEST"
    }, timeout=15)
    assert r.status_code == 200
    wid = r.json()["id"]

    lst = s.get(f"{API}/walks?pet_id={pid}", timeout=15).json()
    assert any(x["id"] == wid for x in lst)

    d = s.delete(f"{API}/walks/{wid}", timeout=15)
    assert d.status_code == 200 and d.json()["deleted"] == 1


# ============ AI document analysis ============
def _build_doc_image_b64() -> str:
    """Real JPEG with text + shapes (real visual features, not solid color)."""
    img = Image.new("RGB", (640, 480), (245, 240, 220))
    d = ImageDraw.Draw(img)
    # Shapes
    d.rectangle([20, 20, 620, 460], outline=(60, 60, 60), width=3)
    d.line([(20, 90), (620, 90)], fill=(60, 60, 60), width=2)
    d.rectangle([40, 380, 200, 440], outline=(120, 30, 30), width=2)
    # Text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        font_s = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except Exception:
        font = ImageFont.load_default()
        font_s = font
    d.text((40, 35), "CLINIQUE VETERINAIRE DES PINS", fill=(20, 60, 40), font=font)
    d.text((40, 110), "Animal : Zelda (chienne, Labrador)", fill=(0, 0, 0), font=font_s)
    d.text((40, 140), "Date : 12/01/2026", fill=(0, 0, 0), font=font_s)
    d.text((40, 170), "Vaccin : CHPPiL (rappel annuel)", fill=(0, 0, 0), font=font_s)
    d.text((40, 200), "Poids : 22.3 kg", fill=(0, 0, 0), font=font_s)
    d.text((40, 230), "Vétérinaire : Dr Martin", fill=(0, 0, 0), font=font_s)
    d.text((40, 260), "Prochain rappel : 12/01/2027", fill=(0, 0, 0), font=font_s)
    d.text((40, 300), "Traitement : antiparasitaire mensuel", fill=(0, 0, 0), font=font_s)
    d.text((50, 395), "CACHET", fill=(120, 30, 30), font=font)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def test_ai_analyze_document(s):
    b64 = _build_doc_image_b64()
    r = s.post(f"{API}/ai/analyze-document", json={
        "image_base64": b64, "mime_type": "image/jpeg",
        "context": "Analyse ce document vétérinaire."
    }, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "summary" in data
    summary = data["summary"]
    assert isinstance(summary, str) and len(summary.strip()) > 30
    # Heuristic: response is in French
    lower = summary.lower()
    french_markers = ["document", "vétérinaire", "vaccin", "animal", "résumé", "date"]
    assert any(m in lower for m in french_markers), f"Not French? {summary[:200]}"
