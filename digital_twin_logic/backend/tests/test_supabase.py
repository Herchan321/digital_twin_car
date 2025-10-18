import pytest
from app.database import get_supabase

def test_supabase_connection():
    """Test the Supabase connection"""
    try:
        # Get Supabase client
        supabase = get_supabase()
        
        # Try to fetch data from a table (adjust table name if needed)
        response = supabase.table('vehicles').select("*").execute()
        
        # If we get here without exception, connection is working
        assert True
        
    except Exception as e:
        pytest.fail(f"Failed to connect to Supabase: {str(e)}")