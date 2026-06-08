# PRD — Compagnons (Suivi Zelda & Maddie)

## Problem statement (original, FR)
> Peux-tu me créer une appli en français ? Pour le suivi de ma chienne Zelda et ma chatte Maddie, pour leur suivi global. Exemple : ration alimentaire actuelle, suivi vétérinaire, dossier des fichiers vétérinaires et récupérer certains historiques par photo.

## User choices
- IA pour analyse de photos: **OUI** (Claude Sonnet 4.6 via Emergent LLM Key)
- Stockage: basique (base64 en Mongo)
- Auth: aucune
- Modules: rations, rdv véto (passé + futur), fichiers véto, poids, journal, podomètre GPS pour Zelda
- Design: nature (Organic & Earthy, sage greens + warm sands)

## Architecture
- **Backend**: FastAPI + Motor (Mongo). Tous endpoints préfixés `/api`. Modèles: Pet, Ration, VetAppointment, VetFile, WeightEntry, JournalEntry, Walk. Endpoint IA `/api/ai/analyze-document` (claude-sonnet-4-6, emergentintegrations).
- **Frontend**: React + Tailwind + shadcn/ui + Recharts + lucide-react + framer-motion + sonner. Polices Manrope + Work Sans.
- **Pages**: Dashboard, Rations, Vétérinaire (rdv + fichiers + scan IA), Poids (courbe), Journal, Balades (GPS via `navigator.geolocation`).
- **Seed**: Zelda + Maddie créés au démarrage.

## What's implemented (2026-02)
- ✅ Sélecteur d'animal global (sticky, persistant via localStorage)
- ✅ Dashboard avec 6 stat cards (ration / prochain rdv / poids / km / journal / fichiers)
- ✅ CRUD rations (ration actuelle + historique)
- ✅ CRUD rendez-vous véto (à venir + passé + toggle "fait")
- ✅ CRUD fichiers véto avec upload base64 (img + PDF) + visionneuse
- ✅ Analyse IA de documents véto par photo (Claude Sonnet 4.6, sortie FR structurée)
- ✅ CRUD poids avec courbe (Recharts) + delta vs précédent
- ✅ Journal avec humeurs (super / ok / inquiet / malade)
- ✅ Podomètre GPS pour Zelda (watchPosition + Haversine), historique des balades
- ✅ Onglet Balades caché pour Maddie
- ✅ Backend testé 10/10 ✓

## Backlog
### P1
- Notifications/rappels pour rdv véto (push ou email Resend)
- Export PDF du dossier d'un animal
- Tracé GPS de la balade sur carte (Leaflet/Mapbox)
- Compteur de calories à partir de la marque/quantité

### P2
- Multi-utilisateurs / partage avec un proche
- Carnet de santé numérique exportable
- Rappels traitement (anti-puces, vermifuge) avec récurrence

## Test credentials
N/A (no auth)
