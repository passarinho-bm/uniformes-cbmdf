"""Patch único (ajustes de 13/11): aplica as mudanças pedidas em data.js, draw.js, app.js, uniformes.js e index.html."""
import re
import sys

R = sys.argv[1].rstrip('/') + '/'


def rd(p):
    return open(R + p, encoding='utf-8').read()


def wr(p, s):
    open(R + p, 'w', encoding='utf-8').write(s)


def sub1(s, old, new, name):
    assert old in s, 'nao achei: ' + name
    return s.replace(old, new, 1)


def between(s, a, b, new, name):
    i = s.index(a)
    j = s.index(b, i)
    return s[:i] + new + s[j:]


# ------------------------------------------------------------------ data.js
s = rd('js/data.js')
s = between(s, "  const cursosCarreira = [", "  // Tabela de siglas", """  const cursosCarreira = [
    { id: 'cfo', sigla: 'CFO', nome: 'Curso de Formação de Oficiais', sprite: 'curso-cfo' },
    { id: 'cho', sigla: 'CHO', nome: 'Curso de Habilitação de Oficiais (Quadro Complementar)', sprite: 'curso-cho' },
    { id: 'cho2', sigla: 'CHO', nome: 'Curso de Habilitação de Oficiais (Quadro de Saúde)', sprite: 'curso-cho2' },
    { id: 'cfp', sigla: 'CFP', nome: 'Curso de Formação de Praças', sprite: 'curso-cfp' },
    { id: 'cao', sigla: 'CAO', nome: 'Curso de Aperfeiçoamento de Oficiais', sprite: 'curso-cao' },
    { id: 'cao-adm', sigla: 'CAO', nome: 'Curso de Aperfeiçoamento de Oficiais Adm./Esp.', sprite: 'curso-cao-adm' },
    { id: 'cap', sigla: 'CAP', nome: 'Curso de Aperfeiçoamento de Praças', sprite: 'curso-cap' },
    { id: 'caeo', sigla: 'CAEO', nome: 'Curso de Altos Estudos para Oficiais', sprite: 'curso-caeo', caeo: true },
    { id: 'caep', sigla: 'CAEP', nome: 'Curso de Altos Estudos para Praças', sprite: 'curso-caep' },
    { id: 'cpo', sigla: 'CPO', nome: 'Curso Preparatório de Oficiais', sprite: 'curso-cpo' },
    { id: 'outro', sigla: '', nome: 'Outro curso de carreira (informar sigla)' },
  ];

""", 'cursosCarreira')
s = sub1(s, "  const sangues =", "  // Unidades cujo efetivo usa boina no 3º A (pedido do usuário: COESP, GPCIU, GBS e GAEPH)\n  const obmsBoina = ['COESP', 'GPCIU', 'GBS', 'GAEPH'];\n\n  const sangues =", 'obmsBoina')
s = sub1(s, "obms, funcoes, sangues, coresFita };", "obms, obmsBoina, funcoes, sangues, coresFita };", 'export')
wr('js/data.js', s)

# ------------------------------------------------------------------ draw.js
s = rd('js/draw.js')

# colocação de brevês
s = sub1(s, "    const exts = cursos.filter((x) => x.externo);", "    let exts = cursos.filter((x) => x.externo);", 'exts')
s = sub1(s, "    const borracha = uni === '3a';", """    const borracha = uni === '3a';
    if (borracha) { // 3º A: brevês de instrutor ocupam as posições #1 a #4, nessa ordem
      const prim = (l) => l.filter((x) => x.instrutor).concat(l.filter((x) => !x.instrutor));
      ints = prim(ints); exts = prim(exts);
    }""", 'borracha')
