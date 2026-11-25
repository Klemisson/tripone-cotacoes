/**
 * Integrações via servidor TripOne (pasta worker/): Google Places (hotel, nota, avaliações)
 * e Google Routes (distância por estrada). As chaves ficam no servidor.
 * Sem servidor configurado, os atalhos abrem o Google Maps (gratuito).
 */
import { getDB } from './store';

export interface ResultadoHotel {
  placeId: string;
  nome: string;
  endereco: string;
  lat: number | null;
  lng: number | null;
  notaGoogle: number | null;
  numAvaliacoes: number | null;
  mapsUrl: string | null;
}

export const integracaoAtiva = () => !!getDB().config.apiUrl.trim();

export async function chamarApi<T>(rota: string, corpo: unknown): Promise<T> {
  const { apiUrl, apiToken } = getDB().config;
  if (!apiUrl.trim()) throw new Error('Configure o servidor TripOne em Configurações › Integrações.');
  let r: Response;
  try {
    r = await fetch(apiUrl.trim().replace(/\/+$/, '') + rota, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-token': apiToken.trim() },
      body: JSON.stringify(corpo),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor TripOne. Verifique a URL e a internet.');
  }
  const d = (await r.json().catch(() => ({}))) as { erro?: string };
  if (!r.ok) throw new Error(d.erro || `Servidor respondeu ${r.status}`);
  return d as T;
}

export const buscarHoteis = (texto: string) => chamarApi<ResultadoHotel[]>('/hoteis/buscar', { texto });

export interface DestinoDist { id: string; lat?: number | null; lng?: number | null; endereco?: string | null }
export const calcularDistancias = (origem: string, destinos: DestinoDist[]) =>
  chamarApi<{ id: string; km: number | null }[]>('/distancias', { origem, destinos });

export const linkMapsBusca = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export const linkMapsRota = (origem: string, destino: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}`;

/** Distância em linha reta (km) entre coordenadas. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
