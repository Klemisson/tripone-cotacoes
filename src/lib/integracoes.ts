/**
 * Integrações de hotel / avaliação / distância.
 * Nenhuma API paga está ligada ainda: aguardando aprovação dos custos.
 * Enquanto isso, os atalhos abaixo abrem o Google Maps (gratuito, sem chave).
 * Quando aprovado, basta implementar `ProvedorHoteis` (ex.: Google Places + Routes
 * chamados por um endpoint próprio que guarda a chave).
 */
export interface ResultadoHotel {
  nome: string;
  endereco: string;
  notaGoogle: number | null;
  numAvaliacoes: number | null;
  lat: number | null;
  lng: number | null;
}
export interface ProvedorHoteis {
  buscarHotel(nome: string, cidade: string): Promise<ResultadoHotel[]>;
  distanciaKm(origem: string, destino: string): Promise<number | null>;
}

export const linkMapsBusca = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export const linkMapsRota = (origem: string, destino: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}`;

/** Distância em linha reta (km) entre coordenadas; útil quando houver geocodificação. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
