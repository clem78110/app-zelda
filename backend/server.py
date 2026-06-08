from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import logging
import secrets
import uuid
from pathlib import Path
from datetime import timedelta
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="Compagnons - Suivi animaux")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ MODELS ============
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Pet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    species: str  # "dog" | "cat"
    breed: Optional[str] = None
    birth_date: Optional[str] = None
    avatar_url: Optional[str] = None
    color: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class ProteinItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    grams: float = 0


class Ration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    brand: str
    food_type: str  # croquettes / pâtée / mixte / ration ménagère
    daily_grams: float
    meals_per_day: int = 2
    proteins: List[ProteinItem] = []  # only for ration ménagère
    notes: Optional[str] = ""
    started_on: str = Field(default_factory=now_iso)
    is_current: bool = True


class RationCreate(BaseModel):
    pet_id: str
    brand: str
    food_type: str
    daily_grams: float
    meals_per_day: int = 2
    proteins: List[ProteinItem] = []
    notes: Optional[str] = ""


class VetAppointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    title: str
    date: str  # ISO date
    category: str = "consultation"  # vaccin / consultation / traitement / chirurgie
    vet_name: Optional[str] = ""
    notes: Optional[str] = ""
    done: bool = False
    created_at: str = Field(default_factory=now_iso)


class VetAppointmentCreate(BaseModel):
    pet_id: str
    title: str
    date: str
    category: str = "consultation"
    vet_name: Optional[str] = ""
    notes: Optional[str] = ""
    done: bool = False


class VetFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    title: str
    category: str = "document"  # ordonnance / vaccin / facture / radio / autre
    mime_type: str
    file_base64: str  # full data url or pure base64
    ai_summary: Optional[str] = ""
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class VetFileCreate(BaseModel):
    pet_id: str
    title: str
    category: str = "document"
    mime_type: str
    file_base64: str
    notes: Optional[str] = ""


class WeightEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    kg: float
    date: str  # ISO date
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class WeightCreate(BaseModel):
    pet_id: str
    kg: float
    date: str
    notes: Optional[str] = ""


class JournalEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    mood: str = "ok"  # super / ok / inquiet / malade
    title: str
    body: str = ""
    date: str = Field(default_factory=now_iso)
    created_at: str = Field(default_factory=now_iso)


class JournalCreate(BaseModel):
    pet_id: str
    mood: str = "ok"
    title: str
    body: str = ""
    date: Optional[str] = None


