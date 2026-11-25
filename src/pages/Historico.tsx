import { useMemo, useState } from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { duplicarCotacao, excluirCotacao, useDB } from '../lib/store';
import { fmtBRL, fmtData, fmtDataHora, noites, normaliza, totalHotel } from '../lib/format';
import { ir } from '../lib/rota';

export default function Historico() {
  const { cotacoes } = useDB();
  const [q, setQ] = useState('');
  const lista = useMemo(() => {
    const t = normaliza(q);
    return [...cotacoes]
      .sort((a, b) => b.numero - a.numero)
      .filter((c) => !t || normaliza(`${c.numero} ${c.clienteNome} ${c.destino} ${c.hoteis.map((h) => h.nome).join(' ')}`).includes(t));
  }, [cotacoes, q]);

  return (
    <>
      <div className="cab">
        <div>
          <h1>Histórico</h1>
          <p>Todas as cotações salvas. Abra para editar, duplique para reaproveitar.</p>
        </div>
      </div>
      <div className="card">
        <input className="inp busca" placeholder="Buscar por nº, cliente, destino ou hotel…" value={q} onChange={(e) => setQ(e.target.value)} />
        <table className="tabela" style={{ marginTop: 10 }}>
          <thead>
            <tr><th>Nº</th><th>Tipo</th><th>Cliente</th><th>Destino</th><th>Período</th><th>Hotéis</th><th>Menor total</th><th>Atualizada</th><th /></tr>
          </thead>
          <tbody>
            {lista.map((c) => {
              const n = noites(c.checkIn, c.checkOut);
              const tots = c.hoteis.map((h) => totalHotel(h.diaria, n, h.quartos)).filter((v) => v > 0);
              return (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => ir('editar/' + c.id)}>
                  <td><b>{c.numero}</b></td>
                  <td style={{ textTransform: 'capitalize' }}>{c.tipo}</td>
                  <td>{c.clienteNome || '—'}</td>
                  <td>{c.destino || '—'}</td>
                  <td>{c.checkIn ? `${fmtData(c.checkIn)} – ${fmtData(c.checkOut)}` : '—'}</td>
                  <td>{c.hoteis.length}</td>
                  <td>{tots.length ? fmtBRL(Math.min(...tots)) : '—'}</td>
                  <td style={{ fontSize: 11 }}>{fmtDataHora(c.atualizadaEm)}</td>
                  <td className="acoes-l" onClick={(e) => e.stopPropagation()}>
                    <button className="btn ico" title="Editar" onClick={() => ir('editar/' + c.id)}><Pencil size={14} /></button>
                    <button className="btn ico" title="Duplicar" onClick={() => { const d = duplicarCotacao(c.id); if (d) ir('editar/' + d.id); }}><Copy size={14} /></button>
                    <button className="btn ico perigo" title="Excluir" onClick={() => confirm(`Excluir a cotação nº ${c.numero}?`) && excluirCotacao(c.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && <div className="vazio">Nenhuma cotação encontrada.</div>}
      </div>
    </>
  );
}
