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
  magnesio:   {E:45,   sy:97,   ts:220,  el:12,  nu:0.29, fragil:false},
  zinc:       {E:105,  sy:120,  ts:200,  el:8,   nu:0.25, fragil:false},
  plata:      {E:76,   sy:55,   ts:170,  el:40,  nu:0.37, fragil:false},
  plomo:      {E:16,   sy:14,   ts:18,   el:50,  nu:0.44, fragil:false},
  tungsteno:  {E:407,  sy:750,  ts:980,  el:2,   nu:0.28, fragil:false},
  laton:      {E:101,  sy:75,   ts:300,  el:68,  nu:0.35, fragil:false},
  oro:        {E:79,   sy:30,   ts:130,  el:45,  nu:0.42, fragil:false},
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

