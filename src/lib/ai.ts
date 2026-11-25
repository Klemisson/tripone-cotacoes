import Anthropic from '@anthropic-ai/sdk';
import { getDB } from './store';

/**
 * Preenchimento por IA (Claude). A IA só devolve o que está escrito no material;
 * campos ausentes voltam como null e o formulário não é alterado.
 *
 * Duas formas de uso (Configurações):
 *  - Chave da API Anthropic salva neste navegador (rápido para começar);
 *  - URL de um endpoint próprio (recomendado em produção: a chave fica no servidor).
 *    O endpoint recebe { content } e devolve o JSON no formato `ExtracaoHospedagem`.
 */

export interface ExtracaoHotel {
  nome: string | null;
  estrelas: number | null;
  notaGoogle: number | null;
  numAvaliacoes: number | null;
  endereco: string | null;
  distanciaKm: number | null;
  categoria: string | null;
  detalhes: string[] | null;
  acomodacao: string | null;
  cafe: string | null;
  estacionamento: string | null;
  diaria: number | null;
  total: number | null;
  obs: string | null;
}
export interface ExtracaoHospedagem {
  cliente: string | null;
  destino: string | null;
  checkIn: string | null;
  checkOut: string | null;
  enderecoReferencia: string | null;
  hoteis: ExtracaoHotel[];
}

export interface Anexo {
  nome: string;
  mediaType: string; // image/png, image/jpeg, application/pdf ...
  base64: string;
}

const s = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const n = { anyOf: [{ type: 'number' }, { type: 'null' }] };

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cliente', 'destino', 'checkIn', 'checkOut', 'enderecoReferencia', 'hoteis'],
  properties: {
    cliente: s,
    destino: s,
    checkIn: { ...s, description: 'Data no formato AAAA-MM-DD' },
    checkOut: { ...s, description: 'Data no formato AAAA-MM-DD' },
    enderecoReferencia: s,
    hoteis: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nome', 'estrelas', 'notaGoogle', 'numAvaliacoes', 'endereco', 'distanciaKm', 'categoria', 'detalhes', 'acomodacao', 'cafe', 'estacionamento', 'diaria', 'total', 'obs'],
        properties: {
          nome: s,
          estrelas: n,
          notaGoogle: n,
          numAvaliacoes: n,
          endereco: s,
          distanciaKm: n,
          categoria: s,
          detalhes: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
          acomodacao: s,
          cafe: s,
          estacionamento: s,
          diaria: n,
          total: n,
          obs: s,
        },
      },
    },
  },
} as const;

const SISTEMA = `Você extrai dados de cotações de hospedagem para uma agência de viagens corporativas (TripOne Travel).
Regras obrigatórias:
- Use SOMENTE informações que aparecem explicitamente no material recebido. Nunca invente, estime ou complete dados com conhecimento próprio.
- Quando um campo não aparece no material, devolva null. Não deduza nota Google, estrelas, endereço ou distância se não estiverem escritos.
- Datas no formato AAAA-MM-DD. Se o ano não estiver escrito, devolva null para a data.
- Valores monetários como número (ex.: "R$ 1.234,50" -> 1234.5). "diaria" é o valor de uma diária; "total" só se o total estiver escrito.
- "cafe" e "estacionamento": use "INCLUÍDO" ou "NÃO INCLUÍDO" quando o material disser isso; outro texto curto se for diferente (ex.: "R$ 30/dia"); null se não mencionado.
- "categoria" é o nome do quarto/tarifa (ex.: "Single", "Standard", "Master"). "detalhes" são características do quarto, uma por item (ex.: "Cama casal", "1 cama King").
- "acomodacao" descreve capacidade/ocupação (ex.: "Acomoda 2", "1").
- Um item em "hoteis" para cada hotel/opção distinta, na ordem em que aparecem.`;

export async function extrairHospedagem(texto: string, anexos: Anexo[]): Promise<ExtracaoHospedagem> {
  const content: Anthropic.ContentBlockParam[] = [];
  for (const a of anexos) {
    if (a.mediaType === 'application/pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.base64 } });
    } else {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: a.mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif', data: a.base64 },
      });
    }
  }
  content.push({
    type: 'text',
    text: (texto.trim() ? `Material colado pelo usuário:\n<material>\n${texto.trim()}\n</material>\n\n` : '') +
      'Extraia os dados da cotação de hospedagem seguindo as regras.',
  });

  const { config } = getDB();
  if (config.iaProxyUrl.trim()) {
    const r = await fetch(config.iaProxyUrl.trim(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ system: SISTEMA, schema: SCHEMA, content }),
    });
    if (!r.ok) throw new Error(`Endpoint de IA respondeu ${r.status}`);
    return (await r.json()) as ExtracaoHospedagem;
  }
  if (!config.anthropicApiKey.trim()) {
    throw new Error('Configure a chave da IA em Configurações › Inteligência artificial.');
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey.trim(), dangerouslyAllowBrowser: true });
  const resp = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SISTEMA,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);

  if (resp.stop_reason === 'refusal') throw new Error('A IA recusou processar este material.');
  if (resp.stop_reason === 'max_tokens') throw new Error('Material muito longo: a resposta foi cortada. Divida em partes.');
  const txt = resp.content.find((b) => b.type === 'text');
  if (!txt || txt.type !== 'text') throw new Error('A IA não retornou dados.');
  return JSON.parse(txt.text) as ExtracaoHospedagem;
}

export function arquivoParaAnexo(f: File): Promise<Anexo> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      res({ nome: f.name, mediaType: f.type || 'application/octet-stream', base64: url.slice(url.indexOf(',') + 1) });
    };
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}
