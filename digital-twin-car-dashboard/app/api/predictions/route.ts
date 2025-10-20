import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicleId');
  
  if (!vehicleId) {
    console.error("ID de véhicule manquant dans la requête");
    return NextResponse.json({ error: 'ID du véhicule requis' }, { status: 400 });
  }

  console.log(`Envoi d'une requête au backend pour le véhicule: ${vehicleId}`);
  
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/predictions/${vehicleId}`;
    
    console.log(`URL complète: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',  // Désactiver la mise en cache
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erreur du backend (${response.status}):`, errorText);
      throw new Error(`Erreur du backend: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Données reçues du backend:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur lors de la récupération des prédictions:', error);
    return NextResponse.json({ 
      error: 'Échec de la récupération des prédictions',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}