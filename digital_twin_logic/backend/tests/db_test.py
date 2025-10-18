import os
from supabase import create_client, Client
from dotenv import load_dotenv

def test_db_connection():
    # Charger les variables d'environnement
    load_dotenv()
    
    # Récupérer les credentials Supabase
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    try:
        # Créer le client Supabase
        # Établir la connexion
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Test de la connexion en faisant une requête simple
        response = supabase.table('vehicles').select("*").execute()
        
        print("Connexion à la base de données réussie!")
        print(f"Nombre de véhicules : {len(response.data)}")
        
    except Exception as e:
        print(f"Erreur lors de la connexion à la base de données : {str(e)}")
        raise e
        
        # Créer un curseur
        cur = conn.cursor()
        
        # Exécuter une requête de test
        cur.execute('SELECT version();')
        
        # Récupérer le résultat
        version = cur.fetchone()
        print("Connexion à la base de données réussie!")
        print(f"Version PostgreSQL : {version[0]}")
        
        # Test des tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cur.fetchall()
        print("\nTables disponibles:")
        for table in tables:
            print(f"- {table[0]}")
        
    except Exception as e:
        print(f"Erreur lors de la connexion à la base de données : {e}")
    finally:
        # Fermer la connexion
        if 'conn' in locals():
            conn.close()
            print("\nConnexion fermée.")

if __name__ == "__main__":
    test_db_connection()