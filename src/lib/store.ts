import { useSyncExternalStore } from 'react';
import type { BancoDados, Cliente, Configuracoes, Cotacao, Fornecedor, HotelCadastro, HotelOpcao } from '../types';
import { normaliza, uid } from './format';

/**
 * Persistência local (localStorage). Toda a leitura/escrita passa por este módulo,
 * então trocar por Supabase/API no futuro é só reimplementar `carregar`/`gravar`.
 */
const CHAVE = 'tripone-cotacoes:v1';

export const configPadrao: Configuracoes = {
  empresa: 'TripOne Travel',
  slogan: 'SUA VIAGEM, NOSSA MISSÃO.',
  logoDataUrl: null,
  corPrimaria: '#1b3461',
  corDestaque: '#e8883c',
  corColuna: '#f4e8d3',
  corIcone: '#e1e6dc',
  proximoNumero: 1362,
  infoPadrao: [
    'Tarifas em reais (R$).',
    'Valores válidos para o período informado.',
    'Sujeito à disponibilidade no momento da reserva.',
    'Não inclui taxas de turismo (se houver).',
  ],
  obsPadrao: [
    'Nada reservado, apenas cotado.',
    'Valores sujeitos à disponibilidade e alterações sem aviso prévio no momento da confirmação da reserva.',
  ],
  anthropicApiKey: '',
  iaProxyUrl: '',
};

function vazio(): BancoDados {
  return { versao: 1, cotacoes: [], clientes: [], hoteis: [], fornecedores: [], config: { ...configPadrao } };
}

function carregar(): BancoDados {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return vazio();
    const db = JSON.parse(raw) as BancoDados;
    return { ...vazio(), ...db, config: { ...configPadrao, ...db.config } };
  } catch {
    return vazio();
  }
}

let db: BancoDados = carregar();
// Build de demonstração (VITE_DEMO=1): carrega a cotação 1359 de exemplo quando não há dados.
if (import.meta.env.VITE_DEMO && db.cotacoes.length === 0) db = { ...db, cotacoes: [demo()] };

function demo(): Cotacao {
  const h = (nome: string, nota: number, n: number, endereco: string, cat: string, det: string, acom: string, diaria: number | null, obs = ''): HotelOpcao => ({
    id: uid(), nome, estrelas: 3, notaGoogle: nota, numAvaliacoes: n, endereco, distanciaKm: null, categoria: cat, detalhes: det,
    acomodacao: acom, cafe: 'INCLUÍDO', estacionamento: 'INCLUÍDO', diaria, quartos: 1, obs,
  });
  return {
    ...novaCotacaoRascunho(), id: 'exemplo-1359', numero: 1359, destino: 'CACHOEIRO DE ITAPEMIRIM, ES', checkIn: '2026-12-07', checkOut: '2026-12-08',
    hoteis: [
      h('EASY HOTEL CACHOEIRO DE ITAPEMIRIM BY ATLANTICA', 4.4, 1774, 'Avenida Francisco Lacerda de Aguiar, 277 - Doutor Gilberto Machado CACHOEIRO DE ITAPEMIRIM Doutor Gilberto Machado, ES BRASIL', 'single', 'standard casal', '1', 427),
      h('Hotel Rinkão', 4.1, 1197, 'Av. Francisco Lacerda de Aguiar, 203 - Amarelo, Cachoeiro de Itapemirim - ES, 29304-393, Brazil', 'Single', 'Cama Casal', 'Acomoda 2', 308),
      h('Hotel Diamantte em cachoeiro', 4.0, 39, 'Rodovia Engenheiro Fabiano Vivacqua, 3420 Ao lado do Hotel Rinkão - Alto Amarelo, Cachoeiro de Itapemirim - ES, 29304-393, Brazil', 'Single', 'Cama Casal', 'Acomoda 2', 287.5, 'S/ ELEVADOR'),
      h('Hotel Rio Grande Cachoeira do Itape', 4.5, 1965, 'Av. Beira-Rio, 463 - Guandú, Cachoeiro de Itapemirim - ES, 29300-765, Brazil', 'Single', 'Solteiro', 'Acomoda 2', null, 'INDISPONIVEL'),
    ],
  };
}
const ouvintes = new Set<() => void>();
let erroGravacao: string | null = null;

function gravar(novo: BancoDados) {
  db = novo;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(db));
    erroGravacao = null;
  } catch (e) {
    erroGravacao = 'Não foi possível salvar no navegador (armazenamento cheio?).';
    console.error(e);
  }
  ouvintes.forEach((f) => f());
}

window.addEventListener('storage', (e) => {
  if (e.key === CHAVE) {
    db = carregar();
    ouvintes.forEach((f) => f());
  }
});

export function useDB(): BancoDados {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => db,
  );
}
export const getDB = () => db;
export const getErroGravacao = () => erroGravacao;