s = between(s, "      if (sup3 && slots[3]) {", "      c.sup3 = sup3; c.sup4 = sup4;", """      if (sup3 && !sup4) {
        // até 9 barretas: a posição #3 some, mas o 3º brevê continua permitido e passa a ocupar a #4
        if (slots[3]) {
          if (slots[4]) suprimidos.push({ c: slots[4], pos: 4, motivo: 'uso de barretas (resta só a posição #4, ocupada pelo 3º brevê)' });
          slots[4] = slots[3]; slots[3] = null;
          add(c, { key: 'breves', nivel: 'info', titulo: 'Brevê na posição #4', texto: `Com barretas (até 9), a posição #3 é suprimida e o seu 3º brevê (${slots[4].sigla}) ocupa a posição #4. Com 10 ou mais barretas a #4 também é suprimida.`, pag: 'p. 18, 36', at: null });
        }
      } else {
        if (sup3 && slots[3]) { suprimidos.push({ c: slots[3], pos: 3, motivo: medalhas ? 'medalhas no peito esquerdo' : 'uso de barretas' }); slots[3] = null; }
        if (sup4 && slots[4]) { suprimidos.push({ c: slots[4], pos: 4, motivo: medalhas ? 'medalhas no peito esquerdo' : '10 ou mais barretas' }); slots[4] = null; }
      }
""", 'sup34')

# espaçamento vertical com elipses de instrutor
s = sub1(s, "  /* ---------- coberturas (insets) ---------- */", """  // posição do brevê metálico, abrindo espaço vertical quando há elipse(s) de instrutor (80 x 45 mm)
  function posBreve(G, B, pos) {
    const g0 = G.bp[pos], k = g0.k || 1;
    const el = (p) => { const cv = B.slots[p]; return !!(cv && cv.instrutor && !cv.semElipse && p <= 2); };
    let dy = 0;
    if (pos === 1 && el(1)) dy = -4;
    if (pos === 2) {
      const gap = (G.bp[1].y - g0.y) / k;
      const need = el(1) && el(2) ? 40 : (el(1) || el(2)) ? 33 : gap;
      dy = (el(1) ? -4 : 0) - Math.max(0, need - gap);
    }
    return Object.assign({}, g0, { y: g0.y + dy * k });
  }

  /* ---------- coberturas (insets) ---------- */""", 'posBreve')
s = sub1(s, "bvHtml += pl(G.bp[pos], breveMetal(cv, 0, 0, cv.instrutor && !cv.semElipse && pos <= 2));", "bvHtml += pl(posBreve(G, B, pos), breveMetal(cv, 0, 0, cv.instrutor && !cv.semElipse && pos <= 2));", 'bp tunica')
s = sub1(s, "bv += pl(G.bp[pos], breveMetal(cv, 0, 0, cv.instrutor && !cv.semElipse && pos <= 2));", "bv += pl(posBreve(G, B, pos), breveMetal(cv, 0, 0, cv.instrutor && !cv.semElipse && pos <= 2));", 'bp passeio')

# armas inclinadas ~45°, base para fora
s = sub1(s, "g += hs('arma', G.arma.map((a) => pl(a, armaMetal(c, 0, 0, 21, 0))).join(''), c.q.nome);", "g += hs('arma', G.arma.map((a, i) => pl(a, armaMetal(c, 0, 0, 21, i === 0 ? 45 : -45))).join(''), c.q.nome);", 'arma tunica')
s = sub1(s, "arma dourada de 30 mm, centralizada na largura da lapela e a 10 mm da base da gola superior, nos dois lados.", "arma dourada de 30 mm, centralizada na largura da lapela e a 10 mm da base da gola superior, nos dois lados, inclinada cerca de 45° com a base voltada para fora (para a base da lapela).", 'texto arma')
s = sub1(s, "arma: [{ x: 362, y: 172, r: -35, k: 2.1 }, { x: 588, y: 172, r: 35, k: 2.1 }],", "arma: [{ x: 362, y: 172, r: 42, k: 2.1 }, { x: 588, y: 172, r: -42, k: 2.1 }],", 'arma passeio')

