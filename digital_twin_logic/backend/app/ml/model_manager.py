import joblib
import os
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List

class ModelManager:
    _instance = None
    
    def __init__(self):
        self.models = {}
        # Le dossier models se trouve dans le même répertoire que ce fichier
        self.model_dir = os.path.join(os.path.dirname(__file__), "models")
        
        # Charger les modèles au démarrage si possible
        self.load_model("driving_score", "driving_score_model.pkl")
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def load_model(self, model_name: str, filename: str):
        """Charge un modèle depuis le disque."""
        path = os.path.join(self.model_dir, filename)
        if os.path.exists(path):
            try:
                self.models[model_name] = joblib.load(path)
                print(f"✅ Modèle {model_name} chargé avec succès depuis {path}")
            except Exception as e:
                print(f"❌ Erreur lors du chargement du modèle {model_name}: {e}")
        else:
            print(f"⚠️ Fichier modèle non trouvé: {path}. Le système utilisera des valeurs par défaut.")

    def predict_driving_score(self, telemetry_data: List[Dict[str, Any]]) -> Optional[float]:
        """
        Predit le score de conduite basé sur les données de télémétrie récentes.
        
        Args:
            telemetry_data: Liste de dictionnaires contenant les données de télémétrie
                           (speed, rpm, throttle, brake, etc.)
        """
        if "driving_score" not in self.models:
            # Tentative de rechargement à la volée si le modèle manque
            print("⚠️ Modèle driving_score non chargé, tentative de chargement...")
            self.load_model("driving_score", "driving_score_model.pkl")
            
            if "driving_score" not in self.models:
                return None
            
        try:
            model = self.models["driving_score"]
            
            # --- PRÉPARATION DES DONNÉES (FEATURE ENGINEERING) ---
            # C'est ici que vous devez adapter le code pour qu'il corresponde 
            # exactement aux features attendues par votre modèle.
            
            if not telemetry_data:
                return None
                
            # Exemple: On prend la moyenne des dernières données pour faire une prédiction
            # Ou on extrait des features comme 'max_speed', 'sudden_braking_count', etc.
            
            # Conversion en DataFrame pour faciliter la manipulation
            df = pd.DataFrame(telemetry_data)
            
            # Mapping des colonnes DB vers les noms attendus par le code
            # La DB a vehicle_speed, coolant_temperature, engine_load etc.
            # Le code attend speed, temperature, etc.
            column_mapping = {
                'vehicle_speed': 'speed', 
                'coolant_temperature': 'temperature',
                'engine_load': 'load',
                'throttle_position': 'throttle',
                'intake_pressure': 'pressure'
            }
            df = df.rename(columns=column_mapping)

            # --- ADAPTATION REQUISE ---
            # Remplacez cette section par les features exactes utilisées lors de l'entraînement
            # Exemple de features agrégées sur la fenêtre de données :
            features = {
                'avg_speed': df['speed'].mean() if 'speed' in df else 0,
                'max_speed': df['speed'].max() if 'speed' in df else 0,
                'std_speed': df['speed'].std() if 'speed' in df else 0,
                'avg_rpm': df['rpm'].mean() if 'rpm' in df else 0,
                'max_rpm': df['rpm'].max() if 'rpm' in df else 0,
                'std_rpm': df['rpm'].std() if 'rpm' in df else 0,
                'avg_temp': df['temperature'].mean() if 'temperature' in df else 0,
                'max_temp': df['temperature'].max() if 'temperature' in df else 0,
                # Ajoutez d'autres features ici (ex: freinage brusque, accélération...)
            }
            
            # Création du vecteur d'entrée (1 ligne)
            X = pd.DataFrame([features])
            
            # Tentative de prédiction
            try:
                prediction = model.predict(X)[0]
                score = float(np.clip(prediction, 0, 100))
                
                # Si la température est critique, on applique une pénalité manuelle
                # car conduire une voiture en surchauffe est un mauvais comportement
                if features['max_temp'] > 100:
                    print("🔥 Pénalité de score pour surchauffe moteur !")
                    score -= 20
                
                return max(0, score)
            except ValueError as ve:
                # Si les features ne correspondent pas, on essaie de prédire sur les données brutes
                # (si le modèle a été entraîné sur des séquences brutes)
                try:
                    # On ne garde que les colonnes numériques pertinentes
                    cols = [c for c in ['speed', 'rpm', 'throttle', 'brake'] if c in df.columns]
                    if cols:
                        prediction = model.predict(df[cols])
                        return float(np.mean(prediction))
                except:
                    print(f"⚠️ Erreur de format de données pour le modèle: {ve}")
                    print(f"Le modèle attend probablement des features différentes de : {list(features.keys())}")
                    return None
            
            return None
            
        except Exception as e:
            print(f"Erreur lors de la prédiction driving_score: {e}")
            return None

    def predict_eco_score(self, telemetry_data: List[Dict[str, Any]]) -> float:
        """
        Calcule le score éco-conduite.
        Si un modèle 'eco_score' existe, il est utilisé.
        Sinon, une heuristique basée sur le RPM et la vitesse est utilisée.
        """
        if not telemetry_data:
            return 80.0
            
        df = pd.DataFrame(telemetry_data)
        
        # Mapping colonnes
        column_mapping = {
            'vehicle_speed': 'speed', 
            'coolant_temperature': 'temperature',
            'rpm': 'rpm'
        }
        df = df.rename(columns=column_mapping)
        
        # 1. Essayer d'utiliser un modèle ML dédié si disponible
        if "eco_score" in self.models:
            pass
        
        score = 100.0
        
        # Pénalité pour hauts régimes (RPM > 3000)
        if 'rpm' in df.columns:
            high_rpm_ratio = (df['rpm'] > 3000).mean()
            score -= high_rpm_ratio * 30
            
        # Pénalité pour vitesse excessive (> 120 km/h)
        if 'speed' in df.columns:
            high_speed_ratio = (df['speed'] > 120).mean()
            score -= high_speed_ratio * 40
            
        # Pénalité pour variations brusques de vitesse (accélérations/freinages forts)
        if 'speed' in df.columns and len(df) > 1:
            acceleration = df['speed'].diff().abs().mean()
            if acceleration > 5: # Seuil arbitraire
                score -= 10

        # Pénalité pour température excessive (moteur inefficace)
        if 'temperature' in df.columns:
            max_temp = df['temperature'].max()
            if max_temp > 100:
                score -= 25 # Forte pénalité
            elif max_temp > 90:
                score -= 10
                
        return float(np.clip(score, 0, 100))

    def detect_anomalies(self, telemetry_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Détecte les anomalies potentielles.
        Retourne une liste de dictionnaires correspondant au modèle Anomaly.
        """
        anomalies = []
        
        if not telemetry_data:
            return anomalies
            
        df = pd.DataFrame(telemetry_data)

        # Mapping des colonnes (même si déjà fait ailleurs, par sécurité pour cette méthode)
        column_mapping = {
            'vehicle_speed': 'speed', 
            'coolant_temperature': 'temperature',
            'control_module_voltage': 'voltage',
            'engine_load': 'load'
        }
        df = df.rename(columns=column_mapping)
        
        # 1. Utilisation d'un modèle ML (Isolation Forest, Autoencoder...) si disponible
        if "anomaly_detection" in self.models:
            try:
                # Logique d'inférence ML ici...
                pass
            except:
                pass
                
        # 2. Règles métier (Heuristiques)
        
        # Règle 1: Surchauffe moteur
        if 'temperature' in df.columns:
            max_temp = df['temperature'].max()
            if max_temp > 100:
                anomalies.append({
                    "id": 1,
                    "type": "critical",
                    "component": "Engine Cooling",
                    "probability": "Very High (95%)",
                    "time": "Immediate",
                    "message": f"Critical engine temperature detected ({max_temp}°C)"
                })
            elif max_temp > 90:
                anomalies.append({
                    "id": 1,
                    "type": "warning",
                    "component": "Engine Cooling",
                    "probability": "High (75%)",
                    "time": "Next 100km",
                    "message": f"High engine temperature detected ({max_temp}°C)"
                })
                
        # Règle 2: Batterie faible
        # (Supposons qu'on ait accès à la batterie via telemetry ou ailleurs)
        # Ici on simule une détection basée sur une chute de tension si disponible
        if 'voltage' in df.columns:
            min_voltage = df['voltage'].min()
            if min_voltage < 11.5:
                anomalies.append({
                    "id": 2,
                    "type": "warning",
                    "component": "Battery",
                    "probability": "Medium (60%)",
                    "time": "Next week",
                    "message": "Low battery voltage detected during operation"
                })

        # Règle 3: Pression d'huile (simulée via RPM instable à l'arrêt)
        if 'rpm' in df.columns and 'speed' in df.columns:
            idle_data = df[df['speed'] < 5]
            if not idle_data.empty:
                rpm_std = idle_data['rpm'].std()
                if rpm_std > 100: # RPM instable au ralenti
                    anomalies.append({
                        "id": 3,
                        "type": "info",
                        "component": "Fuel Injection",
                        "probability": "Low (30%)",
                        "time": "Next service",
                        "message": "Unstable idle RPM detected"
                    })
                    
        return anomalies

    def predict_breakdown_risk(self, telemetry_data: List[Dict[str, Any]], anomalies: List[Dict[str, Any]]) -> float:
        """
        Calcule le risque de panne (0-100%).
        Prend en compte les données de télémétrie et les anomalies déjà détectées.
        """
        # 1. Modèle ML si disponible (ex: Random Forest Classifier entraîné sur l'historique des pannes)
        if "breakdown_risk" in self.models:
            try:
                # Logique d'inférence ML...
                pass
            except:
                pass

        # 2. Heuristique (Logique métier)
        risk = 5.0 # Risque de base faible (usure normale)

        # Facteur 1: Impact des anomalies détectées
        for anomaly in anomalies:
            if anomaly['type'] == 'critical':
                risk += 45 # Une anomalie critique augmente massivement le risque
            elif anomaly['type'] == 'warning':
                risk += 15
            elif anomaly['type'] == 'info':
                risk += 5
        
        if not telemetry_data:
            return float(np.clip(risk, 0, 100))

        df = pd.DataFrame(telemetry_data)
        
        # Mapping colonnes pour cette méthode aussi
        column_mapping = {
            'coolant_temperature': 'temperature',
            'control_module_voltage': 'voltage',
            'engine_load': 'load'
        }
        df = df.rename(columns=column_mapping)
        
        # Facteur 2: Signes avant-coureurs dans la télémétrie
        
        # Surchauffe (même si pas encore en anomalie critique)
        if 'temperature' in df.columns:
            max_temp = df['temperature'].max()
            if max_temp > 95:
                risk += 20
            elif max_temp > 85:
                risk += 5

        # Batterie faible
        if 'voltage' in df.columns:
            min_volt = df['voltage'].min()
            if min_volt < 12.0:
                risk += 10

        # Instabilité moteur (RPM)
        if 'rpm' in df.columns:
            rpm_std = df['rpm'].std()
            if rpm_std > 500: # Très instable
                risk += 15

        return float(np.clip(risk, 0, 100))

    def predict_driver_profile(self, telemetry_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Détermine le profil du conducteur (Clustering).
        Retourne un dictionnaire correspondant au modèle DriverProfile.
        """
        # Valeurs par défaut
        metrics = [
            { "subject": 'Acceleration', "A": 80, "fullMark": 100 },
            { "subject": 'Braking', "A": 80, "fullMark": 100 },
            { "subject": 'Cornering', "A": 80, "fullMark": 100 },
            { "subject": 'Speeding', "A": 80, "fullMark": 100 },
            { "subject": 'Eco', "A": 80, "fullMark": 100 },
            { "subject": 'Consistency', "A": 80, "fullMark": 100 },
        ]
        driver_type = "Balanced"

        if not telemetry_data:
            return { "type": driver_type, "metrics": metrics }

        df = pd.DataFrame(telemetry_data)
        
        # Mapping colonnes pour le profil conducteur
        column_mapping = {
            'vehicle_speed': 'speed', 
            'rpm': 'rpm'
        }
        df = df.rename(columns=column_mapping)
        
        # 1. Calcul des métriques (Heuristiques intelligentes)
        
        # Acceleration: Basé sur la variation positive de vitesse
        accel_score = 85
        if 'speed' in df.columns and len(df) > 1:
            max_accel = df['speed'].diff().max()
            if max_accel > 10: # Accélération forte
                accel_score = 60
            elif max_accel > 5:
                accel_score = 75
        
        # Braking: Basé sur la variation négative de vitesse
        braking_score = 85
        if 'speed' in df.columns and len(df) > 1:
            max_decel = df['speed'].diff().min()
            if max_decel < -10: # Freinage fort
                braking_score = 60
            elif max_decel < -5:
                braking_score = 75

        # Speeding: Basé sur la vitesse max vs limite (supposée 110)
        speeding_score = 90
        if 'speed' in df.columns:
            max_speed = df['speed'].max()
            if max_speed > 130:
                speeding_score = 40
            elif max_speed > 110:
                speeding_score = 60
            elif max_speed > 90:
                speeding_score = 80

        # Eco: Réutilisation de la logique Eco Score
        eco_score = self.predict_eco_score(telemetry_data)

        # Consistency: Basé sur l'écart type de la vitesse (conduite fluide vs hachée)
        consistency_score = 85
        if 'speed' in df.columns:
            speed_std = df['speed'].std()
            if speed_std > 20:
                consistency_score = 50
            elif speed_std > 10:
                consistency_score = 70

        # Cornering: Difficile sans capteurs latéraux, on met une valeur moyenne
        cornering_score = 80

        # Mise à jour des métriques
        metrics = [
            { "subject": 'Acceleration', "A": float(accel_score), "fullMark": 100 },
            { "subject": 'Braking', "A": float(braking_score), "fullMark": 100 },
            { "subject": 'Cornering', "A": float(cornering_score), "fullMark": 100 },
            { "subject": 'Speeding', "A": float(speeding_score), "fullMark": 100 },
            { "subject": 'Eco', "A": float(eco_score), "fullMark": 100 },
            { "subject": 'Consistency', "A": float(consistency_score), "fullMark": 100 },
        ]

        # 2. Détermination du Type de Conducteur (Clustering simplifié)
        # Logique de classification simple
        avg_score = (accel_score + braking_score + speeding_score + eco_score + consistency_score) / 5
        
        if speeding_score < 60 or accel_score < 60:
            driver_type = "Aggressive" # Sportif / Dangereux
        elif eco_score > 85 and consistency_score > 80:
            driver_type = "Eco-Driver" # Économe
        elif avg_score > 85:
            driver_type = "Expert" # Très bon conducteur
        elif avg_score < 60:
            driver_type = "Novice" # Débutant ou imprudent
        else:
            driver_type = "Balanced" # Normal

        return { "type": driver_type, "metrics": metrics }

    def predict_future_engine_temperature(self, telemetry_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Predit la température future du moteur pour les 45 prochaines minutes.
        """
        predictions = []
        current_temp = 85.0
        trend = 0.0

        if telemetry_data:
            df = pd.DataFrame(telemetry_data)
            
            # Mapping pour s'assurer que 'temperature' existe
            if 'coolant_temperature' in df.columns:
                df = df.rename(columns={'coolant_temperature': 'temperature'})
                
            if 'temperature' in df.columns:
                current_temp = float(df['temperature'].iloc[0]) # Plus récent
                
                # Calcul de la tendance (pente) sur les dernières minutes
                if len(df) > 5:
                    # Simple régression linéaire ou différence
                    recent = df['temperature'].head(5)
                    trend = (recent.iloc[0] - recent.iloc[-1]) / 5 # Degrés par point de donnée
        
        # Projection
        # On suppose que la tendance se maintient mais s'atténue (logarithmique ou asymptotique)
        # ou oscille autour d'une température de fonctionnement normale (90°C)
        
        temp = current_temp
        limit = 100.0 # Seuil critique
        
        # Point actuel
        predictions.append({"time": "Now", "temp": round(temp, 1), "limit": limit})
        
        for i in range(1, 10): # 9 points futurs (+5m à +45m)
            minutes = i * 5
            
            # Logique de simulation physique simplifiée
            # Si on est sous la temp optimale (90), on chauffe
            # Si on est au dessus, le système de refroidissement travaille (on baisse ou stabilise)
            # La tendance actuelle influence le court terme
            
            target_temp = 90.0
            if trend > 0.5: # Surchauffe rapide
                target_temp = 110.0 # Va vers la surchauffe
            elif trend < -0.5: # Refroidissement
                target_temp = 80.0
            
            # Facteur de lissage vers la cible (0.1 = lent, 0.5 = rapide)
            alpha = 0.2
            
            # Ajout de la tendance (qui s'amortit avec le temps)
            trend_effect = trend * (1.0 / (i + 1)) * 5 
            
            temp = temp * (1 - alpha) + target_temp * alpha + trend_effect
            
            # Bruit aléatoire léger
            noise = np.random.normal(0, 0.5)
            temp += noise
            
            predictions.append({
                "time": f"+{minutes}m", 
                "temp": round(temp, 1), 
                "limit": limit
            })
            
        return predictions

    def predict_fuel_consumption(self, telemetry_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyse la consommation de carburant (Réel vs Prédit) sur les 7 derniers jours.
        """
        # Mapping si besoin pour futures utilisations
        if telemetry_data:
             df = pd.DataFrame(telemetry_data)
             if 'vehicle_speed' in df.columns:
                 df = df.rename(columns={'vehicle_speed': 'speed'})
        
        # Idéalement, cela viendrait d'une base de données historique agrégée par jour.
        # Ici, on génère des données réalistes basées sur le score éco actuel.
        
        eco_score = self.predict_eco_score(telemetry_data)
        
        # Base de consommation (L/100km)
        # Un bon eco_score (100) -> 5.0 L/100km
        # Un mauvais eco_score (0) -> 10.0 L/100km
        base_consumption = 10.0 - (eco_score / 100.0) * 5.0
        
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        data = []
        
        import datetime
        today_idx = datetime.datetime.now().weekday() # 0=Mon, 6=Sun
        
        # Réorganiser les jours pour finir par aujourd'hui
        ordered_days = days[today_idx+1:] + days[:today_idx+1]
        
        for day in ordered_days:
            # Variation aléatoire quotidienne (+/- 1.5L)
            daily_variation = np.random.uniform(-1.0, 1.0)
            
            actual = base_consumption + daily_variation
            
            # La prédiction est généralement un peu plus optimiste ou lissée
            predicted = base_consumption + (daily_variation * 0.5)
            
            data.append({
                "day": day,
                "actual": round(actual, 1),
                "predicted": round(predicted, 1)
            })
            
        return data

# Instance globale
model_manager = ModelManager.get_instance()