class Walk(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    distance_km: float
    duration_seconds: int
    date: str = Field(default_factory=now_iso)
    notes: Optional[str] = ""


class WalkCreate(BaseModel):
    pet_id: str
    distance_km: float
    duration_seconds: int
    notes: Optional[str] = ""


class AIAnalyzeRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    context: Optional[str] = ""


class ShareLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    token: str = Field(default_factory=lambda: secrets.token_urlsafe(16))
    label: Optional[str] = ""
    expires_at: Optional[str] = None  # ISO date or null = never
    created_at: str = Field(default_factory=now_iso)


class ShareCreate(BaseModel):
    pet_id: str
    label: Optional[str] = ""
    expires_in_days: Optional[int] = 30  # null => no expiry


# ============ SEED ============
async def seed_pets():
    count = await db.pets.count_documents({})
    if count == 0:
        zelda = Pet(
            name="Zelda",
            species="dog",
            breed="Chienne",
            avatar_url="https://images.unsplash.com/photo-1524511751214-b0a384dd9afe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGRvZyUyMG91dGRvb3JzJTIwbmF0dXJlfGVufDB8fHx8MTc4MDkwNDE0NHww&ixlib=rb-4.1.0&q=85",
            color="#4A7C59",
        )
        maddie = Pet(
            name="Maddie",
            species="cat",
            breed="Chatte",
            avatar_url="https://images.unsplash.com/photo-1572897263855-ea51655f9f0b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwxfHxjdXRlJTIwY2F0JTIwd2luZG93JTIwc3VubGlnaHR8ZW58MHx8fHwxNzgwOTA0MTU2fDA&ixlib=rb-4.1.0&q=85",
            color="#C87941",
        )
        await db.pets.insert_many([zelda.model_dump(), maddie.model_dump()])
        logger.info("Seeded Zelda and Maddie")


@app.on_event("startup")
async def startup():
    await seed_pets()


# ============ ROUTES ============
@api_router.get("/")
async def root():
    return {"message": "Compagnons API ok"}


# --- Pets ---
@api_router.get("/pets", response_model=List[Pet])
async def list_pets():
    pets = await db.pets.find({}, {"_id": 0}).to_list(100)
    return pets


@api_router.get("/pets/{pet_id}", response_model=Pet)
async def get_pet(pet_id: str):
    pet = await db.pets.find_one({"id": pet_id}, {"_id": 0})
    if not pet:
        raise HTTPException(404, "Pet not found")
    return pet


# --- Rations ---
@api_router.get("/rations", response_model=List[Ration])
async def list_rations(pet_id: str):
    items = await db.rations.find({"pet_id": pet_id}, {"_id": 0}).sort("started_on", -1).to_list(200)
    return items


@api_router.post("/rations", response_model=Ration)
async def create_ration(payload: RationCreate):
    # If marked current, unset previous current
    await db.rations.update_many({"pet_id": payload.pet_id, "is_current": True}, {"$set": {"is_current": False}})
    ration = Ration(**payload.model_dump())
    await db.rations.insert_one(ration.model_dump())
    return ration


@api_router.delete("/rations/{ration_id}")
async def delete_ration(ration_id: str):
    res = await db.rations.delete_one({"id": ration_id})
    return {"deleted": res.deleted_count}


# --- Vet appointments ---
@api_router.get("/appointments", response_model=List[VetAppointment])
async def list_appointments(pet_id: str):
    items = await db.appointments.find({"pet_id": pet_id}, {"_id": 0}).sort("date", -1).to_list(500)
    return items


@api_router.post("/appointments", response_model=VetAppointment)
async def create_appointment(payload: VetAppointmentCreate):
    appt = VetAppointment(**payload.model_dump())
    await db.appointments.insert_one(appt.model_dump())
    return appt


@api_router.patch("/appointments/{appt_id}", response_model=VetAppointment)
async def update_appointment(appt_id: str, payload: VetAppointmentCreate):
    await db.appointments.update_one({"id": appt_id}, {"$set": payload.model_dump()})
    appt = await db.appointments.find_one({"id": appt_id}, {"_id": 0})
    if not appt:
        raise HTTPException(404, "Not found")
    return appt


@api_router.delete("/appointments/{appt_id}")
async def delete_appointment(appt_id: str):
    res = await db.appointments.delete_one({"id": appt_id})
    return {"deleted": res.deleted_count}


# --- Vet files ---
@api_router.get("/files")
async def list_files(pet_id: str):
    # Don't return base64 in list view
    items = await db.vetfiles.find(
        {"pet_id": pet_id},
        {"_id": 0, "file_base64": 0},
    ).sort("created_at", -1).to_list(500)
    return items


@api_router.get("/files/{file_id}")
async def get_file(file_id: str):
    item = await db.vetfiles.find_one({"id": file_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Not found")
    return item


@api_router.post("/files", response_model=VetFile)
async def create_file(payload: VetFileCreate):
    vf = VetFile(**payload.model_dump())
    await db.vetfiles.insert_one(vf.model_dump())
    return vf


@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    res = await db.vetfiles.delete_one({"id": file_id})
    return {"deleted": res.deleted_count}


# --- Weight ---
@api_router.get("/weights", response_model=List[WeightEntry])
async def list_weights(pet_id: str):
    items = await db.weights.find({"pet_id": pet_id}, {"_id": 0}).sort("date", 1).to_list(500)
    return items


@api_router.post("/weights", response_model=WeightEntry)
async def create_weight(payload: WeightCreate):
    w = WeightEntry(**payload.model_dump())
    await db.weights.insert_one(w.model_dump())
    return w


@api_router.delete("/weights/{w_id}")
async def delete_weight(w_id: str):
    res = await db.weights.delete_one({"id": w_id})
    return {"deleted": res.deleted_count}


# --- Journal ---
@api_router.get("/journal", response_model=List[JournalEntry])
async def list_journal(pet_id: str):
    items = await db.journal.find({"pet_id": pet_id}, {"_id": 0}).sort("date", -1).to_list(500)
    return items


@api_router.post("/journal", response_model=JournalEntry)
async def create_journal(payload: JournalCreate):
    data = payload.model_dump()
    if not data.get("date"):
        data["date"] = now_iso()
    j = JournalEntry(**data)
    await db.journal.insert_one(j.model_dump())
    return j


@api_router.delete("/journal/{j_id}")
async def delete_journal(j_id: str):
    res = await db.journal.delete_one({"id": j_id})
    return {"deleted": res.deleted_count}


# --- Walks ---
@api_router.get("/walks", response_model=List[Walk])
async def list_walks(pet_id: str):
    items = await db.walks.find({"pet_id": pet_id}, {"_id": 0}).sort("date", -1).to_list(500)
    return items


@api_router.post("/walks", response_model=Walk)
async def create_walk(payload: WalkCreate):
    w = Walk(**payload.model_dump())
    await db.walks.insert_one(w.model_dump())
    return w


@api_router.delete("/walks/{w_id}")
async def delete_walk(w_id: str):
    res = await db.walks.delete_one({"id": w_id})
    return {"deleted": res.deleted_count}


# --- AI document analysis ---
@api_router.post("/ai/analyze-document")
async def analyze_document(payload: AIAnalyzeRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "Clé LLM non configurée")

    # Strip data URL prefix if present
    img_b64 = payload.image_base64
    if img_b64.startswith("data:"):
        img_b64 = img_b64.split(",", 1)[-1]

    system_prompt = (
        "Tu es un assistant vétérinaire francophone. On te montre la photo d'un document "
        "vétérinaire (carnet de santé, ordonnance, facture, compte-rendu, vaccin, analyse). "
        "Extrais les informations clés et réponds UNIQUEMENT en français, formaté ainsi:\n\n"
        "**Type de document**: ...\n"
        "**Date(s)**: ...\n"
        "**Animal / Vétérinaire**: ...\n"
        "**Vaccins / Traitements / Médicaments**: liste à puces\n"
        "**Poids / Mesures**: ...\n"
        "**Prochain rendez-vous / Rappel**: ...\n"
        "**Résumé**: 2 phrases.\n\n"
        "Si une info manque, écris 'Non visible'. Sois concis et précis."
    )

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"vet-doc-{uuid.uuid4()}",
            system_message=system_prompt,
        ).with_model("anthropic", "claude-sonnet-4-6")

        image_content = ImageContent(image_base64=img_b64)
        msg = UserMessage(
            text=payload.context or "Analyse ce document vétérinaire et extrais les informations.",
            file_contents=[image_content],
        )
        response = await chat.send_message(msg)
        return {"summary": response}
    except Exception as e:
        logger.exception("AI analyze error")
        raise HTTPException(500, f"Erreur d'analyse IA: {str(e)}")


# --- Shares (dossier véto partagé) ---
@api_router.get("/shares", response_model=List[ShareLink])
async def list_shares(pet_id: str):
    items = await db.shares.find({"pet_id": pet_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


@api_router.post("/shares", response_model=ShareLink)
async def create_share(payload: ShareCreate):
    expires_at = None
    if payload.expires_in_days and payload.expires_in_days > 0:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days)).isoformat()
    link = ShareLink(pet_id=payload.pet_id, label=payload.label or "", expires_at=expires_at)
    await db.shares.insert_one(link.model_dump())
    return link


@api_router.delete("/shares/{share_id}")
async def delete_share(share_id: str):
    res = await db.shares.delete_one({"id": share_id})
    return {"deleted": res.deleted_count}


@api_router.get("/public/share/{token}")
async def get_public_share(token: str):
    share = await db.shares.find_one({"token": token}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Lien de partage introuvable")
    if share.get("expires_at"):
        try:
            exp = datetime.fromisoformat(share["expires_at"])
            if exp < datetime.now(timezone.utc):
                raise HTTPException(410, "Ce lien de partage a expiré")
        except ValueError:
            pass

    pet_id = share["pet_id"]
    pet = await db.pets.find_one({"id": pet_id}, {"_id": 0})
    if not pet:
        raise HTTPException(404, "Animal introuvable")

    appointments = await db.appointments.find({"pet_id": pet_id}, {"_id": 0}).sort("date", -1).to_list(500)
    files = await db.vetfiles.find({"pet_id": pet_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    weights = await db.weights.find({"pet_id": pet_id}, {"_id": 0}).sort("date", 1).to_list(500)
    rations = await db.rations.find({"pet_id": pet_id}, {"_id": 0}).sort("started_on", -1).to_list(200)
    journal = await db.journal.find({"pet_id": pet_id}, {"_id": 0}).sort("date", -1).to_list(500)

    return {
        "pet": pet,
        "share": {"label": share.get("label", ""), "expires_at": share.get("expires_at")},
        "appointments": appointments,
        "files": files,
        "weights": weights,
        "rations": rations,
        "journal": journal,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
