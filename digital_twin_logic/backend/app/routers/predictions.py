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
        # NOTE: La colonne est 'recorded_at' et non 'timestamp'
        # On s'assure que vehicle_id est bien utilisé (cast en int si besoin, bien que Supabase gère souvent les strings)
        v_id_query = int(req.vehicle_id) if str(req.vehicle_id).isdigit() else req.vehicle_id
        print(f"🔍 Recherche télémétrie pour vehicle_id={v_id_query} (type: {type(v_id_query)})")

        telemetry_response = supabase.from_("telemetry").select("*").eq("vehicle_id", v_id_query).order("recorded_at", desc=True).limit(20).execute()
        telemetry_data = telemetry_response.data
        
        if not telemetry_data:
            print(f"⚠️ Aucune donnée de télémétrie trouvée pour le véhicule {req.vehicle_id}")
            raise HTTPException(status_code=404, detail="Pas de données de télémétrie pour ce véhicule")
            
        print(f"✅ {len(telemetry_data)} points de télémétrie trouvés pour véhicule {req.vehicle_id}")

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
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")

@router.get("/{vehicle_id}", response_model=PredictionResponse)
async def get_predictions(vehicle_id: str, supabase=Depends(get_supabase)):
    """
    Obtient les prédictions pour un véhicule spécifié par son ID.
    """
    try:
        req = PredictionRequest(vehicle_id=vehicle_id)
        return await generate_predictions(req, supabase)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")