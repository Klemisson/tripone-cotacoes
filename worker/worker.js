/**
 * TripOne Cotações · API (Cloudflare Worker) — versão para colar no editor web da Cloudflare.
 * Arquivo único, sem dependências e sem build.
 *
 * Variáveis secretas (Settings › Variables and Secrets › tipo "Secret"):
 *   GOOGLE_MAPS_API_KEY  chave do Google Cloud (Places API (New) + Routes API)
 *   ANTHROPIC_API_KEY    chave da API Anthropic (IA)
 *   APP_TOKEN            senha que o app envia (a mesma vai em Configurações › Integrações › Token)
 * Opcional (tipo "Text"):
 *   ALLOWED_ORIGINS      domínios do app separados por vírgula; vazio ou "*" libera todos
 *
 * Rotas (POST, cabeçalho x-app-token):
 *   /hoteis/buscar  { texto }
 *   /distancias     { origem, destinos: [{ id, lat?, lng?, endereco? }] }
 *   /ia/extrair     { system, schema, content }
 */

class ErroHttp extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

function cors(req, env) {
  const origem = req.headers.get('origin') || '';
  const permitidas = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = permitidas.length === 0 || permitidas.includes('*') || permitidas.includes(origem);
  return {
    'access-control-allow-origin': ok ? origem || '*' : 'null',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-app-token',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(dados, status, h) {
  return new Response(JSON.stringify(dados), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...h } });
}

/* ---------- Google Places (New): Text Search ---------- */
const CAMPOS_PLACES = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri';

async function buscarHoteis(env, texto) {
  if (!env.GOOGLE_MAPS_API_KEY) throw new ErroHttp(500, 'Secret GOOGLE_MAPS_API_KEY não configurado no Worker.');
  if (!texto || !texto.trim()) throw new ErroHttp(400, 'Informe o nome do hotel.');
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': CAMPOS_PLACES },
    body: JSON.stringify({ textQuery: texto.trim(), languageCode: 'pt-BR', regionCode: 'BR', pageSize: 5 }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroHttp(502, 'Google Places: ' + ((d.error && d.error.message) || r.status));
  return (d.places || []).map((p) => ({
    placeId: p.id,
    nome: (p.displayName && p.displayName.text) || '',
    endereco: p.formattedAddress || '',
    lat: p.location ? p.location.latitude : null,
    lng: p.location ? p.location.longitude : null,
    notaGoogle: p.rating ?? null,
    numAvaliacoes: p.userRatingCount ?? null,
    mapsUrl: p.googleMapsUri || null,
  }));
}

/* ---------- Google Routes: Compute Route Matrix (sem trânsito = faixa Essentials) ---------- */
async function distancias(env, origem, destinos) {
  if (!env.GOOGLE_MAPS_API_KEY) throw new ErroHttp(500, 'Secret GOOGLE_MAPS_API_KEY não configurado no Worker.');
  if (!origem || !origem.trim()) throw new ErroHttp(400, 'Informe o endereço de referência.');
  const validos = (destinos || []).filter((d) => (d.lat != null && d.lng != null) || (d.endereco && d.endereco.trim())).slice(0, 25);
  if (!validos.length) return [];
  const wp = (d) => (d.lat != null && d.lng != null
    ? { waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } } }
    : { waypoint: { address: d.endereco.trim() } });
  const r = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,condition' },
    body: JSON.stringify({
      origins: [{ waypoint: { address: origem.trim() } }],
      destinations: validos.map(wp),
      travelMode: 'DRIVE',
      languageCode: 'pt-BR',
      regionCode: 'BR',
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !Array.isArray(d)) throw new ErroHttp(502, 'Google Routes: ' + ((d.error && d.error.message) || r.status));
  return d.map((e) => ({
    id: validos[e.destinationIndex].id,
    km: e.condition === 'ROUTE_EXISTS' && e.distanceMeters != null ? Math.round(e.distanceMeters / 100) / 10 : null,
  }));
}

/* ---------- IA: Claude (Anthropic Messages API) ---------- */
async function extrair(env, body) {
  if (!env.ANTHROPIC_API_KEY) throw new ErroHttp(500, 'Secret ANTHROPIC_API_KEY não configurado no Worker.');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      fallbacks: 'default',
      system: body.system,
      messages: [{ role: 'user', content: body.content }],
      output_config: { format: { type: 'json_schema', schema: body.schema } },
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroHttp(502, 'IA: ' + ((d.error && d.error.message) || r.status));
  if (d.stop_reason === 'refusal') throw new ErroHttp(422, 'A IA recusou processar este material.');
  if (d.stop_reason === 'max_tokens') throw new ErroHttp(422, 'Material muito longo: divida em partes.');
  const txt = (d.content || []).find((b) => b.type === 'text');
  if (!txt) throw new ErroHttp(502, 'A IA não retornou dados.');
  return JSON.parse(txt.text);
}

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      if (req.method !== 'POST') throw new ErroHttp(405, 'TripOne API ativa. Use POST.');
      if (!env.APP_TOKEN || req.headers.get('x-app-token') !== env.APP_TOKEN) throw new ErroHttp(401, 'Token de acesso inválido.');
      const caminho = new URL(req.url).pathname.replace(/\/+$/, '');
      const body = await req.json();
      if (caminho === '/hoteis/buscar') return json(await buscarHoteis(env, String(body.texto || '')), 200, h);
      if (caminho === '/distancias') return json(await distancias(env, String(body.origem || ''), body.destinos), 200, h);
      if (caminho === '/ia/extrair') return json(await extrair(env, body), 200, h);
      throw new ErroHttp(404, 'Rota não encontrada.');
    } catch (e) {
      return json({ erro: e instanceof Error ? e.message : String(e) }, e instanceof ErroHttp ? e.status : 500, h);
    }
  },
};
