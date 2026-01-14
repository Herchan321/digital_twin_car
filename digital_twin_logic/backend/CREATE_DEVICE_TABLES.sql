-- ============================================================================
-- SCRIPT SQL: Création des tables pour gestion dynamique des devices OBD-II
-- ============================================================================
-- Contexte: Un device peut être branché/débranché et réassigné à différentes
--           voitures. Les télémétries doivent être rattachées dynamiquement
--           au véhicule actuellement associé au device.
-- ============================================================================

-- ============================================================================
-- 1. TABLE: devices
-- ============================================================================
-- Stocke tous les devices OBD-II (ESP32 MeatPI) du système
-- Chaque device a un topic MQTT unique (ex: wincan/device1, wincan/device2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS devices (
    id BIGSERIAL PRIMARY KEY,
    device_code VARCHAR(50) UNIQUE NOT NULL,  -- Ex: "device1", "device2", etc.
    mqtt_topic VARCHAR(100) UNIQUE NOT NULL,  -- Ex: "wincan/device1"
    description TEXT,                          -- Description du device
    status VARCHAR(20) DEFAULT 'active',       -- active, inactive, maintenance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide par topic MQTT
CREATE INDEX IF NOT EXISTS idx_devices_mqtt_topic ON devices(mqtt_topic);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- Commentaires pour documentation
COMMENT ON TABLE devices IS 'Référentiel des devices OBD-II (ESP32 MeatPI) avec leur topic MQTT unique';
COMMENT ON COLUMN devices.device_code IS 'Identifiant unique du device (ex: device1, device2)';
COMMENT ON COLUMN devices.mqtt_topic IS 'Topic MQTT complet sur lequel le device publie (ex: wincan/device1)';
COMMENT ON COLUMN devices.status IS 'Statut opérationnel: active, inactive, maintenance';


-- ============================================================================
-- 2. TABLE: vehicle_device_assignment
-- ============================================================================
-- Table d'association many-to-many avec historique temporel
-- Permet de tracer l'historique des branchements/débranchements des devices
-- Un seul assignment peut être actif par device à la fois
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_device_assignment (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    device_id BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,              -- Un seul assignment actif par device
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unassigned_at TIMESTAMP WITH TIME ZONE,      -- NULL si toujours actif
    notes TEXT,                                  -- Notes optionnelles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide de l'assignment actif d'un device
CREATE INDEX IF NOT EXISTS idx_vda_device_active ON vehicle_device_assignment(device_id, is_active)
    WHERE is_active = TRUE;

-- Index pour recherche par véhicule
CREATE INDEX IF NOT EXISTS idx_vda_vehicle ON vehicle_device_assignment(vehicle_id);

-- Index pour recherche historique
CREATE INDEX IF NOT EXISTS idx_vda_assigned_at ON vehicle_device_assignment(assigned_at DESC);

-- Commentaires pour documentation
COMMENT ON TABLE vehicle_device_assignment IS 'Historique des associations véhicule ↔ device OBD-II avec traçabilité temporelle';
COMMENT ON COLUMN vehicle_device_assignment.is_active IS 'TRUE = association active, FALSE = historique désactivé';
COMMENT ON COLUMN vehicle_device_assignment.assigned_at IS 'Date/heure de branchement du device sur le véhicule';
COMMENT ON COLUMN vehicle_device_assignment.unassigned_at IS 'Date/heure de débranchement (NULL si toujours branché)';


-- ============================================================================
-- 3. MODIFICATION TABLE: telemetry
-- ============================================================================
-- Ajout de la colonne device_id pour tracer quel device a envoyé la télémétrie
-- ============================================================================

-- Ajouter la colonne device_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telemetry' AND column_name = 'device_id'
    ) THEN
        ALTER TABLE telemetry ADD COLUMN device_id BIGINT REFERENCES devices(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Index pour recherche rapide par device
CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry(device_id);

-- Index composite pour recherche par véhicule + device
CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_device ON telemetry(vehicle_id, device_id);

COMMENT ON COLUMN telemetry.device_id IS 'Device OBD-II qui a envoyé cette télémétrie (traçabilité)';


-- ============================================================================
-- 4. CONTRAINTE: Un seul assignment actif par device
-- ============================================================================
-- Empêche qu'un device soit actif sur plusieurs véhicules simultanément
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_device_assignment
    ON vehicle_device_assignment(device_id)
    WHERE is_active = TRUE;

COMMENT ON INDEX unique_active_device_assignment IS 'Garantit qu''un device ne peut être actif que sur un seul véhicule à la fois';


-- ============================================================================
-- 5. FONCTION: Désactiver automatiquement l'ancien assignment
-- ============================================================================
-- Trigger pour désactiver automatiquement l'ancien assignment actif
-- lorsqu'un nouveau assignment actif est créé pour le même device
-- ============================================================================

CREATE OR REPLACE FUNCTION deactivate_previous_device_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le nouvel assignment est actif
    IF NEW.is_active = TRUE THEN
        -- Désactiver tous les anciens assignments actifs pour ce device
        UPDATE vehicle_device_assignment
        SET 
            is_active = FALSE,
            unassigned_at = NOW()
        WHERE 
            device_id = NEW.device_id
            AND is_active = TRUE
            AND id != NEW.id;  -- Exclure le nouvel assignment
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_deactivate_previous_assignment ON vehicle_device_assignment;

CREATE TRIGGER trigger_deactivate_previous_assignment
    BEFORE INSERT OR UPDATE ON vehicle_device_assignment
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_previous_device_assignment();

COMMENT ON FUNCTION deactivate_previous_device_assignment() IS 'Désactive automatiquement l''ancien assignment actif lors de la création d''un nouveau';


-- ============================================================================
-- 6. DONNÉES DE TEST (OPTIONNEL)
-- ============================================================================
-- Exemples de devices et assignments pour tester le système
-- À adapter selon vos besoins réels
-- ============================================================================

-- Insérer quelques devices de test
INSERT INTO devices (device_code, mqtt_topic, description, status) VALUES
    ('device1', 'wincan/device1', 'ESP32 MeatPI #1 - Device principal', 'active'),
    ('device2', 'wincan/device2', 'ESP32 MeatPI #2 - Device secondaire', 'active'),
    ('device3', 'wincan/device3', 'ESP32 MeatPI #3 - Device de test', 'inactive')
ON CONFLICT (device_code) DO NOTHING;

-- Exemple d'assignment (à adapter selon vos IDs de véhicules existants)
-- Commenter cette section si vos IDs de véhicules sont différents
/*
INSERT INTO vehicle_device_assignment (vehicle_id, device_id, is_active, assigned_at) 
SELECT 1, d.id, TRUE, NOW()
FROM devices d 
WHERE d.device_code = 'device1'
ON CONFLICT DO NOTHING;
*/


-- ============================================================================
-- 7. VUES UTILES (OPTIONNEL)
-- ============================================================================
-- Vues pour faciliter les requêtes courantes
-- ============================================================================

-- Vue: Assignments actifs avec détails véhicule + device
CREATE OR REPLACE VIEW v_active_device_assignments AS
SELECT 
    vda.id as assignment_id,
    vda.vehicle_id,
    v.name as vehicle_name,
    v.vin as vehicle_vin,
    vda.device_id,
    d.device_code,
    d.mqtt_topic,
    d.status as device_status,
    vda.assigned_at,
    vda.notes
FROM vehicle_device_assignment vda
JOIN vehicles v ON vda.vehicle_id = v.id
JOIN devices d ON vda.device_id = d.id
WHERE vda.is_active = TRUE;

COMMENT ON VIEW v_active_device_assignments IS 'Vue simplifiée des assignments actifs avec détails véhicule et device';


-- Vue: Statistiques télémétries par device
CREATE OR REPLACE VIEW v_telemetry_stats_by_device AS
SELECT 
    d.device_code,
    d.mqtt_topic,
    COUNT(t.id) as telemetry_count,
    MAX(t.recorded_at) as last_telemetry,
    COUNT(DISTINCT t.vehicle_id) as vehicles_count
FROM devices d
LEFT JOIN telemetry t ON d.id = t.device_id
GROUP BY d.id, d.device_code, d.mqtt_topic;

COMMENT ON VIEW v_telemetry_stats_by_device IS 'Statistiques des télémétries reçues par device';


-- ============================================================================
-- VÉRIFICATIONS POST-INSTALLATION
-- ============================================================================

-- Vérifier la création des tables
SELECT 
    'devices' as table_name, 
    COUNT(*) as row_count 
FROM devices
UNION ALL
SELECT 
    'vehicle_device_assignment', 
    COUNT(*) 
FROM vehicle_device_assignment
UNION ALL
SELECT 
    'telemetry (avec device_id)', 
    COUNT(*) 
FROM telemetry 
WHERE device_id IS NOT NULL;

-- Afficher les assignments actifs
SELECT * FROM v_active_device_assignments;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
