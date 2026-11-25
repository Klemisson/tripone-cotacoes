import { MapPin } from 'lucide-react';
import type { HotelCadastro } from '../types';
import { excluirItem, salvarItem, useDB } from '../lib/store';
import { uid } from '../lib/format';
import { linkMapsBusca } from '../lib/integracoes';
import Cadastro from '../components/Cadastro';

export default function Hoteis() {
  const { hoteis } = useDB();
  return (
    <Cadastro<HotelCadastro>
      titulo="Hotéis"
      subtitulo="Cadastro de fornecedores de hospedagem. Hotéis usados nas cotações entram aqui automaticamente."
      itens={hoteis}
      colunas={[
        { rotulo: 'Hotel', render: (x) => <><b>{x.nome}</b>{x.estrelas ? <span style={{ marginLeft: 6 }}>{'★'.repeat(x.estrelas)}</span> : null}</> },
        { rotulo: 'Google', render: (x) => (x.notaGoogle != null ? `${x.notaGoogle.toFixed(1)} (${x.numAvaliacoes ?? '—'})` : '—') },
        { rotulo: 'Endereço', render: (x) => <span style={{ fontSize: 11.5 }}>{x.endereco}</span> },
        { rotulo: 'Contato', render: (x) => [x.contato, x.telefone, x.email].filter(Boolean).join(' · ') },
      ]}
      campos={[
        { k: 'nome', rotulo: 'Nome do hotel', largo: true },
        { k: 'estrelas', rotulo: 'Estrelas', tipo: 'estrelas' },
        { k: 'cidade', rotulo: 'Cidade/UF' },
        { k: 'notaGoogle', rotulo: 'Nota Google', tipo: 'numero' },
        { k: 'numAvaliacoes', rotulo: 'Nº de avaliações', tipo: 'numero' },
        { k: 'endereco', rotulo: 'Endereço', largo: true },
        { k: 'contato', rotulo: 'Contato comercial' },
        { k: 'telefone', rotulo: 'Telefone' },
        { k: 'email', rotulo: 'E-mail', largo: true },
        { k: 'obs', rotulo: 'Observações (acordos, tarifas corporativas…)', tipo: 'area' },
      ]}
      novo={() => ({ id: uid(), nome: '', estrelas: null, notaGoogle: null, numAvaliacoes: null, endereco: '', cidade: '', telefone: '', email: '', contato: '', obs: '', atualizadoEm: '' })}
      onSalvar={(x) => salvarItem('hoteis', { ...x, atualizadoEm: new Date().toISOString() })}
      onExcluir={(x) => excluirItem('hoteis', x.id)}
      extraAcoes={(x) => (
        <a className="btn ico" title="Abrir no Google Maps" href={linkMapsBusca(`${x.nome} ${x.endereco || x.cidade}`)} target="_blank" rel="noreferrer"><MapPin size={14} /></a>
      )}
    />
  );
}
