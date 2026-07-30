// data-presets.js — tabla PRESETS de materiales (tracción) + funciones applyPreset*()

/* ============================================================ PRESETS */
const PRESETS = {
  acero:      {E:207,  sy:250,  ts:450,  el:20,  nu:0.30, fragil:false},
  aluminio:   {E:69,   sy:276,  ts:310,  el:14,  nu:0.33, fragil:false},
  cobre:      {E:110,  sy:69,   ts:200,  el:45,  nu:0.34, fragil:false},
  titanio:    {E:114,  sy:880,  ts:950,  el:14,  nu:0.34, fragil:false},
  fragil:     {E:125,  sy:0,    ts:200,  el:0.6, nu:0.26, fragil:true },
  nylon:      {E:2.8,  sy:50,   ts:75,   el:150, nu:0.40, fragil:false},
  carbono:    {E:230,  sy:null, ts:3500, el:1.5, nu:0.20, fragil:true },
  ceramica:   {E:380,  sy:null, ts:300,  el:0.1, nu:0.22, fragil:true },
  hormigon:   {E:30,   sy:0,    ts:3,    el:0.015, nu:0.20, fragil:true, tsc:25 },
  madera:     {E:12,   sy:null, ts:90,   el:0.75, nu:0.35, fragil:false, tsc:50 },
  pino:       {E:9,    sy:null, ts:65,   el:0.6,  nu:0.35, fragil:false, tsc:35 },
  algarrobo:  {E:14,   sy:null, ts:110,  el:0.85, nu:0.35, fragil:false, tsc:60 },
  quebracho:  {E:19,   sy:null, ts:140,  el:1.0,  nu:0.35, fragil:false, tsc:75 },
  // — Nuevos materiales (Tabla 6.1 y 6.2 del apunte) —
  niquel:     {E:200,  sy:138,  ts:480,  el:40,  nu:0.31, fragil:false},
  aceroinox:  {E:193,  sy:207,  ts:517,  el:40,  nu:0.27, fragil:false},
  molibdeno:  {E:330,  sy:565,  ts:655,  el:35,  nu:0.28, fragil:false},
  // FIX (QA — hallazgo Parte 6): sy estaba en 97 MPa, que corresponde al límite de
  // fluencia en COMPRESIÓN (CYS) de AZ31, no al de TRACCIÓN (TYS, ~150 MPa para
  // AZ31-F) usado en este campo para todos los demás materiales. El magnesio (HCP)
  // tiene una asimetría tracción/compresión marcada por maclado, fácil de confundir
  // al cargar una tabla. AGUS: verificar contra la tabla/fuente original antes de dar
  // por definitivo — 150 es un valor típico de literatura (ASM) para AZ31-F, no el
  // dato exacto de la cátedra si difiere.
  magnesio:   {E:45,   sy:150,  ts:220,  el:12,  nu:0.29, fragil:false},
  zinc:       {E:105,  sy:120,  ts:200,  el:8,   nu:0.25, fragil:false},
  plata:      {E:76,   sy:55,   ts:170,  el:40,  nu:0.37, fragil:false},
  plomo:      {E:16,   sy:14,   ts:18,   el:50,  nu:0.44, fragil:false},
  tungsteno:  {E:407,  sy:750,  ts:980,  el:2,   nu:0.28, fragil:false},
  laton:      {E:101,  sy:75,   ts:300,  el:68,  nu:0.35, fragil:false},
  oro:        {E:79,   sy:30,   ts:130,  el:45,  nu:0.42, fragil:false},
  // — Materiales nuevos v4.10 (pedido de Agus, ver Materiales_nuevos_Sim_MatyEns.md) —
  // Fuentes: MatWeb/ASM (metales), Wikipedia/hojas técnicas de fabricante (polímeros),
  // NIST/papers de cerámicos técnicos (Munro y similares), Callister (compuestos UD).
  // Mismo criterio que el resto de PRESETS: condición de referencia razonable, no
  // "el" valor del material -- 1045/4140 en particular varían mucho según tratamiento
  // térmico real (ver nota en Materiales_nuevos_Sim_MatyEns.md).
  aisi1045:        {E:200,  sy:530,  ts:625,  el:12,  nu:0.29, fragil:false}, // normalizado
  acero4140:       {E:195,  sy:990,  ts:1080, el:16,  nu:0.29, fragil:false}, // templado y revenido (Q&T)
  aluminio7075:    {E:71.7, sy:480,  ts:570,  el:10,  nu:0.33, fragil:false}, // T6
  aluminio2024:    {E:73.1, sy:345,  ts:483,  el:18,  nu:0.33, fragil:false}, // T3
  broncefosforico: {E:110,  sy:360,  ts:500,  el:18,  nu:0.34, fragil:false}, // CuSn8, temple duro (H04)
  hierronodular:   {E:170,  sy:276,  ts:414,  el:18,  nu:0.28, fragil:false}, // ASTM A536 60-40-18, ferrítico -- dúctil, NO frágil como la fundición gris
  inconel718:      {E:200,  sy:1100, ts:1275, el:15,  nu:0.29, fragil:false}, // envejecido (AMS 5663 típico)
  titaniocp2:      {E:105,  sy:275,  ts:380,  el:20,  nu:0.34, fragil:false}, // CP Grado 2, recocido
  sic:             {E:440,  sy:null, ts:490,  el:0.08, nu:0.19, fragil:true}, // carburo de silicio -- ts=resistencia flexural (no hay fluencia real)
  si3n4:           {E:300,  sy:null, ts:800,  el:0.08, nu:0.27, fragil:true}, // nitruro de silicio
  zirconia:        {E:200,  sy:null, ts:1000, el:0.1,  nu:0.30, fragil:true}, // ZrO2 3Y-TZP, tenacificada por transformación
  gfrp:            {E:45,   sy:null, ts:1020, el:2.5,  nu:0.28, fragil:true}, // fibra de vidrio E-glass/epoxi, unidireccional (dirección de la fibra)
  kevlarepoxi:     {E:76,   sy:null, ts:1380, el:1.8,  nu:0.34, fragil:true}, // Kevlar 49/epoxi, unidireccional (dirección de la fibra)
  hdpe:            {E:1.0,  sy:25,   ts:25,   el:200, nu:0.46, fragil:false}, // polietileno alta densidad -- sy=tensión de fluencia; %EL real suele superar 400% pero se topea a 200 (límite de rango que valida el simulador)
  pp:              {E:1.3,  sy:33,   ts:33,   el:200, nu:0.42, fragil:false}, // polipropileno homopolímero -- %EL real puede llegar a 600% según grado, topeado a 200
  pvcrigido:       {E:3.0,  sy:52,   ts:52,   el:30,  nu:0.38, fragil:false}, // PVC rígido/UPVC
  abs:             {E:2.3,  sy:42,   ts:42,   el:20,  nu:0.35, fragil:false},
  pc:              {E:2.3,  sy:62,   ts:65,   el:100, nu:0.37, fragil:false}, // policarbonato -- ν=0.37 confirmado (Wikipedia)
};

