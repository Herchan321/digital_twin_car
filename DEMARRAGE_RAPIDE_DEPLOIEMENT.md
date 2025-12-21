# 🚀 DÉMARRAGE RAPIDE - Déploiement Backend

## 📦 Prérequis
- Accès SSH: `ssh asma@gounane.ovh` (mot de passe: `Asma1234`)
- Git Bash ou WSL installé sur Windows
- Les fichiers de configuration créés

## ⚡ Déploiement en 3 étapes

### 1️⃣ Connexion et préparation du serveur

```bash
# Connexion SSH
ssh asma@gounane.ovh
# Mot de passe: Asma1234

# Installer les dépendances système
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx

# Vérifier Python
python3 --version  # Devrait afficher Python 3.8+
```

### 2️⃣ Transfert des fichiers

**Sur votre machine Windows (Git Bash):**

```bash
# Aller dans le dossier du projet
cd /c/wamp64/www/DigitalTwin/digital_twin_car

# Transférer le dossier backend
scp -r digital_twin_logic/backend asma@gounane.ovh:~/digital-twin-backend

# Transférer le fichier .env de production
scp production.env asma@gounane.ovh:~/digital-twin-backend/.env

# Transférer les fichiers de configuration
scp digital-twin.service asma@gounane.ovh:~/
scp nginx-digital-twin.conf asma@gounane.ovh:~/
```

### 3️⃣ Configuration sur le serveur

**Retour sur le serveur SSH:**

```bash
# Installer les dépendances Python
cd ~/digital-twin-backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Tester le backend manuellement
uvicorn app.main:app --host 0.0.0.0 --port 8000
# Ouvrir http://gounane.ovh:8000 dans votre navigateur
# Appuyer sur Ctrl+C pour arrêter

# Configurer le service systemd
sudo cp ~/digital-twin.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable digital-twin
sudo systemctl start digital-twin
sudo systemctl status digital-twin

# Configurer Nginx
sudo cp ~/nginx-digital-twin.conf /etc/nginx/sites-available/digital-twin
sudo ln -s /etc/nginx/sites-available/digital-twin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Configurer le pare-feu
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## ✅ Vérification

### Tester l'API
```bash
# Depuis votre machine locale
curl http://gounane.ovh/
# Devrait retourner la page Swagger UI

# Tester un endpoint
curl http://gounane.ovh/vehicles
```

### Voir les logs
```bash
# Sur le serveur
sudo journalctl -u digital-twin -f
```

## 🌐 URLs disponibles

- **Documentation API:** http://gounane.ovh/
- **Endpoints API:** http://gounane.ovh/vehicles
- **WebSocket:** ws://gounane.ovh/ws/telemetry

## 🔧 Commandes utiles

```bash
# Redémarrer le backend
sudo systemctl restart digital-twin

# Voir les logs
sudo journalctl -u digital-twin -f

# Arrêter le backend
sudo systemctl stop digital-twin

# Redémarrer Nginx
sudo systemctl restart nginx
```

## 📱 Mettre à jour le frontend

Dans votre code Next.js, changez l'URL de l'API:

```typescript
// lib/api.ts ou configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://gounane.ovh';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://gounane.ovh/ws/telemetry';
```

## 🆘 Problèmes courants

### Le service ne démarre pas
```bash
sudo journalctl -u digital-twin -n 50
```

### Port 8000 occupé
```bash
sudo lsof -i :8000
sudo kill -9 <PID>
sudo systemctl restart digital-twin
```

### Nginx ne démarre pas
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

## ✅ Checklist

- [ ] Serveur préparé (Python, Nginx installés)
- [ ] Fichiers transférés
- [ ] Dépendances Python installées
- [ ] Fichier .env créé
- [ ] Backend testé manuellement
- [ ] Service systemd configuré
- [ ] Nginx configuré
- [ ] Pare-feu configuré
- [ ] API accessible depuis http://gounane.ovh/
- [ ] WebSocket fonctionnel
- [ ] MQTT reçoit les données
- [ ] Frontend mis à jour avec la nouvelle URL

Fait! 🎉
