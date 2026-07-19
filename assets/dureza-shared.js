// dureza-shared.js — datos y helpers compartidos por todas las escalas de dureza (interpolación, switch de sub-tabs)

// dureza.js — Módulo 2: escalas de dureza (Mohs, Rockwell, Brinell, Vickers, Janka, esclerómetro)

/* ============================================================ MODULO 2: DUREZA */

const DZ_MOHS = [
  [10,'Diamante'],[9,'Corindón'],[8,'Topacio'],[7,'Cuarzo'],[6,'Ortoclasa'],
  [5,'Apatita'],[4,'Fluorita'],[3,'Calcita'],[2,'Yeso'],[1,'Talco']
];

const DZ_RK_NORMAL = [
  ['A','Diamante',60],['B','Bola de 1/16 pulg.',100],['C','Diamante',150],
  ['D','Diamante',100],['E','Bola de 1/8 pulg.',100],['F','Bola de 1/16 pulg.',60],
  ['G','Bola de 1/16 pulg.',150],['H','Bola de 1/8 pulg.',60],['K','Bola de 1/8 pulg.',150]
];
const DZ_RK_SUPERFICIAL = [
  ['15N','Diamante',15],['30N','Diamante',30],['45N','Diamante',45],
  ['15T','Bola de 1/16 pulg.',15],['30T','Bola de 1/16 pulg.',30],['45T','Bola de 1/16 pulg.',45],
  ['15W','Bola de 1/8 pulg.',15],['30W','Bola de 1/8 pulg.',30],['45W','Bola de 1/8 pulg.',45]
];

// Approximate reference conversion points for steels (illustrative, standard published table)
const DZ_CONV_POINTS = [
  {hrc:20, hb:226, ts_mpa:772},
  {hrc:25, hb:253, ts_mpa:840},
  {hrc:30, hb:286, ts_mpa:1015},
  {hrc:35, hb:327, ts_mpa:1160},
  {hrc:40, hb:371, ts_mpa:1310},
  {hrc:45, hb:428, ts_mpa:1500},
  {hrc:50, hb:481, ts_mpa:1720},
  {hrc:55, hb:562, ts_mpa:1980},
  {hrc:60, hb:654, ts_mpa:2280},
  {hrc:65, hb:739, ts_mpa:2600}
];

let dzRkSelected = null;
let dzTsChartInst = null;

function dzInterp(scaleKey, val, targetKey){
  const arr = DZ_CONV_POINTS.map(p=>({x:p[scaleKey], y:p[targetKey]})).sort((a,b)=>a.x-b.x);
  if(val<=arr[0].x) return arr[0].y;
  if(val>=arr[arr.length-1].x) return arr[arr.length-1].y;
  for(let i=0;i<arr.length-1;i++){
    if(val>=arr[i].x && val<=arr[i+1].x){
      const t = (val-arr[i].x)/(arr[i+1].x-arr[i].x);
      return arr[i].y + t*(arr[i+1].y-arr[i].y);
    }
  }
}

/* ---------------- SUB-NAV ---------------- */
function dzSwitch(name){
  document.querySelectorAll('.dz-subbtn').forEach(b=>b.classList.toggle('active', b.dataset.dz===name));
  document.querySelectorAll('.dz-sub-panel').forEach(p=>p.classList.toggle('active', p.id==='dz_panel_'+name));
  document.querySelectorAll('.dz-sub-ctrl').forEach(c=>c.classList.toggle('active', c.id==='dz_ctrl_'+name));
}

/* ---------------- SUB-NAV (Ensayo destructivo) ---------------- */
function edSwitch(name){
  document.querySelectorAll('.ed-subbtn').forEach(b=>b.classList.toggle('active', b.dataset.ed===name));
  document.querySelectorAll('.ed-sub-panel').forEach(p=>p.classList.toggle('active', p.id==='ed_panel_'+name));
  document.querySelectorAll('.ed-sub-ctrl').forEach(c=>c.classList.toggle('active', c.id==='ed_ctrl_'+name));
  if(name==='configuraciones') { renderSavedList(); updateCurrentConfigDisplay(); }
}

/* ---------------- 1. MOHS ---------------- */
