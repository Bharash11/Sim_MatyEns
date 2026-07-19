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
  const p = PRESETS[key];
  const nombre = MATERIAL_LABELS[key] || key;
  const now = new Date().toLocaleString('es-AR');

  // Tracción: mismas funciones que ya calculan la curva y las áreas para el
  // ensayo interactivo — nada nuevo, solo se llaman con los datos del preset.
  const pts = genCurve(p.E, p.sy||0, p.ts, p.el, false);
  const res = calcResilience(pts);
  const ten = calcTenacity(pts);

  // Dureza estimada — misma correlación TS≈3.45·HB validada en tests.js (dz_ts_correlation).
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

  const frac = p.frac || {};
  const tieneKic = frac.kic !== undefined;
  const tieneParis = frac.parisC !== undefined;
  const tieneCreep = frac.K !== undefined;
  const ejCreep = FICHA_CREEP_EJEMPLO[key] || {sigma:100, t:500};
  const faltantes = [!tieneKic&&'K_IC', !tieneParis&&'Ley de Paris', !tieneCreep&&'parámetros de fluencia'].filter(Boolean);

  let fractSeccion;
  if (tieneKic || tieneParis || tieneCreep) {
    fractSeccion = `
    <div class="ficha-sec ficha-full">
      <h3>Fractura, fatiga y fluencia</h3>
      ${tieneKic ? `<div class="ficha-row"><span class="fk">Tenacidad a la fractura K_IC</span><span class="fv">${frac.kic} MPa·√m</span></div>` : ''}
      ${tieneParis ? `
      <div class="ficha-row"><span class="fk">Ley de Paris</span><span class="fv">C=${frac.parisC.toExponential(2)}, m=${frac.parisM}</span></div>
      <div class="ficha-row"><span class="fk">da/dN a ΔK=15 MPa·√m</span><span class="fv">${ftDadN(15, frac.parisC, frac.parisM).toExponential(2)} mm/ciclo</span></div>` : ''}
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
      <h3>Dureza (estimada)</h3>
      <div class="ficha-row"><span class="fk">HB estimado</span><span class="fv">${hbEst.toFixed(0)} *</span></div>
      <div class="note" style="margin-top:6px">* Correlación TS(MPa)≈3.45·HB — aproximación válida sobre todo para aceros de baja/media aleación. No reemplaza un ensayo de dureza real.</div>
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
