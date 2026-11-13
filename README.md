# Uniformes CBMDF 2026 — Simulador de insígnias

Site estático (HTML + CSS + JS puro, sem build e sem internet) baseado no **Regulamento de Uniformes do CBMDF 2026**.

## Como abrir
Dê dois cliques em `index.html`. Para publicar, basta hospedar a pasta inteira (GitHub Pages, Netlify, servidor da corporação etc.).

## O que faz
Você preenche a ficha (nome de guerra, sexo, tipo sanguíneo, OBM, posto/graduação, quadro/qualificação, função de comando, curso de carreira, cursos de especialização e condecorações) e as quatro abas redesenham, em tempo real:

- **Túnica Cinza (1º B)**, **Segundo A (Passeio)**, **Prontidão (3º A)** e **TFM (4º A)**;
- platinas/luvas/divisas, armas do quadro, plaqueta/cadarços, brevês #1–#4, elipse de instrutor, manicacas, distintivo de OBM, medalhas/barretas/comendas, aplique de comando, bandeira do DF, emblema e cobertura;
- cartões "Regras para você" (obrigatório / opcional / vedado / atenção) com a página do regulamento; passe o mouse num número para destacar na imagem, clique num cartão para aproximar a região.

## Regras implementadas (principais)
- Máx. 4 brevês; internos em #1–#2 (direita), externos só em #3–#4 (esquerda); sobra de internos ocupa #3/#4 livres (p. 159).
- Brevê #3 suprimido com qualquer barreta/medalha; #4 com 10+ barretas ou medalhas (p. 18, 36, 171).
- Elipse aveludada de instrutor: máx. 2, nas posições #1/#2; no 3º A, borda amarela sem limite (p. 162–163).
- Medalhas só no 1º grupo (máx. 16, 4×4); barretas até 32 (1º B e 2º A); nada disso no 3º A e no 4º A (p. 170–172).
- Com medalhas: sem distintivo de OBM, sem brevês #3/#4 e sem barretas (p. 171).
- Comendas só com medalhas, até 3 (p. 173). Aplique de comando só em túnica e camisa bege (p. 166).
- Praças: divisas nas mangas (130 mm da costura); oficiais, praças especiais e subtenentes: platinas (1º/2º grupos) ou luvas amovíveis (3º grupo) (p. 144–149).
- Bermuda do TFM com 2 listras (oficiais/praças especiais), 1 (ST e sargentos) ou lisa (cabos e soldados) (p. 95).

## Ajustes de 13/11/2026
- Condecorações: informa-se só a quantidade; as fitas são sorteadas (cores estáveis para cada quantidade). Comendas saíram da ficha.
- Até 9 barretas: a posição #3 some e o 3º brevê passa à #4; com 10 ou mais, a #4 também é suprimida.
- Dois brevês de instrutor (elipses) ganham espaçamento vertical extra.
- Armas na lapela/gola inclinadas ~45° com a base para fora (figura da p. 151).
- 3º A: brevês de instrutor ocupam #1 a #4 nessa ordem; boina só para lotação COESP, GPCIU, GBS ou GAEPH (lista em `obmsBoina`, js/data.js); arma da carcela alinhada pela base dos cadarços.
- 2º A: bibico sempre; boina aparece como opcional.
- Distintivo próprio de cada curso de carreira (p. 158); vista "Cobertura" mostra a pala de cada posto.
- Camisa bege reconstruída por `tools/base_camisa.py`; túnicas e gandola retocadas por `tools/fix_bases.py`.

## Limites conhecidos
- O regulamento **não lista as medalhas** nem as siglas dos cursos de carreira; por isso medalhas são digitadas por você e os cursos de carreira têm um distintivo genérico (círculo com a sigla).
- Só 16 dos 17 cursos de especialização têm brevê ilustrado no regulamento; o CORPAS usa um brevê genérico.
- As peças (túnica masculina e feminina, camisa bege, gandola e TFM masculino/feminino) são as fotos oficiais do regulamento, retocadas: legendas e insígnias gravadas foram apagadas e as áreas encobertas (principalmente mangas e ombros) foram reconstruídas e espelhadas. Por isso há pequenas imperfeições nessas regiões e a peça fica simétrica. Brevês, armas e estrelas de posto são recortes das imagens oficiais, posicionados conforme as cotas dos diagramas (p. 18, 19, 36, 48).
- Também são recortes das figuras do regulamento: platinas e luvas de cada posto (p. 145–148), armas emborrachadas (p. 153), bandeira do DF (p. 155), emblema (p. 157), plaquetas e distintivo de curso (p. 109), distintivo de OBM institucional com suporte (p. 165–166), apliques de comando (p. 166–167), quepe, gorros, palas, bibico e boina (p. 86–92), cadarços (p. 106) e divisas de gola (p. 148).
- Ainda são desenhos: divisas bordadas das mangas, manicacas, medalhas/barretas (as cores são as que você escolhe) e o brevê genérico de cursos sem imagem. O distintivo de curso de carreira é sempre o mesmo modelo ilustrado no regulamento; o escudo de OBM é o institucional com a sua sigla na faixa. No TFM a bandeira do DF não aparece porque a manga direita fica de costas na foto de referência (a regra continua listada).
- Não cobre ainda: 1º A/C/D–H, 2º B–D, 3º B, 4º B/C, alamares, espada, faixas e placas de condecoração.
- Em caso de dúvida vale o texto oficial e as notas técnicas do Comandante-Geral.

## Estrutura
```
index.html          página
css/style.css       estilos (claro/escuro, impressão)
js/data.js          catálogos (postos, quadros, cursos, OBMs, funções)
js/uniformes.js     texto resumido de cada uniforme + páginas do PDF
js/draw.js          desenho SVG + motor de regras
js/app.js           ficha, abas, filtros, zoom e destaque
assets/sprites/     brevês, armas, estrelas e bibico recortados do PDF
assets/base/        fotos-base retocadas (túnicas, camisa, gandola, TFM)
build_sprites.py    embute sprites e fotos-base em js/sprites.js
tools/              scripts de recorte (extract.py, make_sprites.py, to_webp.py) e retoque das fotos-base (fix_bases.py); precisam de Python com pymupdf, pillow, numpy, scipy e opencv
assets/fotos/       fotos oficiais de referência
```
