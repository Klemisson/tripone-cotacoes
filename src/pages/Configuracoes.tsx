import { useState } from 'react';
import { Download, Upload, RotateCcw } from 'lucide-react';
import { configPadrao, exportarBackup, importarBackup, salvarConfig, useDB } from '../lib/store';
import { Campo, LinhasInput } from '../components/Campos';
import logoPadrao from '../assets/logo-tripone.png';

export default function Configuracoes() {
  const { config, cotacoes } = useDB();
  const [msg, setMsg] = useState<string | null>(null);
  const maiorNumero = cotacoes.reduce((m, c) => Math.max(m, c.numero), 0);

  const trocarLogo = (f: File) => {
    const r = new FileReader();
    r.onload = () => salvarConfig({ logoDataUrl: String(r.result) });
    r.readAsDataURL(f);
  };
  const baixarBackup = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportarBackup()], { type: 'application/json' }));
    a.download = `tripone-cotacoes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <>
      <div className="cab">
        <div>
          <h1>Configurações</h1>
          <p>Identidade visual, numeração, textos padrão, IA e integrações. Tudo é salvo automaticamente.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 14, alignItems: 'start' }}>
        <div>
          <section className="card">
            <h3>Identidade visual</h3>
            <div className="pilha">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={config.logoDataUrl || logoPadrao} alt="" style={{ height: 54, border: '1px solid #e3e6eb', borderRadius: 6, padding: 4 }} />
                <label className="btn peq"><Upload size={13} /> Trocar logo<input hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && trocarLogo(e.target.files[0])} /></label>
                {config.logoDataUrl && <button className="btn peq" onClick={() => salvarConfig({ logoDataUrl: null })}>Usar logo padrão</button>}
              </div>
              <div className="g2">
                <Campo rotulo="Nome da empresa"><input className="inp" value={config.empresa} onChange={(e) => salvarConfig({ empresa: e.target.value })} /></Campo>
                <Campo rotulo="Slogan"><input className="inp" value={config.slogan} onChange={(e) => salvarConfig({ slogan: e.target.value })} /></Campo>
              </div>
              <div className="cores">
                <Campo rotulo="Cor principal"><input type="color" value={config.corPrimaria} onChange={(e) => salvarConfig({ corPrimaria: e.target.value })} /></Campo>
                <Campo rotulo="Cor de destaque"><input type="color" value={config.corDestaque} onChange={(e) => salvarConfig({ corDestaque: e.target.value })} /></Campo>
                <Campo rotulo="Colunas KM/Total"><input type="color" value={config.corColuna} onChange={(e) => salvarConfig({ corColuna: e.target.value })} /></Campo>
                <Campo rotulo="Fundo dos ícones"><input type="color" value={config.corIcone} onChange={(e) => salvarConfig({ corIcone: e.target.value })} /></Campo>
              </div>
              <button className="btn peq" style={{ alignSelf: 'flex-start' }} onClick={() => salvarConfig({ corPrimaria: configPadrao.corPrimaria, corDestaque: configPadrao.corDestaque, corColuna: configPadrao.corColuna, corIcone: configPadrao.corIcone })}><RotateCcw size={12} /> Restaurar cores TripOne</button>
            </div>
          </section>

          <section className="card">
            <h3>Numeração e textos padrão</h3>
            <div className="pilha">
              <Campo rotulo={<>Próximo número de cotação <em>(maior já usado: {maiorNumero || '—'})</em></>}>
                <input className="inp" type="number" min={1} value={config.proximoNumero} onChange={(e) => salvarConfig({ proximoNumero: Math.max(1, Number(e.target.value) || 1) })} />
              </Campo>
              <Campo rotulo="Informações importantes (novas cotações)"><LinhasInput linhas={4} valor={config.infoPadrao} onChange={(v) => salvarConfig({ infoPadrao: v })} /></Campo>
              <Campo rotulo="Observações (novas cotações)"><LinhasInput linhas={3} valor={config.obsPadrao} onChange={(v) => salvarConfig({ obsPadrao: v })} /></Campo>
            </div>
          </section>
        </div>

        <div>
          <section className="card">
            <h3>Inteligência artificial</h3>
            <div className="pilha">
              <div className="aviso info" style={{ marginTop: 0 }}>
                A leitura de textos, prints e PDFs usa o Claude (Anthropic), pago por uso direto na sua conta Anthropic, sem créditos do Lovable.
                Custo estimado: de US$ 0,01 a 0,05 por leitura.
              </div>
              <Campo rotulo="Chave da API Anthropic (fica salva só neste navegador)">
                <input className="inp" type="password" placeholder="sk-ant-..." value={config.anthropicApiKey} onChange={(e) => salvarConfig({ anthropicApiKey: e.target.value })} />
              </Campo>
              <Campo rotulo="OU endpoint próprio (recomendado em produção: a chave fica no servidor)">
                <input className="inp" placeholder="https://.../extrair-cotacao" value={config.iaProxyUrl} onChange={(e) => salvarConfig({ iaProxyUrl: e.target.value })} />
              </Campo>
            </div>
          </section>

          <section className="card">
            <h3>Integrações de hotéis <span className="selo">AGUARDANDO APROVAÇÃO</span></h3>
            <div className="integ"><b>Hoje (gratuito):</b> os botões “Conferir no Google Maps” e “Ver distância” abrem o Maps com a busca pronta; você confere e digita nota, avaliações e km.</div>
            <div className="integ"><b>Proposta:</b> busca automática de endereço, nota Google, nº de avaliações e distância via Google Places + Routes. O custo é zero dentro da cota mensal gratuita. Os detalhes foram enviados para aprovação.</div>
          </section>

          <section className="card">
            <h3>Backup dos dados</h3>
            <p style={{ fontSize: 12, color: '#6b7488', margin: '0 0 10px' }}>Os dados ficam neste navegador. Faça backup periódico ou use-o para levar os dados a outro computador.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={baixarBackup}><Download size={13} /> Baixar backup</button>
              <label className="btn"><Upload size={13} /> Restaurar backup
                <input hidden type="file" accept="application/json" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (!confirm('Restaurar o backup substitui todos os dados atuais. Continuar?')) return;
                  try { importarBackup(await f.text()); setMsg('Backup restaurado.'); } catch (err) { setMsg(err instanceof Error ? err.message : 'Falha ao restaurar.'); }
                }} />
              </label>
            </div>
            {msg && <div className="aviso info">{msg}</div>}
          </section>
        </div>
      </div>
    </>
  );
}