# curso de carreira com o distintivo de cada curso
s = sub1(s, "      g += hs('curso', pl(G.car, distCarreira(0, 0, carSigla)), carSigla);\n      add(c, { key: 'curso', nivel: 'obrig', titulo: 'Distintivo de curso de carreira (' + carSigla + ')', texto: fem ?", "      g += hs('curso', pl(G.car, distCarreira(0, 0, carSigla, null, car.sprite)), carSigla);\n      add(c, { key: 'curso', nivel: 'obrig', titulo: 'Distintivo de curso de carreira (' + carSigla + ')', texto: fem ?", 'curso tunica')
s = sub1(s, "      g += hs('curso', pl(G.car, distCarreira(0, 0, carSigla)), carSigla);", "      g += hs('curso', pl(G.car, distCarreira(0, 0, carSigla, null, car.sprite)), carSigla);", 'curso passeio')
s = sub1(s, "g += hs('caeo', pl(G.caeo, distCarreira(0, 0, 'CAEO', 10)), 'CAEO bordado');", "g += hs('caeo', pl(G.caeo, `<g style=\"filter:grayscale(1) brightness(1.25)\">${distCarreira(0, 0, 'CAEO', 10, 'curso-caeo')}</g>`), 'CAEO bordado');", 'caeo')
s = between(s, "  function distCarreira(cx, cy, sigla, r) {\n    r = r || 11;\n    return `<g filter=\"url(#fSh)\">${spr('curso-carreira'", "  function obmDistintivo(c, cx, topY, comSuporte) {\n    const sg", """  function distCarreira(cx, cy, sigla, r, sprite) {
    r = r || 11;
    if (sprite && temSpr(sprite)) return `<g filter="url(#fSh)">${spr(sprite, cx, cy, r * 2.3)}</g>`;
    const t = sigla ? sigla.toUpperCase().slice(0, 5) : '?';
    return `<g filter="url(#fSh)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gGold)" stroke="#8a6410" stroke-width=".7"/><circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="#17294f"/>${textFit(t, cx, cy + 0.3, r * 1.15, Math.max(3.4, r * 0.4), '#fff')}</g>`;
  }
""", 'distCarreira')

# coberturas: pala sempre visível, enquadramento aberto
s = between(s, "  function palaDetalhe(c, cor, cx, cy, w) {", "  // IDs de gradiente/filtro", """  function palaDetalhe(c, cor, cx, cy) {
    const tipo = c.fn.id === 'cmtgeral' ? 'cmt' : (c.superior ? 'sup' : 'lisa');
    const leg = tipo === 'cmt' ? 'Pala do Comandante-Geral' : tipo === 'sup' ? 'Pala de oficial superior' : 'Pala lisa (seu posto/graduação)';
    return spr('pala-' + cor + '-' + tipo, cx, cy, 74) + `<text x="${cx}" y="${cy + 27}" text-anchor="middle" font-size="6.5" fill="#7a8290" font-family="Arial">${leg}</text>`;
  }
  function quepe(c, cx, cy) { return spr(c.fem ? 'quepe-f' : 'quepe-m', cx, cy - 34, 118) + palaDetalhe(c, 'preta', cx, cy + 62); }
  function boina(c, cx, cy) { return spr('boina', cx, cy - 6, 140); }
  function gorroPala(c, cx, cy, cor) {
    const lar = cor === COR.laranja;
    return spr(lar ? 'gorro-laranja' : 'gorro-vermelho', cx, cy - 38, 96) + palaDetalhe(c, lar ? 'laranja' : 'vermelho', cx, cy + 62);
  }
  // enquadramento da vista "Cobertura": cobre a cobertura, a pala e as legendas
  function hatVB(h, k) { k = k || h.k || 1; return `${f1(h.x - 95 * k)} ${f1(h.y - 105 * k)} ${f1(190 * k)} ${f1(205 * k)}`; }
  function manicaca(cx, cy, txt, id) {
    const w = 84, sz = (window.SPRITE_SIZE || {}).manicaca || [300, 96], h = w * sz[1] / sz[0];
    const fs = Math.min(7.2, 66 / (String(txt).length * 0.74));
    return `<g filter="url(#fSh)"><defs><path id="mp-${id}" d="M${cx - w * 0.41},${cy + h * 0.30} Q${cx},${cy - h * 0.62} ${cx + w * 0.41},${cy + h * 0.30}"/></defs>${image('manicaca', cx, cy, w, h)}
<text font-family="'Arial Black',Arial" font-size="${fs.toFixed(2)}" fill="#a9afb7" font-weight="900" letter-spacing=".3"><textPath href="#mp-${id}" startOffset="50%" text-anchor="middle">${esc(txt)}</textPath></text></g>`;
  }

""", 'coberturas')
s = sub1(s, "chaoLabel('Quepe', 640, 230)", "chaoLabel(fem ? 'Quepe feminino cinza-escuro' : 'Quepe cinza-escuro', 640, 252)", 'label quepe')
s = sub1(s, "    const r = finalizar(c, g, foto ? Object.assign({}, VB, G.vb) : Object.assign({}, VB));\n    r.aspect = foto ? G.aspect : '760 / 650';", "    const r = finalizar(c, g, foto ? Object.assign({}, VB, G.vb, { cobertura: hatVB({ x: G.hat.x, y: G.hat.y + 20 * G.hat.k }, G.hat.k) }) : Object.assign({}, VB));\n    r.aspect = foto ? G.aspect : '760 / 650';", 'vb tunica')

