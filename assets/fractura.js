// fractura.js — Módulo 3, grupo "Fractura": diagramas SVG (dúctil/frágil), calculadora de mecánica
// de la fractura (K_I vs K_IC, longitud de grieta crítica) y curva de ensayo de impacto Charpy.
// tc/gc (colores de gráfico) vienen definidos globalmente en traccion.js, cargado antes que este archivo.

let rtMecaChartInst = null;
let rtImpactoChartInst = null;

function frInit(){
  frDrawDuctilSvg();
  frDrawFragilSvg();
  frInitMecaChart();
  frUpdateMecanica();
  frInitImpactoChart();
  frUpdateImpacto();
}

/* ================================================================ FR2. DIAGRAMA FRACTURA DÚCTIL */
function frDrawDuctilSvg(){
  const svg = document.getElementById('rt_ductilSvg');
  if(!svg) return;
  const stages = [
    {cx:70,  label:'1. Estricción'},
    {cx:210, label:'2. Microcavidades'},
    {cx:350, label:'3. Coalescencia'},
    {cx:490, label:'4. Copa y cono'}
  ];
  let html='';
  // flechas entre etapas
  for(let i=0;i<3;i++){
    const x1=stages[i].cx+45, x2=stages[i+1].cx-45;
    html+=`<line x1="${x1}" y1="45" x2="${x2}" y2="45" stroke="var(--border)" stroke-width="2" marker-end="url(#rtArrow)"/>`;
  }
  html+=`<defs><marker id="rtArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--border)"/></marker></defs>`;

  // Etapa 1: probeta con estricción (silueta con cintura)
  html+=`<path d="M${stages[0].cx-30},20 L${stages[0].cx-30},70 L${stages[0].cx-14},70 L${stages[0].cx-8},45 L${stages[0].cx+8},45 L${stages[0].cx+14},70 L${stages[0].cx+30},70 L${stages[0].cx+30},20 L${stages[0].cx+14},20 L${stages[0].cx+8},45 L${stages[0].cx-8},45 L${stages[0].cx-14},20 Z" fill="none" stroke="var(--elastic)" stroke-width="2"/>`;

  // Etapa 2: probeta con puntitos (microcavidades) en el centro
  html+=`<path d="M${stages[1].cx-30},20 L${stages[1].cx-30},70 L${stages[1].cx-14},70 L${stages[1].cx-8},45 L${stages[1].cx+8},45 L${stages[1].cx+14},70 L${stages[1].cx+30},70 L${stages[1].cx+30},20 L${stages[1].cx+14},20 L${stages[1].cx+8},45 L${stages[1].cx-8},45 L${stages[1].cx-14},20 Z" fill="none" stroke="var(--elastic)" stroke-width="2"/>`;
  [[-6,-4],[0,0],[6,3],[-3,6],[4,-6]].forEach(([dx,dy])=>{
    html+=`<circle cx="${stages[1].cx+dx}" cy="${45+dy}" r="1.6" fill="var(--frac)"/>`;
  });

  // Etapa 3: grieta elíptica interna (coalescencia)
  html+=`<path d="M${stages[2].cx-30},20 L${stages[2].cx-30},70 L${stages[2].cx-14},70 L${stages[2].cx-8},45 L${stages[2].cx+8},45 L${stages[2].cx+14},70 L${stages[2].cx+30},70 L${stages[2].cx+30},20 L${stages[2].cx+14},20 L${stages[2].cx+8},45 L${stages[2].cx-8},45 L${stages[2].cx-14},20 Z" fill="none" stroke="var(--elastic)" stroke-width="2"/>`;
  html+=`<ellipse cx="${stages[2].cx}" cy="45" rx="9" ry="3.5" fill="var(--frac)" opacity=".8"/>`;

  // Etapa 4: fractura final - copa y cono (dos mitades separadas con bordes a 45°)
  html+=`<path d="M${stages[3].cx-30},20 L${stages[3].cx-30},44 L${stages[3].cx-14},44 L${stages[3].cx-8},38 Z" fill="none" stroke="var(--elastic)" stroke-width="2"/>`;
  html+=`<path d="M${stages[3].cx+30},20 L${stages[3].cx+30},44 L${stages[3].cx+14},44 L${stages[3].cx+8},38 Z" fill="none" stroke="var(--elastic)" stroke-width="2"/>`;
  html+=`<path d="M${stages[3].cx-8},52 L${stages[3].cx-14},46 L${stages[3].cx-30},46 L${stages[3].cx-30},70 L${stages[3].cx-14},70 Z" fill="none" stroke="var(--elastic)" stroke-width="2"/>`;
  html+=`<path d="M${stages[3].cx+8},52 L${stages[3].cx+14},46 L${stages[3].cx+30},46 L${stages[3].cx+30},70 L${stages[3].cx+14},70 Z" fill="none" stroke="var(--elastic)" stroke-width="2"/>`;

  stages.forEach(s=>{
    html+=`<text x="${s.cx}" y="95" text-anchor="middle" fill="var(--muted)" font-size="11">${s.label}</text>`;
  });
  svg.innerHTML = html;
}

