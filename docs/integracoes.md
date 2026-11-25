# Integrações: hotéis, avaliações Google e distância (proposta, aguardando aprovação)

Preços oficiais do Google Maps Platform (nov/2026), em US$, com a cota gratuita **mensal por SKU**:

| Uso no sistema | Serviço Google | Grátis por mês | Depois da cota |
|---|---|---|---|
| Buscar hotel pelo nome e trazer endereço, **nota Google e nº de avaliações** | Places API (New) – Text Search Enterprise¹ | 1.000 buscas | US$ 35 / 1.000 |
| Geocodificar o endereço de referência | Geocoding | 10.000 | US$ 5 / 1.000 |
| Distância em km por estrada (referência → hotel) | Routes – Compute Route Matrix Essentials | 10.000 elementos | US$ 5 / 1.000 |

¹ Nota e nº de avaliações estão na faixa “Enterprise” da Places API. Uma busca por hotel já devolve nome, endereço, coordenadas, nota e avaliações.

**Estimativa TripOne:** 5 hotéis por cotação.
- Até ~200 cotações/mês → ~1.000 buscas → **US$ 0** (dentro da cota grátis).
- 400 cotações/mês → ~2.000 buscas → ~US$ 35/mês.
- O cadastro de hotéis guarda o que já foi buscado, então hotel repetido não gera nova busca (só no botão “Atualizar avaliação”).

Requisitos: conta Google Cloud com faturamento (cartão), chave restrita às 3 APIs e um endpoint pequeno (Cloudflare Worker / Supabase Edge Function, gratuitos nesse volume) para a chave não ficar no navegador. Termos do Google: pode guardar o place_id sem limite; nota e avaliações devem ser atualizadas (cache de no máximo 30 dias).

## Alternativas avaliadas

| Opção | Custo | Prós | Contras |
|---|---|---|---|
| **Google Places + Routes (recomendado)** | US$ 0 até ~1.000 hotéis/mês | É exatamente a “avaliação Google” do template; dados confiáveis | Exige cartão no Google Cloud |
| OpenStreetMap (Nominatim) + OSRM | Grátis | Endereço e distância sem custo | **Não tem nota Google**; dados de hotéis no interior são fracos; limite de 1 req/s |
| Distância em linha reta (cálculo local) | Grátis | Instantâneo, já implementado (`haversineKm`) | Não é distância por estrada; ainda precisa de coordenadas |
| Tripadvisor Content API | Cota grátis, depois pago | Notas e reviews | Nota do Tripadvisor, não do Google |
| SerpApi / scraping do Google | ~US$ 75+/mês | Sem Google Cloud | Mais caro e contra os termos do Google |
| Manual + atalhos do Google Maps (atual) | Grátis | Já funciona | Digitação manual de nota, avaliações e km |

## IA (já implementada, sem créditos Lovable)
Claude (Anthropic), pago por uso na conta Anthropic: ~US$ 0,01–0,05 por leitura de texto/print/PDF.