# 2º A: bibico sempre; boina como opção
s = between(s, "    const usaBoina = st.coesp;\n    const deb =", "    add(c, { key: 'cob2'", """    const deb = c.eOf || c.p.grupo === 'esp' ? 'vermelho' : (c.p.grupo === 'st' || ['sgt1', 'sgt2', 'sgt3'].includes(c.p.id) ? 'bege' : 'liso');
    const hat = `<g transform="translate(${G.hat.x},${G.hat.y - 70})">${bibicoFoto(c, deb, 0, 0, 300)}<text x="0" y="78" text-anchor="middle" font-size="16" fill="#7a8290" font-family="Arial">Gorro sem pala (bibico)</text></g>`;
    g += hs('cobertura', hat, 'Bibico');
    g += hs('boina', `<g transform="translate(${G.hat.x},${G.hat.y + 150}) scale(1.5) translate(-645,-150)">${boina(c, 645, 150)}</g><text x="${G.hat.x}" y="${G.hat.y + 232}" text-anchor="middle" font-size="16" fill="#7a8290" font-family="Arial">Boina azul-escuro (opcional)</text>`, 'Boina');
    add(c, { key: 'cobertura', nivel: 'obrig', titulo: 'Gorro sem pala (bibico)', texto: `Bibico azul-escuro, com debrum de 3 mm ${deb !== 'liso' ? deb + ' (' + (deb === 'vermelho' ? 'oficiais e praças especiais' : 'subtenentes e sargentos') + ')' : '— cabos e soldados não têm debrum'}; insígnia em miniatura a 30 mm da frente, lado esquerdo. Quando não usado, fica preso ao cinto, lado direito.`, pag: 'p. 34 (III), 90–91, 149', at: [G.hat.x, G.hat.y - 150] });
    add(c, { key: 'boina', nivel: 'opc', titulo: 'Boina azul-escuro (opcional)', texto: 'A boina pode substituir o bibico no 2º A, com o distintivo circular do símbolo do CBMDF no lado direito. Os militares do Comando Especializado e das unidades subordinadas usam boina.', pag: 'p. 34 (III), 91–92', at: [G.hat.x + 120, G.hat.y + 110] });
""", 'hat 2a')
s = sub1(s, "    const r = finalizar(c, g, Object.assign({}, VB, G.vb));\n    r.aspect = G.aspect;\n    return r;\n  }\n\n  /* =====================================================================\n     4º A", "    const r = finalizar(c, g, Object.assign({}, VB, G.vb, { cobertura: `${G.hat.x - 215} ${G.hat.y - 190} 430 450` }));\n    r.aspect = G.aspect;\n    return r;\n  }\n\n  /* =====================================================================\n     4º A", 'vb 2a')

# 4º A: símbolo maior e enquadramento do gorro
s = sub1(s, "simboloCBMDF(0, 0, c.fem ? 5.5 : 7)", "simboloCBMDF(0, 0, c.fem ? 9.5 : 13)", 'simbolo tfm')
s = sub1(s, "sym: { x: 351, y: 244 }", "sym: { x: 358, y: 243 }", 'sym m')
s = sub1(s, "sym: { x: 108, y: 223 }", "sym: { x: 112, y: 222 }", 'sym f')
s = sub1(s, "chaoLabel('Gorro com pala vermelho (opcional)', 645, 232)", "chaoLabel('Gorro com pala vermelho (opcional)', 645, 252)", 'label gorro v')
s = sub1(s, "    const r = finalizar(c, g, Object.assign({}, VB, G.vb));\n    r.aspect = G.aspect;\n    return r;\n  }\n\n  /* =====================================================================\n     3º A", "    const r = finalizar(c, g, Object.assign({}, VB, G.vb, { cobertura: hatVB({ x: G.hat.x, y: G.hat.y + 20 * G.hat.k }, G.hat.k) }));\n    r.aspect = G.aspect;\n    return r;\n  }\n\n  /* =====================================================================\n     3º A", 'vb tfm')

