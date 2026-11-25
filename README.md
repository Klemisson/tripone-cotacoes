# TripOne · Cotações Corporativas

Sistema de cotações corporativas da TripOne Travel. Primeiro módulo: **Hospedagem**.

## Como rodar

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm run build      # gera a versão de produção em dist/
```

`dist/` é um site estático: pode ser publicado em Vercel, Netlify, Cloudflare Pages, GitHub Pages ou importado no Lovable.

## O que já funciona (módulo Hospedagem)

- Formulário à esquerda e pré-visualização em tempo real à direita, com o **template fixo** da cotação TripOne (`src/components/Template.tsx`). A IA nunca altera o layout, só os dados.
- Cliente, destino, check-in/check-out, cálculo automático de diárias, período (automático ou texto livre), endereço de referência.
- Hotéis: nome, estrelas, nota Google, nº de avaliações, endereço, distância (km), categoria, detalhes do quarto, acomodação, café da manhã, estacionamento, diária, nº de quartos, **total automático** (diária × diárias × quartos), observação individual.
- Adicionar, editar, excluir e reordenar hotéis (setas ou arrastar).
- **Preenchimento por IA** (Claude) a partir de texto colado, prints/imagens (inclusive Ctrl+V) e PDFs. Só preenche o que está escrito; o resto fica em branco.
- Numeração automática (configurável), salvamento automático, histórico com busca, edição, duplicação e exclusão.
- Cadastro de clientes, hotéis (alimentado automaticamente pelas cotações), companhias aéreas, locadoras e seguradoras.
- Exportação em **PDF, PNG e JPG em alta resolução** (3×, ~4170 px de largura).
- Configurações de identidade visual (logo, slogan, cores), textos padrão do rodapé, IA e backup/restauração dos dados.

## Dados

Nesta versão os dados ficam no navegador (localStorage), com backup/restauração em JSON em Configurações.
Toda a persistência passa por `src/lib/store.ts`, então migrar para um banco compartilhado (ex.: Supabase) para vários usuários é uma troca localizada.

## IA

`src/lib/ai.ts`. Em Configurações informe **uma** das opções:
- a chave da API Anthropic (fica salva só no navegador; prático para começar), ou
- a URL de um endpoint próprio que guarda a chave no servidor (recomendado em produção).

## Integrações (hotéis, avaliações Google, distância)

Ainda **não ligadas**: aguardando aprovação de custos. Hoje os botões “Conferir no Google Maps” e “Ver distância” abrem o Maps (gratuito).
O ponto de extensão é `src/lib/integracoes.ts` (`ProvedorHoteis`).