// FIX (integración Unidad 3): propiedades de fractura/fatiga/fluencia agrupadas
// bajo `frac`, solo para los materiales de PRESETS que tienen un análogo directo
// en las tablas de la Unidad 3. Antes esto vivía duplicado y desconectado en
// FT_PARIS_PRESETS (fatiga.js) y FL_MAT_PRESETS (fluencia.js) con las MISMAS
// claves "acero"/"aluminio"/"titanio" -- ahora hay una sola fuente de verdad.
// No se agrega `frac` a materiales sin dato real de referencia, en vez de
// inventar un valor: mejor dejarlos sin la propiedad que fingir precisión.
// K, n, Qc: mismos nombres que espera flEpsDot() en fluencia.js (ecuación de Dorn).
PRESETS.acero.frac     = { kic:98,  parisC:6.9e-12,  parisM:3.0 };
PRESETS.aluminio.frac  = { kic:24,  parisC:1.8e-11,  parisM:3.5, K:2.35e5, n:4, Qc:140000 };
PRESETS.titanio.frac   = { kic:55,  parisC:9.0e-12,  parisM:4.0 };
PRESETS.aceroinox.frac = { K:260, n:5, Qc:300000 };
PRESETS.ceramica.frac  = { kic:4.5 };

// FIX (Fase 5a): resto de PRESETS.frac. Se completa SOLO donde el dato tiene
// sentido físico real, no parejo para los 23 materiales -- mismo criterio que
// Fase 1: mejor un campo ausente que uno inventado sin respaldo.
// - Cu/Ni puros: no llevan kic -- son tan dúctiles que no se logra la condición
//   de deformación plana en un ensayo K_IC estándar (la probeta necesaria sería
//   poco práctica). Sí tienen ley de Paris documentada.
// - Zn/Pb: funden a baja T, entran en régimen de fluencia a temperatura
//   ambiente (T_hom≈0.4-0.5) -- ejemplo clásico de cátedra. Sin kic/Paris,
//   no son materiales de uso estructural cíclico.
// - Mo/W (refractarios BCC): kic bajo (frágiles a temperatura ambiente) +
//   fluencia (uso típico a alta T). Sin ley de Paris -- no hay dato tabulado
//   habitual para cátedra.
// - Latón/Mg: kic + Paris (uso estructural cíclico común). Sin fluencia --
//   no son materiales de alta T en un curso introductorio.
// - Fundición gris/hormigón/nylon: solo kic (mecánica de la fractura definida
//   y con dato real). Sin Paris/fluencia -- fundición gris y hormigón siguen
//   otros modelos de fatiga/fluencia, y nylon es viscoelástico (ninguno de
//   los dos encaja en la ecuación de Dorn ni en Paris tal como están
//   implementadas acá; forzarlas sería aplicar mal la fórmula).
PRESETS.cobre.frac      = { parisC:1.0e-11, parisM:3.5 };
PRESETS.niquel.frac     = { parisC:5.0e-12, parisM:3.3 };
PRESETS.zinc.frac       = { K:6,    n:5, Qc:65000  };
PRESETS.plomo.frac      = { K:30,   n:4, Qc:65000  };
PRESETS.molibdeno.frac  = { kic:20, K:3.0,  n:4.5, Qc:410000 };
PRESETS.tungsteno.frac  = { kic:10, K:0.5,  n:4.5, Qc:580000 };
PRESETS.laton.frac      = { kic:40, parisC:1.2e-11, parisM:3.6 };
PRESETS.magnesio.frac   = { kic:15, parisC:8.0e-12,  parisM:3.2 };
PRESETS.fragil.frac     = { kic:18 };
PRESETS.hormigon.frac   = { kic:1.0 };
PRESETS.nylon.frac      = { kic:3  };

