// ficha.js — Ficha técnica de material (integración Unidad 3, Fase 4)
//
// FIX (integración — Fase 4): antes no había forma de ver, para UN material,
// los resultados de todos los ensayos aplicables en un solo lugar; había que
// entrar pestaña por pestaña y cargar el material a mano en cada una (y en
// varias, ni siquiera se podía porque cada ensayo tenía su propia lista de
// materiales, ver Fase 1). Esto reutiliza:
//   - PRESETS[x] (data-presets.js) para las propiedades base y de tracción
//   - genCurve/calcResilience/calcTenacity (traccion.js) para resiliencia y tenacidad reales,
//     sin reinventar la fórmula
//   - PRESETS[x].frac (Fase 1) + ftDadN/flEpsDot (fatiga.js/fluencia.js) para
//     fractura/fatiga/fluencia, mostrando "no disponible" en vez de inventar
//     un valor cuando el material no tiene esos datos cargados
//   - el mismo modal #fichaModal / #fichaBody y printFicha() que ya usaba la
//     ficha del ensayo de tracción (traccion.js), incluida la corrección de
//     @media print de esta misma fase

// Mismos nombres visibles que ya usa el <select id="e_preset"> de tracción,
// para que un material se llame igual en todos lados.
const MATERIAL_LABELS = {
  acero:'Acero estructural A36', aceroinox:'Acero Inoxidable 304', molibdeno:'Molibdeno',
  aluminio:'Aluminio 6061', cobre:'Cobre recocido', titanio:'Titanio Ti-6Al-4V',
  niquel:'Níquel', magnesio:'Magnesio AZ31', laton:'Latón', zinc:'Zinc', tungsteno:'Tungsteno',
  oro:'Oro', plata:'Plata', plomo:'Plomo',
  fragil:'Hierro fundido gris (frágil)', ceramica:'Cerámica Al₂O₃', carbono:'Fibra de carbono',
  hormigon:'Hormigón', madera:'Madera de roble', pino:'Pino', algarrobo:'Algarrobo',
  quebracho:'Quebracho colorado', nylon:'Nylon PA6'
};

// FIX (Fase 5a): la condición de ejemplo para fluencia (σ, T) no puede ser la
// misma para todos los materiales -- 500°C funde al zinc/plomo (Tm 420/327°C)
// y es demasiado bajo para mostrar algo visible en molibdeno/tungsteno
// (funden a >2600°C, fluencia relevante recién a alta T). Un material sin
// entrada acá usa el ejemplo genérico (100 MPa, 500 °C).
const FICHA_CREEP_EJEMPLO = {
  zinc:      {sigma:15, t:50},
  plomo:     {sigma:5,  t:40},
  molibdeno: {sigma:50, t:1200},
  tungsteno: {sigma:50, t:1800},
};

// FIX (Fase 8, punto 1): FT_SN_PRESETS (fatiga.js) vive separado de PRESETS
// a propósito -- tiene claves de GRADO específico ("acero1045", "acero4340",
// "al2014"), no genéricas como PRESETS ("acero", "aluminio"), y ya se había
// excluido a mano de la sincronización cruzada de material (ver
// MATERIAL_SYNC_TARGETS en material-sync.js, Fase 7) por ese mismo motivo.
// En vez de forzar esos datos dentro de PRESETS[x].frac (lo que perdería la
// distinción entre grados -- 1045 y 4340 tienen pendientes de Basquin bien
// distintas) o de duplicar sus valores acá, este mapeo liviano conecta cada
// material de PRESETS con el grado de FT_SN_PRESETS más representativo,
// SOLO para mostrarlo como referencia rotulada en la ficha -- no como si
// fuera un ensayo propio de ese material genérico. No se mapean los
// materiales sin un grado representativo real en FT_SN_PRESETS.
const FICHA_SN_REF = { acero:'acero1045', aceroinox:'acero4340', aluminio:'al2014' };
// σ_a de referencia para el resumen de vida a fatiga: mismo valor que trae
// por defecto el slider ft_sa en la pestaña interactiva (fatiga.js), para no
// inventar una condición de carga nueva solo para la ficha.
const FICHA_SN_SA_EJEMPLO = 200;

