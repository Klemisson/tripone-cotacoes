import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { normaliza } from '../lib/format';

export interface CampoDef<T> {
  k: keyof T & string;
  rotulo: string;
  tipo?: 'texto' | 'area' | 'numero' | 'estrelas';
  largo?: boolean;
}

interface Props<T extends { id: string; nome: string }> {
  titulo: string;
  subtitulo: string;
  itens: T[];
  colunas: { rotulo: string; render: (x: T) => ReactNode }[];
  campos: CampoDef<T>[];
  novo: () => T;
  onSalvar: (x: T) => void;
  onExcluir: (x: T) => void;
  extraAcoes?: (x: T) => ReactNode;
}

export default function Cadastro<T extends { id: string; nome: string }>(p: Props<T>) {
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<T | null>(null);
  const filtrados = useMemo(() => {
    const t = normaliza(q);
    return [...p.itens]
      .filter((x) => !t || normaliza(Object.values(x).filter((v) => typeof v === 'string').join(' ')).includes(t))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [p.itens, q]);

  const setCampo = (k: string, v: unknown) => setEdit((e) => (e ? ({ ...e, [k]: v } as T) : e));

  return (
    <>
      <div className="cab">
        <div>
          <h1>{p.titulo}</h1>
          <p>{p.subtitulo}</p>
        </div>
        <button className="btn lar" onClick={() => setEdit(p.novo())}><Plus size={14} /> Novo</button>
      </div>
      <div className="card">
        <input className="inp busca" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <table className="tabela" style={{ marginTop: 10 }}>
          <thead>
            <tr>{p.colunas.map((c) => <th key={c.rotulo}>{c.rotulo}</th>)}<th /></tr>
          </thead>
          <tbody>
            {filtrados.map((x) => (
              <tr key={x.id}>
                {p.colunas.map((c) => <td key={c.rotulo}>{c.render(x)}</td>)}
                <td className="acoes-l">
                  {p.extraAcoes?.(x)}
                  <button className="btn ico" title="Editar" onClick={() => setEdit({ ...x })}><Pencil size={14} /></button>
                  <button className="btn ico perigo" title="Excluir" onClick={() => confirm(`Excluir "${x.nome}"?`) && p.onExcluir(x)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && <div className="vazio">Nenhum registro{q ? ' para esta busca' : ''}.</div>}
      </div>

      {edit && (
        <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && setEdit(null)}>
          <div className="modal">
            <h2>{p.itens.some((x) => x.id === edit.id) ? 'Editar' : 'Novo'} registro</h2>
            <div className="g2">
              {p.campos.map((c) => {
                const v = edit[c.k] as unknown;
                return (
                  <label key={c.k} className="campo" style={c.largo || c.tipo === 'area' ? { gridColumn: '1 / -1' } : undefined}>
                    <span>{c.rotulo}</span>
                    {c.tipo === 'area' ? (
                      <textarea className="inp" rows={3} value={(v as string) ?? ''} onChange={(e) => setCampo(c.k, e.target.value)} />
                    ) : c.tipo === 'estrelas' ? (
                      <select className="inp" value={(v as number | null) ?? ''} onChange={(e) => setCampo(c.k, e.target.value ? Number(e.target.value) : null)}>
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                      </select>
                    ) : c.tipo === 'numero' ? (
                      <input className="inp" inputMode="decimal" value={v == null ? '' : String(v).replace('.', ',')}
                        onChange={(e) => { const t = e.target.value.replace(/\./g, '').replace(',', '.'); setCampo(c.k, t === '' ? null : Number.isFinite(Number(t)) ? Number(t) : v); }} />
                    ) : (
                      <input className="inp" value={(v as string) ?? ''} onChange={(e) => setCampo(c.k, e.target.value)} />
                    )}
                  </label>
                );
              })}
            </div>
            <div className="rodape">
              <button className="btn" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn navy" disabled={!edit.nome.trim()} onClick={() => { p.onSalvar({ ...edit, nome: edit.nome.trim() }); setEdit(null); }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