// FIX (v4.10): K_IC de los 3 cerámicos técnicos nuevos -- son justamente el
// caso de cátedra que muestra que "cerámica" no es sinónimo de "frágil como
// el vidrio": el SiC y sobre todo la ZrO2 (tenacificada por transformación
// de fase) tienen K_IC bastante más alto que la Al2O3 ya cargada (4,5).
// Sin Paris/Dorn -- fatiga y fluencia en cerámicos técnicos siguen otros
// modelos que no están implementados acá (mismo criterio que Al2O3/hormigón).
// Ninguno de los otros 15 materiales nuevos (metales/polímeros/compuestos)
// tiene K_IC/Paris/Dorn con una fuente única y confiable -- quedan sin `frac`,
// igual que varios de los 23 originales.
PRESETS.sic.frac      = { kic:6.8 };
PRESETS.si3n4.frac    = { kic:5   };
PRESETS.zirconia.frac = { kic:9   };

// FIX (Fase 6a — unificar Dureza con PRESETS, mismo problema que Fase 1 pero
// en Ensayo no destructivo): ROCKWELL_REF/BRINELL_REF/VICKERS_REF vivían cada
// una con sus propios valores de dureza para los mismos materiales, sin
// relación con PRESETS ni entre sí. Acá se centraliza el valor "real" de
// dureza (hb/hv/hr) -- los parámetros propios de cada ensayo (carga P,
// diagonal/profundidad d, posición del dial) siguen en cada archivo porque
// son de la puesta a punto de ESE ensayo puntual, no una propiedad del
// material. Los números son los mismos que ya estaban en cada REF (no se
// inventó ningún valor nuevo); wolfram/tungsteno y algunos no-metales quedan
// afuera si no tenían dato real en ninguna de las tres tablas.
PRESETS.acero.dureza     = { hb:130, hv:135, hr:{scale:'B', value:70} };
PRESETS.aceroinox.dureza = { hb:150, hv:155, hr:{scale:'B', value:80} };
PRESETS.fragil.dureza    = { hb:200, hv:210, hr:{scale:'C', value:20} };
PRESETS.aluminio.dureza  = { hb:95,  hv:107, hr:{scale:'B', value:60} };
PRESETS.titanio.dureza   = { hb:334, hv:349, hr:{scale:'C', value:34} };
PRESETS.niquel.dureza    = { hb:70,  hv:75,  hr:{scale:'B', value:45} };
PRESETS.molibdeno.dureza = { hb:160, hv:165, hr:{scale:'B', value:75} };
PRESETS.magnesio.dureza  = { hb:50,  hv:57,  hr:{scale:'B', value:50} };
PRESETS.zinc.dureza      = { hb:35,  hv:38,  hr:{scale:'B', value:35} };
PRESETS.tungsteno.dureza = { hb:250, hv:310, hr:{scale:'C', value:22} };
PRESETS.laton.dureza     = { hb:55,  hv:60,  hr:{scale:'B', value:55} };
PRESETS.cobre.dureza     = { hb:45,  hv:50  };
PRESETS.oro.dureza       = { hb:25,  hv:25  };
PRESETS.plata.dureza     = { hb:25,  hv:27  };
PRESETS.ceramica.dureza  = { hv:1700 };