/* ================================================================ FR3. DIAGRAMA FRACTURA FRÁGIL */
function frDrawFragilSvg(){
  const svg = document.getElementById('rt_fragilSvg');
  if(!svg) return;
  // grilla de "granos" (círculos) para cada mitad
  const rows=3, cols=3, r=24;
  function grid(offsetX){
    const pts=[];
    for(let row=0; row<rows; row++){
      for(let col=0; col<cols; col++){
        const x = offsetX + col*(r*1.9) + (row%2? r*0.9:0) + r;
        const y = 25 + row*(r*1.55) + r;
        pts.push({x,y});
      }
    }
    return pts;
  }
  const left = grid(15);
  const right = grid(300);
  let html='';
  [left,right].forEach(g=>{
    g.forEach(p=>{ html+=`<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`; });
  });

  // Transgranular: línea recta que atraviesa el interior de los granos (ignora bordes)
  html+=`<polyline points="${left[0].x-10},10 ${left[4].x+6},${left[4].y-4} ${left[4].x-4},${left[4].y+8} ${left[8].x+10},110" fill="none" stroke="var(--frac)" stroke-width="2.5"/>`;

  // Intergranular: línea que va por las tangentes entre círculos (bordes de grano)
  const gapPts = [
    {x:right[0].x, y:10},
    {x:(right[0].x+right[1].x)/2, y:(right[0].y+right[1].y)/2 - r*0.05},
    {x:(right[1].x+right[4].x)/2, y:(right[1].y+right[4].y)/2},
    {x:(right[4].x+right[5].x)/2, y:(right[4].y+right[5].y)/2},
    {x:(right[5].x+right[8].x)/2, y:(right[5].y+right[8].y)/2},
    {x:right[8].x, y:110}
  ];
  html+=`<polyline points="${gapPts.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="var(--frac)" stroke-width="2.5"/>`;

  html+=`<text x="${(left[0].x+left[8].x)/2}" y="132" text-anchor="middle" fill="var(--muted)" font-size="11">Transgranular (a través de los granos)</text>`;
  html+=`<text x="${(right[0].x+right[8].x)/2}" y="132" text-anchor="middle" fill="var(--muted)" font-size="11">Intergranular (por los bordes de grano)</text>`;
  svg.innerHTML = html;
}

/* ================================================================ FR4. MECÁNICA DE LA FRACTURA */
function frApplyKicPreset(){
  const v = document.getElementById('rt_kicPreset').value;
  if(v!==''){ document.getElementById('rt_kic').value = v; }
  frUpdateMecanica();
}

