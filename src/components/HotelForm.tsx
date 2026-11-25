import { ChevronDown, ChevronUp, GripVertical, Loader2, MapPin, Navigation, Search, Trash2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { HotelCadastro, HotelOpcao } from '../types';
import { fmtBRL, normaliza, totalHotel } from '../lib/format';
import { buscarHoteis, calcularDistancias, integracaoAtiva, linkMapsBusca, linkMapsRota } from '../lib/integracoes';
import type { ResultadoHotel } from '../lib/integracoes';
import { Campo, NumInput } from './Campos';

interface Props {
  hotel: HotelOpcao;
  indice: number;
  total: number;
  noites: number;
  destino: string;
  enderecoReferencia: string;
  cadastro: HotelCadastro[];
  aberto: boolean;
  onToggle: () => void;
  onChange: (h: HotelOpcao) => void;
  onPatch: (id: string, patch: Partial<HotelOpcao>) => void; // para respostas assíncronas
  onRemover: () => void;
  onMover: (de: number, para: number) => void;
}

const OPC = ['INCLUÍDO', 'NÃO INCLUÍDO'];

export default function HotelForm(p: Props) {
  const h = p.hotel;
  const [arrastando, setArrastando] = useState(false);
  const [alvo, setAlvo] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoHotel[] | null>(null);
  const [erroGoogle, setErroGoogle] = useState<string | null>(null);
  const set = <K extends keyof HotelOpcao>(k: K, v: HotelOpcao[K]) => p.onChange({ ...h, [k]: v });

  const escolherNome = (nome: string) => {
    const cad = p.cadastro.find((c) => normaliza(c.nome) === normaliza(nome));
    if (!cad) return set('nome', nome);
    // Preenche só o que estiver vazio, com dados do cadastro do próprio usuário.
    p.onChange({
      ...h,
      nome: cad.nome,
      estrelas: h.estrelas ?? cad.estrelas,
      notaGoogle: h.notaGoogle ?? cad.notaGoogle,
      numAvaliacoes: h.numAvaliacoes ?? cad.numAvaliacoes,
      endereco: h.endereco || cad.endereco,
      placeId: h.placeId ?? cad.placeId ?? null,
      lat: h.lat ?? cad.lat ?? null,
      lng: h.lng ?? cad.lng ?? null,
      avaliacaoEm: h.avaliacaoEm ?? cad.avaliacaoEm ?? null,
    });
  };

  const total = totalHotel(h.diaria, p.noites, h.quartos);
  const google = integracaoAtiva();

  const buscarGoogle = async () => {
    setErroGoogle(null);
    setResultados(null);
    setBuscando(true);
    try {
      const rs = await buscarHoteis([h.nome, p.destino].filter(Boolean).join(' '));
      if (!rs.length) setErroGoogle('Nenhum hotel encontrado no Google. Ajuste o nome ou o destino.');
      else setResultados(rs);
    } catch (e) {
      setErroGoogle(e instanceof Error ? e.message : String(e));
    } finally {
      setBuscando(false);
    }
  };

  const escolherResultado = async (r: ResultadoHotel) => {
    setResultados(null);
    const patch: Partial<HotelOpcao> = {
      nome: h.nome.trim() || r.nome,
      endereco: r.endereco,
      notaGoogle: r.notaGoogle,
      numAvaliacoes: r.numAvaliacoes,
      placeId: r.placeId,
      lat: r.lat,
      lng: r.lng,
      avaliacaoEm: new Date().toISOString(),
    };
    p.onPatch(h.id, patch);
    if (p.enderecoReferencia.trim()) {
      try {
        const [d] = await calcularDistancias(p.enderecoReferencia, [{ id: h.id, lat: r.lat, lng: r.lng, endereco: r.endereco }]);
        if (d) p.onPatch(h.id, { distanciaKm: d.km });
      } catch (e) {
        setErroGoogle('Distância: ' + (e instanceof Error ? e.message : String(e)));
      }
    }
  };
  const buscaMaps = [h.nome, h.endereco || p.destino].filter(Boolean).join(' ');

  return (
    <div
      className={'hotel-card' + (arrastando ? ' arrastando' : '') + (alvo ? ' alvo' : '')}
      onDragOver={(e) => { e.preventDefault(); setAlvo(true); }}
      onDragLeave={() => setAlvo(false)}
      onDrop={(e) => {
        e.preventDefault();
        setAlvo(false);
        const de = Number(e.dataTransfer.getData('text/hotel-idx'));
        if (Number.isFinite(de) && de !== p.indice) p.onMover(de, p.indice);
      }}
    >
      <div className="hotel-cab">
        <span
          className="alca"
          draggable
          title="Arraste para reordenar"
          onDragStart={(e) => { e.dataTransfer.setData('text/hotel-idx', String(p.indice)); setArrastando(true); }}
          onDragEnd={() => setArrastando(false)}
        >
          <GripVertical size={16} />
        </span>
        <span className="num">{p.indice + 1}</span>
        <input className="inp" list="lista-hoteis" placeholder="Nome do hotel" value={h.nome} onChange={(e) => escolherNome(e.target.value)} />
        <button className="btn ico" title="Subir" disabled={p.indice === 0} onClick={() => p.onMover(p.indice, p.indice - 1)}><ChevronUp size={16} /></button>
        <button className="btn ico" title="Descer" disabled={p.indice === p.total - 1} onClick={() => p.onMover(p.indice, p.indice + 1)}><ChevronDown size={16} /></button>
        <button className="btn ico perigo" title="Excluir hotel" onClick={p.onRemover}><Trash2 size={15} /></button>
        <button className="btn ico" title={p.aberto ? 'Recolher' : 'Editar'} onClick={p.onToggle}>
          {p.aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {!p.aberto && (
        <div className="hotel-res">
          {[h.categoria, h.diaria != null ? `diária ${fmtBRL(h.diaria)}` : 'sem diária', `total ${fmtBRL(total)}`].filter(Boolean).join(' · ')}
        </div>
      )}

      {p.aberto && (
        <div className="pilha" style={{ marginTop: 10 }}>
          <div className="links">
            {google && (
              <button className="btn peq lar-borda" disabled={buscando || !(h.nome.trim() || p.destino.trim())} onClick={buscarGoogle} title="Busca endereço, nota e avaliações no Google e calcula a distância">
                {buscando ? <Loader2 size={13} className="gira" /> : <Search size={13} />} {h.placeId ? 'Atualizar Google (avaliação)' : 'Buscar no Google'}
              </button>
            )}
            <a className={'btn peq' + (google ? '' : ' lar-borda')} href={linkMapsBusca(buscaMaps)} target="_blank" rel="noreferrer" title="Abre o Google Maps para conferir nota, avaliações e endereço">
              <MapPin size={13} /> Conferir no Google Maps
            </a>
            <a
              className={'btn peq' + (p.enderecoReferencia && (h.endereco || h.nome) ? '' : ' desab')}
              href={p.enderecoReferencia && (h.endereco || h.nome) ? linkMapsRota(p.enderecoReferencia, h.endereco || buscaMaps) : undefined}
              target="_blank"
              rel="noreferrer"
              title={p.enderecoReferencia ? 'Abre a rota a partir do endereço de referência' : 'Preencha o endereço de referência'}
            >
              <Navigation size={13} /> Ver distância
            </a>
          </div>
          {resultados && (
            <div className="resultados">
              <div className="resultados-t">Escolha o hotel correto:</div>
              {resultados.map((r) => (
                <button key={r.placeId} onClick={() => escolherResultado(r)}>
                  <b>{r.nome}</b>
                  {r.notaGoogle != null && <span> · {r.notaGoogle.toFixed(1)} ★ ({(r.numAvaliacoes ?? 0).toLocaleString('pt-BR')})</span>}
                  <small>{r.endereco}</small>
                </button>
              ))}
              <button className="cancelar" onClick={() => setResultados(null)}>Cancelar</button>
            </div>
          )}
          {erroGoogle && <div className="aviso erro" style={{ marginTop: 0 }}>{erroGoogle}</div>}
          {h.avaliacaoEm && <div className="hotel-res" style={{ margin: 0 }}>Nota Google atualizada em {new Date(h.avaliacaoEm).toLocaleDateString('pt-BR')}</div>}
          <div className="g3">
            <Campo rotulo="Estrelas (hotel)">
              <select className="inp" value={h.estrelas ?? ''} onChange={(e) => set('estrelas', e.target.value ? Number(e.target.value) : null)}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Nota Google"><NumInput valor={h.notaGoogle} decimais={1} placeholder="4,5" onChange={(v) => set('notaGoogle', v == null ? null : Math.min(5, v))} /></Campo>
            <Campo rotulo="Nº avaliações"><NumInput valor={h.numAvaliacoes} decimais={0} placeholder="881" onChange={(v) => set('numAvaliacoes', v)} /></Campo>
          </div>
          <Campo rotulo="Endereço">
            <textarea className="inp" rows={2} value={h.endereco} onChange={(e) => p.onChange({ ...h, endereco: e.target.value, lat: null, lng: null })} />
          </Campo>
          <div className="g2">
            <Campo rotulo="Distância (km)"><NumInput valor={h.distanciaKm} decimais={1} placeholder="—" onChange={(v) => set('distanciaKm', v)} /></Campo>
            <Campo rotulo="Categoria / quarto"><input className="inp" value={h.categoria} placeholder="Single, Standard..." onChange={(e) => set('categoria', e.target.value)} /></Campo>
          </div>
          <Campo rotulo="Detalhes do quarto (uma linha por detalhe)">
            <textarea className="inp" rows={2} placeholder="Cama casal" value={h.detalhes} onChange={(e) => set('detalhes', e.target.value)} />
          </Campo>
          <div className="g3">
            <Campo rotulo="Acomodação"><input className="inp" value={h.acomodacao} placeholder="Acomoda 2" onChange={(e) => set('acomodacao', e.target.value)} /></Campo>
            <Campo rotulo="Café da manhã"><input className="inp" list="opc-incluso" value={h.cafe} onChange={(e) => set('cafe', e.target.value)} /></Campo>
            <Campo rotulo="Estacionamento"><input className="inp" list="opc-incluso" value={h.estacionamento} onChange={(e) => set('estacionamento', e.target.value)} /></Campo>
          </div>
          <div className="g3">
            <Campo rotulo="Diária (R$)"><NumInput valor={h.diaria} placeholder="0,00" onChange={(v) => set('diaria', v)} /></Campo>
            <Campo rotulo="Quartos"><NumInput valor={h.quartos} decimais={0} onChange={(v) => set('quartos', Math.max(1, v ?? 1))} /></Campo>
            <Campo rotulo={<>Total <em>(auto)</em></>}><input className="inp" readOnly value={fmtBRL(total)} /></Campo>
          </div>
          <Campo rotulo="Observação deste hotel">
            <input className="inp" value={h.obs} placeholder="Ex.: S/ ELEVADOR, INDISPONÍVEL" onChange={(e) => set('obs', e.target.value)} />
          </Campo>
        </div>
      )}
      <datalist id="opc-incluso">{OPC.map((o) => <option key={o} value={o} />)}</datalist>
    </div>
  );
}
