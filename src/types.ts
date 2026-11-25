export type TipoCotacao = 'hospedagem' | 'aereo' | 'locacao' | 'seguro' | 'completa';

export interface HotelOpcao {
  id: string;
  nome: string;
  estrelas: number | null; // classificação do hotel (1-5)
  notaGoogle: number | null; // ex.: 4.4
  numAvaliacoes: number | null; // ex.: 1774
  endereco: string;
  distanciaKm: number | null;
  categoria: string; // ex.: Single, Standard
  detalhes: string; // uma linha por detalhe (ex.: "Cama casal")
  acomodacao: string; // ex.: "Acomoda 2"
  cafe: string; // INCLUÍDO / NÃO INCLUÍDO / texto livre
  estacionamento: string;
  diaria: number | null;
  quartos: number; // multiplicador do total
  obs: string;
  placeId?: string | null; // Google Places
  lat?: number | null;
  lng?: number | null;
  avaliacaoEm?: string | null; // quando nota/avaliações vieram do Google
}

export interface Cotacao {
  id: string;
  numero: number;
  tipo: TipoCotacao;
  criadaEm: string;
  atualizadaEm: string;
  clienteId: string | null;
  clienteNome: string;
  destino: string;
  checkIn: string; // yyyy-mm-dd
  checkOut: string; // yyyy-mm-dd
  periodoTexto: string; // vazio = automático
  enderecoReferencia: string;
  hoteis: HotelOpcao[];
  infoImportantes: string[];
  observacoes: string[];
}

export interface Cliente {
  id: string;
  nome: string;
  documento: string; // CNPJ/CPF
  contato: string;
  email: string;
  telefone: string;
  endereco: string;
  obs: string;
}

export interface HotelCadastro {
  id: string;
  nome: string;
  estrelas: number | null;
  notaGoogle: number | null;
  numAvaliacoes: number | null;
  endereco: string;
  cidade: string;
  telefone: string;
  email: string;
  contato: string;
  obs: string;
  atualizadoEm: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  avaliacaoEm?: string | null;
}

export type TipoFornecedor = 'aerea' | 'locadora' | 'seguradora';

export interface Fornecedor {
  id: string;
  tipo: TipoFornecedor;
  nome: string;
  contato: string;
  email: string;
  telefone: string;
  site: string;
  obs: string;
}

export interface Configuracoes {
  empresa: string;
  slogan: string;
  logoDataUrl: string | null; // null = logo padrão
  corPrimaria: string; // azul marinho
  corDestaque: string; // laranja
  corColuna: string; // bege das colunas KM/TOTAL
  corIcone: string; // fundo dos ícones
  proximoNumero: number;
  infoPadrao: string[];
  obsPadrao: string[];
  anthropicApiKey: string; // modo simples: chave no navegador
  apiUrl: string; // servidor TripOne (worker/): Google Places, Routes e IA
  apiToken: string;
}

export interface BancoDados {
  versao: 1;
  cotacoes: Cotacao[];
  clientes: Cliente[];
  hoteis: HotelCadastro[];
  fornecedores: Fornecedor[];
  config: Configuracoes;
}
