# Compagnons 🐾

Application web personnelle de suivi global pour vos animaux (rations, vétérinaire, poids, journal, balades, partage du dossier véto).

Construite à l'origine sur [Emergent](https://emergent.sh). Ce README explique comment **récupérer le code et le déployer gratuitement ailleurs**, pour ne jamais perdre l'accès à votre app même après résiliation.

---

## Pile technique

- **Backend** : FastAPI (Python) + Motor (MongoDB async) + emergentintegrations (analyse IA Claude Sonnet)
- **Frontend** : React 19 + Tailwind + shadcn/ui + Recharts + react-day-picker
- **Base de données** : MongoDB
- **PWA** : installable sur écran d'accueil (manifest + service worker)

## Structure

```
/app
├── backend/
│   ├── server.py           # toutes les routes /api/...
│   ├── requirements.txt
│   └── .env                # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, CORS_ORIGINS
└── frontend/
    ├── src/                # React app
    ├── public/             # icônes, manifest, service worker
    ├── package.json
    └── .env                # REACT_APP_BACKEND_URL
```

---

## 1. Sauvegarder votre travail

### Code

Dans Emergent, cliquez sur **"Save to GitHub"** (en haut à droite) pour pousser tout le code dans votre propre dépôt. C'est gratuit et permanent — votre code reste à vous.

### Données

Dans l'app, en haut à droite à côté du sélecteur d'animal, cliquez sur l'icône **↓ (Téléchargement)**. Un fichier `compagnons-AAAA-MM-JJ.json` est généré avec **tout** : Zelda, Maddie, rations, rdv, fichiers véto (incluant les images en base64), poids, journal, balades, liens de partage.

Gardez ce fichier en sécurité (Dropbox, Google Drive, disque dur).

---

## 2. Déploiement gratuit (3 services)

Coût total : **0 €/mois**.

### A. MongoDB Atlas (base de données)

1. Compte sur [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Build a cluster** → choisir **M0 (Free)** dans une région proche (Paris / Frankfurt)
3. **Database Access** → créer un utilisateur (notez le mot de passe)
4. **Network Access** → "Allow Access from Anywhere" (0.0.0.0/0)
5. **Connect → Drivers** → copier la chaîne `mongodb+srv://...` (remplacer `<password>` par le vrai mot de passe)

### B. Backend FastAPI sur Railway

1. Compte sur [railway.app](https://railway.app) avec votre GitHub
2. **New Project → Deploy from GitHub repo** → choisir votre dépôt
3. **Settings → Root Directory** : `backend`
4. **Variables** :
   ```
   MONGO_URL=mongodb+srv://user:password@cluster.xxxxx.mongodb.net/compagnons?retryWrites=true&w=majority
   DB_NAME=compagnons
   EMERGENT_LLM_KEY=sk-emergent-...   # ou ANTHROPIC_API_KEY si vous migrez
   CORS_ORIGINS=*
   PORT=8001
   ```
5. **Settings → Deploy** : la commande de démarrage est
   ```
   uvicorn server:app --host 0.0.0.0 --port $PORT
   ```
6. **Settings → Networking → Generate Domain** → copier l'URL `https://xxx.up.railway.app`

> ⚠️ Plan gratuit Railway : 500 h/mois + endormissement après 30 min d'inactivité. Alternative : Render (cf. plus bas).

### C. Frontend React sur Vercel

1. Compte sur [vercel.com](https://vercel.com) avec GitHub
2. **Add New → Project** → importer votre dépôt
3. **Root Directory** : `frontend`
4. **Framework Preset** : `Create React App`
5. **Build Command** : `yarn build` (ou laisser le défaut)
6. **Environment Variables** :
   ```
   REACT_APP_BACKEND_URL=https://xxx.up.railway.app
   ```
7. **Deploy** → URL `https://compagnons.vercel.app`

### D. Restreindre les CORS (recommandé après le 1er déploiement)

Sur Railway, remplacez `CORS_ORIGINS=*` par votre URL Vercel :
```
CORS_ORIGINS=https://compagnons.vercel.app
```

---

## 3. Réimporter vos données

Une fois le déploiement live, importez votre `compagnons-AAAA-MM-JJ.json` dans la nouvelle Mongo. Exemple avec `mongoimport` :

```bash
# Convertir le JSON pour mongoimport (un objet par ligne)
python3 -c "
import json
data = json.load(open('compagnons-2026-06-08.json'))
for collection in ['pets','rations','appointments','vetfiles','weights','journal','walks','shares']:
    with open(f'{collection}.jsonl','w') as f:
        for doc in data[collection]:
            f.write(json.dumps(doc) + '\n')
"

# Importer dans Atlas
for c in pets rations appointments vetfiles weights journal walks shares; do
  mongoimport --uri 'mongodb+srv://user:pw@cluster.xxx.mongodb.net/compagnons' \
              --collection $c --file $c.jsonl
done
```

Ou utilisez **MongoDB Compass** (GUI gratuite) → connectez-vous à Atlas → "Import Data" pour chaque collection.

---

## 4. Lancer en local

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # éditez MONGO_URL, DB_NAME
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
yarn install
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
yarn start
```

Ouvrez http://localhost:3000.

---

## 5. Si la clé Emergent n'est plus disponible

L'analyse IA des documents véto (`/api/ai/analyze-document`) utilise `EMERGENT_LLM_KEY`. Pour la remplacer par une clé Anthropic directe :

1. Compte sur [console.anthropic.com](https://console.anthropic.com) → API key
2. Dans `backend/server.py`, remplacer l'appel `LlmChat` par le SDK officiel `anthropic`
3. Mettre `ANTHROPIC_API_KEY=sk-ant-...` dans Railway

Si l'IA n'est pas vitale pour vous, vous pouvez simplement laisser l'endpoint renvoyer une erreur — toutes les autres fonctionnalités continuent.

---

## Variables d'environnement — résumé

### Backend
| Variable | Description |
|---|---|
| `MONGO_URL` | Chaîne de connexion Mongo (Atlas) |
| `DB_NAME` | Nom de la base (ex: `compagnons`) |
| `EMERGENT_LLM_KEY` | Clé universelle Emergent (analyse IA) — optionnelle |
| `CORS_ORIGINS` | Origines autorisées, ex: `https://compagnons.vercel.app` |
| `PORT` | Port d'écoute (Railway l'injecte automatiquement) |

### Frontend
| Variable | Description |
|---|---|
| `REACT_APP_BACKEND_URL` | URL publique du backend (Railway) |

---

## Alternative Render (au lieu de Railway)

- [render.com](https://render.com) → New Web Service → Connect repo → Root `backend`
- Build : `pip install -r requirements.txt`
- Start : `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Plan gratuit : endormissement après 15 min — première requête lente (~30 s).

---

## Garder l'app éveillée (anti-sleep)

Sur les plans gratuits Railway/Render, ajoutez un cron via [cron-job.org](https://cron-job.org) :
```
GET https://xxx.up.railway.app/api/  toutes les 10 min
```

---

## Sécurité

- L'app n'a **pas d'authentification** (usage perso).
- Les **liens de partage** vétérinaire utilisent un token aléatoire 128 bits — gardez-les privés.
- En cas de déploiement public, ajoutez une auth simple (basic auth Nginx, Cloudflare Access, ou middleware FastAPI).

---

Made with 🌿 by you & Emergent.