// FIX (v4.10): dureza de los materiales nuevos. Mismo criterio que arriba --
// hb/hv se completan usando la aproximación HV≈HB para dureza baja/media
// (<200 HB, ver FIX #34 en dureza-brinell.js) cuando el material solo trae
// un dato real (HB o HV, no ambos); por encima de 200 HB (acero4140) esa
// aproximación pierde precisión y se deja hv sin completar en vez de
// inventarlo. Los 5 polímeros nuevos (HDPE/PP/PVC rígido/ABS/PC) y los 2
// compuestos (GFRP/Kevlar) quedan sin dureza acá a propósito: sus escalas
// reales (Shore D, Rockwell R/M) usan un indentador y una fórmula distintos
// a los que implementa este simulador (HB/HV/HRB-HRC), así que cargar un
// número ahí sería aplicar mal la escala -- mismo motivo por el que Nylon y
// Fibra de carbono ya quedaban afuera de esta tabla.
PRESETS.aisi1045.dureza        = { hb:179, hv:179, hr:{scale:'B', value:88} };
PRESETS.acero4140.dureza       = { hb:310,         hr:{scale:'C', value:30} };
PRESETS.aluminio7075.dureza    = { hb:150, hv:150, hr:{scale:'B', value:87} };
PRESETS.aluminio2024.dureza    = { hb:120, hv:137, hr:{scale:'B', value:75} };
PRESETS.broncefosforico.dureza = { hb:150, hv:155, hr:{scale:'B', value:88} };
PRESETS.hierronodular.dureza   = { hb:165, hv:165, hr:{scale:'B', value:83} };
PRESETS.inconel718.dureza      = {                 hr:{scale:'C', value:40} };
PRESETS.titaniocp2.dureza      = { hb:160, hv:160, hr:{scale:'B', value:75} };
PRESETS.sic.dureza             = { hv:3200 };
PRESETS.si3n4.dureza           = { hv:900  }; // rango bibliográfico amplio (600-1200 HV según fuente)
PRESETS.zirconia.dureza        = { hv:1250 };

function applyPreset(prefix, val) {
  val = val || document.getElementById(prefix==='e'?'e_preset':prefix+'_preset')?.value || '';
  if (!val) return;
  const p = PRESETS[val]; if (!p) return;
  if (prefix==='e') {
    document.getElementById('e_E').value  = p.E;
    document.getElementById('e_sy').value = p.sy||0;
    document.getElementById('e_ts').value = p.ts;
    document.getElementById('e_el').value = p.el;
    document.getElementById('e_nu').value = p.nu||0.30;
  } else if (prefix==='t') {
    document.getElementById('t_E').value  = p.E;
    document.getElementById('t_sy').value = p.sy||0;
    document.getElementById('t_ts').value = p.ts;
    document.getElementById('t_el').value = p.el;
  }
}
function applyPreset2(n, val) {
  if (!val) return; const p=PRESETS[val]; if(!p) return;
  document.getElementById('c'+n+'_E').value  = p.E;
  document.getElementById('c'+n+'_sy').value = p.sy||0;
  document.getElementById('c'+n+'_ts').value = p.ts;
  document.getElementById('c'+n+'_el').value = p.el;
}
function applyPresetComp(n, val) {
  if (!val) return; const p=PRESETS[val]; if(!p) return;
  if (n===1) { document.getElementById('k1_E').value=p.E; document.getElementById('k1_sy').value=p.sy||0; document.getElementById('k1_ts').value=p.ts; document.getElementById('k1_el').value=p.el; }
  else { document.getElementById('k2_E').value=p.E; document.getElementById('k2_ts').value=p.ts; document.getElementById('k2_el').value=p.el; }
}

// FIX #2: sincroniza los inputs de compresión con el preset seleccionado por defecto al inicializar
function applyPresetComp0() {
  const val = document.getElementById('co_preset').value;
  const p = PRESETS[val]; if(!p) return;
  const scVal = p.tsc || p.ts; // usa resistencia a compresión dedicada si existe (ej: hormigón, madera); si no, cae a TS
  document.getElementById('co_E').value   = p.E;
  document.getElementById('co_sc').value  = scVal;
  document.getElementById('co_syc').value = p.sy||Math.round(scVal*0.75);
  document.getElementById('co_frag').value= p.fragil?'si':'no';
  updateCompDerived();
}

