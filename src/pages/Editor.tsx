import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, FileDown, FileText, Image as ImageIcon, Loader2, Plus, Save, Sparkles, Type, X, UserPlus } from 'lucide-react';
import type { Cotacao, HotelOpcao, TipoCotacao } from '../types';
import { getDB, novaCotacaoRascunho, salvarCotacao, salvarItem, useDB, getErroGravacao } from '../lib/store';
import { fmtDataHora, noites, normaliza, periodoAuto, uid } from '../lib/format';
import { arquivoParaAnexo, extrairHospedagem } from '../lib/ai';
import type { Anexo, ExtracaoHospedagem } from '../lib/ai';
import { exportarImagem, exportarPDF } from '../lib/export';
import { TemplateHospedagem } from '../components/Template';
import HotelForm from '../components/HotelForm';
import { Campo, LinhasInput } from '../components/Campos';

const TIPOS: { id: TipoCotacao; rotulo: string }[] = [
  { id: 'hospedagem', rotulo: 'Hospedagem' },
  { id: 'aereo', rotulo: 'Aéreo' },
  { id: 'locacao', rotulo: 'Locação' },
  { id: 'seguro', rotulo: 'Seguro' },
  { id: 'completa', rotulo: 'Completa' },
];

export const hotelVazio = (): HotelOpcao => ({
  id: uid(), nome: '', estrelas: null, notaGoogle: null, numAvaliacoes: null, endereco: '', distanciaKm: null,
  categoria: '', detalhes: '', acomodacao: '', cafe: '', estacionamento: '', diaria: null, quartos: 1, obs: '',
});

const temConteudo = (c: Cotacao) => !!(c.clienteNome || c.destino || c.checkIn || c.checkOut || c.hoteis.length);

/** Aplica o resultado da IA: só preenche o que veio; hotéis com o mesmo nome são atualizados. */
function aplicarExtracao(c: Cotacao, x: ExtracaoHospedagem): { cot: Cotacao; resumo: string } {
  let campos = 0;
  const cot = { ...c, hoteis: [...c.hoteis] };
  const put = <K extends 'clienteNome' | 'destino' | 'checkIn' | 'checkOut' | 'enderecoReferencia'>(k: K, v: string | null) => {
    if (v && v.trim()) { cot[k] = v.trim(); campos++; }
  };
  put('clienteNome', x.cliente);
  put('destino', x.destino);
  if (x.checkIn && /^\d{4}-\d{2}-\d{2}$/.test(x.checkIn)) put('checkIn', x.checkIn);
  if (x.checkOut && /^\d{4}-\d{2}-\d{2}$/.test(x.checkOut)) put('checkOut', x.checkOut);
  put('enderecoReferencia', x.enderecoReferencia);
  if (x.cliente) {
    const cli = getDB().clientes.find((k) => normaliza(k.nome) === normaliza(x.cliente!));
    if (cli) cot.clienteId = cli.id;
  }

  let novos = 0, atualizados = 0;
  const n = noites(cot.checkIn, cot.checkOut);
  for (const eh of x.hoteis ?? []) {
    const idx = eh.nome ? cot.hoteis.findIndex((h) => h.nome && normaliza(h.nome) === normaliza(eh.nome!)) : -1;
    const base = idx >= 0 ? cot.hoteis[idx] : hotelVazio();
    let diaria = eh.diaria;
    // Se só o total veio escrito, a diária é derivada dele (cálculo, não invenção).
    if (diaria == null && eh.total != null && n > 0) diaria = Math.round((eh.total / n) * 100) / 100;
    const h: HotelOpcao = {
      ...base,
      nome: eh.nome ?? base.nome,
      estrelas: eh.estrelas ?? base.estrelas,
      notaGoogle: eh.notaGoogle ?? base.notaGoogle,
      numAvaliacoes: eh.numAvaliacoes ?? base.numAvaliacoes,
      endereco: eh.endereco ?? base.endereco,
      distanciaKm: eh.distanciaKm ?? base.distanciaKm,
      categoria: eh.categoria ?? base.categoria,
      detalhes: eh.detalhes && eh.detalhes.length ? eh.detalhes.join('\n') : base.detalhes,
      acomodacao: eh.acomodacao ?? base.acomodacao,
      cafe: eh.cafe ?? base.cafe,
      estacionamento: eh.estacionamento ?? base.estacionamento,
      diaria: diaria ?? base.diaria,
      obs: eh.obs ?? base.obs,
    };
    if (idx >= 0) { cot.hoteis[idx] = h; atualizados++; } else { cot.hoteis.push(h); novos++; }
  }
  const partes = [];
  if (campos) partes.push(`${campos} campo(s) da cotação`);
  if (novos) partes.push(`${novos} hotel(is) adicionado(s)`);
  if (atualizados) partes.push(`${atualizados} hotel(is) atualizado(s)`);
  return { cot, resumo: partes.length ? `Preenchido: ${partes.join(', ')}. Confira antes de enviar.` : 'Nenhuma informação de hospedagem encontrada no material.' };
}

