import { BarChart3, Building2, FilePlus2, History, Plane, Settings, ShieldCheck, CarFront, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRota } from './lib/rota';
import { useDB } from './lib/store';
import logoPadrao from './assets/logo-tripone.png';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Historico from './pages/Historico';
import Clientes from './pages/Clientes';
import Hoteis from './pages/Hoteis';
import Fornecedores from './pages/Fornecedores';
import Configuracoes from './pages/Configuracoes';

const MENU: { id: string; rotulo: string; icone: ReactNode }[] = [
  { id: 'dashboard', rotulo: 'Dashboard', icone: <BarChart3 size={15} /> },
  { id: 'nova', rotulo: 'Nova Cotação', icone: <FilePlus2 size={15} /> },
  { id: 'clientes', rotulo: 'Clientes', icone: <Users size={15} /> },
  { id: 'hoteis', rotulo: 'Hotéis', icone: <Building2 size={15} /> },
  { id: 'aereas', rotulo: 'Companhias Aéreas', icone: <Plane size={15} /> },
  { id: 'locadoras', rotulo: 'Locadoras', icone: <CarFront size={15} /> },
  { id: 'seguradoras', rotulo: 'Seguradoras', icone: <ShieldCheck size={15} /> },
  { id: 'historico', rotulo: 'Histórico', icone: <History size={15} /> },
  { id: 'config', rotulo: 'Configurações', icone: <Settings size={15} /> },
];

export default function App() {
  const [pag, arg] = useRota();
  const { config } = useDB();
  const ativo = pag === 'editar' ? 'nova' : pag;

  let conteudo: ReactNode;
  switch (pag) {
    case 'nova': conteudo = <Editor key="nova" />; break;
    case 'editar': conteudo = <Editor key={arg} id={arg} />; break;
    case 'historico': conteudo = <Historico />; break;
    case 'clientes': conteudo = <Clientes />; break;
    case 'hoteis': conteudo = <Hoteis />; break;
    case 'aereas': conteudo = <Fornecedores tipo="aerea" />; break;
    case 'locadoras': conteudo = <Fornecedores tipo="locadora" />; break;
    case 'seguradoras': conteudo = <Fornecedores tipo="seguradora" />; break;
    case 'config': conteudo = <Configuracoes />; break;
    default: conteudo = <Dashboard />;
  }

  return (
    <div className="app">
      <aside className="side">
        <div className="side-logo">
          <span className="caixa"><img src={config.logoDataUrl || logoPadrao} alt={config.empresa} /></span>
          <small>COTAÇÕES CORPORATIVAS</small>
        </div>
        <nav className="side-menu">
          <div className="t">MENU</div>
          {MENU.map((m) => (
            <a key={m.id} href={`#/${m.id}`} className={ativo === m.id ? 'on' : ''}>
              {m.icone}
              {m.rotulo}
            </a>
          ))}
        </nav>
        <div className="side-rod">{config.slogan}</div>
      </aside>
      <main className="main">{conteudo}</main>
    </div>
  );
}
