from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta
from ..models import PredictionRequest, PredictionResponse
from ..database import get_supabase
from ..ml.model_manager import model_manager

router = APIRouter(
    prefix="/predictions",
    tags=["predictions"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=PredictionResponse)
async def generate_predictions(req: PredictionRequest, supabase=Depends(get_supabase)):
    """
    Génère des prédictions pour un véhicule spécifié.
    """
    try:
        # Récupérer les données historiques du véhicule depuis Supabase
        response = supabase.from_("vehicles").select("*").eq("id", req.vehicle_id).execute()
        vehicle_data = response.data
        
        if not vehicle_data:
            raise HTTPException(status_code=404, detail="Véhicule non trouvé")
        
        vehicle = vehicle_data[0]
        
        # Récupérer les données de télémétrie récentes
        telemetry_response = supabase.from_("telemetry").select("*").eq("vehicle_id", req.vehicle_id).order("timestamp", desc=True).limit(20).execute()
        telemetry_data = telemetry_response.data
        
        # Calculer les prédictions
        battery_pct = req.current_battery_pct or vehicle.get("battery_pct", 80)
        
        # 1. Autonomie estimée (km)
        # Formule simple: 1.5km par % de batterie (à ajuster selon vos données)
        estimated_range_km = battery_pct * 1.5
        
        # 2. Santé de la batterie
        # Dégradation progressive basée sur l'âge et l'utilisation
        # Formule fictive à remplacer par votre logique métier
        battery_age_days = 30  # À remplacer par le calcul réel
        battery_health_pct = 100 - (battery_age_days / 365) * 5
        
        # 3. Prochaine maintenance
        # Basé sur le kilométrage ou la date de dernière maintenance
        current_date = datetime.now()
        next_maintenance_due = (current_date + timedelta(days=30)).isoformat()
        
        # 4. Score de performance
        # Essayer d'utiliser le modèle ML s'il est disponible
        ml_score = model_manager.predict_driving_score(telemetry_data)
        
        if ml_score is not None:
            performance_score = ml_score
        else:
            # Fallback à la logique existante
            performance_score = 85.0  # Score de base fictif
            if telemetry_data:
                # Ajustement basé sur les données récentes
                recent_temps = [t.get("temperature", 25) for t in telemetry_data if "temperature" in t]
                if recent_temps:
                    avg_temp = sum(recent_temps) / len(recent_temps)
                    if avg_temp > 50:  # Température élevée
                        performance_score -= 10
        
        # 5. Eco Score
        eco_score = model_manager.predict_eco_score(telemetry_data)

        # 6. Anomalies
        anomalies = model_manager.detect_anomalies(telemetry_data)

        # 7. Profil Conducteur
        driver_profile = model_manager.predict_driver_profile(telemetry_data)

        # 8. Risque de panne
        breakdown_risk = model_manager.predict_breakdown_risk(telemetry_data, anomalies)

        # 9. Consommation d'énergie estimée
        estimated_energy_consumption = 15.5  # kWh/100km (exemple)
        
        # 10. Prédictions avancées
        future_temp = model_manager.predict_future_engine_temperature(telemetry_data)
        fuel_consumption = model_manager.predict_fuel_consumption(telemetry_data)

        # Créer la réponse
        prediction = PredictionResponse(
            vehicle_id=req.vehicle_id,
            timestamp=datetime.now().isoformat(),
            estimated_range_km=estimated_range_km,
            battery_health_pct=battery_health_pct,
            next_maintenance_due=next_maintenance_due,
            performance_score=performance_score,
            eco_score=eco_score,
            anomalies=anomalies,
            driver_profile=driver_profile,
            breakdown_risk=breakdown_risk,
            estimated_energy_consumption=estimated_energy_consumption,
            future_engine_temperature=future_temp,
            fuel_consumption_analysis=fuel_consumption
        )
        
        return prediction
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")

@router.get("/{vehicle_id}", response_model=PredictionResponse)
async def get_predictions(vehicle_id: str, supabase=Depends(get_supabase)):
    """
    Obtient les prédictions pour un véhicule spécifié par son ID.
    """
    try:
        # Gestion du cas spécial "vehicle1" ou "1" pour le test
        if vehicle_id == "vehicle1" or vehicle_id == "1":
            print(f"🔍 Demande de prédictions pour {vehicle_id}")
            
            # Pour éviter tout blocage avec la base de données, on passe directement au mode simulation/modèle
            # Si vous voulez réactiver la DB plus tard, décommentez le bloc try/except ci-dessous
            
            # try:
            #     req = PredictionRequest(vehicle_id=vehicle_id)
            #     return await generate_predictions(req, supabase)
            # except HTTPException:
            
            if True: # Force l'exécution du bloc de simulation
                print(f"⚠️ Mode test: utilisation de données simulées pour {vehicle_id}")
                
                # Simulation de données de télémétrie pour le modèle
                # On ajoute un peu de variation pour avoir un score réaliste (pas 100/100)
                # ET on simule une SURCHAUFFE (105°C) pour tester les alertes
                dummy_telemetry = [
                    {"speed": 85, "rpm": 2500, "throttle": 0.4, "brake": 0, "temperature": 105}, # <--- SURCHAUFFE !
                    {"speed": 92, "rpm": 3100, "throttle": 0.6, "brake": 0, "temperature": 102},
                    {"speed": 84, "rpm": 2450, "throttle": 0.3, "brake": 0, "temperature": 98},
                ]
                
                # Appel du modèle ML avec les données simulées
                print("🤖 Appel du modèle ML...")
                ml_score = model_manager.predict_driving_score(dummy_telemetry)
                eco_score = model_manager.predict_eco_score(dummy_telemetry)
                anomalies = model_manager.detect_anomalies(dummy_telemetry)
                breakdown_risk = model_manager.predict_breakdown_risk(dummy_telemetry, anomalies)
                driver_profile = model_manager.predict_driver_profile(dummy_telemetry)
                future_temp = model_manager.predict_future_engine_temperature(dummy_telemetry)
                fuel_consumption = model_manager.predict_fuel_consumption(dummy_telemetry)
                
                print(f"✅ Score ML obtenu: {ml_score}, Eco Score: {eco_score}, Anomalies: {len(anomalies)}, Risk: {breakdown_risk}%")
                
                performance_score = ml_score if ml_score is not None else 88.7
                
                return PredictionResponse(
                    vehicle_id=vehicle_id,
                    timestamp=datetime.now().isoformat(),
                    estimated_range_km=350.5,
                    battery_health_pct=92.8,
                    next_maintenance_due=(datetime.now() + timedelta(days=30)).isoformat(),
                    performance_score=performance_score,
                    eco_score=eco_score,
                    anomalies=anomalies,
                    driver_profile=driver_profile,
                    breakdown_risk=breakdown_risk,
                    estimated_energy_consumption=15.3,
                    future_engine_temperature=future_temp,
                    fuel_consumption_analysis=fuel_consumption
                )
            
        # Traitement normal pour les autres véhicules...
            
        # Traitement normal pour les autres véhicules...
        req = PredictionRequest(vehicle_id=vehicle_id)
        return await generate_predictions(req, supabase)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")