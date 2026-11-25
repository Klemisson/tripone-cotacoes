/**
 * API da TripOne Cotações (Cloudflare Worker).
 * Guarda as chaves do Google e da Anthropic no servidor; o navegador nunca as vê.
 *
 *   POST /hoteis/buscar   { texto }                       -> Google Places (New) Text Search
 *   POST /distancias      { origem, destinos: [{id, lat?, lng?, endereco?}] } -> Google Routes (Route Matrix)
 *   POST /ia/extrair      { system, schema, content }     -> Claude (Anthropic)
 *
 * Todas exigem o cabeçalho  x-app-token: <APP_TOKEN>.
 */
import Anthropic from '@anthropic-ai/sdk';

export interface Env {
  GOOGLE_MAPS_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  APP_TOKEN: string;
  ALLOWED_ORIGINS: string;
}

class ErroHttp extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

function cors(req: Request, env: Env): Record<string, string> {
  const origem = req.headers.get('origin') ?? '';
  const permitidas = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());
  const ok = permitidas.includes('*') || permitidas.includes(origem);
  return {
    'access-control-allow-origin': ok ? origem || '*' : 'null',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-app-token',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

const json = (dados: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(dados), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...h } });

/* ---------- Google Places (New): Text Search ---------- */
// rating e userRatingCount ficam na faixa "Enterprise" do Text Search (1.000 grátis/mês).
const CAMPOS_PLACES = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri';

async function buscarHoteis(env: Env, texto: string) {
  if (!texto?.trim()) throw new ErroHttp(400, 'Informe o nome do hotel.');
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': CAMPOS_PLACES,
    },
    body: JSON.stringify({ textQuery: texto.trim(), languageCode: 'pt-BR', regionCode: 'BR', pageSize: 5 }),
  });
  const d = (await r.json()) as {
    places?: {
      id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number };
      rating?: number; userRatingCount?: number; googleMapsUri?: string;
    }[];
    error?: { message: string };
  };
  if (!r.ok) throw new ErroHttp(502, `Google Places: ${d.error?.message ?? r.status}`);
  return (d.places ?? []).map((p) => ({
    placeId: p.id,
    nome: p.displayName?.text ?? '',
    endereco: p.formattedAddress ?? '',
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    notaGoogle: p.rating ?? null,
    numAvaliacoes: p.userRatingCount ?? null,
    mapsUrl: p.googleMapsUri ?? null,
  }));
}

/* ---------- Google Routes: Compute Route Matrix (Essentials, sem trânsito) ---------- */
interface Destino { id: string; lat?: number | null; lng?: number | null; endereco?: string | null }

async function distancias(env: Env, origem: string, destinos: Destino[]) {
  if (!origem?.trim()) throw new ErroHttp(400, 'Informe o endereço de referência.');
  const validos = (destinos ?? []).filter((d) => (d.lat != null && d.lng != null) || d.endereco?.trim()).slice(0, 25);
  if (!validos.length) return [];
  const wp = (d: Destino) =>
    d.lat != null && d.lng != null
      ? { waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } } }
      : { waypoint: { address: d.endereco!.trim() } };
  const r = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,condition',
    },
    body: JSON.stringify({
      origins: [{ waypoint: { address: origem.trim() } }],
      destinations: validos.map(wp),
      travelMode: 'DRIVE',
      languageCode: 'pt-BR',
      regionCode: 'BR',
    }),
  });
  const d = (await r.json()) as { destinationIndex: number; distanceMeters?: number; condition?: string }[] | { error?: { message: string } };
  if (!r.ok || !Array.isArray(d)) throw new ErroHttp(502, `Google Routes: ${(d as { error?: { message: string } }).error?.message ?? r.status}`);
  return d.map((e) => ({
    id: validos[e.destinationIndex].id,
    km: e.condition === 'ROUTE_EXISTS' && e.distanceMeters != null ? Math.round(e.distanceMeters / 100) / 10 : null,
  }));
}

/* ---------- IA: Claude ---------- */
async function extrair(env: Env, body: { system: string; schema: object; content: Anthropic.ContentBlockParam[] }) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const resp = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: body.system,
    messages: [{ role: 'user', content: body.content }],
    output_config: { format: { type: 'json_schema', schema: body.schema } },
  } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);
  if (resp.stop_reason === 'refusal') throw new ErroHttp(422, 'A IA recusou processar este material.');
  if (resp.stop_reason === 'max_tokens') throw new ErroHttp(422, 'Material muito longo: divida em partes.');
  const txt = resp.content.find((b) => b.type === 'text');
  if (!txt || txt.type !== 'text') throw new ErroHttp(502, 'A IA não retornou dados.');
  return JSON.parse(txt.text);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      if (req.method !== 'POST') throw new ErroHttp(405, 'Use POST.');
      if (!env.APP_TOKEN || req.headers.get('x-app-token') !== env.APP_TOKEN) throw new ErroHttp(401, 'Token de acesso inválido.');
      const caminho = new URL(req.url).pathname.replace(/\/+$/, '');
      const body = (await req.json()) as Record<string, unknown>;
      switch (caminho) {
        case '/hoteis/buscar':
          return json(await buscarHoteis(env, String(body.texto ?? '')), 200, h);
        case '/distancias':
          return json(await distancias(env, String(body.origem ?? ''), body.destinos as Destino[]), 200, h);
        case '/ia/extrair':
          return json(await extrair(env, body as never), 200, h);
        default:
          throw new ErroHttp(404, 'Rota não encontrada.');
      }
    } catch (e) {
      const status = e instanceof ErroHttp ? e.status : e instanceof Anthropic.APIError ? 502 : 500;
      return json({ erro: e instanceof Error ? e.message : String(e) }, status, h);
    }
  },
};
