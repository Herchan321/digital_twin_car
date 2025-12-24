-- ========================================
-- MISE À JOUR DE LA TABLE TELEMETRY
-- Ajout des nouvelles colonnes pour les PIDs supplémentaires
-- ========================================

-- Exécuter ce script dans l'éditeur SQL de Supabase

-- 1. Nouvelles colonnes pour Oxygen Sensor 2
ALTER TABLE telemetry 
ADD COLUMN IF NOT EXISTS oxygen_sensor2_faer FLOAT;

-- 2. Nouvelles colonnes pour EGR combiné (peut remplacer egr_commanded et egr_error)
ALTER TABLE telemetry 
ADD COLUMN IF NOT EXISTS egr_commanded_error FLOAT;

-- 3. Nouvelles colonnes pour PIDs Supported supplémentaires
ALTER TABLE telemetry 
ADD COLUMN IF NOT EXISTS pids_supported_61_80 INTEGER;

ALTER TABLE telemetry 
ADD COLUMN IF NOT EXISTS pids_supported_81_a0 INTEGER;

-- 4. Nouvelles colonnes pour Engine Coolant Temperature (2 valeurs)
ALTER TABLE telemetry 
ADD COLUMN IF NOT EXISTS engine_coolant_temp1 FLOAT;

ALTER TABLE telemetry 
ADD COLUMN IF NOT EXISTS engine_coolant_temp2 FLOAT;

-- 5. Nouvelles colonnes pour températures additionnelles
ALTER TABLE telemetry 
ADD COLUMN IF NOT EXISTS charge_air_cooler_temp FLOAT;

ALTER TABLE telemetry 
ADD COLUMN IF NOT EXISTS egt_bank1 FLOAT;

-- 6. Nouvelle colonne pour Diesel Aftertreatment
ALTER TABLE telemetry 
ADD COLUMN IF NOT EXISTS diesel_aftertreatment INTEGER;

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'telemetry'
ORDER BY ordinal_position;

-- ========================================
-- NOTES IMPORTANTES
-- ========================================
-- 
-- 1. Toutes les nouvelles colonnes sont NULLABLE pour ne pas casser les données existantes
-- 
-- 2. Colonnes ajoutées:
--    - oxygen_sensor2_faer: Fuel-Air Equivalence Ratio du capteur O2 #2
--    - egr_commanded_error: EGR commandé + erreur combinés (depuis 69-CmdEGR_EGRError)
--    - pids_supported_61_80: PIDs supportés (range 0x61-0x80)
--    - pids_supported_81_a0: PIDs supportés (range 0x81-0xA0)
--    - engine_coolant_temp1: Température coolant moteur #1 (depuis 67-EngineCoolantTemp1)
--    - engine_coolant_temp2: Température coolant moteur #2 (depuis 67-EngineCoolantTemp2)
--    - charge_air_cooler_temp: Température du refroidisseur d'air de suralimentation
--    - egt_bank1: Exhaust Gas Temperature Bank 1
--    - diesel_aftertreatment: Système de post-traitement diesel
--
-- 3. Les colonnes existantes sont conservées:
--    - egr_commanded et egr_error restent disponibles pour compatibilité
--
-- 4. Après exécution de ce script, redémarrer le backend Python:
--    cd digital_twin_logic/backend
--    uvicorn app.main:app --reload
--
