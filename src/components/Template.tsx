import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { BedDouble, CalendarDays, Car, ClipboardList, Coffee, Info, Users } from 'lucide-react';
import type { Configuracoes, Cotacao } from '../types';
import { fmtBRL, fmtData, fmtNum, noites, periodoAuto, totalHotel } from '../lib/format';
import logoPadrao from '../assets/logo-tripone.png';
import './Template.css';

const Traco = () => <span className="tpl-traco">—</span>;
const estrelas = (n: number) => '★'.repeat(Math.max(0, Math.min(5, Math.round(n))));

interface Props {
  cotacao: Cotacao;
  config: Configuracoes;
}

/** Template fixo da cotação de hospedagem. A IA nunca altera este layout: ela só preenche os dados. */
export const TemplateHospedagem = forwardRef<HTMLDivElement, Props>(function TemplateHospedagem({ cotacao: c, config }, ref) {
  const n = noites(c.checkIn, c.checkOut);
  const periodo = c.periodoTexto.trim() || periodoAuto(n);
  const cor = config.corPrimaria;
  const vars = {
    '--azul': config.corPrimaria,
    '--laranja': config.corDestaque,
    '--bege': config.corColuna,
    '--icone': config.corIcone,
  } as CSSProperties;

  return (
    <div className="tpl" ref={ref} style={vars}>
      <div className="tpl-topo">
        <div className="tpl-marca">
          <img src={config.logoDataUrl || logoPadrao} alt={config.empresa} />
          <div className="tpl-slogan">{config.slogan}</div>
        </div>
        <div className="tpl-titulo">
          <h1>COTAÇÃO DE HOSPEDAGEM</h1>
          <div className="tpl-linha" />
          <div className="tpl-num">
            Cotação Nº <b>{c.numero}</b>
          </div>
        </div>
      </div>

      <div className="tpl-caixa">
        <div>
          <span className="tpl-ico"><CalendarDays size={22} color={cor} strokeWidth={1.8} /></span>
          <span>
            <div className="tpl-rot">Destino</div>
            <div className="tpl-val">{c.destino || '—'}</div>
          </span>
        </div>
        <div>
          <span className="tpl-ico"><CalendarDays size={22} color={cor} strokeWidth={1.8} /></span>
          <span>
            <div className="tpl-rot">Check-in</div>
            <div className="tpl-val">{fmtData(c.checkIn) || '—'}</div>
          </span>
        </div>
        <div>
          <span className="tpl-ico"><CalendarDays size={22} color={cor} strokeWidth={1.8} /></span>
          <span>
            <div className="tpl-rot">Check-out</div>
            <div className="tpl-val">{fmtData(c.checkOut) || '—'}</div>
          </span>
        </div>
        <div>
          <span className="tpl-ico"><BedDouble size={22} color={cor} strokeWidth={1.8} /></span>
          <span>
            <div className="tpl-rot">Período</div>
            <div className="tpl-val">{periodo}</div>
          </span>
        </div>
      </div>

      <table className="tpl-tab">
        <colgroup>
          <col style={{ width: 212 }} />
          <col style={{ width: 58 }} />
          <col style={{ width: 150 }} />
          <col style={{ width: 168 }} />
          <col style={{ width: 119 }} />
          <col style={{ width: 208 }} />
          <col style={{ width: 111 }} />
          <col style={{ width: 137 }} />
          <col style={{ width: 147 }} />
        </colgroup>
        <thead>
          <tr>
            <th className="esq">Hotel</th>
            <th>Km</th>
            <th className="esq">Categoria / Quarto</th>
            <th>Acomodação</th>
            <th>Café da manhã</th>
            <th>Estacionamento</th>
            <th>Diária</th>
            <th className="bege">Total</th>
            <th>Obs</th>
          </tr>
        </thead>
        <tbody>
          {c.hoteis.length === 0 && (
            <tr>
              <td colSpan={9} className="tpl-vazio">Adicione hotéis no formulário ao lado.</td>
            </tr>
          )}
          {c.hoteis.map((h) => {
            const detalhes = h.detalhes.split('\n').map((x) => x.trim()).filter(Boolean);
            return (
              <tr key={h.id}>
                <td className="hotel">
                  {h.estrelas ? <div className="tpl-est">{estrelas(h.estrelas)}</div> : null}
                  <div className="tpl-nome">{h.nome || 'Hotel'}</div>
                  {h.notaGoogle != null && (
                    <div className="tpl-g">
                      <span className="tpl-gb">G</span>
                      <b>{h.notaGoogle.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(',', '.')}</b>
                      <span className="tpl-gs">{estrelas(h.notaGoogle)}</span>
                      {h.numAvaliacoes != null && <span className="tpl-gc">({h.numAvaliacoes.toLocaleString('pt-BR')})</span>}
                    </div>
                  )}
                  {h.endereco && <div className="tpl-end">{h.endereco}</div>}
                </td>
                <td className="bege">{h.distanciaKm != null ? <b className="tpl-lbl n">{h.distanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b> : <Traco />}</td>
                <td className="tpl-cat">
                  {h.categoria && <b>{h.categoria}</b>}
                  {detalhes.length > 0 && (
                    <ul>{detalhes.map((d, i) => <li key={i}>{d}</li>)}</ul>
                  )}
                  {!h.categoria && detalhes.length === 0 && <Traco />}
                </td>
                <td>
                  <div className="tpl-circ"><Users size={26} color={cor} strokeWidth={1.8} /></div>
                  <div className="tpl-lbl n">{h.acomodacao || '—'}</div>
                </td>
                <td>
                  <div className="tpl-circ"><Coffee size={26} color={cor} strokeWidth={1.8} /></div>
                  <div className="tpl-lbl">{h.cafe || '—'}</div>
                </td>
                <td>
                  <div className="tpl-circ"><Car size={26} color={cor} strokeWidth={1.8} /></div>
                  <div className="tpl-lbl">{h.estacionamento || '—'}</div>
                </td>
                <td><div className="tpl-dia">{h.diaria != null ? fmtNum(h.diaria) : ''}</div></td>
                <td className="bege"><div className="tpl-tot">{fmtBRL(totalHotel(h.diaria, n, h.quartos))}</div></td>
                <td className="tpl-obs">{h.obs ? h.obs : <Traco />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="tpl-rod">
        <div>
          <span className="tpl-pill"><Info size={18} color={config.corDestaque} strokeWidth={2.2} /> Informações importantes</span>
          <ul>{c.infoImportantes.filter(Boolean).map((t, i) => <li key={i}><span className="tpl-bul az" />{t}</li>)}</ul>
        </div>
        <div>
          <span className="tpl-pill"><ClipboardList size={18} color={config.corDestaque} strokeWidth={2.2} /> Observações</span>
          <ul>{c.observacoes.filter(Boolean).map((t, i) => <li key={i}><span className="tpl-bul la" />{t}</li>)}</ul>
        </div>
      </div>
    </div>
  );
});
