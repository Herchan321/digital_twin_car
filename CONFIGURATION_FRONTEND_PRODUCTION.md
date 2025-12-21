# 🌐 CONFIGURATION FRONTEND - URL Production

## 🎯 Modifications nécessaires dans le frontend Next.js

Une fois le backend déployé, vous devez mettre à jour le frontend pour qu'il utilise l'URL de production.

---

## 📝 Fichiers à modifier

### 1. Variables d'environnement

Créer/modifier le fichier `.env.local` dans `digital-twin-car-dashboard/`:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://gounane.ovh
NEXT_PUBLIC_WS_URL=ws://gounane.ovh/ws/telemetry
NEXT_PUBLIC_SUPABASE_URL=https://qwpqqtaygnltqxzpbqng.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cHFxdGF5Z25sdHF4enBicW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjY0OTgsImV4cCI6MjA3NjIwMjQ5OH0.1oE4b_3mGpqflZ_9ejiZCaekazl4jktmj8oTF-dZ7ns
```

---

### 2. Configuration API (si vous avez un fichier dédié)

**Fichier:** `lib/api.ts` ou `lib/config.ts`

```typescript
// Avant
const API_URL = 'http://localhost:8000';

// Après
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://gounane.ovh';
```

---

### 3. WebSocket (TelemetryDashboard ou autre)

Cherchez dans votre code où le WebSocket est initialisé:

**Exemple dans `components/telemetry-dashboard.tsx`:**

```typescript
// Avant
const ws = new WebSocket('ws://localhost:8000/ws/telemetry');

// Après
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://gounane.ovh/ws/telemetry';
const ws = new WebSocket(WS_URL);
```

---

### 4. Fetching data (si appels API directs)

**Exemple:**

```typescript
// Avant
const response = await fetch('http://localhost:8000/vehicles');

// Après
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://gounane.ovh';
const response = await fetch(`${API_URL}/vehicles`);
```

---

## 🔍 Recherche rapide

Utilisez VS Code pour trouver toutes les occurrences:

```
Ctrl+Shift+F (ou Cmd+Shift+F sur Mac)
Rechercher: localhost:8000
```

Remplacer par la variable d'environnement.

---

## 🧪 Test en local avec l'API de production

Pour tester localement le frontend avec l'API de production:

```bash
# Dans digital-twin-car-dashboard/
npm run dev
```

Le frontend local (`http://localhost:3000`) utilisera l'API de production (`http://gounane.ovh`).

---

## 🚀 Déployer le frontend (optionnel)

Si vous voulez aussi déployer le frontend sur le même serveur:

### Option 1: Build static

```bash
# Sur votre machine
cd digital-twin-car-dashboard
npm run build
npm run export  # ou next export selon la version

# Transférer
scp -r out asma@gounane.ovh:~/frontend
```

Sur le serveur, servir avec Nginx:

```nginx
# Ajouter dans /etc/nginx/sites-available/digital-twin
location / {
    root /home/asma/frontend;
    try_files $uri $uri/ /index.html;
}
```

### Option 2: Run with PM2

```bash
# Sur le serveur
sudo apt install nodejs npm -y
sudo npm install -g pm2

cd ~/digital-twin-car-dashboard
npm install
npm run build
pm2 start npm --name "digital-twin-frontend" -- start
pm2 save
pm2 startup
```

---

## 📋 Résumé des URLs

| Environnement | API | WebSocket | Frontend |
|---------------|-----|-----------|----------|
| **Développement** | http://localhost:8000 | ws://localhost:8000/ws/telemetry | http://localhost:3000 |
| **Production** | http://gounane.ovh | ws://gounane.ovh/ws/telemetry | http://gounane.ovh |

---

## ✅ Checklist Frontend

- [ ] Fichier `.env.local` créé/modifié
- [ ] Toutes les occurrences de `localhost:8000` remplacées
- [ ] Variables d'environnement utilisées partout
- [ ] WebSocket utilise `process.env.NEXT_PUBLIC_WS_URL`
- [ ] Test en local avec API production réussi
- [ ] Frontend build et déployé (si applicable)

---

**Conseil:** Utilisez toujours des variables d'environnement pour faciliter le basculement entre dev et production! 🎯
