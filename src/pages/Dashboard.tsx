import { Building2, FilePlus2, History, TrendingUp, Users } from 'lucide-react';
import { useDB } from '../lib/store';
import { fmtData } from '../lib/format';

export default function Dashboard() {
  const { cotacoes, hoteis, clientes } = useDB();
  const agora = new Date();
  const doMes = cotacoes.filter((c) => { const d = new Date(c.criadaEm); return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear(); }).length;
  const recentes = [...cotacoes].sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm)).slice(0, 8);
  return (
    <>
      <div className="cab">
        <div>
          <h1>Dashboard</h1>
          <p>Bem-vindo ao TripOne Travel Cotações.</p>
        </div>
        <a className="btn lar" href="#/nova"><FilePlus2 size={14} /> Nova Cotação</a>
      </div>
      <div className="stats">
        <div className="stat"><div><small>COTAÇÕES</small><b>{cotacoes.length}</b></div><TrendingUp color="#e8883c" size={20} /></div>
        <div className="stat"><div><small>HOTÉIS CADASTRADOS</small><b>{hoteis.length}</b></div><Building2 color="#1b3461" size={20} /></div>
        <div className="stat"><div><small>CLIENTES</small><b>{clientes.length}</b></div><Users color="#1b3461" size={20} /></div>
        <div className="stat"><div><small>ESTE MÊS</small><b>{doMes}</b></div><History color="#e8883c" size={20} /></div>
      </div>
      <div className="card">
        <h3 style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 600 }}>Cotações recentes</h3>
        {recentes.length === 0 ? <div className="vazio">Nenhuma cotação ainda. Clique em “Nova Cotação”.</div> : (
          <ul className="lista">
            {recentes.map((c) => (
              <li key={c.id}>
                <a href={`#/editar/${c.id}`}>
                  <div className="t1">Nº {c.numero} · {c.tipo.toUpperCase()} · {c.destino || 'Sem destino'}</div>
                  <div className="t2">{c.tipo} · {c.clienteNome || 'sem cliente'}{c.checkIn ? ` · ${fmtData(c.checkIn)} a ${fmtData(c.checkOut)}` : ''}</div>
                </a>
                <span className="dt">{new Date(c.atualizadaEm).toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