export default function Editor({ id }: { id?: string }) {
  const db = useDB();
  const [cot, setCot] = useState<Cotacao>(() => (id && db.cotacoes.find((c) => c.id === id)) || novaCotacaoRascunho());
  const [persistida, setPersistida] = useState(() => !!id && db.cotacoes.some((c) => c.id === id));
  const [salvoEm, setSalvoEm] = useState<string | null>(persistida ? cot.atualizadaEm : null);
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
  const sujo = useRef(false);
  const persistidaRef = useRef(persistida);
  const cotRef = useRef(cot);
  cotRef.current = cot;

  // IA
  const [aba, setAba] = useState<'texto' | 'imagem' | 'pdf'>('texto');
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [iaCarregando, setIaCarregando] = useState(false);
  const [iaMsg, setIaMsg] = useState<{ tipo: 'ok' | 'erro'; txt: string } | null>(null);
  const [soltando, setSoltando] = useState(false);

  // exportação
  const tplRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  const salvar = useCallback(() => {
    const c = cotRef.current;
    if (!sujo.current) return;
    if (!persistidaRef.current && !temConteudo(c)) return;
    sujo.current = false;
    const salva = salvarCotacao(c);
    if (!persistidaRef.current) {
      persistidaRef.current = true;
      setPersistida(true);
      history.replaceState(null, '', '#/editar/' + salva.id);
    }
    if (salva.numero !== c.numero) setCot((x) => ({ ...x, numero: salva.numero }));
    setSalvoEm(salva.atualizadaEm);
  }, []);
  // salvamento automático (debounce) + ao sair da página
  useEffect(() => {
    if (!sujo.current) return;
    const t = setTimeout(salvar, 700);
    return () => clearTimeout(t);
  }, [cot, salvar]);
  useEffect(() => {
    const f = () => salvar();
    window.addEventListener('beforeunload', f);
    return () => { window.removeEventListener('beforeunload', f); salvar(); };
  }, [salvar]);

  const atualizar = (f: (c: Cotacao) => Cotacao) => {
    sujo.current = true;
    setCot(f);
  };
  const set = <K extends keyof Cotacao>(k: K, v: Cotacao[K]) => atualizar((c) => ({ ...c, [k]: v }));

  const n = noites(cot.checkIn, cot.checkOut);

  const adicionarHotel = () => {
    const h = hotelVazio();
    atualizar((c) => ({ ...c, hoteis: [...c.hoteis, h] }));
    setAbertos((s) => new Set(s).add(h.id));
  };
  const moverHotel = (de: number, para: number) =>
    atualizar((c) => {
      if (para < 0 || para >= c.hoteis.length) return c;
      const hs = [...c.hoteis];
      const [x] = hs.splice(de, 1);
      hs.splice(para, 0, x);
      return { ...c, hoteis: hs };
    });

  const escolherCliente = (nome: string) => {
    const cli = db.clientes.find((k) => normaliza(k.nome) === normaliza(nome));
    atualizar((c) => ({
      ...c,
      clienteNome: cli ? cli.nome : nome,
      clienteId: cli ? cli.id : null,
      enderecoReferencia: c.enderecoReferencia || (cli?.endereco ?? ''),
    }));
  };
  const cadastrarCliente = () => {
    const novo = { id: uid(), nome: cot.clienteNome.trim(), documento: '', contato: '', email: '', telefone: '', endereco: cot.enderecoReferencia, obs: '' };
    salvarItem('clientes', novo);
    set('clienteId', novo.id);
  };

  const addArquivos = async (files: FileList | File[]) => {
    const lista = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf');
    const novos = await Promise.all(lista.map(arquivoParaAnexo));
    setAnexos((a) => [...a, ...novos]);
  };

  const interpretar = async () => {
    setIaMsg(null);
    setIaCarregando(true);
    try {
      const x = await extrairHospedagem(texto, anexos);
      const { cot: nova, resumo } = aplicarExtracao(cotRef.current, x);
      atualizar(() => nova);
      setAbertos(new Set());
      setIaMsg({ tipo: 'ok', txt: resumo });
    } catch (e) {
      setIaMsg({ tipo: 'erro', txt: e instanceof Error ? e.message : String(e) });
    } finally {
      setIaCarregando(false);
    }
  };

  const nomeArquivo = () =>
    `Cotacao-${cot.numero}-Hospedagem${cot.destino ? '-' + normaliza(cot.destino).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ''}`;
  const exportar = async (fmt: 'pdf' | 'png' | 'jpg') => {
    if (!tplRef.current) return;
    sujo.current = true;
    salvar();
    setExportando(fmt);
    try {
      if (fmt === 'pdf') await exportarPDF(tplRef.current, nomeArquivo());
      else await exportarImagem(tplRef.current, nomeArquivo(), fmt);
    } finally {
      setExportando(null);
    }
  };

  // escala da pré-visualização
  const prevRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.5);
  const [alturaTpl, setAlturaTpl] = useState(1000);
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (prevRef.current) setEscala(prevRef.current.clientWidth / 1390);
      if (tplRef.current) setAlturaTpl(tplRef.current.offsetHeight);
    });
    if (prevRef.current) ro.observe(prevRef.current);
    if (tplRef.current) ro.observe(tplRef.current);
    return () => ro.disconnect();
  }, []);

  const clienteCadastrado = !cot.clienteNome.trim() || db.clientes.some((k) => normaliza(k.nome) === normaliza(cot.clienteNome));
  const erroGrav = getErroGravacao();

  return (
    <>
      <div className="cab">
        <div>
          <h1>{persistida ? 'Editar' : 'Nova'} Cotação Nº {cot.numero}</h1>
          <p>Cole texto, envie print ou PDF — a IA preenche o template TripOne.</p>
        </div>
        <div className="salvo">
          {erroGrav ? <span style={{ color: '#c0392b' }}>{erroGrav}</span>
            : salvoEm ? <><Check size={13} color="#23713a" /> Salvo automaticamente · {fmtDataHora(salvoEm)}</>
            : 'O salvamento começa ao preencher a cotação'}
        </div>
      </div>

      <div className="editor">
        <div>
          <section className="card">
            <h3>Tipo de cotação</h3>
            <div className="tipos">
              {TIPOS.map((t) => (
                <button key={t.id} className={cot.tipo === t.id ? 'on' : ''} disabled={t.id !== 'hospedagem'} onClick={() => set('tipo', t.id)}>
                  {t.rotulo}
                  {t.id !== 'hospedagem' && <small>em breve</small>}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <h3><Sparkles size={13} color="#e8883c" /> Entrada por IA</h3>
            <div className="abas">
              <button className={aba === 'texto' ? 'on' : ''} onClick={() => setAba('texto')}><Type size={12} /> Texto</button>
              <button className={aba === 'imagem' ? 'on' : ''} onClick={() => setAba('imagem')}><ImageIcon size={12} /> Imagem</button>
              <button className={aba === 'pdf' ? 'on' : ''} onClick={() => setAba('pdf')}><FileText size={12} /> PDF</button>
            </div>
            {aba === 'texto' ? (
              <textarea
                className="inp"
                rows={6}
                placeholder={'Cole aqui o e-mail, mensagem ou tarifário do hotel.\nVocê também pode colar um print (Ctrl+V).'}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onPaste={(e) => {
                  const fs = Array.from(e.clipboardData.files);
                  if (fs.length) { e.preventDefault(); addArquivos(fs); }
                }}
              />
            ) : (
              <label
                className={'soltar' + (soltando ? ' ativo' : '')}
                onDragOver={(e) => { e.preventDefault(); setSoltando(true); }}
                onDragLeave={() => setSoltando(false)}
                onDrop={(e) => { e.preventDefault(); setSoltando(false); addArquivos(e.dataTransfer.files); }}
              >
                <input type="file" hidden multiple accept={aba === 'pdf' ? 'application/pdf' : 'image/*'} onChange={(e) => e.target.files && addArquivos(e.target.files)} />
                {aba === 'pdf' ? 'Arraste PDFs aqui ou clique para escolher' : 'Arraste prints/fotos aqui, clique para escolher ou cole com Ctrl+V na aba Texto'}
              </label>
            )}
            {anexos.length > 0 && (
              <div className="anexos">
                {anexos.map((a, i) => (
                  <span className="anexo" key={i}>
                    {a.mediaType === 'application/pdf' ? <FileText size={12} /> : <ImageIcon size={12} />}
                    <span>{a.nome || 'imagem colada'}</span>
                    <button className="btn ico" onClick={() => setAnexos((x) => x.filter((_, j) => j !== i))}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <button className="btn lar bloco" style={{ marginTop: 8 }} disabled={iaCarregando || (!texto.trim() && !anexos.length)} onClick={interpretar}>
              {iaCarregando ? <><Loader2 size={14} className="gira" /> Interpretando…</> : <><Sparkles size={14} /> Interpretar com IA</>}
            </button>
            {iaMsg && <div className={'aviso ' + iaMsg.tipo}>{iaMsg.txt}</div>}
          </section>

          <section className="card">
            <h3>Dados da cotação</h3>
            <div className="pilha">
              <div className="g2">
                <Campo rotulo={<>Cliente {!clienteCadastrado && <button className="btn peq" style={{ padding: '0 6px', marginLeft: 4 }} onClick={cadastrarCliente} title="Salvar no cadastro de clientes"><UserPlus size={11} /> cadastrar</button>}</>}>
                  <input className="inp" list="lista-clientes" placeholder="Nome do cliente" value={cot.clienteNome} onChange={(e) => escolherCliente(e.target.value)} />
                </Campo>
                <Campo rotulo="Destino"><input className="inp" placeholder="Cidade/UF" value={cot.destino} onChange={(e) => set('destino', e.target.value)} /></Campo>
                <Campo rotulo="Check-in"><input className="inp" type="date" value={cot.checkIn} onChange={(e) => set('checkIn', e.target.value)} /></Campo>
                <Campo rotulo="Check-out"><input className="inp" type="date" value={cot.checkOut} min={cot.checkIn || undefined} onChange={(e) => set('checkOut', e.target.value)} /></Campo>
              </div>
              {cot.checkIn && cot.checkOut && n === 0 && <div className="aviso erro" style={{ marginTop: 0 }}>O check-out precisa ser depois do check-in.</div>}
              <Campo rotulo={<>Período <em>({n} diária{n === 1 ? '' : 's'} — total dos hotéis calculado automaticamente)</em></>}>
                <input className="inp" placeholder={periodoAuto(n) + '  (deixe vazio para automático)'} value={cot.periodoTexto} onChange={(e) => set('periodoTexto', e.target.value)} />
              </Campo>
              <Campo rotulo="Endereço de referência (para cálculo de distância)">
                <input className="inp" placeholder="Ex.: Av. Paulista, 1000 - São Paulo/SP" value={cot.enderecoReferencia} onChange={(e) => set('enderecoReferencia', e.target.value)} />
              </Campo>
            </div>
          </section>

          <section className="card">
            <h3>
              Hotéis ({cot.hoteis.length})
              <button className="btn peq dir" onClick={adicionarHotel}><Plus size={13} /> Adicionar</button>
            </h3>
            {cot.hoteis.length === 0 && <div className="vazio">Nenhum hotel ainda. Adicione manualmente ou use a IA.</div>}
            {cot.hoteis.map((h, i) => (
              <HotelForm
                key={h.id}
                hotel={h}
                indice={i}
                total={cot.hoteis.length}
                noites={n}
                destino={cot.destino}
                enderecoReferencia={cot.enderecoReferencia}
                cadastro={db.hoteis}
                aberto={abertos.has(h.id)}
                onToggle={() => setAbertos((s) => { const x = new Set(s); if (x.has(h.id)) x.delete(h.id); else x.add(h.id); return x; })}
                onChange={(nh) => atualizar((c) => ({ ...c, hoteis: c.hoteis.map((y) => (y.id === nh.id ? nh : y)) }))}
                onRemover={() => { if (confirm(`Excluir "${h.nome || 'hotel ' + (i + 1)}" desta cotação?`)) atualizar((c) => ({ ...c, hoteis: c.hoteis.filter((y) => y.id !== h.id) })); }}
                onMover={moverHotel}
              />
            ))}
            {cot.hoteis.length > 0 && (
              <button className="btn bloco" style={{ marginTop: 10 }} onClick={adicionarHotel}><Plus size={13} /> Adicionar hotel</button>
            )}
          </section>

          <section className="card">
            <h3>Rodapé da cotação</h3>
            <div className="pilha">
              <Campo rotulo="Informações importantes (uma por linha)"><LinhasInput linhas={4} valor={cot.infoImportantes} onChange={(v) => set('infoImportantes', v)} /></Campo>
              <Campo rotulo="Observações (uma por linha)"><LinhasInput linhas={3} valor={cot.observacoes} onChange={(v) => set('observacoes', v)} /></Campo>
            </div>
          </section>

          <div className="acoes">
            <button className="btn" onClick={() => { sujo.current = true; salvar(); }}><Save size={14} /> Salvar agora</button>
            <button className="btn navy" disabled={!!exportando} onClick={() => exportar('pdf')}>{exportando === 'pdf' ? <Loader2 size={14} className="gira" /> : <FileDown size={14} />} PDF</button>
            <button className="btn" disabled={!!exportando} onClick={() => exportar('png')}>{exportando === 'png' ? <Loader2 size={14} className="gira" /> : null} PNG</button>
            <button className="btn" disabled={!!exportando} onClick={() => exportar('jpg')}>{exportando === 'jpg' ? <Loader2 size={14} className="gira" /> : null} JPG</button>
          </div>
        </div>

        <div className="prev">
          <div className="prev-rot"><span>Preview · Template fixo TripOne (não é modificado pela IA)</span></div>
          <div className="prev-caixa" ref={prevRef} style={{ height: alturaTpl * escala }}>
            <div className="prev-escala" style={{ transform: `scale(${escala})`, width: 1390 }}>
              <TemplateHospedagem ref={tplRef} cotacao={cot} config={db.config} />
            </div>
          </div>
        </div>
      </div>

      <datalist id="lista-clientes">{db.clientes.map((k) => <option key={k.id} value={k.nome} />)}</datalist>
      <datalist id="lista-hoteis">{db.hoteis.map((h) => <option key={h.id} value={h.nome}>{h.endereco}</option>)}</datalist>
    </>
  );
}