function openFichaPicker(){
  const opts = Object.keys(PRESETS).map(k => `<option value="${k}">${MATERIAL_LABELS[k]||k}</option>`).join('');
  document.getElementById('fichaBody').innerHTML = `
    <div class="field"><label>Elegí un material para generar su ficha técnica</label>
      <select id="fichaMatSelect">
        <option value="">— Seleccionar —</option>
        ${opts}
      </select>
    </div>
    <div class="note">La ficha muestra tracción, dureza estimada y — cuando el material tiene esos datos cargados — fractura, fatiga y fluencia.</div>
    <div class="no-print" style="margin-top:12px">
      <button class="btn-primary" style="width:auto;padding:8px 20px" onclick="renderFichaMaterial()">Generar ficha</button>
    </div>`;
  document.getElementById('fichaModal').style.display='flex';
}

function renderFichaMaterial(){
  const key = document.getElementById('fichaMatSelect').value;
  if(!key) return;
  // FIX (Fase 10): registrar en el progreso local que se generó una ficha
  // para este material, si el módulo de progreso está cargado.
  if (typeof progRegistrar === 'function') progRegistrar('ficha', { material: key });
  const p = PRESETS[key];
  const nombre = MATERIAL_LABELS[key] || key;
  const now = new Date().toLocaleString('es-AR');

  // Tracción: mismas funciones que ya calculan la curva y las áreas para el
  // ensayo interactivo — nada nuevo, solo se llaman con los datos del preset.
  const pts = genCurve(p.E, p.sy||0, p.ts, p.el, false);
  const res = calcResilience(pts);
  const ten = calcTenacity(pts);

  // Dureza estimada — misma correlación TS≈3.45·HB validada en tests.js (dz_ts_correlation).
  // FIX (Fase 6b): con la unificación de Dureza (Fase 6a), varios materiales
  // ahora tienen un HB real en PRESETS[x].dureza -- se usa ese en vez de
  // estimarlo por correlación cuando existe, igual que hicimos con K_IC/Paris/
  // creep en la Fase 1 (dato real > estimación, cuando el dato real existe).
  const durezaReal = p.dureza;
  const hbReal = durezaReal?.hb;
  const hbEst = p.ts/3.45;

  // FIX (Fase 5c): la pestaña Compresión SÍ puede tener σ_yc/σ_c cargados a
  // mano para este material -- antes la ficha nunca los leía y siempre
  // mostraba el aviso de "sin datos", aunque el usuario ya los hubiera
  // cargado. Ahora, si el preset actualmente seleccionado en Compresión
  // coincide con el material de la ficha, se usan esos valores reales.
  const coPresetEl = document.getElementById('co_preset');
  const tieneCompresion = coPresetEl && coPresetEl.value === key;
  let compData = null;
  if (tieneCompresion) {
    compData = {
      E:    parseFloat(document.getElementById('co_E').value)   || p.E,
      syc:  parseFloat(document.getElementById('co_syc').value) || 0,
      sc:   parseFloat(document.getElementById('co_sc').value)  || 0,
      frag: document.getElementById('co_frag').value,
    };
  }

  // FIX (Fase 7b — extender la lectura cruzada de la Fase 5c a Dureza): la
  // Fase 5c ya lee Compresión en vivo si el material coincide (ver
  // `tieneCompresion` arriba). Mismo criterio acá para Rockwell/Brinell/
  // Vickers: si el <select> de ESE subensayo tiene cargado el mismo
  // material que la ficha, se lee el resultado que el simulador YA
  // calculó y mostró en pantalla para ese ensayo puntual (el texto de
  // dz_rkNumber/dz_brResult/dz_vResult), en vez de reinventar la fórmula acá.
  // Se lee el texto ya renderizado -- no se recalcula con otra copia de la
  // fórmula -- para que si el alumno movió el slider/carga/diámetro
  // respecto del ensayo guiado, la ficha muestre EXACTAMENTE lo que el
  // alumno tiene en pantalla en ese momento, no una reconstrucción aparte
  // que podría desincronizarse de dureza-rockwell.js/brinell.js/vickers.js.
  // Puede coincidir en unos subensayos y no en otros (ej. "Oro" está en
  // Brinell/Vickers pero no en Rockwell, ver dureza-rockwell.js) -- por
  // eso los 3 se chequean por separado, no como un solo "tieneDureza".
  function fichaMedidoDureza(selectId, resultId, regex) {
    const selEl = document.getElementById(selectId);
    if (!selEl || selEl.value !== key) return null; // otro material cargado ahí, o sin selector en el DOM
    const resEl = document.getElementById(resultId);
    if (!resEl) return null;
    const m = resEl.textContent.match(regex);
    return m ? m[1] : null; // null también cuando el resultado en pantalla es "—" (ensayo sin completar)
  }
  const rkMedido = fichaMedidoDureza('dz_rkMat', 'dz_rkNumber', /^(\d+(?:\.\d+)?\s*HR\w+)/);
  const brMedido = fichaMedidoDureza('dz_brMat', 'dz_brResult', /^(\d+(?:\.\d+)?)\s*HB/);
  const vMedido  = fichaMedidoDureza('dz_vMat',  'dz_vResult',  /^(\d+(?:\.\d+)?)\s*HV/);
  const tieneDurezaMedida = !!(rkMedido || brMedido || vMedido);

  const frac = p.frac || {};
  const tieneKic = frac.kic !== undefined;
  const tieneParis = frac.parisC !== undefined;
  const tieneCreep = frac.K !== undefined;
  const ejCreep = FICHA_CREEP_EJEMPLO[key] || {sigma:100, t:500};

  // FIX (Fase 8, punto 1): resumen de vida a fatiga por S-N/Basquin, al lado
  // del resumen de Paris ya existente. Solo para los materiales mapeados en
  // FICHA_SN_REF (ver comentario junto a esa constante) -- para el resto, no
  // se muestra nada acá, igual que kic/paris/creep no se muestran cuando no
  // hay dato real. Se etiqueta explícitamente con el grado de referencia
  // (ej. "Acero 1045") para que quede claro que es una curva de referencia
  // de ESE grado, no un ensayo propio del acero genérico de esta ficha.
  const snGrado = FICHA_SN_REF[key];
  const snRef = snGrado ? FT_SN_PRESETS[snGrado] : null;
  const tieneSn = !!snRef;
  const snInfinita = tieneSn && snRef.hasLimit && FICHA_SN_SA_EJEMPLO <= snRef.Se;
  const snNf = tieneSn && !snInfinita ? ftBasquinN(FICHA_SN_SA_EJEMPLO, snRef.sfp, snRef.b) : null;

  const faltantes = [!tieneKic&&'K_IC', !tieneParis&&'Ley de Paris', !tieneCreep&&'parámetros de fluencia'].filter(Boolean);

  let fractSeccion;
  if (tieneKic || tieneParis || tieneCreep || tieneSn) {
    fractSeccion = `
    <div class="ficha-sec ficha-full">
      <h3>Fractura, fatiga y fluencia</h3>
      ${tieneKic ? `<div class="ficha-row"><span class="fk">Tenacidad a la fractura K_IC</span><span class="fv">${frac.kic} MPa·√m</span></div>` : ''}
      ${tieneParis ? `
      <div class="ficha-row"><span class="fk">Ley de Paris</span><span class="fv">C=${frac.parisC.toExponential(2)}, m=${frac.parisM}</span></div>
      <div class="ficha-row"><span class="fk">da/dN a ΔK=15 MPa·√m</span><span class="fv">${ftDadN(15, frac.parisC, frac.parisM).toExponential(2)} mm/ciclo</span></div>` : ''}
      ${tieneSn ? `
      <div class="ficha-row"><span class="fk">Curva S-N (Basquin) — referencia</span><span class="fv">${snRef.label}</span></div>
      <div class="ficha-row"><span class="fk">σ_f' / b</span><span class="fv">${snRef.sfp} MPa / ${snRef.b}</span></div>
      ${snRef.hasLimit ? `<div class="ficha-row"><span class="fk">Límite de fatiga S_e</span><span class="fv">${snRef.Se} MPa</span></div>` : ''}
      <div class="ficha-row"><span class="fk">Vida estimada a σ_a=${FICHA_SN_SA_EJEMPLO} MPa</span><span class="fv">${snInfinita ? 'mayor a 10⁷ ciclos (infinita)' : snNf.toExponential(2)+' ciclos'}</span></div>
      <div class="note" style="margin-top:2px">Curva de referencia para ${snRef.label} — "${nombre}" no tiene datos S-N propios cargados en el simulador.</div>` : ''}
      ${tieneCreep ? `
      <div class="ficha-row"><span class="fk">Parámetros de Dorn</span><span class="fv">K=${frac.K}, n=${frac.n}, Q_c=${frac.Qc} J/mol</span></div>
      <div class="ficha-row"><span class="fk">ε̇_s estimada (${ejCreep.sigma} MPa, ${ejCreep.t} °C)</span><span class="fv">${flEpsDot(frac,ejCreep.sigma,ejCreep.t).toExponential(2)} 1/h</span></div>` : ''}
      ${faltantes.length ? `<div class="note" style="margin-top:6px">No disponible para este material: ${faltantes.join(', ')}.</div>` : ''}
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px">
        ${tieneKic ? `<div style="flex:1;min-width:220px"><div class="note" style="margin:0 0 4px">K_I vs. longitud de grieta (σ=${(0.5*p.ts).toFixed(0)} MPa, Y=1.0)</div><div class="ficha-mini" style="height:160px"><canvas id="fichaMatFracChart"></canvas></div></div>` : ''}
        ${tieneParis ? `<div style="flex:1;min-width:220px"><div class="note" style="margin:0 0 4px">da/dN vs. ΔK (ley de Paris)</div><div class="ficha-mini" style="height:160px"><canvas id="fichaMatFatigaChart"></canvas></div></div>` : ''}
        ${tieneCreep ? `<div style="flex:1;min-width:220px"><div class="note" style="margin:0 0 4px">ε̇_s vs. T (σ=${ejCreep.sigma} MPa)</div><div class="ficha-mini" style="height:160px"><canvas id="fichaMatFluenciaChart"></canvas></div></div>` : ''}
      </div>
    </div>`;
  } else {
    fractSeccion = `
    <div class="ficha-sec ficha-full">
      <h3>Fractura, fatiga y fluencia</h3>
      <div class="note" style="margin-top:0">Este material no tiene datos de fractura/fatiga/fluencia cargados en el simulador. Elegí acero, aluminio, titanio, acero inoxidable o cerámica para ver esta sección completa.</div>
    </div>`;
  }

  document.getElementById('fichaBody').innerHTML = `
  <div class="ficha-header">
    <div>
      <div class="ficha-title">Ficha técnica de material — ${nombre}</div>
      <div class="ficha-meta">Fecha: ${now} — Simulador de Ensayos Mecánicos</div>
    </div>
    <div style="text-align:right">
      <div class="ficha-badge ${p.fragil?'badge-fragil':'badge-ductil'}">${p.fragil?'MATERIAL FRÁGIL':'MATERIAL DÚCTIL'}</div>
    </div>
  </div>
  <div class="ficha">
    <div class="ficha-sec">
      <h3>Propiedades elásticas</h3>
      <div class="ficha-row"><span class="fk">Módulo de elasticidad E</span><span class="fv">${p.E} GPa</span></div>
      <div class="ficha-row"><span class="fk">Coeficiente de Poisson ν</span><span class="fv">${p.nu ?? '—'}</span></div>
      <div class="ficha-row"><span class="fk">Límite elástico σ_y</span><span class="fv">${p.sy ? p.sy+' MPa' : '— (frágil)'}</span></div>
      <div class="ficha-row"><span class="fk">Módulo de resiliencia U_R</span><span class="fv">${(res*1000).toFixed(2)} kJ/m³</span></div>
    </div>
    <div class="ficha-sec">
      <h3>Resistencia (tracción)</h3>
      <div class="ficha-row"><span class="fk">Resistencia a la tracción TS</span><span class="fv">${p.ts} MPa</span></div>
      <div class="ficha-row"><span class="fk">%EL (elongación)</span><span class="fv">${p.el} %</span></div>
      <div class="ficha-row"><span class="fk">Tenacidad (área bajo curva)</span><span class="fv">${ten.toFixed(3)} MJ/m³</span></div>
      <div class="ficha-row"><span class="fk">Tipo de fractura</span><span class="fv">${p.fragil?'Frágil':'Dúctil'}</span></div>
    </div>
    <div class="ficha-sec${tieneCompresion?' ficha-full':''}">
      <h3>Compresión</h3>
      ${tieneCompresion ? `
      <div class="ficha-row"><span class="fk">Límite elástico comp. σ_yc</span><span class="fv">${compData.syc} MPa</span></div>
      <div class="ficha-row"><span class="fk">Resistencia a compresión σ_c</span><span class="fv">${compData.sc} MPa</span></div>
      <div class="ficha-row"><span class="fk">Comportamiento</span><span class="fv">${compData.frag==='si'?'Frágil':'Dúctil'}</span></div>
      <div class="note" style="margin-top:6px">Valores tomados de la pestaña Compresión (cargados manualmente ahí para este material).</div>
      <div style="max-width:320px;margin-top:8px"><div class="ficha-mini" style="height:150px"><canvas id="fichaMatCompChart"></canvas></div></div>` : `
      <div class="note" style="margin-top:0">Sin datos propios de compresión (σ_yc, σ_c) para este material — cargalos manualmente en la pestaña Compresión (con este mismo material seleccionado ahí) y volvé a generar la ficha. No se estiman a partir de tracción porque el comportamiento a compresión no es simétrico, sobre todo en materiales frágiles.</div>`}
    </div>
    <div class="ficha-sec">
      <h3>Dureza${durezaReal ? '' : ' (estimada)'}</h3>
      ${durezaReal ? `
      ${durezaReal.hb!==undefined ? `<div class="ficha-row"><span class="fk">HB (Brinell)</span><span class="fv">${durezaReal.hb}</span></div>` : ''}
      ${durezaReal.hv!==undefined ? `<div class="ficha-row"><span class="fk">HV (Vickers)</span><span class="fv">${durezaReal.hv}</span></div>` : ''}
      ${durezaReal.hr!==undefined ? `<div class="ficha-row"><span class="fk">HR (Rockwell ${durezaReal.hr.scale})</span><span class="fv">${durezaReal.hr.value}</span></div>` : ''}
      <div class="note" style="margin-top:6px">Valores de referencia del simulador (no estimados) — mismos usados en la pestaña Ensayo no destructivo.</div>` : `
      <div class="ficha-row"><span class="fk">HB estimado</span><span class="fv">${hbEst.toFixed(0)} *</span></div>
      <div class="note" style="margin-top:6px">* Correlación TS(MPa)≈3.45·HB — aproximación válida sobre todo para aceros de baja/media aleación. No reemplaza un ensayo de dureza real.</div>`}
      ${rkMedido ? `<div class="ficha-row"><span class="fk">HR medido en tu ensayo (Rockwell)</span><span class="fv">${rkMedido}</span></div>` : ''}
      ${brMedido ? `<div class="ficha-row"><span class="fk">HB medido en tu ensayo (Brinell)</span><span class="fv">${brMedido}</span></div>` : ''}
      ${vMedido  ? `<div class="ficha-row"><span class="fk">HV medido en tu ensayo (Vickers)</span><span class="fv">${vMedido}</span></div>` : ''}
      ${tieneDurezaMedida ? `<div class="note" style="margin-top:6px">Tomado de lo que tenés cargado ahora mismo en la pestaña Ensayo no destructivo (con este mismo material seleccionado ahí) — puede diferir de la referencia bibliográfica de arriba si moviste el control respecto del ensayo guiado.</div>` : ''}
    </div>
    <div class="ficha-sec ficha-full">
      <h3>Curva σ — ε (tracción)</h3>
      <div class="ficha-mini"><canvas id="fichaMatTraccionChart"></canvas></div>
    </div>
    ${fractSeccion}
  </div>
  <div class="no-print" style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn-primary" style="width:auto;padding:8px 20px" onclick="printFicha()">⬇ Imprimir / Guardar PDF</button>
    <button class="btn-secondary" style="width:auto;padding:8px 20px" onclick="openFichaPicker()">← Elegir otro material</button>
    <button class="btn-secondary" style="width:auto;padding:8px 20px" onclick="closeFicha()">Cerrar</button>
  </div>`;

  document.getElementById('fichaModal').style.display='flex';

  // FIX (Fase 5b): mismo patrón que showFicha() en traccion.js -- los canvas
  // recién existen en el DOM después de asignar innerHTML, así que Chart.js
  // se instancia en un setTimeout, no en línea.
  setTimeout(() => {
    const tCtx = document.getElementById('fichaMatTraccionChart')?.getContext('2d');
    if (tCtx) {
      const [el_,pl,nk,fr] = splitPhases(pts);
      new Chart(tCtx,{type:'line',data:{datasets:[
        {data:el_,borderColor:'#2176ae',borderWidth:2,pointRadius:0,tension:0,fill:false},
        {data:pl, borderColor:'#1a8c5e',borderWidth:2,pointRadius:0,tension:0.2,fill:false},
        {data:nk, borderColor:'#c8780a',borderWidth:2,pointRadius:0,tension:0.3,fill:false},
        {data:fr, borderColor:'#c43535',borderWidth:2,pointRadius:5,pointBackgroundColor:'#c43535',tension:0,fill:false},
      ]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:0},
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{x:{type:'linear',grid:{color:gc},ticks:{color:tc,maxTicksLimit:5,callback:v=>v.toFixed(3)}},
                y:{grid:{color:gc},ticks:{color:tc,maxTicksLimit:5}}}}});
    }

    const coCtx = document.getElementById('fichaMatCompChart')?.getContext('2d');
    if (coCtx && compData) {
      const compPts = genCompCurve(compData.E, compData.syc, compData.sc, compData.frag);
      new Chart(coCtx,{type:'line',data:{datasets:[{data:compPts, borderColor:'#7a3fb8', borderWidth:2, pointRadius:0, tension:0.15, fill:false}]},
        options:{responsive:true,maintainAspectRatio:false,animation:{duration:0},
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{x:{type:'linear',title:{display:true,text:'ε_c',color:tc,font:{size:10}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:4}},
                y:{title:{display:true,text:'σ_c (MPa)',color:tc,font:{size:10}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:4}}}}});
    }

    const fCtx = document.getElementById('fichaMatFracChart')?.getContext('2d');
    if (fCtx) {
      const sigma = 0.5*p.ts, Y = 1.0;
      const ac = frCalcAcMm(frac.kic, Y, sigma);
      const xMax = Math.max(ac*1.6, 2);
      const curva = []; const N=30;
      for(let i=0;i<=N;i++){ const x=xMax*i/N; curva.push({x, y:frCalcKi(Y, sigma, x)}); }
      new Chart(fCtx,{type:'line',data:{datasets:[
        {data:curva, borderColor:'#c43535', borderWidth:2, pointRadius:0, tension:0, fill:false},
        {data:[{x:0,y:frac.kic},{x:xMax,y:frac.kic}], borderColor:'#c8780a', borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false}
      ]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:0},
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{x:{type:'linear',title:{display:true,text:'a (mm)',color:tc,font:{size:10}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:4}},
                y:{title:{display:true,text:'K_I',color:tc,font:{size:10}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:4}}}}});
    }

    const paCtx = document.getElementById('fichaMatFatigaChart')?.getContext('2d');
    if (paCtx) {
      const curva = []; const N=30;
      for(let i=0;i<=N;i++){ const dk = 2 + (60-2)*i/N; curva.push({x:dk, y:ftDadN(dk, frac.parisC, frac.parisM)}); }
      new Chart(paCtx,{type:'line',data:{datasets:[{data:curva, borderColor:'#1a5fa8', borderWidth:2, pointRadius:0, tension:0, fill:false}]},
        options:{responsive:true,maintainAspectRatio:false,animation:{duration:0},
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{x:{type:'linear',title:{display:true,text:'ΔK (MPa·√m)',color:tc,font:{size:10}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:4}},
                y:{type:'logarithmic',title:{display:true,text:'da/dN (mm/ciclo)',color:tc,font:{size:10}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:4}}}}});
    }

    const flCtx = document.getElementById('fichaMatFluenciaChart')?.getContext('2d');
    if (flCtx) {
      const tMin = Math.max(0, ejCreep.t-100), tMax = ejCreep.t+150;
      const curva = []; const N=30;
      for(let i=0;i<=N;i++){ const tC = tMin + (tMax-tMin)*i/N; curva.push({x:1000/(tC+273.15), y:flEpsDot(frac, ejCreep.sigma, tC)}); }
      curva.sort((a,b)=>a.x-b.x);
      new Chart(flCtx,{type:'line',data:{datasets:[{data:curva, borderColor:'#1a5fa8', borderWidth:2, pointRadius:0, tension:0, fill:false}]},
        options:{responsive:true,maintainAspectRatio:false,animation:{duration:0},
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{x:{type:'linear',title:{display:true,text:'1000/T (1/K)',color:tc,font:{size:10}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:4}},
                y:{type:'logarithmic',title:{display:true,text:'ε̇_s (1/h)',color:tc,font:{size:10}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:4}}}}});
    }
  }, 100);
}