# 3º A
s = sub1(s, "    arma: { x: 507, y: 247, k: KP },", "    arma: { x: 507, y: 251.9, k: KP }, // base da arma na mesma linha da base dos cadarços", 'arma 3a')
s = between(s, "    manD: { x: 266", "    hat:", """    manD: { x: 270, y: 194, r: 34, k: 0.8 }, manE: { x: 744, y: 194, r: -34, k: 0.8 },
    band: { x: 238, y: 262, r: 34, k: KP * 0.7 }, emb: { x: 776, y: 262, r: -34, k: KP * 0.7 },
    div: [{ x: 190, y: 330, r: 34, k: KP * 0.8 }, { x: 824, y: 330, r: -34, k: KP * 0.8 }],
""", 'geo man')
s = sub1(s, "      g += hs('posto', G.div.map((d) => pl(d, divisas(c, 0, 0, 'preto', '#f1690f'))).join(''), c.p.nome);", "      g += G.luva.map((l) => pl(l, `<g filter=\"url(#fSh)\">${spr('luva-lisa', 0, 0, 40)}</g>`)).join('');\n      g += hs('posto', G.div.map((d) => pl(d, divisas(c, 0, 0, 'preto', '#f1690f'))).join(''), c.p.nome);", 'passadeira lisa')
s = sub1(s, "    const usaBoina = st.coesp;\n    const hatInner = (usaBoina ? boina(c, 645, 150) : gorroPala(c, 645, 150, COR.laranja, COR.laranjaEsc)) + chaoLabel(usaBoina ? 'Boina azul-escuro' : 'Gorro com pala laranja', 645, 232);", "    const usaBoina = D.obmsBoina.includes((st.obm || '').trim().toUpperCase());\n    const hatInner = (usaBoina ? boina(c, 645, 150) : gorroPala(c, 645, 150, COR.laranja, COR.laranjaEsc)) + chaoLabel(usaBoina ? 'Boina azul-escuro' : 'Gorro com pala laranja', 645, usaBoina ? 215 : 252);", 'boina 3a')
s = sub1(s, "titulo: usaBoina ? 'Boina (Comando Especializado)' : 'Gorro com pala laranja', texto: usaBoina ? 'Militares do Comando Especializado e unidades subordinadas usam boina azul-escuro no lugar do gorro com pala.'", "titulo: usaBoina ? 'Boina azul-escuro (' + st.obm.toUpperCase() + ')' : 'Gorro com pala laranja', texto: usaBoina ? 'Sua lotação (COESP, GPCIU, GBS ou GAEPH) usa boina azul-escuro no lugar do gorro com pala, com o distintivo circular do símbolo do CBMDF no lado direito.'", 'texto boina 3a')
s = sub1(s, "    add(c, { key: 'bermuda', nivel: 'info', titulo: 'Bermuda de malha preta', texto: 'No serviço operacional o 3º A", "    add(c, { key: 'gola', nivel: 'info', titulo: 'Gola: dobrada ou elevada', texto: 'A gola do 3º A pode ser usada dobrada ou elevada, a critério do militar. Com a tropa em forma o uso é padronizado: preferencialmente dobrada em ambientes fechados e elevada em ambientes abertos, como proteção contra o sol. Veja a figura abaixo.', pag: 'p. 46 (XIV), 47', at: [507, 70] });\n    add(c, { key: 'bermuda', nivel: 'info', titulo: 'Bermuda de malha preta', texto: 'No serviço operacional o 3º A", 'gola')
s = sub1(s, "    const r = finalizar(c, g, Object.assign({}, VB, G.vb));\n    r.aspect = G.aspect;\n    return r;\n  }\n\n", "    const r = finalizar(c, g, Object.assign({}, VB, G.vb, { cobertura: hatVB({ x: G.hat.x, y: G.hat.y + 20 * G.hat.k }, G.hat.k) }));\n    r.aspect = G.aspect;\n    return r;\n  }\n\n", 'vb 3a')
s = sub1(s, "Até 4: ${lista.join('; ')}. Suporte elíptico", "Até 4: ${lista.join('; ')}. Os brevês de instrutor ocupam primeiro as posições #1, #2, #3 e #4, nessa ordem. Suporte elíptico", 'texto instr')
wr('js/draw.js', s)

