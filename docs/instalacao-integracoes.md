# Ativar Google (hotéis, avaliações, distância) e IA

Leva uns 20 minutos, uma única vez. No fim você terá uma URL e um token para colar em **Configurações › Integrações**.

## 1. Chave do Google Maps

1. Acesse https://console.cloud.google.com/ e crie um projeto (ex.: `tripone-cotacoes`).
2. **Faturamento**: vincule uma conta de faturamento (cartão). Ela é exigida mesmo na cota grátis.
   Para não ter surpresa, crie um **alerta de orçamento** (Faturamento › Orçamentos e alertas), por exemplo de US$ 10.
3. Em **APIs e serviços › Biblioteca**, ative:
   - **Places API (New)**
   - **Routes API**
4. Em **APIs e serviços › Credenciais › Criar credenciais › Chave de API**.
   Edite a chave: em *Restrições de API* marque só **Places API (New)** e **Routes API**.
5. Opcional e recomendado: em **Cotas**, limite *Text Search* a ~60 por dia. Isso dá no máximo ~1.800 buscas por mês.

## 2. Chave da IA (Anthropic)

1. Acesse https://console.anthropic.com/, adicione créditos (ex.: US$ 10) e crie uma **API key**.

## 3. Publicar o servidor TripOne (Cloudflare Workers, plano gratuito)

**Opção A, pelo painel da Cloudflare (sem terminal):** crie o Worker, cole o conteúdo de [`worker/worker.js`](../worker/worker.js) no editor, clique em Deploy e cadastre os secrets `GOOGLE_MAPS_API_KEY`, `ANTHROPIC_API_KEY` e `APP_TOKEN` em Settings › Variables and Secrets.

**Opção B, pelo terminal** (precisa de Node.js):

```bash
cd worker
npm install
npx wrangler login                       # abre o navegador para entrar/criar conta Cloudflare (grátis)
npx wrangler secret put GOOGLE_MAPS_API_KEY   # cole a chave do passo 1
npx wrangler secret put ANTHROPIC_API_KEY     # cole a chave do passo 2
npx wrangler secret put APP_TOKEN             # invente uma senha longa
npx wrangler deploy
```

O deploy mostra a URL, algo como `https://tripone-cotacoes-api.SEU-USUARIO.workers.dev`.

Opcional: em `wrangler.toml`, troque `ALLOWED_ORIGINS = "*"` pelo endereço onde o app ficar publicado e rode `npx wrangler deploy` de novo.

## 4. Ligar no app

Em **Configurações › Integrações**: cole a URL e o token (APP_TOKEN) e clique em **Testar conexão**.

A partir daí, no editor:
- **Buscar no Google** em cada hotel: escolha o hotel certo e o sistema preenche endereço, nota e nº de avaliações, e calcula a distância.
- **Calcular km** ao lado do endereço de referência: recalcula a distância de todos os hotéis.
- A IA (Interpretar com IA) passa a usar o servidor, e a chave sai do navegador.

## Custos (Google, por mês)
| Ação | Grátis | Depois |
|---|---|---|
| Buscar no Google (1 por hotel) | 1.000 | US$ 35 / 1.000 |
| Distância (1 por hotel) | 10.000 | US$ 5 / 1.000 |

Hotéis repetidos vêm do cadastro sem nova busca; só clique em “Atualizar Google” quando quiser renovar a nota (o Google pede atualização a cada 30 dias, no máximo).
