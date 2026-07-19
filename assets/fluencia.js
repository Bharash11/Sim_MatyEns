// fluencia.js — Módulo 3, grupo "Fluencia en caliente": curva de fluencia (3 etapas), ecuación de
// Dorn (dependencia con tensión y temperatura) y extrapolación de Larson-Miller.
// tc/gc (colores de gráfico) y Chart vienen definidos/cargados globalmente antes que este archivo.
// NOTA: las constantes K, n, Q_c usadas son valores ILUSTRATIVOS con fines didácticos, calibrados
// para dar resultados razonables en los rangos de los controles — no son datos de ensayo reales.

let flCreepChartInst = null;
let flArrheniusChartInst = null;
let flLmChartInst = null;

const R_GAS = 8.314; // J/(mol·K)

// K (1/h, con σ en MPa), n (exponente de tensión), Qc (J/mol), ductilidad a rotura ε_f (fracción)
// FIX (integración Unidad 3): antes K/n/Qc/epsF estaban hardcodeados acá, sin
// relación con PRESETS (data-presets.js) -- si mañana se ajusta el aluminio en
// PRESETS, este módulo quedaba desactualizado en silencio. Ahora "inox" y
// "aluminio" leen K/n/Qc de PRESETS.aceroinox.frac / PRESETS.aluminio.frac
// (misma fuente que tracción/compresión); solo epsF y el label quedan acá
// porque son específicos de fluencia (ductilidad a rotura) y no tienen
// equivalente en PRESETS. "superaleacion" no tiene análogo en PRESETS (no es
// un material de tracción de esta simulación), así que se queda con sus
// valores propios completos.
const FL_MAT_PRESETS = {
  inox:          {label:"Acero inoxidable austenítico", ...PRESETS.aceroinox.frac, epsF:0.15},
  superaleacion: {label:"Superaleación base Ni",         K:1.8,  n:6, Qc:350000, epsF:0.05},
  aluminio:      {label:"Aleación de aluminio",          ...PRESETS.aluminio.frac, epsF:0.30},
};

function flInit(){
  flInitCreepChart();
  flUpdateComportamiento();
  flInitArrheniusChart();
  flUpdateTensionTemp();
  flInitLmChart();
  flUpdateExtrapolacion();
}

function flEpsDot(mat, sigma, tC){
  const T = tC + 273.15;
  return mat.K * Math.pow(sigma, mat.n) * Math.exp(-mat.Qc/(R_GAS*T));
}