# ------------------------------------------------------------------ uniformes.js
s = rd('js/uniformes.js')
figs = {
    "'1b': {": "figuras: [{ src: 'assets/fotos/fig-lapela.jpg', cap: 'Modo correto de uso da arma do quadro na lapela (túnica, 30 mm) e na gola (passeio, 20 mm) — figura do regulamento, p. 151.' }],",
    "'2a': {": "figuras: [{ src: 'assets/fotos/fig-lapela.jpg', cap: 'Modo correto de uso da arma do quadro: na gola do 2º A (20 mm) e na lapela da túnica (30 mm) — figura do regulamento, p. 151.' }],",
    "'3a': {": "figuras: [{ src: 'assets/fotos/fig-gola.jpg', cap: 'Gola elevada (à esquerda) e gola dobrada (à direita) — figura do regulamento, p. 47. Em forma: dobrada em ambientes fechados e elevada em ambientes abertos.' }, { src: 'assets/fotos/fig-breves-3a.jpg', cap: 'Posições #1 a #4 dos brevês, manicacas e arma na carcela — figura do regulamento, p. 160.' }],",
    "'4a': {": "figuras: [{ src: 'assets/fotos/fig-meia.jpg', cap: 'Uso da meia com tênis: a meia de cano alto deve ser dobrada, bem ajustada à perna; é vedado usá-la frouxa ou totalmente estendida — figura do regulamento, p. 117.' }],",
}
for k, v in figs.items():
    if v[:20] not in s:
        s = sub1(s, k, k + '\n    ' + v, 'fig ' + k)
wr('js/uniformes.js', s)

# ------------------------------------------------------------------ index.html
s = rd('index.html')
s = between(s, '      <label class="chk"><input id="f-coesp"', '    </section>', '', 'coesp html')
s = between(s, '      <p class="hint">O regulamento não lista as medalhas', '    </section>', """      <p class="hint">Informe só a quantidade; o app distribui fitas de cores variadas. Só se usam após publicação em Boletim Geral.</p>
      <label class="fld"><span>Quantidade de condecorações <small>(0 a 32)</small></span><input id="f-ncond" type="number" min="0" max="32" step="1" inputmode="numeric" value="0"></label>
      <div class="seg full" role="radiogroup" aria-label="Condecorações na túnica">
        <label><input type="radio" name="f-modo" value="medalhas"><span>Túnica com medalhas</span></label>
        <label><input type="radio" name="f-modo" value="barretas"><span>Túnica com barretas</span></label>
      </div>
""", 'cond html')
s = re.sub(r'\?v=\d+', '?v=30', s)
wr('index.html', s)

# ------------------------------------------------------------------ app.js
s = rd('js/app.js')
s = between(s, "    medalhas: [\n", "    modo:", "    nCond: 3, medalhas: [],\n", 'exemplo medalhas')
s = sub1(s, "cursos: [], medalhas: [], modo: 'barretas'", "cursos: [], nCond: 0, medalhas: [], modo: 'barretas'", 'vazio')
s = sub1(s, "  function carregar() {", """  // condecorações: só a quantidade; as fitas são sorteadas de forma estável (mesma quantidade => mesmas cores)
  function gerarCondecoracoes(n) {
    const out = [];
    let x = 7;
    for (let i = 0; i < n; i++) { x = (x * 73 + 41 + i * 11) % 997; out.push({ nome: 'Condecoração ' + (i + 1), tipo: 'medalha', origem: 'cbmdf', cor: D.coresFita[x % D.coresFita.length].id }); }
    return out;
  }
  function normalizar(s) {
    if (typeof s.nCond !== 'number') s.nCond = (s.medalhas || []).filter((m) => m.tipo !== 'comenda').length;
    s.nCond = Math.max(0, Math.min(32, Math.round(s.nCond) || 0));
    s.medalhas = gerarCondecoracoes(s.nCond);
    if (s.carreira && s.carreira.id && !D.cursosCarreira.some((c) => c.id === s.carreira.id)) s.carreira.id = '';
    return s;
  }
  function carregar() {""", 'gerar')
