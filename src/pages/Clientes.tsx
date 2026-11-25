import type { Cliente } from '../types';
import { excluirItem, salvarItem, useDB } from '../lib/store';
import { uid } from '../lib/format';
import Cadastro from '../components/Cadastro';

export default function Clientes() {
  const { clientes, cotacoes } = useDB();
  return (
    <Cadastro<Cliente>
      titulo="Clientes"
      subtitulo="Empresas e viajantes atendidos. O endereço vira o endereço de referência da cotação."
      itens={clientes}
      colunas={[
        { rotulo: 'Nome', render: (x) => <b>{x.nome}</b> },
        { rotulo: 'CNPJ/CPF', render: (x) => x.documento },
        { rotulo: 'Contato', render: (x) => [x.contato, x.email, x.telefone].filter(Boolean).join(' · ') },
        { rotulo: 'Cotações', render: (x) => cotacoes.filter((c) => c.clienteId === x.id).length },
      ]}
      campos={[
        { k: 'nome', rotulo: 'Nome / Razão social', largo: true },
        { k: 'documento', rotulo: 'CNPJ / CPF' },
        { k: 'contato', rotulo: 'Pessoa de contato' },
        { k: 'email', rotulo: 'E-mail' },
        { k: 'telefone', rotulo: 'Telefone' },
        { k: 'endereco', rotulo: 'Endereço (referência para distância)', largo: true },
        { k: 'obs', rotulo: 'Observações', tipo: 'area' },
      ]}
      novo={() => ({ id: uid(), nome: '', documento: '', contato: '', email: '', telefone: '', endereco: '', obs: '' })}
      onSalvar={(x) => salvarItem('clientes', x)}
      onExcluir={(x) => excluirItem('clientes', x.id)}
    />
  );
}
