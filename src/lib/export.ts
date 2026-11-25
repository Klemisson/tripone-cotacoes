import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

const ESCALA = 3; // ~300 dpi numa folha A4

async function render(node: HTMLElement) {
  await document.fonts.ready;
  return toCanvas(node, { pixelRatio: ESCALA, backgroundColor: '#ffffff', cacheBust: true });
}

function baixar(url: string, nome: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
}

export async function exportarImagem(node: HTMLElement, nome: string, formato: 'png' | 'jpg') {
  const c = await render(node);
  const url = formato === 'png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.95);
  baixar(url, `${nome}.${formato}`);
}

/** PDF em largura A4. Se a cotação for mais longa que uma A4, a página é estendida (sem cortar hotéis). */
export async function exportarPDF(node: HTMLElement, nome: string) {
  const c = await render(node);
  const larguraMm = 210;
  const alturaMm = Math.max(297, (c.height / c.width) * larguraMm);
  const pdf = new jsPDF({ unit: 'mm', format: [larguraMm, alturaMm], orientation: 'portrait', compress: true });
  pdf.addImage(c.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, larguraMm, (c.height / c.width) * larguraMm);
  pdf.save(`${nome}.pdf`);
}