/* ================================================================ FL1. COMPORTAMIENTO BAJO FLUENCIA */
function flInitCreepChart(){
  const ctx = document.getElementById('fl_creepChart').getContext('2d');
  flCreepChartInst = new Chart(ctx,{
    type:'line',
    data:{datasets:[
      {label:'Deformación', data:[], borderColor:'#1a5fa8', borderWidth:2, pointRadius:0, tension:.15, fill:false},
      {label:'Rotura', data:[], borderColor:'#c43535', backgroundColor:'#c43535', pointRadius:6, showLine:false}
    ]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:200},
      plugins:{legend:{labels:{color:tc,font:{size:11}}}, tooltip:{callbacks:{label:c=>` t=${c.parsed.x.toFixed(0)} h → ε=${(c.parsed.y*100).toFixed(2)}%`}}},
      scales:{
        x:{type:'linear', title:{display:true,text:'Tiempo (h)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}},
        y:{title:{display:true,text:'Deformación ε',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc, callback:v=>(v*100).toFixed(0)+'%'}}
      }}
  });
}

function flUpdateComportamiento(){
  const mat = FL_MAT_PRESETS[document.getElementById('fl_mat1').value];
  const sigma = parseFloat(document.getElementById('fl_sigma1').value)||1;
  const tC = parseFloat(document.getElementById('fl_temp1').value)||0;
  document.getElementById('fl_sigma1Val').textContent = sigma+' MPa';
  document.getElementById('fl_temp1Val').textContent = tC+' °C';

  const epsS = flEpsDot(mat, sigma, tC);
  const tr = mat.epsF/epsS; // aproximación: rotura cuando la deformación acumulada alcanza la ductilidad del material

  document.getElementById('fl_mEpsS1').textContent = epsS.toExponential(2);
  document.getElementById('fl_mTr1').textContent = tr.toExponential(2);

  const t1 = 0.15*tr, t2 = 0.80*tr;
  const eps1 = 0.15*mat.epsF;
  const eps2 = eps1 + epsS*(t2-t1);
  const pts=[]; const N=60;
  for(let i=0;i<=N;i++){
    const t = tr*i/N;
    let eps;
    if(t<=t1){ eps = eps1*Math.pow(t/t1, 0.4); }
    else if(t<=t2){ eps = eps1 + epsS*(t-t1); }
    else { eps = eps2 + (mat.epsF-eps2)*Math.pow((t-t2)/(tr-t2), 3); }
    pts.push({x:t, y:eps});
  }
  if(flCreepChartInst){
    flCreepChartInst.data.datasets[0].data = pts;
    flCreepChartInst.data.datasets[1].data = [{x:tr, y:mat.epsF}];
    flCreepChartInst.update();
  }
}

/* ================================================================ FL2. INFLUENCIA TENSIÓN Y TEMPERATURA */
function flInitArrheniusChart(){
  const ctx = document.getElementById('fl_arrheniusChart').getContext('2d');
  flArrheniusChartInst = new Chart(ctx,{
    type:'line',
    data:{datasets:[
      {label:'ε̇_s(T) a σ actual', data:[], borderColor:'#1a5fa8', borderWidth:2, pointRadius:0, tension:0, fill:false},
      {label:'Punto actual', data:[], borderColor:'#c8780a', backgroundColor:'#c8780a', pointRadius:6, showLine:false}
    ]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:200},
      plugins:{legend:{labels:{color:tc,font:{size:11}}}, tooltip:{callbacks:{label:c=>` 1000/T=${c.parsed.x.toFixed(2)} → ε̇_s=${c.parsed.y.toExponential(2)} /h`}}},
      scales:{
        x:{type:'linear', title:{display:true,text:'1000/T (1/K)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}},
        y:{type:'logarithmic', title:{display:true,text:'ε̇_s (1/h)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}}
      }}
  });
}

function flUpdateTensionTemp(){
  const mat = FL_MAT_PRESETS[document.getElementById('fl_mat2').value];
  const sigma = parseFloat(document.getElementById('fl_sigma2').value)||1;
  const tC = parseFloat(document.getElementById('fl_temp2').value)||0;
  document.getElementById('fl_sigma2Val').textContent = sigma+' MPa';
  document.getElementById('fl_temp2Val').textContent = tC+' °C';

  const epsS = flEpsDot(mat, sigma, tC);
  document.getElementById('fl_mEpsS2').textContent = epsS.toExponential(2);
  document.getElementById('fl_mN').textContent = mat.n;
  document.getElementById('fl_mFactorSigma').textContent = Math.pow(2, mat.n).toFixed(0)+'×';

  const curve=[];
  for(let tMin=300; tMin<=1150; tMin+=10){
    const invT = 1000/(tMin+273.15);
    curve.push({x:invT, y: flEpsDot(mat, sigma, tMin)});
  }
  curve.sort((a,b)=>a.x-b.x);
  const invTNow = 1000/(tC+273.15);
  if(flArrheniusChartInst){
    flArrheniusChartInst.data.datasets[0].data = curve;
    flArrheniusChartInst.data.datasets[1].data = [{x:invTNow, y:epsS}];
    flArrheniusChartInst.update();
  }
}

/* ================================================================ FL3. LARSON-MILLER */
function flInitLmChart(){
  const ctx = document.getElementById('fl_lmChart').getContext('2d');
  flLmChartInst = new Chart(ctx,{
    type:'line',
    data:{datasets:[
      {label:'Vida estimada t_r(T)', data:[], borderColor:'#1a5fa8', borderWidth:2, pointRadius:0, tension:0, fill:false},
      {label:'T de servicio elegida', data:[], borderColor:'#c8780a', backgroundColor:'#c8780a', pointRadius:6, showLine:false}
    ]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:200},
      plugins:{legend:{labels:{color:tc,font:{size:11}}}, tooltip:{callbacks:{label:c=>` T=${c.parsed.x.toFixed(0)}°C → t_r≈${c.parsed.y.toExponential(2)} h`}}},
      scales:{
        x:{type:'linear', title:{display:true,text:'Temperatura de servicio (°C)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}},
        y:{type:'logarithmic', title:{display:true,text:'Tiempo a rotura estimado (h)',color:tc,font:{size:11}}, grid:{color:gc}, ticks:{color:tc}}
      }}
  });
}

// FIX (integración Unidad 3 — Fase 2): fórmulas de Larson-Miller extraídas del
// handler de DOM para que sean testeables (mismo criterio que frCalcKi/frCalcAcMm).
function flLarsonMillerP(T_K, C, tr){
  return T_K*(C+Math.log10(tr));
}
function flLarsonMillerTr(LMP, T_K, C){
  return Math.pow(10, LMP/T_K - C);
}

function flUpdateExtrapolacion(){
  const C = parseFloat(document.getElementById('fl_lmC').value)||20;
  const Ttest = parseFloat(document.getElementById('fl_ttest').value)||0;
  const trTest = parseFloat(document.getElementById('fl_trtest').value)||1;
  const Tserv = parseFloat(document.getElementById('fl_tserv').value)||0;
  document.getElementById('fl_tservVal').textContent = Tserv+' °C';

  const Ttest_K = Ttest+273.15;
  const LMP = flLarsonMillerP(Ttest_K, C, trTest);

  const Tserv_K = Tserv+273.15;
  const trServ = flLarsonMillerTr(LMP, Tserv_K, C);
  const trServAnios = trServ/8760;

  document.getElementById('fl_mLMP').textContent = LMP.toFixed(0);
  document.getElementById('fl_mTrServ').textContent = trServ.toExponential(2);
  document.getElementById('fl_mTrServAnios').textContent = trServAnios<0.01 ? trServAnios.toExponential(2) : trServAnios.toFixed(2);

  const curve=[];
  for(let T=Math.max(200,Ttest-350); T<=Ttest+50; T+=10){
    const T_K = T+273.15;
    curve.push({x:T, y: flLarsonMillerTr(LMP, T_K, C)});
  }
  if(flLmChartInst){
    flLmChartInst.data.datasets[0].data = curve;
    flLmChartInst.data.datasets[1].data = [{x:Tserv, y:trServ}];
    flLmChartInst.update();
  }
}