/* ---------- Cotações ---------- */
export function novaCotacaoRascunho(): Cotacao {
  const agora = new Date().toISOString();
  return {
    id: uid(),
    numero: db.config.proximoNumero,
    tipo: 'hospedagem',
    criadaEm: agora,
    atualizadaEm: agora,
    clienteId: null,
    clienteNome: '',
    destino: '',
    checkIn: '',
    checkOut: '',
    periodoTexto: '',
    enderecoReferencia: '',
    hoteis: [],
    infoImportantes: [...db.config.infoPadrao],
    observacoes: [...db.config.obsPadrao],
  };
}

/** Salva (insere ou atualiza). Na primeira gravação reserva o número definitivo. */
export function salvarCotacao(c: Cotacao): Cotacao {
  const existe = db.cotacoes.some((x) => x.id === c.id);
  let cot = { ...c, atualizadaEm: new Date().toISOString() };
  let config = db.config;
  if (!existe) {
    const usados = new Set(db.cotacoes.map((x) => x.numero));
    let n = Math.max(cot.numero, config.proximoNumero);
    while (usados.has(n)) n++;
    cot = { ...cot, numero: n };
    config = { ...config, proximoNumero: n + 1 };
  }
  const cotacoes = existe ? db.cotacoes.map((x) => (x.id === c.id ? cot : x)) : [cot, ...db.cotacoes];
  gravar({ ...db, cotacoes, config, hoteis: sincronizarHoteis(db.hoteis, cot.hoteis) });
  return cot;
}

export function excluirCotacao(id: string) {
  gravar({ ...db, cotacoes: db.cotacoes.filter((c) => c.id !== id) });
}

export function duplicarCotacao(id: string): Cotacao | null {
  const orig = db.cotacoes.find((c) => c.id === id);
  if (!orig) return null;
  const copia: Cotacao = {
    ...structuredClone(orig),
    id: uid(),
    numero: db.config.proximoNumero,
    criadaEm: new Date().toISOString(),
    hoteis: orig.hoteis.map((h) => ({ ...h, id: uid() })),
  };
  return salvarCotacao(copia);
}

/** Cada hotel usado numa cotação vira/atualiza um registro do cadastro de hotéis. */
function sincronizarHoteis(cad: HotelCadastro[], usados: HotelOpcao[]): HotelCadastro[] {
  let out = cad;
  for (const h of usados) {
    if (!h.nome.trim()) continue;
    const k = normaliza(h.nome);
    const i = out.findIndex((x) => normaliza(x.nome) === k);
    const base: HotelCadastro =
      i >= 0
        ? out[i]
        : { id: uid(), nome: h.nome.trim(), estrelas: null, notaGoogle: null, numAvaliacoes: null, endereco: '', cidade: '', telefone: '', email: '', contato: '', obs: '', atualizadoEm: '' };
    const novo: HotelCadastro = {
      ...base,
      estrelas: h.estrelas ?? base.estrelas,
      notaGoogle: h.notaGoogle ?? base.notaGoogle,
      numAvaliacoes: h.numAvaliacoes ?? base.numAvaliacoes,
      endereco: h.endereco.trim() || base.endereco,
    };
    const mudou = i < 0 || JSON.stringify(novo) !== JSON.stringify(base);
    if (!mudou) continue;
    novo.atualizadoEm = new Date().toISOString();
    out = i >= 0 ? out.map((x, j) => (j === i ? novo : x)) : [...out, novo];
  }
  return out;
}

/* ---------- Cadastros genéricos ---------- */
type Colecao = 'clientes' | 'hoteis' | 'fornecedores';
type ItemDe<K extends Colecao> = K extends 'clientes' ? Cliente : K extends 'hoteis' ? HotelCadastro : Fornecedor;

export function salvarItem<K extends Colecao>(col: K, item: ItemDe<K>) {
  const lista = db[col] as ItemDe<K>[];
  const existe = lista.some((x) => x.id === item.id);
  const nova = existe ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];
  gravar({ ...db, [col]: nova });
}
export function excluirItem(col: Colecao, id: string) {
  gravar({ ...db, [col]: (db[col] as { id: string }[]).filter((x) => x.id !== id) });
}

export function salvarConfig(c: Partial<Configuracoes>) {
  gravar({ ...db, config: { ...db.config, ...c } });
}

/* ---------- Backup ---------- */
export function exportarBackup(): string {
  return JSON.stringify(db, null, 2);
}
export function importarBackup(json: string) {
  const d = JSON.parse(json) as BancoDados;
  if (!d || !Array.isArray(d.cotacoes)) throw new Error('Arquivo de backup inválido.');
  gravar({ ...vazio(), ...d, config: { ...configPadrao, ...d.config } });
}
