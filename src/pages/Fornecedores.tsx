import type { Fornecedor, TipoFornecedor } from '../types';
import { excluirItem, salvarItem, useDB } from '../lib/store';
import { uid } from '../lib/format';
import Cadastro from '../components/Cadastro';

const TIT: Record<TipoFornecedor, string> = { aerea: 'Companhias Aéreas', locadora: 'Locadoras', seguradora: 'Seguradoras' };

export default function Fornecedores({ tipo }: { tipo: TipoFornecedor }) {
  const { fornecedores } = useDB();
  return (
    <Cadastro<Fornecedor>
      key={tipo}
      titulo={TIT[tipo]}
      subtitulo="Cadastro de fornecedores. As cotações deste tipo chegam na próxima etapa."
      itens={fornecedores.filter((f) => f.tipo === tipo)}
      colunas={[
        { rotulo: 'Nome', render: (x) => <b>{x.nome}</b> },
        { rotulo: 'Contato', render: (x) => [x.contato, x.email, x.telefone].filter(Boolean).join(' · ') },
        { rotulo: 'Site', render: (x) => x.site },
      ]}
      campos={[
        { k: 'nome', rotulo: 'Nome', largo: true },
        { k: 'contato', rotulo: 'Contato' },
        { k: 'telefone', rotulo: 'Telefone' },
        { k: 'email', rotulo: 'E-mail' },
        { k: 'site', rotulo: 'Site' },
        { k: 'obs', rotulo: 'Observações', tipo: 'area' },
      ]}
      novo={() => ({ id: uid(), tipo, nome: '', contato: '', email: '', telefone: '', site: '', obs: '' })}
      onSalvar={(x) => salvarItem('fornecedores', x)}
      onExcluir={(x) => excluirItem('fornecedores', x.id)}
    />
  );
}