function frInitMecaChart(){
  const ctx = document.getElementById('rt_mecaChart').getContext('2d');
  rtMecaChartInst = new Chart(ctx,{
    type:'line',
    data:{datasets:[
      {label:'K_I(a)', data:[], borderColor:'#1a5fa8', borderWidth:2, pointRadius:0, tension:0, fill:false},
      {label:'K_IC (material)', data:[], borderColor:'#c43535', borderWidth:2, borderDash:[6,4], pointRadius:0, fill:false},
      {label:'Estado actual', data:[], borderColor:'#c8780a', backgroundColor:'#c8780a', pointRadius:6, showLine:false}
    ]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:200},
      plugins:{legend:{labels:{color:tc,font:{size:11}}}, tooltip:{callbacks:{label:c=>` a=${c.parsed.x.toFixed(2)} mm → K=${c.parsed.y.toFixed(1)} MPa√m`}}},
      scales:{
        x:{type:'linear', title:{display:true,text:'Longitud de grieta a (mm)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}},
        y:{min:0, title:{display:true,text:'K (MPa·√m)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}}
      }}
  });
}

// FIX (integración Unidad 3 — Fase 2): antes K_I y a_c se calculaban en línea,
// mezclados con lecturas del DOM, así que no había forma de testear la fórmula
// en sí sin simular inputs de HTML. Ahora son funciones puras, testeadas en
// tests.js igual que frSigmoid/ftBasquinN/ftDadN/flEpsDot.
function frCalcKi(Y, sigma, a_mm){
  return Y*sigma*Math.sqrt(Math.PI*(a_mm/1000));
}
function frCalcAcMm(kic, Y, sigma){
  return (1/Math.PI)*Math.pow(kic/(Y*sigma),2)*1000;
}

function frUpdateMecanica(){
  const kic = parseFloat(document.getElementById('rt_kic').value)||0.01;
  const sigma = parseFloat(document.getElementById('rt_sigma').value)||1;
  const a = parseFloat(document.getElementById('rt_a').value)||0.01;
  const Y = parseFloat(document.getElementById('rt_yfac').value)||1;

  const Ki = frCalcKi(Y, sigma, a);
  const ac_mm = frCalcAcMm(kic, Y, sigma);
  const margen = Ki>0 ? kic/Ki : Infinity;
  const inestable = Ki >= kic;

  document.getElementById('rt_mKi').textContent = Ki.toFixed(1);
  document.getElementById('rt_mAc').textContent = ac_mm.toFixed(2);
  document.getElementById('rt_mMargen').textContent = isFinite(margen)? margen.toFixed(2)+'×' : '—';
  const vEl = document.getElementById('rt_mVeredicto');
  vEl.textContent = inestable ? '⚠ Fractura inestable' : '✓ Grieta estable';
  vEl.style.color = inestable ? 'var(--frac)' : 'var(--plastic)';

  // curva K_I(a) desde 0 hasta 1.6x la mayor entre a_c y a actual
  const xMax = Math.max(ac_mm*1.6, a*1.6, 2);
  const curve = [];
  const N = 40;
  for(let i=0;i<=N;i++){
    const x = xMax*i/N;
    const y = frCalcKi(Y, sigma, x);
    curve.push({x, y});
  }
  if(rtMecaChartInst){
    rtMecaChartInst.data.datasets[0].data = curve;
    rtMecaChartInst.data.datasets[1].data = [{x:0,y:kic},{x:xMax,y:kic}];
    rtMecaChartInst.data.datasets[2].data = [{x:a,y:Ki}];
    rtMecaChartInst.update();
  }
}

/* ================================================================ FR5. ENSAYO DE IMPACTO CHARPY */
function frSigmoid(T, Elow, Ehigh, Tmid, width){
  return Elow + (Ehigh-Elow)/(1+Math.exp(-(T-Tmid)/width));
}

const FR_IMPACTO_PRESETS = {
  bajoC:  {label:'Acero al carbono (BCC)',        Elow:5,   Ehigh:120, Tmid:20,  width:15, hasDBTT:true},
  aleado: {label:'Acero aleado de baja aleación (BCC)', Elow:10, Ehigh:150, Tmid:-20, width:20, hasDBTT:true},
  fcc:    {label:'Aluminio / inox. austenítico (FCC)', Elow:125, Ehigh:135, Tmid:0,  width:50, hasDBTT:false}
};

function frInitImpactoChart(){
  const ctx = document.getElementById('rt_impactoChart').getContext('2d');
  rtImpactoChartInst = new Chart(ctx,{
    type:'line',
    data:{datasets:[
      {label:'Energía absorbida', data:[], borderColor:'#1a5fa8', backgroundColor:'rgba(26,95,168,.12)', borderWidth:2, pointRadius:0, tension:.35, fill:true},
      {label:'DBTT', data:[], borderColor:'#c43535', borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false}
    ]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:200},
      plugins:{legend:{labels:{color:tc,font:{size:11}}}, tooltip:{callbacks:{label:c=>` ${c.parsed.y.toFixed(0)} J a ${c.parsed.x.toFixed(0)} °C`}}},
      scales:{
        x:{type:'linear', min:-100, max:150, title:{display:true,text:'Temperatura (°C)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}},
        y:{min:0, max:170, title:{display:true,text:'Energía absorbida (J)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}}
      }}
  });
}

function frUpdateImpacto(){
  const key = document.getElementById('rt_impactoMat').value;
  const p = FR_IMPACTO_PRESETS[key];
  const pts=[];
  for(let T=-100; T<=150; T+=10){ pts.push({x:T, y:frSigmoid(T,p.Elow,p.Ehigh,p.Tmid,p.width)}); }
  if(rtImpactoChartInst){
    rtImpactoChartInst.data.datasets[0].data = pts;
    rtImpactoChartInst.data.datasets[0].label = p.label;
    rtImpactoChartInst.data.datasets[1].data = p.hasDBTT ? [{x:p.Tmid,y:0},{x:p.Tmid,y:p.Ehigh}] : [];
    rtImpactoChartInst.update();
  }
}
