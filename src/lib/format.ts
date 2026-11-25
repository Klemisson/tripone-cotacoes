export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtNum = (v: number) => brl.format(v);
export const fmtBRL = (v: number) => `R$ ${brl.format(v)}`;

/** "1.234,56" | "1234.56" | "R$ 304,00" -> number */
export function parseValor(s: string): number | null {
  if (!s) return null;
  let t = s.replace(/[^\d,.-]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function fmtData(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function noites(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = Date.parse(checkIn + 'T12:00:00');
  const b = Date.parse(checkOut + 'T12:00:00');
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

export const periodoAuto = (n: number) => (n <= 0 ? '—' : `${n} ${n === 1 ? 'DIÁRIA' : 'DIÁRIAS'}`);

export function totalHotel(diaria: number | null, n: number, quartos: number): number {
  if (diaria == null) return 0;
  return Math.round(diaria * Math.max(n, 1) * Math.max(quartos || 1, 1) * 100) / 100;
}

export const normaliza = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function fmtDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
