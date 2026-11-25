import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { fmtNum, parseValor } from '../lib/format';

export function Campo({ rotulo, children, className }: { rotulo: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={'campo ' + (className ?? '')}>
      <span>{rotulo}</span>
      {children}
    </label>
  );
}

/** Campo numérico em formato brasileiro (aceita "1.234,56"). */
export function NumInput({
  valor, onChange, decimais = 2, placeholder,
}: { valor: number | null; onChange: (v: number | null) => void; decimais?: number; placeholder?: string }) {
  const fmt = (v: number | null) =>
    v == null ? '' : decimais === 0 ? String(v) : decimais === 2 ? fmtNum(v) : v.toLocaleString('pt-BR', { maximumFractionDigits: decimais });
  const [txt, setTxt] = useState(fmt(valor));
  const [foco, setFoco] = useState(false);
  useEffect(() => {
    if (!foco) setTxt(fmt(valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, foco]);
  return (
    <input
      className="inp"
      inputMode="decimal"
      value={txt}
      placeholder={placeholder}
      onFocus={() => setFoco(true)}
      onBlur={() => setFoco(false)}
      onChange={(e) => {
        setTxt(e.target.value);
        const v = parseValor(e.target.value);
        onChange(v == null ? null : decimais === 0 ? Math.round(v) : v);
      }}
    />
  );
}

/** Lista editável como texto: uma linha por item. */
export function LinhasInput({ valor, onChange, linhas = 3, placeholder }: { valor: string[]; onChange: (v: string[]) => void; linhas?: number; placeholder?: string }) {
  return (
    <textarea
      className="inp"
      rows={linhas}
      placeholder={placeholder}
      value={valor.join('\n')}
      onChange={(e) => onChange(e.target.value.split('\n'))}
    />
  );
}