s = sub1(s, "return Object.assign(clone(EXEMPLO), o.st); } }", "return normalizar(Object.assign(clone(EXEMPLO), o.st)); } }", 'carregar norm')
s = sub1(s, "    return clone(EXEMPLO);\n  }", "    return normalizar(clone(EXEMPLO));\n  }", 'carregar ex')
s = sub1(s, "    $('#m-cor').innerHTML = D.coresFita.map((c) => `<option value=\"${c.id}\">Fita: ${esc(c.nome)}</option>`).join('');\n", "", 'm-cor')
s = sub1(s, "$('#f-obm').value = st.obm; $('#f-coesp').checked = !!st.coesp;", "$('#f-obm').value = st.obm; $('#f-ncond').value = st.nCond;", 'refletir')
s = sub1(s, "    validarObm(); listarCursos(); listarMedalhas();", "    validarObm(); listarCursos();", 'listar')
s = between(s, "  function listarMedalhas() {", "  function mover(", "", 'listarMedalhas')
s = sub1(s, "    $('#f-coesp').addEventListener('change', (e) => { st.coesp = e.target.checked; mudou(); });\n", "    $('#f-ncond').addEventListener('input', (e) => { st.nCond = Math.max(0, Math.min(32, parseInt(e.target.value, 10) || 0)); st.medalhas = gerarCondecoracoes(st.nCond); mudou(); });\n    $('#f-ncond').addEventListener('change', (e) => { e.target.value = st.nCond; });\n", 'ncond handler')
s = between(s, "    $('#btn-medalha-add').addEventListener('click'", "    $('#btn-exemplo')", "", 'handlers medalha')
s = sub1(s, "st = clone(EXEMPLO); refletirFicha(); mudou();", "st = normalizar(clone(EXEMPLO)); refletirFicha(); mudou();", 'btn exemplo')
s = sub1(s, "st = clone(VAZIO); refletirFicha(); mudou();", "st = normalizar(clone(VAZIO)); refletirFicha(); mudou();", 'btn limpar')
s = sub1(s, " <div class=\"box espec\"><h3>Especificidades do regulamento</h3>${u.espec.map((e) => `<details><summary>${esc(e[0])}</summary><p>${esc(e[1])} <span class=\"pag\">${esc(e[2])}</span></p></details>`).join('')}</div>\n</div>", " <div class=\"box espec\"><h3>Especificidades do regulamento</h3>${u.espec.map((e) => `<details><summary>${esc(e[0])}</summary><p>${esc(e[1])} <span class=\"pag\">${esc(e[2])}</span></p></details>`).join('')}</div>\n</div>\n${(u.figuras || []).length ? `<div class=\"box figs\"><h3>Modo correto de uso — figuras do regulamento</h3><div class=\"figs-grid\">${u.figuras.map((f) => `<figure><img src=\"${f.src}\" alt=\"${esc(f.cap)}\" loading=\"lazy\"><figcaption>${esc(f.cap)}</figcaption></figure>`).join('')}</div></div>` : ''}", 'figs box')
s = sub1(s, "    if (key === 'cobertura') return 'cobertura';", "    if (key === 'cobertura' || key === 'boina') return 'cobertura';", 'view boina')
wr('js/app.js', s)

# ------------------------------------------------------------------ css
s = rd('css/style.css')
if '.figs-grid' not in s:
    s = s.replace("@media (max-width: 1280px)", ".figs { margin-top: 16px; }\n.figs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }\n.figs figure { margin: 0; }\n.figs img { width: 100%; height: auto; display: block; background: #fff; border-radius: 8px; border: 1px solid var(--line); }\n.figs figcaption { font-size: 12.5px; color: var(--muted); margin-top: 6px; }\n\n@media (max-width: 1280px)", 1)
    wr('css/style.css', s)
print('patch ok')
