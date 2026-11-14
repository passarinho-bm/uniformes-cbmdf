/* Motor de desenho (SVG) + regras dinâmicas. Escala: 0,7 px por mm de uniforme. */
window.Draw = (function () {
  const D = window.CBMDF;
  const SPR = 'assets/sprites/';
  const MQ = '#aeb4bd'; // manequim (pele neutra)
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (n) => Math.round(n * 10) / 10;

  const COR = {
    cinza: '#454d59', cinzaEsc: '#39404a', cinzaLinha: '#5c6573',
    bege: '#c9a47f', begeEsc: '#a8855f', azul: '#1f3a6e', azulEsc: '#17294f', calca: '#1d3566',
    laranja: '#ff6a13', laranjaEsc: '#d9560a', vermelho: '#c8141e', vermelhoEsc: '#9d0f17',
    ouro: '#d4a52a', prata: '#c9ced6', preto: '#15181d', branco: '#f4f5f7',
  };

  /* ---------- helpers de estado ---------- */
  function ctxOf(st) {
    const p = D.postos.find((x) => x.id === st.posto) || D.postos[0];
    const lista = p.grupo === 'praca' || p.grupo === 'st' ? D.qualificacoesPracas : D.quadrosOficiais;
    const q = lista.find((x) => x.id === st.quadro) || lista[0];
    const fn = D.funcoes.find((x) => x.id === st.funcao) || D.funcoes[0];
    const nome = (st.nome || 'NOME').toUpperCase();
    const sangue = st.sangue || 'O+';
    const eOf = p.grupo === 'of';
    return {
      st, p, q, fn, nome, sangue, eOf,
      plat: p.grupo !== 'praca', // usa platinas/luvas (oficiais, praças especiais, subtenentes)
      praca: p.grupo === 'praca',
      superior: ['cel', 'tc', 'maj'].includes(p.id),
      plaq: p.abrev + ' ' + nome + ' ' + sangue,
      fem: st.sexo === 'F',
      items: [],
    };
  }
  function add(c, it) { c.items.push(it); }
  const hs = (key, inner, title) => `<g class="hs" data-hs="${key}">${title ? `<title>${esc(title)}</title>` : ''}${inner}</g>`;

  function resolverCurso(entry) {
    const cat = D.cursosEsp.find((x) => x.id === entry.id);
    if (cat) return Object.assign({ externo: !!entry.externo, instrutor: !!entry.instrutor }, cat);
    return { id: entry.id, sigla: (entry.sigla || 'CURSO').toUpperCase(), nome: entry.nome || entry.sigla || 'Curso', insc: (entry.sigla || 'CURSO').toUpperCase(), func: false, sprite: null, externo: !!entry.externo, instrutor: !!entry.instrutor };
  }

  /* ---------- peças gráficas ---------- */
  function defs() {
    return `<defs>
<linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e08a"/><stop offset=".5" stop-color="#cf9d27"/><stop offset="1" stop-color="#f3d063"/></linearGradient>
<linearGradient id="gSilver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6f9"/><stop offset=".5" stop-color="#aab1bb"/><stop offset="1" stop-color="#e6eaef"/></linearGradient>
<linearGradient id="gShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
<filter id="fSh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity=".45"/></filter>
</defs>`;
  }
  function image(name, cx, cy, w, h, style) {
    const src = (window.SPRITES && window.SPRITES[name]) || (SPR + name + '.png');
    return `<image href="${src}" x="${f1(cx - w / 2)}" y="${f1(cy - h / 2)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${style ? ` style="${style}"` : ''}/>`;
  }
  function textFit(txt, cx, cy, w, size, fill, weight) {
    return `<text x="${f1(cx)}" y="${f1(cy)}" text-anchor="middle" dominant-baseline="central" font-family="'Arial Black','Arial',sans-serif" font-weight="${weight || 900}" font-size="${size}" fill="${fill}" textLength="${w}" lengthAdjust="spacingAndGlyphs">${esc(txt)}</text>`;
  }
  function botao(cx, cy, r, cor) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${cor || 'url(#gGold)'}" stroke="#0004" stroke-width=".6"/>`;
  }

  // Estrela/insígnia de posto (sprite do regulamento). tam = lado em px.
  function estrela(tipo, cx, cy, tam) {
    const nome = { CG: 'estrela-composta-ouro', CP: 'estrela-composta-prata', SP: 'estrela-simples-prata', AS: 'estrela-aspirante' }[tipo];
    return image('posto-' + nome, cx, cy, tam, tam);
  }
  function trianguloST(cx, cy, lado) {
    const h = lado * 0.866;
    const a = `${cx},${cy - h * 0.62} ${cx - lado / 2},${cy + h * 0.38} ${cx + lado / 2},${cy + h * 0.38}`;
    const k = lado * 0.22, h2 = h - k * 1.9;
    return `<polygon points="${a}" fill="none" stroke="url(#gGold)" stroke-width="${f1(lado * 0.17)}" stroke-linejoin="miter"/>`;
  }

  // Conteúdo central de uma platina rígida / luva (linha de estrelas ao longo do eixo x).
  function conteudoPosto(c, tam, gap, cx0) {
    const p = c.p;
    let s = '';
    if (p.stars) {
      const n = p.stars.length, total = n * tam + (n - 1) * gap;
      p.stars.forEach((t, i) => { s += estrela(t, cx0 - total / 2 + tam / 2 + i * (tam + gap), 0, tam); });
    } else if (p.cadete) {
      s += image('posto-cadete-emblema', cx0, -tam * 0.18, tam * 0.9, tam * 1.1);
      const bar = p.cadete === 2 ? 'posto-cadete-barra-2' : 'posto-cadete-barra-1';
      s += image(bar, cx0, tam * 0.62, tam * 1.1, p.cadete === 2 ? tam * 0.4 : tam * 0.17);
    } else if (p.id === 'st') {
      s += trianguloST(cx0, 0, tam * 1.2);
    }
    return s;
  }

  // Platina rígida (1º e 2º grupos): 130x60 mm
  function platina(c, cx, cy, rot, fundo, side) {
    const L = 91, W = 42;
    const fn = c.fn;
    let inner = '';
    const borda = c.superior || fn.id ? 'url(#gGold)' : (c.eOf ? 'url(#gSilver)' : null);
    inner += `<rect x="${-L / 2}" y="${-W / 2}" width="${L}" height="${W}" rx="3" fill="${fundo}" stroke="#0007" stroke-width=".8"/>`;
    if (borda && (c.eOf || fn.id)) {
      inner += `<rect x="${-L / 2 + 1.4}" y="${-W / 2 + 1.4}" width="${L - 2.8}" height="2.2" fill="${borda}"/><rect x="${-L / 2 + 1.4}" y="${W / 2 - 3.6}" width="${L - 2.8}" height="2.2" fill="${borda}"/>`;
    }
    inner += botao(-L / 2 + 8, 0, 3.6);
    if (fn.id === 'cmtgeral') {
      inner += `<circle cx="-14" cy="0" r="7" fill="url(#gGold)"/>` + estrela('CG', 8, -8, 9) + estrela('CG', 2, 5, 9) + estrela('CG', 14, 5, 9);
      inner += `<path d="M-30,-14 Q4,-22 36,-14 M-30,14 Q4,22 36,14" fill="none" stroke="${COR.ouro}" stroke-width="1.6" stroke-dasharray="2 1.6"/>`;
    } else if (fn.id === 'subcmt') {
      inner += estrela('CG', -4, 0, 14) + estrela('CG', 10, 0, 14) + estrela('CG', 24, 0, 14);
      inner += `<path d="M-14,-15 Q16,-21 34,-14 M-14,15 Q16,21 34,14" fill="none" stroke="${COR.ouro}" stroke-width="1.4" stroke-dasharray="2 1.4"/>`;
    } else {
      inner += conteudoPosto(c, 17.5, 7, 6);
    }
    return `<g transform="translate(${cx},${cy}) rotate(${rot})" filter="url(#fSh)">${inner}</g>`;
  }

  // Luva amovível (3º grupo): trapézio 100x55x60 mm
  function luva(c, cx, cy, rot) {
    const L = 70, W1 = 38, W2 = 42;
    let inner = `<path d="M${-L / 2},${-W1 / 2} L${L / 2},${-W2 / 2} L${L / 2},${W2 / 2} L${-L / 2},${W1 / 2} Z" fill="${COR.laranjaEsc}" stroke="#0006" stroke-width=".7"/>`;
    if (c.p.grupo === 'of') {
      const cor = c.superior ? COR.ouro : COR.prata;
      inner += `<line x1="${-L / 2}" y1="${-W1 / 2 + 1.1}" x2="${L / 2}" y2="${-W2 / 2 + 1.1}" stroke="${cor}" stroke-width="2.1"/><line x1="${-L / 2}" y1="${W1 / 2 - 1.1}" x2="${L / 2}" y2="${W2 / 2 - 1.1}" stroke="${cor}" stroke-width="2.1"/>`;
    }
    if (c.p.stars) {
      const n = c.p.stars.length, tam = 21;
      inner += c.p.stars.map((t, i) => estrela(t, -((n - 1) * tam) / 2 + i * tam, 0, tam)).join('');
    } else inner += conteudoPosto(c, 21, 0, 0);
    return `<g transform="translate(${cx},${cy}) rotate(${rot})">${inner}</g>`;
  }

  // Divisas de praças. modo: 'ouro' (túnica) | 'preto' (prontidão). Retorna grupo centrado em (cx, topo).
  function divisas(c, cx, top, modo, baseOverride) {
    const d = c.p.divisas;
    const W = 49, w = 42, t = 4.2, pitch = 5.6, h = 16;
    const nCh = d.length;
    const Hh = nCh ? h + pitch * (nCh - 1) + t + 8 : 22;
    const baseFill = baseOverride || (modo === 'ouro' ? COR.cinzaEsc : COR.laranja);
    let s = `<path d="M${cx - W / 2},${top} L${cx + W / 2},${top} L${cx + W / 2},${top + Hh} L${cx},${top + Hh + 9} L${cx - W / 2},${top + Hh} Z" fill="${baseFill}" stroke="${modo === 'ouro' ? '#6a7380' : '#a53d00'}" stroke-width="1"/>`;
    for (let i = 0; i < nCh; i++) {
      const y = top + 5 + i * pitch;
      const cor = d[i] === 'c' ? '#d7dce3' : (modo === 'ouro' ? 'url(#gGold)' : '#111');
      const cor2 = d[i] === 'c' && modo === 'ouro' ? '#d7dce3' : cor;
      s += `<path d="M${cx - w / 2},${y} L${cx},${y + h} L${cx + w / 2},${y} L${cx + w / 2},${y + t} L${cx},${y + h + t} L${cx - w / 2},${y + t} Z" fill="${d[i] === 'c' ? '#d7dce3' : cor2}" stroke="#0005" stroke-width=".4"/>`;
    }
    if (!nCh) s += `<text x="${cx}" y="${top + 14}" text-anchor="middle" font-size="6" fill="#fff" font-family="Arial">sem divisa</text>`;
    // arma da qualificação centrada sobre a divisa superior
    if (nCh) {
      const filt = modo === 'ouro' ? 'filter:drop-shadow(0 0 1px #000) drop-shadow(0 0 1.4px #000)' : 'filter:brightness(0)';
      s += image('arma-' + c.q.sprite, cx, top + 11.5, 15, 19, filt);
    }
    return s;
  }
  // divisa/insígnia metálica de gola (2º A) — miniatura
  function divisaGola(c, cx, cy) {
    const d = c.p.divisas;
    if (!d) return '';
    let s = `<path d="M${cx - 7},${cy - 9} L${cx + 7},${cy - 9} L${cx + 7},${cy + 6} L${cx},${cy + 11} L${cx - 7},${cy + 6} Z" fill="url(#gGold)" stroke="#0006" stroke-width=".5"/>`;
    for (let i = 0; i < d.length; i++) {
      const y = cy - 7 + i * 2.6;
      s += `<path d="M${cx - 5.5},${y} L${cx},${y + 3.2} L${cx + 5.5},${y} L${cx + 5.5},${y + 1.2} L${cx},${y + 4.4} L${cx - 5.5},${y + 1.2} Z" fill="${d[i] === 'c' ? '#fff' : '#222'}"/>`;
    }
    return s;
  }

  /* ---------- distintivos ---------- */
  function breveGenerico(cx, cy, w, sigla) {
    const h = w * 0.42;
    return `<g><path d="M${cx},${cy} C${cx - w * 0.18},${cy - h * 0.55} ${cx - w * 0.38},${cy - h * 0.62} ${cx - w / 2},${cy - h * 0.15} C${cx - w * 0.38},${cy + h * 0.32} ${cx - w * 0.15},${cy + h * 0.5} ${cx},${cy + h * 0.38} Z" fill="url(#gGold)" stroke="#8a6410" stroke-width=".5"/>
<path d="M${cx},${cy} C${cx + w * 0.18},${cy - h * 0.55} ${cx + w * 0.38},${cy - h * 0.62} ${cx + w / 2},${cy - h * 0.15} C${cx + w * 0.38},${cy + h * 0.32} ${cx + w * 0.15},${cy + h * 0.5} ${cx},${cy + h * 0.38} Z" fill="url(#gGold)" stroke="#8a6410" stroke-width=".5"/>
<circle cx="${cx}" cy="${cy}" r="${w * 0.17}" fill="${COR.vermelhoEsc}" stroke="${COR.ouro}" stroke-width="1"/>${textFit(sigla.slice(0, 7), cx, cy, w * 0.24, Math.max(3, w * 0.06), '#fff')}</g>`;
  }
  // brevê metálico (1º/2º grupos); ellipse = elipse aveludada de instrutor
  function breveMetal(cv, cx, cy, ellipse) {
    let s = '';
    if (ellipse) s += `<ellipse cx="${cx}" cy="${cy}" rx="28" ry="15.8" fill="#9c111b" stroke="#111" stroke-width="1.3"/>`;
    s += cv.sprite ? image('breve-' + cv.sprite, cx, cy, 46, 22) : breveGenerico(cx, cy, 44, cv.sigla);
    return s;
  }
  // brevê emborrachado (3º grupo): suporte elíptico preto 80x45 mm, borda cinza 3 mm (amarela p/ instrutor)
  function breveBorracha(cv, cx, cy, instrutor) {
    let s = `<ellipse cx="${cx}" cy="${cy}" rx="28" ry="15.8" fill="#14171b" stroke="${instrutor ? '#f2c200' : '#8d949d'}" stroke-width="2.2"/>`;
    s += cv.sprite ? image('breve-' + cv.sprite, cx, cy, 44, 21, 'filter:grayscale(1) brightness(1.05) contrast(1.05)') : `<g style="filter:grayscale(1)">${breveGenerico(cx, cy, 42, cv.sigla)}</g>`;
    return s;
  }
  function distCarreira(cx, cy, sigla, r) {
    r = r || 11;
    const t = sigla ? sigla.toUpperCase().slice(0, 5) : '?';
    return `<g filter="url(#fSh)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gGold)" stroke="#8a6410" stroke-width=".7"/><circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="${COR.azulEsc}"/>${textFit(t, cx, cy + 0.3, r * 1.15, Math.max(3.4, r * 0.4), '#fff')}</g>`;
  }
  function simboloCBMDF(cx, cy, r) {
    return `<g><path d="M${cx - r * 0.55},${cy - r * 0.55} L${cx + r * 0.55},${cy - r * 0.55} L${cx + r * 0.55},${cy + r * 0.1} Q${cx},${cy + r * 0.85} ${cx - r * 0.55},${cy + r * 0.1} Z" fill="${COR.vermelho}" stroke="#d9d9d9" stroke-width="${r * 0.1}"/><polygon points="${cx},${cy - r * 0.35} ${cx + r * 0.1},${cy - r * 0.07} ${cx + r * 0.4},${cy - r * 0.07} ${cx + r * 0.16},${cy + r * 0.1} ${cx + r * 0.25},${cy + r * 0.38} ${cx},${cy + r * 0.21} ${cx - r * 0.25},${cy + r * 0.38} ${cx - r * 0.16},${cy + r * 0.1} ${cx - r * 0.4},${cy - r * 0.07} ${cx - r * 0.1},${cy - r * 0.07}" fill="${COR.ouro}"/><path d="M${cx - r * 0.7},${cy + r * 0.55} L${cx + r * 0.7},${cy - r * 0.2} M${cx + r * 0.7},${cy + r * 0.55} L${cx - r * 0.7},${cy - r * 0.2}" stroke="#7a5a35" stroke-width="${r * 0.14}"/></g>`;
  }
  function obmDistintivo(c, cx, topY, comSuporte) {
    const sg = (c.st.obm || 'OBM').toUpperCase();
    let s = '';
    let sy = topY + 14; // topo do escudo
    if (comSuporte) {
      s += `<path d="M${cx - 8},${topY} Q${cx - 8},${topY - 3} ${cx},${topY - 3} Q${cx + 8},${topY - 3} ${cx + 8},${topY} L${cx + 8},${topY + 20} L${cx + 12},${topY + 20} L${cx + 12},${topY + 38} A12,12 0 0 1 ${cx - 12},${topY + 38} L${cx - 12},${topY + 20} L${cx - 8},${topY + 20} Z" fill="#14171b" stroke="#444" stroke-width=".6"/><circle cx="${cx}" cy="${topY + 3}" r="1.8" fill="#000" stroke="#555" stroke-width=".5"/>`;
      sy = topY + 17;
    }
    s += `<path d="M${cx - 9.5},${sy} L${cx + 9.5},${sy} L${cx + 9.5},${sy + 14} Q${cx + 9.5},${sy + 24} ${cx},${sy + 27} Q${cx - 9.5},${sy + 24} ${cx - 9.5},${sy + 14} Z" fill="#f2f2f2" stroke="${COR.ouro}" stroke-width="1"/><rect x="${cx - 9.5}" y="${sy}" width="19" height="6.4" fill="${COR.vermelho}"/>${textFit(sg, cx, sy + 3.3, 16, 3.6, '#f5d36a')}`;
    s += simboloCBMDF(cx, sy + 15.5, 6.5);
    return `<g filter="url(#fSh)">${s}</g>`;
  }
  function plaqueta(c, cx, cy, cor) {
    const w = 56, h = 12.6;
    const dour = cor === 'ouro';
    return `<g filter="url(#fSh)"><rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="1.2" fill="${dour ? 'url(#gGold)' : '#b5121b'}" stroke="${dour ? '#8a6410' : '#6d0a10'}" stroke-width=".6"/>${textFit(c.plaq, cx, cy + 0.2, w - 5, 5.2, dour ? '#111' : '#fff')}</g>`;
  }
  function bandeiraDF(cx, topY) {
    // 80x60 mm -> 56x42 px; campo branco com losango/faixas (representação)
    const w = 56, h = 42, x = cx - w / 2;
    return `<g filter="url(#fSh)"><rect x="${x}" y="${topY}" width="${w}" height="${h}" fill="#fafafa" stroke="#9aa0a8" stroke-width=".6"/><rect x="${x}" y="${topY}" width="${w}" height="${h * 0.16}" fill="#c8141e"/><rect x="${x}" y="${topY + h * 0.2}" width="${w}" height="${h * 0.12}" fill="#1d3f8f"/><rect x="${x}" y="${topY + h * 0.68}" width="${w}" height="${h * 0.12}" fill="#1d3f8f"/><rect x="${x}" y="${topY + h * 0.84}" width="${w}" height="${h * 0.16}" fill="#c8141e"/><polygon points="${cx},${topY + h * 0.36} ${cx + 8},${topY + h * 0.5} ${cx},${topY + h * 0.64} ${cx - 8},${topY + h * 0.5}" fill="#f2c200" stroke="#1c7a3a" stroke-width="1"/></g>`;
  }
  function emblema(cx, topY) {
    const r = 23.5;
    return `<g filter="url(#fSh)"><circle cx="${cx}" cy="${topY + r}" r="${r}" fill="${COR.vermelho}" stroke="#111" stroke-width="1"/><circle cx="${cx}" cy="${topY + r}" r="${r * 0.74}" fill="#8f949b" stroke="#fff" stroke-width=".6"/>${simboloCBMDF(cx, topY + r, 11)}<text x="${cx}" y="${topY + 6.4}" text-anchor="middle" font-size="3.3" font-weight="700" fill="#fff" font-family="Arial">CORPO DE BOMBEIROS MILITAR</text></g>`;
  }
  // manicaca (meia-lua) emborrachada 120x30 mm
  function manicaca(cx, cy, txt, id) {
    const rx = 36, ry = 9;
    return `<g filter="url(#fSh)"><defs><path id="mp-${id}" d="M${cx - 30},${cy + 5} Q${cx},${cy - 6} ${cx + 30},${cy + 5}"/></defs>
<path d="M${cx - rx},${cy + 8} Q${cx},${cy - 10} ${cx + rx},${cy + 8} L${cx + 29},${cy + 8} Q${cx},${cy - 2} ${cx - 29},${cy + 8} Z" fill="#14171b" stroke="#8d949d" stroke-width="1.2"/>
<text font-family="'Arial Black',Arial" font-size="5.2" fill="#aeb4bc" font-weight="900"><textPath href="#mp-${id}" startOffset="50%" text-anchor="middle">${esc(txt)}</textPath></text></g>`;
  }
  function armaMetal(c, cx, cy, alt, rot) {
    return `<g transform="rotate(${rot || 0} ${cx} ${cy})" filter="url(#fSh)">${image('arma-' + c.q.sprite, cx, cy, alt * 0.8, alt)}</g>`;
  }
  function armaBorracha(c, cx, cy) {
    return `<g><rect x="${cx - 8.8}" y="${cy - 14}" width="17.5" height="28" rx="1" fill="#14171b" stroke="#8d949d" stroke-width="1.2"/>${image('arma-' + c.q.sprite, cx, cy, 11, 21, 'filter:grayscale(1) brightness(.95)')}</g>`;
  }
  function aplique(fn, cx, cy) {
    const w = 20, h = 15;
    let s = `<path d="M${cx - w / 2},${cy - h / 2} L${cx + w / 2},${cy - h / 2} L${cx + w / 2},${cy + h * 0.15} Q${cx},${cy + h * 0.75} ${cx - w / 2},${cy + h * 0.15} Z" fill="${fn.cor}" stroke="${COR.ouro}" stroke-width="1.3"/>`;
    if (fn.forma === 'capacete') s += `<path d="M${cx - 4},${cy + 2} Q${cx - 4},${cy - 5} ${cx},${cy - 5} Q${cx + 4},${cy - 5} ${cx + 4},${cy + 2} Z" fill="${COR.ouro}"/><line x1="${cx + 6}" y1="${cy - 5}" x2="${cx - 6}" y2="${cy + 5}" stroke="${COR.ouro}" stroke-width="1"/>`;
    else s += `<path d="M${cx - 5},${cy + 1} L${cx - 4},${cy - 4} L${cx - 1.5},${cy - 1.5} L${cx},${cy - 5} L${cx + 1.5},${cy - 1.5} L${cx + 4},${cy - 4} L${cx + 5},${cy + 1} Z" fill="${COR.ouro}"/>` + (fn.forma === 'coroa-espada' ? `<line x1="${cx}" y1="${cy - 7}" x2="${cx}" y2="${cy + 5}" stroke="#eee" stroke-width="1.1"/>` : '');
    return `<g filter="url(#fSh)">${s}</g>`;
  }

  /* ---------- condecorações ---------- */
  function corFita(m) {
    const f = D.coresFita.find((x) => x.id === m.cor) || D.coresFita[0];
    return f.c;
  }
  function fitaListras(x, y, w, h, c) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c[0]}"/><rect x="${x + w * 0.2}" y="${y}" width="${w * 0.12}" height="${h}" fill="${c[1]}"/><rect x="${x + w * 0.68}" y="${y}" width="${w * 0.12}" height="${h}" fill="${c[1]}"/>`;
  }
  function ordenarCondecoracoes(lista) {
    // CBMDF primeiro (na ordem de precedência informada), depois demais Forças por ordem cronológica (p.172)
    const cb = lista.filter((m) => m.origem === 'cbmdf');
    const ou = lista.filter((m) => m.origem !== 'cbmdf').sort((a, b) => (+a.ano || 9999) - (+b.ano || 9999));
    return cb.concat(ou);
  }
  function linhasMedalhas(n) {
    const counts = [];
    for (let i = 0; i < Math.floor(n / 4); i++) counts.push(4);
    const rem = n % 4;
    if (rem) counts.push(rem);
    if (rem === 1 && counts.length >= 2) { counts[counts.length - 1] = 2; counts[counts.length - 2] = 3; }
    return counts; // de baixo para cima
  }
  function linhasBarretas(n) {
    if (n <= 2) return [n];
    const cols = n > 15 ? 4 : 3;
    const counts = [];
    for (let i = 0; i < Math.floor(n / cols); i++) counts.push(cols);
    if (n % cols) counts.push(n % cols);
    return counts;
  }
  function desenharMedalhas(lista, cx, baseY) {
    const counts = linhasMedalhas(lista.length);
    // ordem de leitura: fileira superior primeiro
    let idx = 0;
    const rowsTop = counts.slice().reverse();
    const pos = [];
    rowsTop.forEach((n, ri) => { for (let k = 0; k < n; k++) pos.push({ ri, k, n, m: lista[idx++] }); });
    let s = '';
    for (let rb = 0; rb < counts.length; rb++) { // desenha de baixo p/ cima (fileira superior por cima)
      const ri = counts.length - 1 - rb;
      pos.filter((p) => p.ri === ri).forEach((p) => {
        const x = cx - (p.n * 25) / 2 + 12.5 + p.k * 25;
        const by = baseY - rb * 24;
        const c = corFita(p.m);
        s += `<g filter="url(#fSh)">${fitaListras(x - 9, by - 36, 18, 22, c)}<rect x="${x - 10}" y="${by - 37}" width="20" height="3.4" fill="url(#gGold)"/><circle cx="${x}" cy="${by - 8}" r="8" fill="url(#gGold)" stroke="#8a6410" stroke-width=".7"/><circle cx="${x}" cy="${by - 8}" r="4.2" fill="none" stroke="#8a6410" stroke-width=".6"/><title>${esc(p.m.nome || 'Medalha')}</title></g>`;
      });
    }
    return s;
  }
  function desenharBarretas(lista, cx, baseY) {
    const counts = linhasBarretas(lista.length);
    const rowsTop = counts.slice().reverse();
    let idx = 0, s = '';
    rowsTop.forEach((n, ri) => {
      const rb = counts.length - 1 - ri;
      const y = baseY - 8 * (rb + 1);
      const wB = 24, gap = 0.6;
      for (let k = 0; k < n; k++) {
        const x = cx - (n * (wB + gap)) / 2 + k * (wB + gap);
        const m = lista[idx++];
        s += `<g><title>${esc(m.nome || 'Barreta')}</title>${fitaListras(x, y, wB, 7.4, corFita(m))}<rect x="${x}" y="${y}" width="${wB}" height="7.4" fill="none" stroke="#0007" stroke-width=".4"/></g>`;
      }
    });
    return s;
  }
  function desenharComendas(lista) {
    // origem = centro do V do colarinho; fitas descem até a gravata
    let s = '';
    lista.slice(0, 3).forEach((m, i) => {
      const c = corFita(m);
      const y = 42 + i * 3;
      s += `<path d="M-30,0 L-9,${y} M30,0 L9,${y}" stroke="${c[0]}" stroke-width="4" fill="none"/><g transform="translate(${(i - 1) * 5},${y + 8})"><rect x="-6" y="-4" width="12" height="5" fill="${c[0]}"/><circle r="8" fill="url(#gGold)" stroke="#8a6410" stroke-width=".7"/><circle r="4" fill="${c[0]}" stroke="${c[1]}" stroke-width="1"/></g>`;
    });
    return s;
  }

  /* ---------- colocação dos brevês (p.159-160, 162-163) ---------- */
  function colocarBreves(c, uni) {
    const st = c.st;
    const cursos = (st.cursos || []).map(resolverCurso);
    let ints = cursos.filter((x) => !x.externo);
    let exts = cursos.filter((x) => x.externo);
    const notas = [];
    const borracha = uni === '3a';
    if (borracha) { // 3º A: brevês de instrutor ocupam as posições #1 a #4, nessa ordem
      const prim = (l) => l.filter((x) => x.instrutor).concat(l.filter((x) => !x.instrutor));
      ints = prim(ints); exts = prim(exts);
    }
    // Elipses aveludadas de instrutor: máx. 2, sempre no lado direito (#1 e #2) — só 1º/2º grupos
    if (!borracha) {
      const ins = ints.filter((x) => x.instrutor);
      const resto = ints.filter((x) => !x.instrutor);
      ins.slice(2).forEach((x) => { x.semElipse = true; });
      ints = ins.slice(0, 2).concat(ins.slice(2), resto);
      if (ins.length > 2) notas.push('Só 2 elipses de instrutor são permitidas (p.163): ' + ins.slice(2).map((x) => x.sigla).join(', ') + ' perde(m) a elipse.');
    }
    const slots = { 1: null, 2: null, 3: null, 4: null };
    const naoCabem = [];
    ints.forEach((x, i) => { if (i < 2) slots[i + 1] = x; });
    const maisInt = ints.slice(2);
    exts.forEach((x, i) => { if (i < 2) slots[i + 3] = x; else naoCabem.push(x); });
    // sobra de internos pode ocupar #3/#4 livres (p.159)
    let livres = [3, 4].filter((p) => !slots[p]);
    maisInt.forEach((x) => { const p = livres.shift(); if (p) slots[p] = x; else naoCabem.push(x); });
    // supressões por condecorações (túnica/passeio)
    const suprimidos = [];
    if (!borracha) {
      const nBar = uni === '1b' && st.modo === 'medalhas' ? 0 : (st.medalhas || []).filter((m) => m.tipo !== 'comenda').length;
      const medalhas = uni === '1b' && st.modo === 'medalhas' && (st.medalhas || []).some((m) => m.tipo !== 'comenda');
      const sup3 = medalhas || nBar >= 1;
      const sup4 = medalhas || nBar >= 10;
      if (sup3 && !sup4) {
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
      c.sup3 = sup3; c.sup4 = sup4;
    }
    return { slots, naoCabem, suprimidos, notas, total: cursos.length };
  }

  // posição do brevê metálico, abrindo espaço vertical quando há elipse(s) de instrutor (80 x 45 mm)
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

  /* ---------- coberturas (insets) ---------- */
  function quepe(c, cx, cy) {
    const sup = c.superior || c.fn.id;
    let s = `<ellipse cx="${cx}" cy="${cy + 36}" rx="64" ry="18" fill="#111" opacity=".25"/>`;
    s += `<path d="M${cx - 62},${cy + 6} Q${cx - 66},${cy - 30} ${cx - 30},${cy - 44} Q${cx},${cy - 54} ${cx + 30},${cy - 44} Q${cx + 66},${cy - 30} ${cx + 62},${cy + 6} Z" fill="${COR.cinza}" stroke="#222" stroke-width="1.2"/>`;
    s += `<rect x="${cx - 63}" y="${cy + 4}" width="126" height="13" rx="2" fill="#0d0f12"/>`;
    s += `<rect x="${cx - 63}" y="${cy + 6}" width="126" height="1.6" fill="${COR.ouro}"/><rect x="${cx - 63}" y="${cy + 9.4}" width="126" height="1.6" fill="${COR.ouro}"/><rect x="${cx - 63}" y="${cy + 12.8}" width="126" height="1.6" fill="${COR.ouro}"/>`;
    s += botao(cx - 62, cy + 10.5, 2.6) + botao(cx + 62, cy + 10.5, 2.6);
    s += `<path d="M${cx - 50},${cy + 17} Q${cx},${cy + 44} ${cx + 50},${cy + 17} Z" fill="#0b0c0e" stroke="#000"/>`;
    if (sup) {
      const ramo = (dx) => `<g transform="translate(${cx + dx},${cy + 26})"><path d="M0,0 q${dx > 0 ? 8 : -8},-3 ${dx > 0 ? 16 : -16},-2 M${dx > 0 ? 4 : -4},-1 q2,-5 6,-6 M${dx > 0 ? 9 : -9},-2 q2,-5 6,-6" stroke="${COR.ouro}" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="${dx > 0 ? 3 : -3}" cy="-5" r="1.7" fill="${COR.ouro}"/></g>`;
      s += ramo(-34) + ramo(18);
    }
    s += `<circle cx="${cx}" cy="${cy - 6}" r="11" fill="${COR.vermelhoEsc}" stroke="${COR.ouro}" stroke-width="1.6"/>` + simboloCBMDF(cx, cy - 6, 8);
    return s;
  }
  function bibico(c, cx, cy) {
    const deb = c.eOf || c.p.grupo === 'esp' ? COR.vermelho : (c.p.grupo === 'st' || ['sgt1', 'sgt2', 'sgt3'].includes(c.p.id) ? '#d9c2a0' : null);
    let s = `<ellipse cx="${cx}" cy="${cy + 46}" rx="76" ry="9" fill="#000" opacity=".15"/>`;
    // copa (visão lateral) + aba virada ao redor; debrum de 3 mm na borda superior da aba
    s += `<path d="M${cx - 74},${cy + 14} C${cx - 76},${cy - 30} ${cx - 36},${cy - 44} ${cx},${cy - 36} C${cx + 36},${cy - 44} ${cx + 76},${cy - 30} ${cx + 74},${cy + 14} Z" fill="${COR.azul}" stroke="#0c1a38" stroke-width="1.3"/>`;
    s += `<path d="M${cx},${cy - 36} L${cx - 6},${cy + 14}" stroke="#0c1a38" stroke-width="1.1" fill="none"/>`;
    s += `<path d="M${cx - 74},${cy + 12} Q${cx},${cy + 30} ${cx + 74},${cy + 12} L${cx + 70},${cy + 40} Q${cx},${cy + 56} ${cx - 70},${cy + 40} Z" fill="${COR.azul}" stroke="#0c1a38" stroke-width="1.3"/>`;
    s += `<path d="M${cx - 74},${cy + 12} Q${cx},${cy + 30} ${cx + 74},${cy + 12}" fill="none" stroke="${deb || '#0c1a38'}" stroke-width="${deb ? 3.2 : 1}"/>`;
    // insígnia miniatura a 30 mm da frente, lado esquerdo anterior
    const ix = cx - 42, iy = cy + 27;
    if (c.praca) s += divisaGola(c, ix, iy);
    else if (c.p.stars) s += c.p.stars.map((t, i) => estrela(t, ix - ((c.p.stars.length - 1) * 8) + i * 16, iy, 14)).join('');
    else if (c.p.cadete) s += image('posto-cadete-emblema', ix, iy - 3, 14, 17) + image('posto-cadete-barra-' + c.p.cadete, ix, iy + 11, 16, c.p.cadete === 2 ? 5 : 3);
    else if (c.p.id === 'st') s += trianguloST(ix, iy, 16);
    return s;
  }
  function boina(c, cx, cy) {
    let s = `<ellipse cx="${cx}" cy="${cy + 40}" rx="70" ry="9" fill="#000" opacity=".15"/>`;
    s += `<path d="M${cx - 72},${cy + 26} Q${cx - 80},${cy - 20} ${cx - 20},${cy - 34} Q${cx + 50},${cy - 48} ${cx + 78},${cy - 4} Q${cx + 84},${cy + 22} ${cx + 66},${cy + 30} Q${cx},${cy + 44} ${cx - 72},${cy + 26} Z" fill="${COR.azul}" stroke="#0c1a38" stroke-width="1.3"/>`;
    s += `<path d="M${cx - 72},${cy + 26} Q${cx},${cy + 44} ${cx + 66},${cy + 30}" fill="none" stroke="#111" stroke-width="3.2"/>`;
    s += `<circle cx="${cx + 38}" cy="${cy + 8}" r="11" fill="#e9e9e9" stroke="${COR.ouro}" stroke-width="1.5"/>` + simboloCBMDF(cx + 38, cy + 8, 8);
    return s;
  }
  function gorroPala(c, cx, cy, cor, corEsc) {
    const sup = c.superior || c.fn.id;
    let s = `<ellipse cx="${cx}" cy="${cy + 40}" rx="70" ry="9" fill="#000" opacity=".15"/>`;
    s += `<path d="M${cx - 58},${cy + 8} Q${cx - 62},${cy - 34} ${cx},${cy - 40} Q${cx + 62},${cy - 34} ${cx + 58},${cy + 8} Z" fill="${cor}" stroke="${corEsc}" stroke-width="1.2"/>`;
    s += `<path d="M${cx - 58},${cy + 8} Q${cx},${cy + 18} ${cx + 58},${cy + 8} L${cx + 70},${cy + 34} Q${cx},${cy + 56} ${cx - 70},${cy + 34} Z" fill="${cor}" stroke="${corEsc}" stroke-width="1.2"/>`;
    if (sup) s += `<path d="M${cx - 40},${cy + 38} Q${cx - 22},${cy + 28} ${cx - 8},${cy + 34} M${cx + 8},${cy + 34} Q${cx + 22},${cy + 28} ${cx + 40},${cy + 38}" stroke="${COR.ouro}" stroke-width="2.4" fill="none" stroke-dasharray="3 2"/>`;
    s += `<circle cx="${cx}" cy="${cy - 6}" r="12" fill="#f4f4f4" stroke="${COR.ouro}" stroke-width="1.6"/>` + simboloCBMDF(cx, cy - 6, 8.5);
    return s;
  }

  /* ---------- bases de vestuário ---------- */
  const sleeve = (e) => `M108,78 L52,100 Q36,108 34,136 L32,${e - 20} Q32,${e} 52,${e + 1} L100,${e + 3} Q116,${e + 3} 117,${e - 14} L121,150 Z`;
  function mirror(inner) { return `<g transform="translate(520,0) scale(-1,1)">${inner}</g>`; }
  function sleeves(fill, stroke, e, extra) {
    const p = `<path d="${sleeve(e)}" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"/><path d="${sleeve(e)}" fill="url(#gShade)" opacity=".7"/>${extra || ''}`;
    return p + mirror(p);
  }
  function torso(fill, stroke, bottom) {
    return `<path d="M108,78 L218,48 L302,48 L412,78 L406,${bottom} L114,${bottom} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"/><path d="M108,78 L218,48 L302,48 L412,78 L406,${bottom} L114,${bottom} Z" fill="url(#gShade)"/>`;
  }
  function bolsoChato(x, y, w, h, fill, stroke, flapH) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/><path d="M${x},${y} L${x + w},${y} L${x + w},${y + flapH - 5} Q${x + w},${y + flapH} ${x + w - 5},${y + flapH} L${x + 5},${y + flapH} Q${x},${y + flapH} ${x},${y + flapH - 5} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/><circle cx="${x + w / 2}" cy="${y + flapH - 7}" r="2.4" fill="#0006"/>`;
  }
  function chaoLabel(txt, x, y) { return `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" fill="#7a8290" font-family="Arial">${esc(txt)}</text>`; }

  // marcadores numerados + finalização
  function finalizar(c, svgBody, vb, extraDefs) {
    let n = 0, marks = '';
    c.items.forEach((it) => {
      if (it.at) { it.n = ++n; }
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.geral}" role="img" aria-label="Ilustração do uniforme com as insígnias do militar">${defs()}${svgBody}<g class="marks">${marks}</g></svg>`;
    return { svg, items: c.items, vb };
  }

  const VB = {
    geral: '0 0 760 650', peito: '92 34 336 300', mangaD: '-50 84 300 320', mangaE: '270 84 300 320', cobertura: '520 30 250 214',
  };

  /* ---- geometria da túnica ----
     vetor: 0,7 px/mm. foto (base do regulamento, p.18): 1,2 px/mm => k = 1,714 sobre os helpers (feitos a 0,7).
     Coordenadas da foto são as do recorte de 1200x916 (origem do diagrama original - [215,0]). */
  const KF = 1.714;
  const pl = (g, inner) => `<g transform="translate(${f1(g.x)},${f1(g.y)}) rotate(${g.r || 0}) scale(${(g.k || 1).toFixed(3)})">${inner}</g>`;
  const mkAt = (g, dx, dy) => [g.x + (dx || 0) * (g.k || 1), g.y + (dy || 0) * (g.k || 1)];
  const GEO_T = {
    vecM: {
      plat: [{ x: 152, y: 68, r: -16 }, { x: 368, y: 68, r: 16 }], div: [{ x: 76, y: 183 }, { x: 444, y: 183 }],
      arma: [{ x: 222, y: 120 }, { x: 298, y: 120 }], plq: { x: 167, y: 207.5 }, car: { x: 167, y: 246 }, obm: { x: 353, y: 207 },
      bp: { 1: { x: 167, y: 183.5 }, 2: { x: 151, y: 157.5 }, 3: { x: 353, y: 183.5 }, 4: { x: 369, y: 157.5 } },
      ap: { x: 167, y: 137 }, bar: { x: 353, y: 200 }, med: { x: 353, y: 222 }, com: { x: 260, y: 54 },
      band: { x: 76, y: 158 }, emb: { x: 444, y: 153.5 }, caeo: { x: 76, y: 379 }, hat: null,
      mk: { plat: [152, 40], arma: [222, 100], plq: [-36, 0], car: [17, 0], obm: [15, 20], bp: [-30, 0], ap: [15, 0], med: [56, -50], bar: [36, -12], com: [32, 46], band: [0, 22], emb: [0, 24], caeo: [16, 0], div: [0, -7] },
    },
    vecF: {
      plat: [{ x: 152, y: 68, r: -16 }, { x: 368, y: 68, r: 16 }], div: [{ x: 76, y: 183 }, { x: 444, y: 183 }],
      arma: [{ x: 222, y: 120 }, { x: 298, y: 120 }], plq: { x: 190, y: 288 }, car: { x: 190, y: 330 }, obm: { x: 330, y: 330 },
      bp: { 1: { x: 190, y: 266 }, 2: { x: 182, y: 242 }, 3: { x: 330, y: 266 }, 4: { x: 338, y: 242 } },
      ap: { x: 208, y: 232 }, bar: { x: 330, y: 276 }, med: { x: 330, y: 300 }, com: { x: 260, y: 54 },
      band: { x: 76, y: 158 }, emb: { x: 444, y: 153.5 }, caeo: { x: 76, y: 379 }, hat: null,
      mk: { plat: [152, 40], arma: [222, 100], plq: [-36, 0], car: [17, 0], obm: [15, 20], bp: [-30, 0], ap: [15, 0], med: [56, -50], bar: [36, -12], com: [32, 46], band: [0, 22], emb: [0, 24], caeo: [16, 0], div: [0, -7] },
    },
    fotoM: {
      foto: true, w: 1200, h: 916, aspect: '1500 / 916',
      plat: [{ x: 411, y: 98, r: 69, k: KF }, { x: 785, y: 98, r: -69, k: KF }],
      div: [{ x: 248, y: 271, r: 33, k: KF * 0.9 }, { x: 948, y: 271, r: -33, k: KF * 0.9 }],
      arma: [{ x: 517, y: 142, k: KF }, { x: 682, y: 147, k: KF }],
      plq: { x: 478, y: 311, k: KF }, car: { x: 476, y: 396, k: KF * 0.95 }, obm: { x: 719, y: 351, k: KF * 0.85 },
      bp: { 1: { x: 477, y: 273, k: KF }, 2: { x: 445, y: 226, k: KF }, 3: { x: 720, y: 273, k: KF }, 4: { x: 749, y: 228, k: KF } },
      ap: { x: 410, y: 182, k: KF }, bar: { x: 720, y: 298, k: KF }, med: { x: 720, y: 344, k: KF * 0.9 }, com: { x: 598, y: 28, k: KF * 0.9 },
      band: { x: 274, y: 230, r: 33, k: KF * 0.85 }, emb: { x: 918, y: 224, r: -33, k: KF * 0.85 }, caeo: { x: 135, y: 525, r: 14, k: KF * 0.9 },
      hat: { x: 1350, y: 200, k: KF },
      mk: { plat: [0, -52], arma: [0, -36], plq: [-60, 0], car: [30, 0], obm: [26, 56], bp: [-52, 0], ap: [28, 0], med: [60, -60], bar: [66, -18], com: [40, 60], band: [0, 44], emb: [0, 44], caeo: [28, 0], div: [0, -14] },
      vb: { geral: '0 0 1500 916', peito: '330 20 550 335', mangaD: '0 100 560 342', mangaE: '640 100 560 342', cobertura: '1210 20 290 177' },
    },
    fotoF: {
      foto: true, w: 1119, h: 950, aspect: '1419 / 950',
      plat: [{ x: 374, y: 100, r: 77, k: 1.75 }, { x: 744, y: 100, r: -77, k: 1.75 }],
      div: [{ x: 228, y: 297, r: 12, k: 1.7 }, { x: 890, y: 297, r: -12, k: 1.7 }],
      arma: [{ x: 487, y: 137, k: 1.75 }, { x: 647, y: 135, k: 1.75 }],
      plq: { x: 440, y: 368, k: 1.93 }, car: { x: 448, y: 482, k: 2.2 }, obm: { x: 677, y: 430, k: 2.0 },
      bp: { 1: { x: 439, y: 327, k: 2.0 }, 2: { x: 405, y: 275, k: 2.0 }, 3: { x: 684, y: 357, k: 2.0 }, 4: { x: 717, y: 276, k: 2.0 } },
      ap: { x: 371, y: 231, k: 2.0 }, bar: { x: 683, y: 378, k: 2.1 }, med: { x: 683, y: 436, k: 1.8 }, com: { x: 559, y: 40, k: 1.8 },
      band: { x: 239, y: 250, r: 12, k: 1.7 }, emb: { x: 878, y: 241, r: -12, k: 1.7 }, caeo: { x: 133, y: 661, r: 13, k: 1.9 },
      hat: { x: 1290, y: 200, k: 1.7 },
      mk: { plat: [0, -52], arma: [0, -36], plq: [-60, 0], car: [30, 0], obm: [26, 90], bp: [-52, 0], ap: [28, 0], med: [60, -60], bar: [66, -18], com: [40, 60], band: [0, 44], emb: [0, 44], caeo: [28, 0], div: [0, -14] },
      vb: { geral: '0 0 1419 950', peito: '300 20 560 375', mangaD: '0 170 780 522', mangaE: '640 170 780 522', cobertura: '1150 40 270 181' },
    },
  };

  /* =====================================================================
     1º B — TÚNICA CINZA-ESCURO
     ===================================================================== */
  function tunica(st) {
    const c = ctxOf(st);
    const B = colocarBreves(c, '1b');
    c.B = B;
    const fem = c.fem;
    const foto = !!(window.SPRITES && window.SPRITES['base:tunica-' + (fem ? 'f' : 'm') + '-plat']);
    const G = foto ? (fem ? GEO_T.fotoF : GEO_T.fotoM) : (fem ? GEO_T.vecF : GEO_T.vecM);
    const medalhasOn = st.modo === 'medalhas';
    const todas = ordenarCondecoracoes((st.medalhas || []).filter((m) => m.tipo !== 'comenda'));
    const comendas = (st.medalhas || []).filter((m) => m.tipo === 'comenda');
    const nCond = todas.length;
    const usaMedalhas = medalhasOn && nCond > 0;
    const usaBarretas = !medalhasOn && nCond > 0;
    const medShow = todas.slice(0, 16);
    const barShow = todas.slice(0, 32);
    let g = '';

    // peça
    if (foto) {
      g += `<image href="${window.SPRITES['base:tunica-' + (fem ? 'f' : 'm') + '-noplat']}" x="0" y="0" width="${G.w}" height="${G.h}" style="filter:drop-shadow(0 8px 12px rgba(0,0,0,.35))"/>`;
    } else {
      g += sleeves(COR.cinza, '#2b313a', 490);
      g += torso(COR.cinza, '#2b313a', 520);
      g += `<polygon points="232,52 288,52 262,196" fill="${COR.branco}" stroke="#bbb" stroke-width=".8"/>`;
      g += `<path d="M254,66 L266,66 L270,196 L260,222 L250,196 Z" fill="#111" stroke="#000"/><path d="M250,62 L270,62 L268,70 L252,70 Z" fill="#000"/>`;
      const lap = `<path d="M196,60 L234,50 L262,300 L242,306 L206,252 L224,226 L198,196 Z" fill="${COR.cinzaEsc}" stroke="#2b313a" stroke-width="1.3"/>`;
      g += lap + `<g transform="translate(520,0) scale(-1,1)">${lap}</g>`;
      g += `<path d="M262,300 L262,520" stroke="#2b313a" stroke-width="1.2"/>`;
      [318, 376, 434, 492].forEach((y) => { g += botao(266, y, 4.6); });
      if (fem) {
        g += `<path d="M190,150 Q176,300 170,500 M330,150 Q344,300 350,500" stroke="#2b313a" stroke-width="1" fill="none"/>`;
        g += `<rect x="150" y="440" width="52" height="3" fill="#2b313a"/><rect x="318" y="440" width="52" height="3" fill="#2b313a"/>`;
      } else {
        g += bolsoChato(128, 200, 78, 70, COR.cinza, '#2b313a', 22) + bolsoChato(314, 200, 78, 70, COR.cinza, '#2b313a', 22);
        g += bolsoChato(120, 396, 80, 56, COR.cinza, '#2b313a', 20) + bolsoChato(320, 396, 80, 56, COR.cinza, '#2b313a', 20);
      }
    }

    // ---- insígnia de posto (platinas / divisas)
    if (c.plat) {
      if (foto) g += hs('posto', G.plat.map((gg) => pl(gg, platinaSpr(c, 'cinza'))).join(''), c.p.nome);
      else g += hs('posto', platina(c, 152, 68, -16, COR.cinza, 'd') + platina(c, 368, 68, 16, COR.cinza, 'e'), c.p.nome);
      add(c, { key: 'posto', nivel: 'obrig', titulo: 'Insígnia de posto: platinas rígidas', texto: c.fn.id ? `Platina especial de ${c.fn.nome} (cinza-escuro, bordas e ramos dourados), nos dois ombros.` : `${c.p.nome}: platinas rígidas cinza-escuro de 130 × 60 mm, com botão dourado na ponta${c.eOf ? ' e lâmina ' + (c.superior ? 'dourada' : 'prateada') + ' nas bordas' : ''}; ${c.p.stars ? 'estrelas metálicas de 25 mm espaçadas 10 mm' : c.p.cadete ? 'insígnia base do CBMDF sobre ' + c.p.cadete + ' barreta(s)' : 'triângulo equilátero dourado vazado'}.`, pag: 'p. 139–147', at: mkAt(G.plat[0], G.mk.plat[0], G.mk.plat[1]) });
    } else {
      if (!c.p.divisas) add(c, { key: 'posto', nivel: 'info', titulo: 'Sem divisas nas mangas', texto: `${c.p.nome}: não usa divisas na túnica; as mangas levam apenas a bandeira do DF (direita) e o emblema do CBMDF (esquerda).`, pag: 'p. 148–149', at: null });
      else g += hs('posto', G.div.map((d) => pl(d, divisas(c, 0, 0, 'ouro', foto ? '#2c303f' : null))).join(''), c.p.nome);
      if (c.p.divisas) add(c, { key: 'posto', nivel: 'obrig', titulo: 'Divisas nas duas mangas', texto: `${c.p.nome}: divisas bordadas em amarelo-ouro sobre base pentagonal de 70 mm em tecido cinza-escuro, a 130 mm da costura do ombro, em ambas as mangas. A arma da sua qualificação fica centrada sobre a divisa superior.`, pag: 'p. 148–149', at: mkAt(G.div[0], 0, G.mk.div[1]) });
    }

    // ---- arma de quadro/qualificação (lapelas) — todos os militares (p.16, IX)
    {
      g += hs('arma', G.arma.map((a, i) => pl(a, armaMetal(c, 0, 0, 21, i === 0 ? 45 : -45))).join(''), c.q.nome);
      add(c, { key: 'arma', nivel: 'obrig', titulo: 'Arma do quadro/qualificação nas lapelas', texto: `${c.q.nome}: arma dourada de 30 mm, centralizada na largura da lapela e a 10 mm da base da gola superior, nos dois lados, inclinada cerca de 45° com a base voltada para fora (para a base da lapela). Só a arma do seu quadro; é vedada arma de outro quadro. Na camisa branca de manga comprida não se usa arma.`, pag: 'p. 16, 18, 150–152', at: mkAt(G.arma[0], 0, G.mk.arma[1] / 1.0) });
    }

    // ---- plaqueta dourada
    g += hs('plaqueta', pl(G.plq, plaqueta(c, 0, 0, 'ouro')), c.plaq);
    add(c, { key: 'plaqueta', nivel: 'obrig', titulo: 'Plaqueta de identificação dourada', texto: `Texto: “${c.plaq}” (posto/graduação, BM, nome de guerra e tipo sanguíneo), letras pretas. ${fem ? 'Na túnica feminina: centralizada no lado direito do corpo, 50 mm acima da linha do 1º botão dourado.' : 'Na pestana do bolso direito, tangente à costura superior.'}`, pag: 'p. 18–19, 108–109', at: mkAt(G.plq, G.mk.plq[0], G.mk.plq[1]) });

    // ---- distintivo de curso (carreira) e OBM
    const car = st.carreira && st.carreira.id ? (D.cursosCarreira.find((x) => x.id === st.carreira.id) || {}) : null;
    const carSigla = car ? (car.id === 'outro' ? (st.carreira.sigla || 'CURSO') : car.sigla) : '';
    if (car) {
      g += hs('curso', pl(G.car, distCarreira(0, 0, carSigla, null, car.sprite)), carSigla);
      add(c, { key: 'curso', nivel: 'obrig', titulo: 'Distintivo de curso de carreira (' + carSigla + ')', texto: fem ? 'Aplicado 10 mm abaixo da linha de referência do 1º botão dourado, alinhado à costura da túnica. Obrigatório.' : 'No bolso direito, centralizado verticalmente. Obrigatório; não há distinção por uniforme.', pag: 'p. 18–19, 157', at: mkAt(G.car, G.mk.car[0], G.mk.car[1]) });
    } else {
      add(c, { key: 'curso', nivel: 'alerta', titulo: 'Distintivo de curso de carreira', texto: 'O distintivo de curso é obrigatório na túnica (bolso direito). Informe seu curso de carreira na ficha para ele aparecer aqui.', pag: 'p. 16 (IX), 157', at: null });
    }
    if (usaMedalhas) {
      add(c, { key: 'obm', nivel: 'vedado', titulo: 'Distintivo de OBM suprimido', texto: 'Quando você ostenta medalhas, não se usa o distintivo de OBM nem barretas no lado esquerdo, e nenhum brevê nas posições #3 e #4.', pag: 'p. 171', at: null });
    } else {
      g += hs('obm', pl(G.obm, obmDistintivo(c, 0, 0, !fem)), 'OBM: ' + (st.obm || ''));
      add(c, { key: 'obm', nivel: 'obrig', titulo: 'Distintivo da OBM (' + (st.obm || '—') + ')', texto: fem ? 'Na túnica feminina o distintivo vai sem suporte de couro, alinhado verticalmente ao distintivo de curso.' : 'No bolso esquerdo, sobre suporte de couro preto fixado no botão da pestana. Obrigatório para todos.', pag: 'p. 18–19, 164–165', at: mkAt(G.obm, G.mk.obm[0], G.mk.obm[1]) });
    }

    // ---- brevês #1..#4
    let bvHtml = '';
    let lista = [];
    [1, 2, 3, 4].forEach((pos) => {
      const cv = B.slots[pos];
      if (!cv) return;
      bvHtml += pl(posBreve(G, B, pos), breveMetal(cv, 0, 0, cv.instrutor && !cv.semElipse && pos <= 2));
      lista.push(`#${pos} ${cv.sigla}${cv.instrutor && !cv.semElipse && pos <= 2 ? ' (com elipse de instrutor)' : ''}`);
    });
    if (bvHtml) {
      g += hs('breves', bvHtml, 'Brevês');
      add(c, { key: 'breves', nivel: 'opc', titulo: 'Brevês de especialização', texto: `Posições: ${lista.join('; ')}. #1 centralizado 10 mm acima do bolso direito; #2 10 mm acima do #1; #3 e #4 no peito esquerdo (cursos externos só aqui). Todos opcionais.`, pag: 'p. 18–19, 158–160', at: mkAt(G.bp[1], G.mk.bp[0], G.mk.bp[1]) });
    }
    brevesAvisos(c, B);

    // ---- aplique de comando
    if (c.fn.id && c.eOf) {
      g += hs('aplique', pl(G.ap, aplique(c.fn, 0, 0)), c.fn.nome);
      add(c, { key: 'aplique', nivel: 'opc', titulo: 'Aplique de comando e chefia', texto: `${c.fn.nome}: usado apenas durante o efetivo exercício da função, 90 mm acima da costura superior do bolso direito (túnica feminina: 90 mm acima da tarjeta). Não cumulativo: usa-se o de maior precedência.`, pag: 'p. 166–167', at: mkAt(G.ap, G.mk.ap[0], G.mk.ap[1]) });
    } else if (c.fn.id && !c.eOf) {
      add(c, { key: 'aplique', nivel: 'alerta', titulo: 'Aplique de comando', texto: 'Apliques de comando e chefia são de uso do Oficial; sua graduação não os utiliza.', pag: 'p. 166', at: null });
    }

    // ---- condecorações
    if (usaMedalhas) {
      g += hs('condec', pl(G.med, desenharMedalhas(medShow, 0, 0)), 'Medalhas');
      add(c, { key: 'condec', nivel: 'obrig', titulo: `Medalhas (${medShow.length})`, texto: `Lado esquerdo do peito, em ordem de precedência (as do CBMDF primeiro; demais Forças em ordem cronológica), até 4 fileiras de 4 (máx. 16). Bases tangentes à borda inferior da pestana do bolso superior esquerdo; fileiras a 10 mm. ${medShow.length > 16 ? 'Você tem mais de 16: priorize.' : ''} ${medShow.length % 4 === 1 && medShow.length > 4 ? 'Evite uma medalha isolada acima de fileira de quatro.' : ''}`, pag: 'p. 171–172', at: mkAt(G.med, G.mk.med[0], G.mk.med[1]) });
    } else if (usaBarretas) {
      g += hs('condec', pl(G.bar, desenharBarretas(barShow, 0, 0)), 'Barretas');
      add(c, { key: 'condec', nivel: 'obrig', titulo: `Barretas (${barShow.length})`, texto: `Em substituição às medalhas em ocasiões menos formais (limite 32). ${barShow.length <= 2 ? 'Centralizadas no bolso esquerdo.' : barShow.length <= 15 ? 'Fileiras de 3 colunas.' : 'Fileiras de 4 colunas.'} Base tangente à borda superior da pestana. ${barShow.length >= 10 ? 'Com 10 ou mais barretas o brevê #4 é suprimido; ' : ''}${barShow.length >= 1 ? 'com qualquer barreta o brevê #3 é suprimido.' : ''}`, pag: 'p. 172', at: mkAt(G.bar, G.mk.bar[0], G.mk.bar[1]) });
    }
    if (comendas.length) {
      if (usaBarretas) add(c, { key: 'comenda', nivel: 'vedado', titulo: 'Comendas com barretas', texto: 'Comendas só podem ser usadas junto com medalhas; é vedado usá-las com barretas. Troque para “medalhas” na ficha.', pag: 'p. 173', at: null });
      else {
        g += hs('comenda', pl(G.com, desenharComendas(comendas)), 'Comendas');
        add(c, { key: 'comenda', nivel: 'opc', titulo: `Comenda(s) (${Math.min(3, comendas.length)})`, texto: 'No pescoço, pendentes de fita que passa sob o colarinho, com a insígnia sobre a gravata. Máximo de 3, só nos uniformes 1º B e 1º C. Se houver placa correspondente, seu uso é obrigatório.', pag: 'p. 173–174', at: mkAt(G.com, G.mk.com[0], G.mk.com[1]) });
      }
    }
    if (nCond === 0) add(c, { key: 'condec', nivel: 'info', titulo: 'Condecorações', texto: 'Nenhuma condecoração informada. Medalhas e barretas só podem ser ostentadas após publicação do ato em Boletim Geral.', pag: 'p. 171', at: null });

    // ---- mangas: bandeira DF, emblema, CAEO
    g += hs('bandeira', pl(G.band, bandeiraDF(0, -21)), 'Bandeira do DF');
    add(c, { key: 'bandeira', nivel: 'obrig', titulo: 'Bandeira do Distrito Federal', texto: 'Manga direita, com a borda superior 65 mm abaixo da costura da cava (80 × 60 mm).', pag: 'p. 155', at: mkAt(G.band, 0, G.mk.band[1]) });
    g += hs('emblema', pl(G.emb, emblema(0, -23.5)), 'Emblema do CBMDF');
    add(c, { key: 'emblema', nivel: 'obrig', titulo: 'Emblema do CBMDF', texto: 'Manga esquerda, 55 mm abaixo da costura do ombro (círculo de 67 mm).', pag: 'p. 156–157', at: mkAt(G.emb, 0, G.mk.emb[1]) });
    if (car && car.caeo) {
      g += hs('caeo', pl(G.caeo, `<g style="filter:grayscale(1) brightness(1.25)">${distCarreira(0, 0, 'CAEO', 10, 'curso-caeo')}</g>`), 'CAEO bordado');
      add(c, { key: 'caeo', nivel: 'obrig', titulo: 'Brevê do CAEO na manga', texto: 'O brevê do Curso de Altos Estudos para Oficiais também é bordado na manga direita (cinza claro nos uniformes 1º B e 1º C), a 160 mm da abertura do punho.', pag: 'p. 157', at: mkAt(G.caeo, G.mk.caeo[0], G.mk.caeo[1]) });
    }

    // ---- quepe
    const hatInner = quepe(c, 640, 150) + chaoLabel(fem ? 'Quepe feminino cinza-escuro' : 'Quepe cinza-escuro', 640, 252);
    g += hs('cobertura', foto ? `<g transform="translate(${G.hat.x},${G.hat.y}) scale(${G.hat.k}) translate(-640,-150)">${hatInner}</g>` : hatInner, 'Quepe');
    add(c, { key: 'cobertura', nivel: 'info', titulo: 'Quepe cinza-escuro', texto: c.fn.id === 'cmtgeral' ? 'Comandante-Geral: pala circundada por dois ramos de carvalho com folhas e frutos, em fio myller dourado.' : c.superior ? 'Oficial superior: ramos de carvalho (120 mm, 3 folhas, 2 frutos) bordados em relevo na pala, em amarelo-ouro.' : 'Pala lisa para os demais oficiais, cadetes, subtenentes, sargentos, cabos e soldados. Galão ornamental triplo dourado na cinta. O uniforme pode ser usado sem quepe a critério do Comandante-Geral.', pag: 'p. 16 (V), 88–90', at: foto ? [G.hat.x, 90] : [640, 80] });

    if (c.q.id && c.q.id.startsWith('capelao')) add(c, { key: 'capelao', nivel: 'info', titulo: 'Capelães', texto: 'Capelães usam camisa social branca de manga comprida com gola clerical na composição do 1º B.', pag: 'p. 16 (X)', at: null });

    const r = finalizar(c, g, foto ? Object.assign({}, VB, G.vb, { cobertura: hatVB({ x: G.hat.x, y: G.hat.y + 20 * G.hat.k }, G.hat.k) }) : Object.assign({}, VB));
    r.aspect = foto ? G.aspect : '760 / 650';
    return r;
  }

  function brevesAvisos(c, B) {
    if (B.naoCabem.length) add(c, { key: 'avisobreves', nivel: 'alerta', titulo: 'Brevês que não cabem', texto: `O regulamento limita a 4 brevês: ${B.naoCabem.map((x) => x.sigla).join(', ')} ficaria(m) de fora. Reordene seus cursos por prioridade na ficha.`, pag: 'p. 159–160', at: null });
    B.suprimidos.forEach((s) => add(c, { key: 'avisobreves', nivel: 'alerta', titulo: `Brevê #${s.pos} (${s.c.sigla}) suprimido`, texto: `Posição #${s.pos} é suprimida por ${s.motivo}.`, pag: 'p. 18, 36, 171', at: null }));
    B.notas.forEach((t) => add(c, { key: 'avisobreves', nivel: 'alerta', titulo: 'Elipse de instrutor', texto: t, pag: 'p. 162–163', at: null }));
    const ext = (c.st.cursos || []).some((x) => x.externo);
    if (ext) add(c, { key: 'avisoext', nivel: 'info', titulo: 'Cursos externos', texto: 'Brevês de cursos em outras instituições públicas/militares usam só o lado esquerdo (posições #3 e #4). Cursos de entidades privadas são vedados, salvo autorização do Comandante-Geral.', pag: 'p. 159–160', at: null });
  }

  /* =====================================================================
     2º A — PASSEIO (camisa bege) — base fotográfica do regulamento (p.36)
     ===================================================================== */
  const KC = 2.0;
  const GEO_C = {
    w: 950, h: 935, aspect: '1350 / 935',
    plat: [{ x: 280, y: 105, r: 76, k: 1.9 }, { x: 670, y: 105, r: -76, k: 1.9 }],
    arma: [{ x: 362, y: 172, r: 42, k: 2.1 }, { x: 588, y: 172, r: -42, k: 2.1 }],
    plq: { x: 313, y: 379, k: 2.0 }, car: { x: 314, y: 497, k: 2.3 }, obm: { x: 632, y: 442, k: 1.8 },
    bp: { 1: { x: 313, y: 328, k: 2.1 }, 2: { x: 282, y: 262, k: 2.1 }, 3: { x: 637, y: 328, k: 2.1 }, 4: { x: 668, y: 266, k: 2.1 } },
    ap: { x: 313, y: 232, k: 2.0 }, bar: { x: 634, y: 365, k: 2.08 },
    band: { x: 138, y: 228, r: 30, k: 1.45 }, emb: { x: 812, y: 228, r: -30, k: 1.45 },
    hat: { x: 1135, y: 540, k: 1 },
    vb: { geral: '0 0 1350 935', peito: '180 40 560 388', mangaD: '0 60 500 347', mangaE: '450 60 500 347', cobertura: '950 300 400 277' },
  };
  // platina rígida azul-escuro (130 x 60 mm, ponta chanfrada), desenhada na escala dos helpers (91 x 42)
  function platinaAzul(c) {
    const fn = c.fn;
    const borda = c.superior || fn.id ? 'url(#gGold)' : (c.eOf ? 'url(#gSilver)' : null);
    const P = '-45.5,0 -26.5,-21 45.5,-21 45.5,21 -26.5,21';
    let s = `<polygon points="${P}" fill="#1b3568" stroke="#0b1a3a" stroke-width="1"/>`;
    s += `<polygon points="${P}" fill="url(#gShade)" opacity=".6"/>`;
    if (borda) s += `<polygon points="-43,0 -25.5,-19 43.5,-19 43.5,19 -25.5,19" fill="none" stroke="${borda}" stroke-width="1.6"/>`;
    s += `<circle cx="-33" cy="0" r="3.4" fill="url(#gGold)" stroke="#7a5a12" stroke-width=".5"/>`;
    s += conteudoPosto(c, 16, 6, 8);
    return `<g filter="url(#fSh)">${s}</g>`;
  }
  function bibicoFoto(c, deb, cx, cy, w) {
    const nome = deb === 'vermelho' ? 'bibico-vermelho' : deb === 'bege' ? 'bibico-bege' : 'bibico-liso';
    const k = w / 391, h = 123 * k;
    let s = `<ellipse cx="${cx}" cy="${cy + h / 2 + 6}" rx="${w * 0.46}" ry="7" fill="#000" opacity=".18"/>`;
    s += image(nome, cx, cy, w, h);
    // insígnia a 30 mm da frente (esquerda), centrada na aba
    const ix = cx - w / 2 + 64 * k, iy = cy - h / 2 + 72 * k;
    const sz = 15 * k * 1.6;
    let ins = '';
    if (c.praca) ins = divisaGola(c, 0, 0);
    else if (c.p.stars) ins = c.p.stars.map((t, i) => estrela(t, (i - (c.p.stars.length - 1) / 2) * 11, 0, 10)).join('');
    else if (c.p.cadete) ins = image('posto-cadete-emblema', 0, -3, 10, 12) + image('posto-cadete-barra-' + c.p.cadete, 0, 8, 12, c.p.cadete === 2 ? 4 : 2.5);
    else if (c.p.id === 'st') ins = trianguloST(0, 0, 11);
    s += `<g transform="translate(${f1(ix)},${f1(iy)}) scale(${(sz / 15).toFixed(3)})">${ins}</g>`;
    return s;
  }

  function passeio(st) {
    const c = ctxOf(st);
    const B = colocarBreves(c, '2a');
    const G = GEO_C;
    let g = '';
    g += `<image href="${window.SPRITES['base:camisa']}" x="0" y="0" width="${G.w}" height="${G.h}" style="filter:drop-shadow(0 8px 12px rgba(0,0,0,.3))"/>`;

    // posto
    if (c.plat) {
      g += hs('posto', G.plat.map((p) => pl(p, platinaSpr(c, 'azul'))).join(''), c.p.nome);
      add(c, { key: 'posto', nivel: 'obrig', titulo: 'Platinas rígidas azul-escuro', texto: `${c.p.nome}: platinas rígidas azul-escuro de 130 × 60 mm sobre a camisa bege, com ${c.p.stars ? 'estrelas metálicas' : c.p.cadete ? 'insígnia base e barreta(s)' : 'triângulo dourado'}; borda ${c.eOf ? (c.superior ? 'dourada' : 'prateada') : 'sem lâmina'}.`, pag: 'p. 33, 144–147', at: mkAt(G.plat[0], 0, -34) });
      g += hs('arma', G.arma.map((a) => pl(a, armaMetal(c, 0, 0, 14, 0))).join(''), c.q.nome);
      add(c, { key: 'arma', nivel: 'obrig', titulo: 'Arma do quadro em ambas as golas', texto: `${c.q.nome}: arma dourada de 20 mm nas duas golas da camisa, alinhada e a 25 mm da ponta da gola.`, pag: 'p. 34 (VI), 36, 150', at: mkAt(G.arma[0], -4, -22) });
    } else {
      g += hs('arma', pl(G.arma[0], armaMetal(c, 0, 0, 14, 0)), c.q.nome) + hs('posto', pl(G.arma[1], divisaGola(c, 0, 0)), c.p.nome);
      add(c, { key: 'arma', nivel: 'obrig', titulo: 'Arma da qualificação na gola direita', texto: `${c.q.nome}: arma de 20 mm na gola direita da camisa (lado esquerdo de quem olha), a 25 mm da ponta.`, pag: 'p. 34 (VI), 149', at: mkAt(G.arma[0], -4, -22) });
      add(c, { key: 'posto', nivel: 'obrig', titulo: 'Divisa metálica na gola esquerda', texto: `${c.p.nome}: divisa metálica dourada na extremidade da gola esquerda. Praças não usam platinas.`, pag: 'p. 34 (VI), 149', at: mkAt(G.arma[1], 4, -22) });
    }
    // plaqueta vermelha
    g += hs('plaqueta', pl(G.plq, plaqueta(c, 0, 0, 'vermelha')), c.plaq);
    add(c, { key: 'plaqueta', nivel: 'obrig', titulo: 'Plaqueta de identificação vermelha', texto: `Texto: “${c.plaq}”, letras brancas, na pestana do bolso direito, tangente à costura.`, pag: 'p. 36, 108–109', at: mkAt(G.plq, -62, 0) });
    // curso carreira
    const car = st.carreira && st.carreira.id ? (D.cursosCarreira.find((x) => x.id === st.carreira.id) || {}) : null;
    const carSigla = car ? (car.id === 'outro' ? (st.carreira.sigla || 'CURSO') : car.sigla) : '';
    if (car) {
      g += hs('curso', pl(G.car, distCarreira(0, 0, carSigla, null, car.sprite)), carSigla);
      add(c, { key: 'curso', nivel: 'obrig', titulo: 'Distintivo de curso de carreira (' + carSigla + ')', texto: 'No bolso direito, centralizado. Obrigatório.', pag: 'p. 34 (VI), 36', at: mkAt(G.car, 17, 0) });
    } else add(c, { key: 'curso', nivel: 'alerta', titulo: 'Distintivo de curso de carreira', texto: 'Obrigatório no bolso direito. Informe seu curso de carreira na ficha.', pag: 'p. 34 (VI)', at: null });
    // OBM
    g += hs('obm', pl(G.obm, obmDistintivo(c, 0, 0, true)), 'OBM');
    add(c, { key: 'obm', nivel: 'obrig', titulo: 'Distintivo da OBM (' + (st.obm || '—') + ')', texto: 'No bolso esquerdo, sobre suporte de couro preto fixado no botão do bolso. Obrigatório.', pag: 'p. 36, 164–165', at: mkAt(G.obm, 16, 24) });
    // brevês
    let bv = '', lista = [];
    [1, 2, 3, 4].forEach((pos) => { const cv = B.slots[pos]; if (cv) { bv += pl(posBreve(G, B, pos), breveMetal(cv, 0, 0, cv.instrutor && !cv.semElipse && pos <= 2)); lista.push(`#${pos} ${cv.sigla}`); } });
    if (bv) { g += hs('breves', bv, 'Brevês'); add(c, { key: 'breves', nivel: 'opc', titulo: 'Brevês de especialização', texto: `Posições: ${lista.join('; ')}. #1 10 mm acima do bolso direito; #2 10 mm acima do #1, alinhado à esquerda do bolso; #3 e #4 no lado esquerdo (cursos externos). Todos opcionais.`, pag: 'p. 36, 158–160', at: mkAt(G.bp[1], -34, 0) }); }
    brevesAvisos(c, B);
    // aplique
    if (c.fn.id && c.eOf) {
      g += hs('aplique', pl(G.ap, aplique(c.fn, 0, 0)), c.fn.nome);
      add(c, { key: 'aplique', nivel: 'opc', titulo: 'Aplique de comando e chefia', texto: `${c.fn.nome}: 90 mm acima da costura superior do bolso direito, durante o efetivo exercício da função.`, pag: 'p. 166–167', at: mkAt(G.ap, 22, 0) });
    }
    // barretas (somente)
    const todas = ordenarCondecoracoes((st.medalhas || []).filter((m) => m.tipo !== 'comenda')).slice(0, 32);
    if (todas.length) {
      g += hs('condec', pl(G.bar, desenharBarretas(todas, 0, 0)), 'Barretas');
      add(c, { key: 'condec', nivel: 'obrig', titulo: `Barretas (${todas.length})`, texto: 'No 2º A só barretas — medalhas são vedadas. Limite de 32; 1–2 centralizadas no bolso esquerdo, 3–15 em fileiras de 3 colunas, 16+ em 4 colunas, base tangente à borda superior da pestana.', pag: 'p. 34 (VIII), 172', at: mkAt(G.bar, 42, -14) });
    } else add(c, { key: 'condec', nivel: 'info', titulo: 'Condecorações', texto: 'Neste uniforme só se ostentam barretas; medalhas são vedadas.', pag: 'p. 34 (VIII)', at: null });
    // mangas
    g += hs('bandeira', pl(G.band, bandeiraDF(0, -21)), 'Bandeira DF');
    add(c, { key: 'bandeira', nivel: 'obrig', titulo: 'Bandeira do DF', texto: 'Manga direita, 65 mm abaixo da costura da cava.', pag: 'p. 155', at: mkAt(G.band, 0, 30) });
    g += hs('emblema', pl(G.emb, emblema(0, -23.5)), 'Emblema');
    add(c, { key: 'emblema', nivel: 'obrig', titulo: 'Emblema do CBMDF', texto: 'Manga esquerda, 55 mm abaixo da costura do ombro.', pag: 'p. 157', at: mkAt(G.emb, 0, 30) });
    // cobertura
    const deb = c.eOf || c.p.grupo === 'esp' ? 'vermelho' : (c.p.grupo === 'st' || ['sgt1', 'sgt2', 'sgt3'].includes(c.p.id) ? 'bege' : 'liso');
    const hat = `<g transform="translate(${G.hat.x},${G.hat.y - 70})">${bibicoFoto(c, deb, 0, 0, 300)}<text x="0" y="78" text-anchor="middle" font-size="16" fill="#7a8290" font-family="Arial">Gorro sem pala (bibico)</text></g>`;
    g += hs('cobertura', hat, 'Bibico');
    g += hs('boina', `<g transform="translate(${G.hat.x},${G.hat.y + 150}) scale(1.5) translate(-645,-150)">${boina(c, 645, 150)}</g><text x="${G.hat.x}" y="${G.hat.y + 232}" text-anchor="middle" font-size="16" fill="#7a8290" font-family="Arial">Boina azul-escuro (opcional)</text>`, 'Boina');
    add(c, { key: 'cobertura', nivel: 'obrig', titulo: 'Gorro sem pala (bibico)', texto: `Bibico azul-escuro, com debrum de 3 mm ${deb !== 'liso' ? deb + ' (' + (deb === 'vermelho' ? 'oficiais e praças especiais' : 'subtenentes e sargentos') + ')' : '— cabos e soldados não têm debrum'}; insígnia em miniatura a 30 mm da frente, lado esquerdo. Quando não usado, fica preso ao cinto, lado direito.`, pag: 'p. 34 (III), 90–91, 149', at: [G.hat.x, G.hat.y - 150] });
    add(c, { key: 'boina', nivel: 'opc', titulo: 'Boina azul-escuro (opcional)', texto: 'A boina pode substituir o bibico no 2º A, com o distintivo circular do símbolo do CBMDF no lado direito. Os militares do Comando Especializado e das unidades subordinadas usam boina.', pag: 'p. 34 (III), 91–92', at: [G.hat.x + 120, G.hat.y + 110] });
    add(c, { key: 'cob2', nivel: 'info', titulo: 'Cobertura em deslocamento', texto: 'O uso de cobertura é obrigatório em deslocamentos a pé; dispensável no interior das unidades e locais cobertos.', pag: 'p. 34 (III)', at: null });
    const r = finalizar(c, g, Object.assign({}, VB, G.vb, { cobertura: `${G.hat.x - 215} ${G.hat.y - 190} 430 450` }));
    r.aspect = G.aspect;
    return r;
  }

  /* =====================================================================
     4º A — TFM — fotos do regulamento (p.56): masculino e feminino
     ===================================================================== */
  const GEO_F = {
    M: { w: 723, h: 987, aspect: '1123 / 987', ident: { x: 306, y: 247, r: -2 }, sym: { x: 358, y: 243 }, strp: { x: 436, y: 606 }, hat: { x: 930, y: 330, k: 1.7 },
      vb: { geral: '0 0 1123 987', peito: '160 130 300 264', mangaD: '160 130 300 264', mangaE: '330 150 300 264', cobertura: '800 160 260 228' } },
    F: { w: 384, h: 788, aspect: '897 / 788', ident: { x: 71, y: 224, r: -1 }, sym: { x: 112, y: 222 }, strp: { x: 174, y: 474 }, hat: { x: 690, y: 270, k: 1.4 },
      vb: { geral: '0 0 897 788', peito: '0 140 240 211', mangaD: '0 140 240 211', mangaE: '80 150 240 211', cobertura: '600 130 240 211' } },
  };
  function tfm(st) {
    const c = ctxOf(st);
    const G = c.fem ? GEO_F.F : GEO_F.M;
    const nStripes = c.p.grupo === 'of' || c.p.grupo === 'esp' ? 2 : (c.p.grupo === 'st' || ['sgt1', 'sgt2', 'sgt3'].includes(c.p.id) ? 1 : 0);
    let g = '';
    g += `<image href="${window.SPRITES['base:tfm-' + (c.fem ? 'f' : 'm') + '-' + nStripes]}" x="0" y="0" width="${G.w}" height="${G.h}" style="filter:drop-shadow(0 8px 12px rgba(0,0,0,.3))"/>`;
    // identificação bordada e símbolo (peito esquerdo)
    const txt = c.p.abrev + ' ' + c.nome;
    const wTxt = Math.min(c.fem ? 40 : 64, 12 + txt.length * 2.6);
    const fs = c.fem ? 3.4 : 4.6;
    g += hs('ident', `<g transform="translate(${G.ident.x},${G.ident.y}) rotate(${G.ident.r}) scale(.9,1)"><text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-weight="700" font-size="${fs}" fill="#fff" textLength="${wTxt}" lengthAdjust="spacingAndGlyphs">${esc(txt)} <tspan fill="#111">${esc(c.sangue)}</tspan></text></g>`, 'Identificação bordada');
    add(c, { key: 'ident', nivel: 'obrig', titulo: 'Identificação bordada no peito', texto: `“${c.p.abrev} ${c.nome}” em branco e tipo sanguíneo “${c.sangue}” em preto, centralizado à altura do peito, caixa alta, letras Arial de 10 mm, a 65 mm da borda inferior da gola.`, pag: 'p. 65', at: [G.ident.x - 30, G.ident.y - 14] });
    g += hs('simbolo', `<g transform="translate(${G.sym.x},${G.sym.y})">${simboloCBMDF(0, 0, c.fem ? 9.5 : 13)}</g>`, 'Símbolo do CBMDF');
    add(c, { key: 'simbolo', nivel: 'obrig', titulo: 'Símbolo do CBMDF bordado', texto: 'À esquerda da identificação (lado esquerdo do peito), no mesmo alinhamento, a 100 mm da costura da manga.', pag: 'p. 65', at: [G.sym.x + 16, G.sym.y - 12] });
    add(c, { key: 'bandeira', nivel: 'obrig', titulo: 'Bandeira do DF na manga direita', texto: 'Manga direita (80 × 60 mm), borda superior 65 mm abaixo da costura da cava. Obrigatória na camiseta de malha vermelha (na foto de referência a manga direita fica de costas, por isso não aparece).', pag: 'p. 65, 155', at: [c.fem ? 30 : 262, c.fem ? 215 : 300] });
    const temInstr = (st.cursos || []).some((x) => x.id === 'cmte' || x.instrutor);
    if (temInstr) add(c, { key: 'instrutor', nivel: 'opc', titulo: 'Inscrição de instrutor (manga comprida)', texto: 'Na camiseta de manga comprida de instrutor(a) nos Grupamentos Especializados ou estabelecimentos de ensino: “INSTRUTOR/A” em silk screen branco, caixa alta, na vertical, logo abaixo da bandeira do DF. Uso restrito a atividades de instrução.', pag: 'p. 69', at: null });
    add(c, { key: 'bermuda', nivel: 'obrig', titulo: nStripes === 2 ? 'Bermuda vermelha com duas listras brancas' : nStripes === 1 ? 'Bermuda vermelha com uma listra branca' : 'Bermuda vermelha lisa', texto: nStripes === 2 ? `${c.p.nome}: duas listras brancas paralelas (10 mm cada) em cada lateral externa, da cintura à barra.` : nStripes === 1 ? `${c.p.nome}: uma listra branca de 10 mm em cada lateral externa, da cintura à barra.` : `${c.p.nome}: sem listras, frisos ou detalhes laterais; tecido liso. A barra fica no mínimo 100 mm acima do joelho.`, pag: 'p. 95', at: [G.strp.x + 24, G.strp.y - 10] });
    // gorro
    const hatInner = gorroPala(c, 645, 150, COR.vermelho, COR.vermelhoEsc) + chaoLabel('Gorro com pala vermelho (opcional)', 645, 252);
    g += hs('cobertura', `<g transform="translate(${G.hat.x},${G.hat.y}) scale(${G.hat.k}) translate(-645,-150)">${hatInner}</g>`, 'Gorro');
    add(c, { key: 'cobertura', nivel: 'opc', titulo: 'Gorro com pala vermelho', texto: `Opcional, em tactel vermelho, brasão do CBMDF centrado (60 × 50 mm).${c.superior ? ' Oficiais superiores: ramos de carvalho dourados na pala.' : ''}${c.fn.id === 'cmtgeral' ? ' Comandante-Geral: pala circundada por dois ramos de carvalho com folhas e frutos.' : ''}${c.fem ? ' (A foto feminina de referência já mostra o gorro.)' : ''}`, pag: 'p. 56, 88', at: [G.hat.x, G.hat.y - 90] });
    add(c, { key: 'composicao', nivel: 'info', titulo: 'Por baixo da bermuda e calçados', texto: `Bermuda de malha preta, meias pretas de cano médio (ou alto dobradas) e tênis preto.${c.fem ? ' Composição feminina inclui top preto.' : ''} A camiseta é usada por fora da bermuda.`, pag: 'p. 56, 65', at: null });
    add(c, { key: 'vedados', nivel: 'vedado', titulo: 'Brevês, medalhas, barretas e insígnias metálicas', texto: 'O regulamento não prevê brevês, manicacas, distintivos de OBM, armas nem divisas no 4º A: a identificação é a bordada na camiseta. Medalhas são de uso restrito ao 1º grupo.', pag: 'p. 56–57, 170', at: null });
    add(c, { key: 'transito', nivel: 'alerta', titulo: 'Trânsito e uso isolado', texto: 'Uso isolado restrito ao interior da OBM, instruções técnico-profissionais, treinamento físico, áreas de reabilitação (SCI) e prevenção aquática. Em trânsito: permitido em viatura, veículo particular ou aplicativo; vedado em transporte público, motocicleta, a pé em via pública e em estabelecimentos externos.', pag: 'p. 57 (I, III)', at: null });
    const r = finalizar(c, g, Object.assign({}, VB, G.vb, { cobertura: hatVB({ x: G.hat.x, y: G.hat.y + 20 * G.hat.k }, G.hat.k) }));
    r.aspect = G.aspect;
    return r;
  }

  /* =====================================================================
     3º A — PRONTIDÃO (gandola laranja) — base fotográfica do regulamento (p.48), ≈0,94 px/mm
     ===================================================================== */
  const KP = 1.34;
  const GEO_P = {
    w: 1030, h: 800, aspect: '1330 / 800',
    luva: [{ x: 358, y: 122, r: 62, k: KP }, { x: 656, y: 122, r: -62, k: KP }],
    arma: { x: 507, y: 251.9, k: KP }, // base da arma na mesma linha da base dos cadarços
    cadI: { x: 428, y: 259, k: KP }, cadL: { x: 586, y: 259, k: KP },
    bp: { 1: { x: 432, y: 217, k: KP }, 2: { x: 407, y: 177, k: KP }, 3: { x: 582, y: 217, k: KP }, 4: { x: 607, y: 177, k: KP } },
    manD: { x: 280, y: 190, r: 34, k: 0.8 }, manE: { x: 734, y: 190, r: -34, k: 0.8 },
    band: { x: 238, y: 262, r: 34, k: KP * 0.7 }, emb: { x: 776, y: 262, r: -34, k: KP * 0.7 },
    div: [{ x: 190, y: 330, r: 34, k: KP * 0.8 }, { x: 824, y: 330, r: -34, k: KP * 0.8 }],
    hat: { x: 1180, y: 180, k: KP },
    vb: { geral: '0 0 1330 800', peito: '170 40 680 409', mangaD: '0 90 560 337', mangaE: '770 90 560 337', cobertura: '1050 40 280 168' },
  };
  function cadarcoEl(txt, kind) {
    const tx = kind === 'id'
      ? `<text x="0" y=".8" text-anchor="middle" dominant-baseline="central" font-family="'Arial Black',Arial" font-size="6.4" font-weight="900" fill="#111">${esc(txt[0])} <tspan fill="#c8141e">${esc(txt[1])}</tspan></text>`
      : `<text x="0" y=".8" text-anchor="middle" dominant-baseline="central" font-family="'Arial Black',Arial" font-size="6.8" font-weight="900" fill="#111">${esc(txt)}</text>`;
    return `<rect x="-45.5" y="-8.75" width="91" height="17.5" fill="#f1690f" stroke="#c4520a" stroke-width="1"/>${tx}`;
  }

  function prontidao(st) {
    const c = ctxOf(st);
    const B = colocarBreves(c, '3a');
    const G = GEO_P;
    let g = '';
    g += `<image href="${window.SPRITES['base:gandola-noplat']}" x="0" y="0" width="${G.w}" height="${G.h}" style="filter:drop-shadow(0 8px 12px rgba(0,0,0,.3))"/>`;

    // cadarços (130 x 25 mm)
    g += hs('cad-id', pl(G.cadI, cadarcoEl([c.nome.slice(0, 14), c.sangue], 'id')), 'Cadarço de identificação');
    const lot = c.fn.cadarco || (st.obm || 'OBM').toUpperCase();
    g += hs('cad-lot', pl(G.cadL, cadarcoEl(lot, 'lot')), 'Cadarço de lotação');
    add(c, { key: 'cad-id', nivel: 'obrig', titulo: 'Cadarço de identificação', texto: `Lado direito, acima do bolso: “${c.nome}” em preto (letras cheias tipo bastão) seguido de “${c.sangue}” em vermelho. Não leva posto ou graduação.`, pag: 'p. 44 (III), 105', at: mkAt(G.cadI, -50, 0) });
    add(c, { key: 'cad-lot', nivel: 'obrig', titulo: 'Cadarço de lotação', texto: c.fn.cadarco ? `Autoridades do Alto Comando usam a função: “${c.fn.cadarco}”.` : `Lado esquerdo, acima do bolso: sigla da OBM “${lot}”, em preto. Só siglas da tabela do item 3.2 (sem subgrupamentos, seções ou funções).`, pag: 'p. 44 (IV), 105–108', at: mkAt(G.cadL, 50, 0) });

    // posto
    if (c.plat) {
      g += hs('posto', G.luva.map((l) => pl(l, luvaSpr(c))).join(''), c.p.nome);
      add(c, { key: 'posto', nivel: 'obrig', titulo: 'Luvas amovíveis bordadas', texto: `${c.p.nome}: luvas amovíveis trapezoidais (100 × 55 × 60 mm) sobre as passadeiras, com ${c.p.stars ? 'estrelas bordadas de 30 mm sem espaçamento' : c.p.cadete ? 'insígnia base e barretas bordadas' : 'triângulo bordado'}${c.eOf ? '; tarja lateral ' + (c.superior ? 'dourada' : 'prateada') : '; sem tarja (praça especial/subtenente)'}.`, pag: 'p. 144–145', at: mkAt(G.luva[0], 0, -30) });
      g += hs('arma', pl(G.arma, armaBorracha(c, 0, 0)), c.q.nome);
      add(c, { key: 'arma', nivel: 'obrig', titulo: 'Arma emborrachada na carcela', texto: `${c.q.nome}: arma de PVC cinza sobre suporte preto (40 × 25 mm), fixada por velcro na aba frontal, alinhada à linha inferior dos cadarços.`, pag: 'p. 44 (VI), 152–153', at: mkAt(G.arma, 18, 0) });
    } else {
      g += G.luva.map((l) => pl(l, `<g filter="url(#fSh)">${spr('luva-lisa', 0, 0, 40)}</g>`)).join('');
      g += hs('posto', G.div.map((d) => pl(d, divisas(c, 0, 0, 'preto', '#f1690f'))).join(''), c.p.nome);
      add(c, { key: 'posto', nivel: 'obrig', titulo: 'Divisas bordadas nas mangas', texto: `${c.p.nome}: divisas pretas sobre base pentagonal laranja de 70 mm, a 130 mm da costura superior, nas duas mangas. A qualificação (${c.q.nome}) vai centrada sobre a divisa superior; praças não usam arma emborrachada no peito.`, pag: 'p. 148–149, 153', at: mkAt(G.div[0], 0, -10) });
    }

    // brevês emborrachados
    let bv = '', lista = [];
    [1, 2, 3, 4].forEach((pos) => { const cv = B.slots[pos]; if (cv) { bv += pl(G.bp[pos], breveBorracha(cv, 0, 0, cv.instrutor)); lista.push(`#${pos} ${cv.sigla}${cv.instrutor ? ' (borda amarela: instrutor)' : ''}`); } });
    if (bv) { g += hs('breves', bv, 'Brevês'); add(c, { key: 'breves', nivel: 'opc', titulo: 'Brevês emborrachados', texto: `Até 4: ${lista.join('; ')}. Os brevês de instrutor ocupam primeiro as posições #1, #2, #3 e #4, nessa ordem. Suporte elíptico preto 80 × 45 mm, brevê cinza, por velcro. #1 10 mm acima do bolso direito, #2 acima do #1; #3 e #4 no peito esquerdo (externos só aqui). A borda amarela marca instrutor e pode ir em todos os 4.`, pag: 'p. 44 (V), 48, 159, 163', at: mkAt(G.bp[1], -40, 0) }); }
    brevesAvisos(c, B);
    if (st.carreira && st.carreira.id) add(c, { key: 'carr', nivel: 'vedado', titulo: 'Distintivo de curso de carreira', texto: 'Não existem brevês emborrachados de cursos de carreira: ele não é ostentado no 3º A.', pag: 'p. 157', at: null });

    // manicacas
    const cursos = (st.cursos || []).map(resolverCurso);
    const func = cursos.find((x) => x.func), espc = cursos.find((x) => !x.func);
    const mD = st.manD === 'auto' || st.manD == null ? (func ? func.insc : '') : st.manD;
    const mE = st.manE === 'auto' || st.manE == null ? (espc ? espc.insc : '') : st.manE;
    if (mD) g += hs('manicacaD', pl(G.manD, manicaca(0, 0, mD, 'd')), mD);
    if (mE) g += hs('manicacaE', pl(G.manE, manicaca(0, 0, mE, 'e')), mE);
    if (mD) add(c, { key: 'manicacaD', nivel: 'opc', titulo: 'Manicaca funcional — braço direito', texto: `“${mD}”: distintivo de cunho funcional, imediatamente acima da bandeira do DF. Emborrachada 120 × 30 mm, texto cinza em fonte Arial Black, linha única.`, pag: 'p. 44 (V), 161–162', at: mkAt(G.manD, -30, -20) });
    if (mE) add(c, { key: 'manicacaE', nivel: 'opc', titulo: 'Manicaca de especialização — braço esquerdo', texto: `“${mE}”: especialização/estágio, imediatamente acima do emblema do CBMDF.`, pag: 'p. 161–162', at: mkAt(G.manE, 30, -20) });
    if (!mD && !mE) add(c, { key: 'manicaca', nivel: 'info', titulo: 'Manicacas', texto: 'Até 2 manicacas meia-lua: a funcional no braço direito e a de especialização no esquerdo. Opcionais; escolha na ficha.', pag: 'p. 161–162', at: null });

    g += hs('bandeira', pl(G.band, bandeiraDF(0, -21)), 'Bandeira DF');
    add(c, { key: 'bandeira', nivel: 'obrig', titulo: 'Bandeira do DF', texto: 'Manga direita, 65 mm abaixo da costura da cava.', pag: 'p. 155', at: mkAt(G.band, 0, 30) });
    g += hs('emblema', pl(G.emb, emblema(0, -23.5)), 'Emblema');
    add(c, { key: 'emblema', nivel: 'obrig', titulo: 'Emblema do CBMDF', texto: 'Manga esquerda, 55 mm abaixo do ombro.', pag: 'p. 157', at: mkAt(G.emb, 0, 30) });

    // vedados
    if ((st.medalhas || []).length) add(c, { key: 'vedcond', nivel: 'vedado', titulo: 'Medalhas e barretas', texto: 'Medalhas são de uso restrito ao 1º grupo (túnicas); barretas são proibidas nos uniformes operacionais. Nada disso aparece no 3º A.', pag: 'p. 170, 172', at: null });
    if (c.fn.id) add(c, { key: 'vedaplique', nivel: 'vedado', titulo: 'Aplique de comando', texto: 'É vedado o uso do aplique nas demais peças de uniforme (só túnica e camisa bege).', pag: 'p. 166', at: null });

    // cobertura
    const usaBoina = D.obmsBoina.includes((st.obm || '').trim().toUpperCase());
    const hatInner = (usaBoina ? boina(c, 645, 150) : gorroPala(c, 645, 150, COR.laranja, COR.laranjaEsc)) + chaoLabel(usaBoina ? 'Boina azul-escuro' : 'Gorro com pala laranja', 645, usaBoina ? 215 : 252);
    g += hs('cobertura', `<g transform="translate(${G.hat.x},${G.hat.y}) scale(${G.hat.k}) translate(-645,-150)">${hatInner}</g>`, 'Cobertura');
    add(c, { key: 'cobertura', nivel: 'obrig', titulo: usaBoina ? 'Boina azul-escuro (' + st.obm.toUpperCase() + ')' : 'Gorro com pala laranja', texto: usaBoina ? 'Sua lotação (COESP, GPCIU, GBS ou GAEPH) usa boina azul-escuro no lugar do gorro com pala, com o distintivo circular do símbolo do CBMDF no lado direito.' : `Tropa em geral: gorro com pala laranja, com brasão bordado conforme o posto/graduação${c.superior ? ' e ramos de carvalho dourados na pala (oficiais superiores)' : ''}. Obrigatória em deslocamento a pé; dispensável no interior das unidades, em veículo e em socorro (com capacete).`, pag: 'p. 45 (VIII), 86–87, 91–92', at: [G.hat.x, 80] });
    add(c, { key: 'gola', nivel: 'info', titulo: 'Gola: dobrada ou elevada', texto: 'A gola do 3º A pode ser usada dobrada ou elevada, a critério do militar. Com a tropa em forma o uso é padronizado: preferencialmente dobrada em ambientes fechados e elevada em ambientes abertos, como proteção contra o sol. Veja a figura abaixo.', pag: 'p. 46 (XIV), 47', at: [507, 70] });
    add(c, { key: 'bermuda', nivel: 'info', titulo: 'Bermuda de malha preta', texto: 'No serviço operacional o 3º A é usado com a bermuda de malha preta por baixo, para trocar de uniforme/EPI e agir rápido em meio aquático.', pag: 'p. 46 (XVII)', at: null });
    add(c, { key: 'calca', nivel: 'info', titulo: 'Calça e coturno', texto: 'A barra da calça é ajustada por velcro na região tibial, acima do coturno; não se usa a calça por fora do coturno (exceto campo/buscas, a critério do comandante).', pag: 'p. 44 (VII)', at: null });
    const r = finalizar(c, g, Object.assign({}, VB, G.vb, { cobertura: hatVB({ x: G.hat.x, y: G.hat.y + 20 * G.hat.k }, G.hat.k) }));
    r.aspect = G.aspect;
    return r;
  }


  /* =====================================================================
     SPRITES REAIS DO REGULAMENTO — substituem os desenhos acima.
     Tamanhos nominais na escala dos helpers (0,7 px/mm).
     ===================================================================== */
  function spr(name, cx, cy, w, style) {
    const sz = (window.SPRITE_SIZE || {})[name] || [1, 1];
    return image(name, cx, cy, w, w * sz[1] / sz[0], style);
  }
  const temSpr = (n) => !!(window.SPRITES && window.SPRITES[n]);
  // platina rígida 130 x 60 mm (vertical, botão para cima); cor: 'cinza' (túnica) | 'azul' (2º A)
  function platinaSpr(c, cor) {
    const src = window.SPRITES['platina-' + cor + '-' + c.p.id];
    const w = cor === 'cinza' ? 33 : 38, h = 94; // largura reduzida: ombro visto em perspectiva
    return `<g filter="url(#fSh)"><image href="${src}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" preserveAspectRatio="none"/></g>`;
  }
  // luva amovível 100 x 55/60 mm (vertical)
  function luvaSpr(c) {
    return `<g filter="url(#fSh)">${spr('luva-' + c.p.id, 0, 0, 40)}</g>`;
  }
  function plaqueta(c, cx, cy, cor) {
    const dour = cor === 'ouro';
    return `<g filter="url(#fSh)">${image(dour ? 'plaqueta-ouro' : 'plaqueta-vermelha', cx, cy, 56, 12.6, '')}${textFit(c.plaq, cx, cy + 0.2, 49, 5, dour ? '#111' : '#fff')}</g>`;
  }
  function bandeiraDF(cx, topY) { return `<g filter="url(#fSh)">${image('bandeira-df', cx, topY + 21, 56, 42)}</g>`; }
  function emblema(cx, topY) { return `<g filter="url(#fSh)">${image('emblema', cx, topY + 23.5, 47, 47)}</g>`; }
  function simboloCBMDF(cx, cy, r) { return spr('simbolo', cx, cy, r * 2.1); }
  function armaBorracha(c, cx, cy) { return `<g filter="url(#fSh)">${image('arma-emb-' + c.q.sprite, cx, cy, 17.5, 28)}</g>`; }
  function distCarreira(cx, cy, sigla, r, sprite) {
    r = r || 11;
    if (sprite && temSpr(sprite)) return `<g filter="url(#fSh)">${spr(sprite, cx, cy, r * 2.3)}</g>`;
    const t = sigla ? sigla.toUpperCase().slice(0, 5) : '?';
    return `<g filter="url(#fSh)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gGold)" stroke="#8a6410" stroke-width=".7"/><circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="#17294f"/>${textFit(t, cx, cy + 0.3, r * 1.15, Math.max(3.4, r * 0.4), '#fff')}</g>`;
  }
  function obmDistintivo(c, cx, topY, comSuporte) {
    const sg = (c.st.obm || 'OBM').toUpperCase();
    let s = '';
    let sy = topY + 2; // topo do escudo
    if (comSuporte) { s += spr('obm-suporte', cx, topY + 25, 28); sy = topY + 21; }
    const W = 24.5, H = W * ((window.SPRITE_SIZE || {})['obm-escudo'] || [200, 296])[1] / ((window.SPRITE_SIZE || {})['obm-escudo'] || [200, 296])[0];
    s += image('obm-escudo', cx, sy + H / 2, W, H);
    s += textFit(sg, cx, sy + H * 0.155, Math.min(19, 4 + sg.length * 2.6), 3.6, '#f6d878');
    return `<g filter="url(#fSh)">${s}</g>`;
  }
  function aplique(fn, cx, cy) {
    const grande = fn.id === 'cmtgeral' || fn.id === 'subcmt';
    return `<g filter="url(#fSh)">${spr('aplique-' + fn.id, cx, cy, grande ? 15.4 : 10.5)}</g>`;
  }
  function divisaGola(c, cx, cy) {
    if (!c.p.divisas) return '';
    return `<g filter="url(#fSh)">${spr('divisa-gola-' + c.p.id, cx, cy, 9.8)}</g>`;
  }
  function cadarcoEl(txt, kind) {
    const tx = kind === 'id'
      ? `<text x="0" y=".8" text-anchor="middle" dominant-baseline="central" font-family="'Arial Black',Arial" font-size="7.4" font-weight="900" fill="#141414">${esc(txt[0])} <tspan fill="#c8141e">${esc(txt[1])}</tspan></text>`
      : `<text x="0" y=".8" text-anchor="middle" dominant-baseline="central" font-family="'Arial Black',Arial" font-size="7.8" font-weight="900" fill="#141414">${esc(txt)}</text>`;
    return `<g filter="url(#fSh)">${image('cadarco-laranja', 0, 0, 91, 17.5, '')}</g>${tx}`;
  }
  // coberturas (fotos do regulamento); desenhadas em torno de (cx, cy), ~150 px de largura
  function palaDetalhe(c, cor, cx, cy) {
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

  // IDs de gradiente/filtro/textPath precisam ser únicos por aba (abas ocultas usam display:none).
  function idsUnicos(svg, key) {
    return svg.replace(/(id="|url\(#|href="#)(gGold|gSilver|gShade|fSh|mp-d|mp-e)/g, (m, a, b) => a + b + '-' + key);
  }
  function build(key, st) {
    const r = { '1b': tunica, '2a': passeio, '3a': prontidao, '4a': tfm }[key](st);
    r.svg = idsUnicos(r.svg, key);
    return r;
  }
  return { build, resolverCurso, ctxOf, VB };
})();
