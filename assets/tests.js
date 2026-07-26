// tests.js — testSuite + runAllTests. NO se carga en el arranque: se inyecta on-demand

const testSuite = [
  // ---- GENERAR CURVA ----
  {
    id: 'curve_acero', group: 'Motor de curvas',
    name: 'genCurve — Acero A36',
    run: () => {
      const pts = genCurve(207, 250, 450, 20, false);
      if (!pts || !pts.length) return { ok: false, msg: 'No se generaron puntos' };
      const frac = pts.filter(p => p.phase === 'fracture');
      const el   = pts.filter(p => p.phase === 'elastic');
      if (!frac.length) return { ok: false, msg: 'Sin punto de fractura' };
      if (!el.length)   return { ok: false, msg: 'Sin zona elástica' };
      const maxSig = Math.max(...pts.map(p => p.y));
      if (Math.abs(maxSig - 450) > 20) return { ok: false, msg: `TS esperado ~450, obtenido ${maxSig.toFixed(1)}` };
      return { ok: true, msg: `${pts.length} pts, TS=${maxSig.toFixed(1)} MPa ✓` };
    }
  },
  {
    id: 'curve_fragil', group: 'Motor de curvas',
    name: 'genCurve — Hierro fundido (frágil)',
    run: () => {
      const pts = genCurve(170, 0, 200, 0.6, false);
      const pl = pts.filter(p => p.phase === 'plastic');
      if (pl.length > 0) return { ok: false, msg: `Frágil no debería tener zona plástica (${pl.length} pts)` };
      return { ok: true, msg: `Sin zona plástica ✓ (${pts.length} pts)` };
    }
  },
  {
    id: 'presets_nuevos', group: 'Motor de curvas',
    name: 'PRESETS v5 — nuevos materiales presentes',
    run: () => {
      const requeridos = ['niquel','aceroinox','molibdeno','magnesio','zinc','plata','plomo','tungsteno','laton','oro'];
      const faltantes = requeridos.filter(k => !PRESETS[k]);
      if (faltantes.length) return { ok: false, msg: `Faltantes: ${faltantes.join(', ')}` };
      return { ok: true, msg: `${requeridos.length} nuevos presets ✓` };
    }
  },
  {
    id: 'curve_fluencia', group: 'Motor de curvas',
    name: 'genCurve — Discontinuidad de fluencia',
    run: () => {
      const pts = genCurve(207, 250, 450, 20, true);
      const pl = pts.filter(p => p.phase === 'plastic');
      if (!pl.length) return { ok: false, msg: 'Sin zona plástica con fluencia activada' };
      const maxEarly = Math.max(...pl.slice(0,3).map(p => p.y));
      if (maxEarly < 250) return { warn: true, msg: `Pico de fluencia bajo: ${maxEarly.toFixed(0)} MPa` };
      return { ok: true, msg: `Pico: ${maxEarly.toFixed(1)} MPa ✓` };
    }
  },
  // ---- CÁLCULO RESILIENCIA ----
  {
    id: 'resilience_formula', group: 'Cálculos energéticos',
    name: 'Resiliencia — fórmula σ²/(2E)',
    run: () => {
      const E = 207, sy = 250;
      const pts = genCurve(E, sy, 450, 20, false);
      const res = calcResilience(pts);
      const analytic = (sy * sy) / (2 * E * 1000); // MJ/m³
      const err = Math.abs(res - analytic) / analytic;
      if (err > 0.05) return { ok: false, msg: `Numérico=${(res*1000).toFixed(2)} kJ/m³ vs analítico=${(analytic*1000).toFixed(2)} kJ/m³ (err=${(err*100).toFixed(1)}%)` };
      return { ok: true, msg: `Err=${(err*100).toFixed(2)}% — U_R=${(res*1000).toFixed(2)} kJ/m³ ✓` };
    }
  },
  {
    id: 'tenacity_positive', group: 'Cálculos energéticos',
    name: 'Tenacidad — área positiva',
    run: () => {
      const pts = genCurve(207, 250, 450, 20, false);
      const ten = calcTenacity(pts);
      if (ten <= 0) return { ok: false, msg: `Tenacidad negativa o cero: ${ten}` };
      const res = calcResilience(pts);
      if (ten < res) return { ok: false, msg: `Tenacidad(${ten.toFixed(4)}) < Resiliencia(${res.toFixed(4)})` };
      return { ok: true, msg: `Ten=${ten.toFixed(4)} MJ/m³ > Res=${res.toFixed(4)} ✓` };
    }
  },
  // ---- CURVA DE COMPRESIÓN ----
  {
    id: 'comp_curve', group: 'Compresión',
    name: 'genCompCurve — Acero A36',
    run: () => {
      const pts = genCompCurve(207, 250, 450, 'no');
      if (!pts.length) return { ok: false, msg: 'Sin puntos' };
      const negSig = pts.filter(p => p.y > 0);
      if (negSig.length > 1) return { ok: false, msg: `${negSig.length} puntos con σ positivo (debería ser negativo)` };
      return { ok: true, msg: `${pts.length} pts, todos σ ≤ 0 ✓` };
    }
  },
  {
    id: 'comp_fragil', group: 'Compresión',
    name: 'genCompCurve — Hormigón (frágil)',
    run: () => {
      const pts = genCompCurve(30, 0, 30, 'si');
      const pl = pts.filter(p => p.phase === 'plastic');
      if (pl.length > 0) return { ok: false, msg: `Frágil tiene zona plástica (${pl.length} pts)` };
      return { ok: true, msg: 'Sin plástica en frágil ✓' };
    }
  },
  {
    id: 'comp_syc_negativo', group: 'Compresión',
    name: 'genCompCurve — σyc negativo no rompe monotonicidad (FIX #28)',
    run: () => {
      const pts = genCompCurve(207, -10, 450, 'no');
      let prevX = Infinity, badMono = false;
      for (const p of pts) { if (p.x > prevX + 1e-9) badMono = true; prevX = p.x; }
      if (badMono) return { ok: false, msg: 'ε no monotónico con σyc negativo' };
      return { ok: true, msg: 'Monotónico incluso con σyc negativo ✓' };
    }
  },
  {
    id: 'comp_sc_negativo', group: 'Compresión',
    name: 'genCompCurve (frágil) — σc negativo no da σ positivo (FIX #28)',
    run: () => {
      const pts = genCompCurve(125, 0, -200, 'si');
      const bad = pts.filter(p => p.y > 0);
      if (bad.length) return { ok: false, msg: `${bad.length} puntos con σ positivo (debería ser ≤0)` };
      return { ok: true, msg: 'σ ≤ 0 en toda la curva ✓' };
    }
  },
  // ---- PRESETS ----
  {
    id: 'preset_load', group: 'Presets',
    name: 'PRESETS — todas las claves definidas',
    run: () => {
      const required = ['acero','aluminio','cobre','titanio','fragil','nylon','carbono','ceramica','hormigon','madera'];
      const missing = required.filter(k => !PRESETS[k]);
      if (missing.length) return { ok: false, msg: `Faltantes: ${missing.join(', ')}` };
      return { ok: true, msg: `${required.length} presets OK ✓` };
    }
  },
  {
    id: 'preset_values', group: 'Presets',
    name: 'PRESETS — valores en rango',
    run: () => {
      const errors = [];
      for (const [k, p] of Object.entries(PRESETS)) {
        if (p.E <= 0 || p.E > 1000) errors.push(`${k}.E=${p.E}`);
        if (p.ts <= 0 || p.ts > 10000) errors.push(`${k}.ts=${p.ts}`);
        if (p.el < 0 || p.el > 200) errors.push(`${k}.el=${p.el}`);
      }
      if (errors.length) return { ok: false, msg: errors.join(', ') };
      return { ok: true, msg: 'Todos los valores en rango ✓' };
    }
  },
  // ---- REGLA DE MEZCLAS ----
  {
    id: 'compound_parallel', group: 'Material compuesto',
    name: 'Regla de mezclas — módulo paralelo',
    run: () => {
      const E1=207, E2=230, f2=0.3, f1=0.7;
      const E_par = E1*f1 + E2*f2;
      const expected = 207*0.7 + 230*0.3;
      if (Math.abs(E_par - expected) > 0.01) return { ok: false, msg: `E_par=${E_par} ≠ ${expected}` };
      if (E_par < Math.min(E1,E2) || E_par > Math.max(E1,E2)) 
        return { ok: false, msg: `E_par=${E_par.toFixed(1)} fuera de rango [${Math.min(E1,E2)},${Math.max(E1,E2)}]` };
      return { ok: true, msg: `E_par=${E_par.toFixed(1)} GPa ✓` };
    }
  },
  {
    id: 'compound_plausibility', group: 'Material compuesto',
    name: 'Aviso de plausibilidad — térmico + madera-matriz + rigidez (FIX #35)',
    run: () => {
      const cases = [
        // [matriz, refuerzo, debeAvisar, motivo]
        ['madera','ceramica', true,  'madera como matriz'],
        ['ceramica','madera', true,  'cerámica funde a más temp. que lo que la madera tolera'],
        ['acero','algarrobo', true,  'acero funde a más temp. que lo que el algarrobo tolera'],
        ['acero','plomo',     true,  'acero funde a más temp. y plomo es más blando'],
        ['acero','aluminio',  true,  'aluminio (E=69) más blando que acero (E=207): no refuerza'],
        ['acero','carbono',   false, 'combinación real (default de la app)'],
        ['hormigon','acero',  false, 'hormigón armado -- real, acero más rígido que hormigón'],
        ['hormigon','madera', true,  'madera (E=12) menos rígida que hormigón (E=30): no refuerza en rigidez, aunque existan tableros madera-cemento por otros motivos (aislación/peso)'],
        ['cobre','tungsteno', false, 'compuesto W-Cu -- real'],
        ['nylon','madera',    false, 'compuesto madera-plástico -- madera más rígida que nylon'],
      ];
      const fails = [];
      for (const [k1,k2,expectWarn,why] of cases) {
        const got = !!dzCompoundPlausibility(k1,k2);
        if (got !== expectWarn) fails.push(`${k1}+${k2}: esperado ${expectWarn?'aviso':'sin aviso'} (${why}), dio ${got?'aviso':'sin aviso'}`);
      }
      if (fails.length) return { ok: false, msg: fails.join(' | ') };
      return { ok: true, msg: `${cases.length} combinaciones verificadas ✓` };
    }
  },
  // ---- TEMPERATURA ----
  {
    id: 'temp_factor', group: 'Temperatura',
    name: 'tempFactor — alta T reduce propiedades',
    run: () => {
      const cold = tempFactor(25, -200);
      const hot  = tempFactor(25,  500);
      if (cold.kE <= hot.kE) return { ok: false, msg: `kE frío(${cold.kE}) ≤ kE caliente(${hot.kE})` };
      if (cold.kEl >= hot.kEl) return { ok: false, msg: `kEl frío(${cold.kEl}) ≥ kEl caliente(${hot.kEl})` };
      return { ok: true, msg: `T alta: kE=${hot.kE.toFixed(2)}, kEl=${hot.kEl.toFixed(2)} ✓` };
    }
  },
  {
    id: 'temp_extreme', group: 'Temperatura',
    name: 'tempFactor — valores en límites físicos',
    run: () => {
      const f = tempFactor(25, 1500);
      if (f.kE < 0) return { ok: false, msg: `kE negativo a 1500°C: ${f.kE}` };
      if (f.kS < 0) return { ok: false, msg: `kS negativo a 1500°C: ${f.kS}` };
      if (f.kEl > 5.1) return { ok: false, msg: `kEl demasiado alto: ${f.kEl}` };
      return { ok: true, msg: `kE=${f.kE.toFixed(3)}, kS=${f.kS.toFixed(3)}, kEl=${f.kEl.toFixed(2)} ✓` };
    }
  },
  {
    id: 'temp_el_cero', group: 'Temperatura',
    name: '%EL≤0 no colapsa la curva (FIX #29)',
    run: () => {
      // Replica la lógica de renderTemp: %EL=0 o negativo debe clampearse a 0.01
      // antes de escalarlo por temperatura y pasarlo a genCurve.
      let el0 = 0; // valor tipeado a mano, inválido
      if (el0 <= 0) el0 = 0.01;
      const f = tempFactor(25, 25);
      const pts = genCurve(207, 250, 450, Math.min(80, el0 * f.kEl), false);
      const lastX = pts[pts.length - 1].x;
      if (lastX <= 0) return { ok: false, msg: `Curva colapsada/invertida: ε_fractura=${lastX}` };
      return { ok: true, msg: `ε_fractura=${lastX.toFixed(5)} ✓` };
    }
  },
  // ---- UNIDADES ----
  {
    id: 'units_mm', group: 'Conversión de unidades',
    name: 'toMM — cm y pulgadas',
    run: () => {
      const cm_result  = toMM(1, 'cm');
      const in_result  = toMM(1, 'in');
      const mm_result  = toMM(5, 'mm');
      const errors = [];
      if (Math.abs(cm_result - 10) > 0.001) errors.push(`1 cm → ${cm_result} (esperado 10)`);
      if (Math.abs(in_result - 25.4) > 0.001) errors.push(`1 in → ${in_result} (esperado 25.4)`);
      if (mm_result !== 5) errors.push(`5 mm → ${mm_result} (esperado 5)`);
      if (errors.length) return { ok: false, msg: errors.join(' | ') };
      return { ok: true, msg: '1cm=10mm, 1in=25.4mm ✓' };
    }
  },
  // ---- SPLITPHASES ----
  {
    id: 'splitphases', group: 'Motor de curvas',
    name: 'splitPhases — continuidad entre zonas',
    run: () => {
      const pts = genCurve(207, 250, 450, 20, false);
      const [el, pl, nk, fr] = splitPhases(pts);
      // el should start at 0
      if (!el.length) return { ok: false, msg: 'Sin zona elástica' };
      if (!pl.length) return { ok: false, msg: 'Sin zona plástica' };
      // last point of elastic should equal first of plastic (bridging)
      const elLast = el[el.length - 1];
      const plFirst = pl[0];
      if (Math.abs(elLast.x - plFirst.x) > 0.0001) 
        return { ok: false, msg: `Discontinuidad elástica-plástica: ε_el_fin=${elLast.x}, ε_pl_ini=${plFirst.x}` };
      return { ok: true, msg: `Zonas continuas ✓ (el:${el.length}, pl:${pl.length}, nk:${nk.length}, fr:${fr.length})` };
    }
  },
  // ---- DOM ----
  {
    id: 'dom_ids', group: 'DOM',
    name: 'IDs críticos del DOM — presentes',
    run: () => {
      const ids = ['e_E','e_sy','e_ts','e_el','e_nu','mainChart','zoomChart','compChart',
                   'compareChart','tempChart','compoundChart','mF','mSig','infoBar'];
      const missing = ids.filter(id => !document.getElementById(id));
      if (missing.length) return { ok: false, msg: `Faltantes: ${missing.join(', ')}` };
      return { ok: true, msg: `${ids.length} IDs presentes ✓` };
    }
  },
  {
    id: 'dom_tabs', group: 'DOM',
    // FIX: este test esperaba 2 tabs/2 páginas porque se escribió antes de
    // v3.1, cuando se agregó la tercera pestaña "Fractura, fatiga y fluencia".
    // Nadie lo actualizó en su momento, así que quedó rompiéndose en silencio
    // apenas se abriera el panel de tests. Ahora cuenta las 3 pestañas reales
    // y también valida las 15 subsecciones de la Unidad 3 (rt-subbtn), igual
    // que ya se hacía con las otras dos pestañas.
    // FIX (v4.0): se agregó la 4ta pestaña "Ensayos complementarios" (esqueleto
    // vacío, todavía sin ensayos). Actualizamos el conteo de tabs/pages a 4 ANTES
    // de que se agregue el primer ensayo -- la vez pasada (v3.4) este test se
    // rompió justamente por dejarlo desactualizado cuando se sumó la 3ra pestaña.
    // FIX (v4.1): primer ensayo de esa pestaña (Desgaste/Archard) -- se agrega el
    // conteo de cm-subbtn (1 por ahora, va a subir a 4 con el resto del Grupo A).
    // FIX (v4.4): 4to y último ensayo del Grupo A (Polímeros/curva DMA) -- cierra
    // por ahora el Grupo A completo: cm-subbtn queda en 4 hasta que arranque el
    // Grupo B (Metalografía/Voronoi) en una fase futura.
    name: 'Tabs — 4 tabs, 4 páginas, 6+8+15+4 subsecciones',
    run: () => {
      const tabs  = document.querySelectorAll('.tab').length;
      const pages = document.querySelectorAll('.page').length;
      const edSubs = document.querySelectorAll('.ed-subbtn').length;
      const dzSubs = document.querySelectorAll('.dz-subbtn').length;
      const rtSubs = document.querySelectorAll('.rt-subbtn').length;
      const cmSubs = document.querySelectorAll('.cm-subbtn').length;
      if (tabs !== 4)   return { ok: false, msg: `Tabs: ${tabs} (esperado 4)` };
      if (pages !== 4)  return { ok: false, msg: `Pages: ${pages} (esperado 4)` };
      if (edSubs !== 6) return { ok: false, msg: `Subsecciones Ensayo destructivo: ${edSubs} (esperado 6)` };
      if (dzSubs !== 8) return { ok: false, msg: `Subsecciones Ensayo no destructivo: ${dzSubs} (esperado 8)` };
      if (rtSubs !== 15) return { ok: false, msg: `Subsecciones Fractura/fatiga/fluencia: ${rtSubs} (esperado 15)` };
      if (cmSubs !== 4) return { ok: false, msg: `Subsecciones Ensayos complementarios: ${cmSubs} (esperado 4)` };
      return { ok: true, msg: `${tabs} tabs, ${pages} pages, ${edSubs}+${dzSubs}+${rtSubs}+${cmSubs} subsecciones ✓` };
    }
  },
  // ---- RESPONSIVE ----
  {
    id: 'responsive_detection', group: 'Responsive',
    name: 'Detección de dispositivo — label presente',
    run: () => {
      const label = document.getElementById('deviceLabel');
      if (!label) return { ok: false, msg: 'deviceLabel no encontrado' };
      if (!label.textContent) return { ok: false, msg: 'deviceLabel vacío' };
      return { ok: true, msg: `Dispositivo: "${label.textContent}" ✓` };
    }
  },
  {
    id: 'responsive_sidebar', group: 'Responsive',
    name: 'Drawer sidebar — funciones definidas',
    run: () => {
      if (typeof openSidebar !== 'function')  return { ok: false, msg: 'openSidebar no definida' };
      if (typeof closeSidebar !== 'function') return { ok: false, msg: 'closeSidebar no definida' };
      return { ok: true, msg: 'openSidebar/closeSidebar ✓' };
    }
  },
  {
    id: 'responsive_charts', group: 'Responsive',
    name: 'Chart.js — instancias inicializadas',
    run: () => {
      const instances = [];
      if (typeof mainChart !== 'undefined' && mainChart) instances.push('mainChart');
      if (typeof zoomChart !== 'undefined' && zoomChart) instances.push('zoomChart');
      if (instances.length < 2) return { ok: false, msg: `Solo ${instances.length}/2 charts init` };
      return { ok: true, msg: instances.join(', ') + ' ✓' };
    }
  },
  // ---- STORAGE ----
  {
    id: 'localstorage', group: 'Configuraciones',
    name: 'localStorage — lectura/escritura',
    run: () => {
      try {
        const key = '__test_ensayo__';
        localStorage.setItem(key, 'ok');
        const val = localStorage.getItem(key);
        localStorage.removeItem(key);
        if (val !== 'ok') return { ok: false, msg: `Valor leído: "${val}"` };
        return { ok: true, msg: 'R/W OK ✓' };
      } catch(e) {
        return { ok: false, msg: e.message };
      }
    }
  },
  // ---- DUREZA (Módulo 2) ----
  {
    id: 'dz_mohs_logic', group: 'Dureza',
    name: 'Mohs — dzMohsCompare() en los 3 casos posibles',
    run: () => {
      if (dzMohsCompare(10,1) !== 'raya') return { ok: false, msg: 'Diamante (10) debería rayar a talco (1)' };
      if (dzMohsCompare(1,10) !== 'no_raya') return { ok: false, msg: 'Talco (1) no debería poder rayar a diamante (10)' };
      if (dzMohsCompare(7,7) !== 'empate') return { ok: false, msg: 'Dos minerales de igual dureza (7 y 7) deberían dar empate' };
      return { ok: true, msg: 'dzMohsCompare(): raya / no_raya / empate ✓ (los 3 casos, no solo 10>1)' };
    }
  },
  {
    id: 'dz_brinell_formula', group: 'Dureza',
    name: 'Brinell — HB = 2P/[πD(D−√(D²−d²))]',
    run: () => {
      const D=10, P=2000, d=3.5;
      const HB = (2*P) / (Math.PI*D*(D - Math.sqrt(D*D - d*d)));
      const expected = 201.3;
      if (Math.abs(HB - expected) > 0.5) return { ok: false, msg: `HB=${HB.toFixed(1)} ≠ ${expected}` };
      return { ok: true, msg: `HB(P=2000kg, d=3.5mm) = ${HB.toFixed(1)} ✓` };
    }
  },
  {
    id: 'dz_vickers_ref_table', group: 'Dureza',
    name: 'VICKERS_REF — los 15 pares (P,d) reproducen su HV declarado (FIX #34)',
    run: () => {
      const bad = [];
      for (const [name, ref] of Object.entries(VICKERS_REF)) {
        const HV = 1.854*(ref.p/1000)/(ref.d*ref.d);
        if (Math.abs(HV-ref.hv)/ref.hv*100 > 2) bad.push(`${name}: HV calc=${HV.toFixed(1)} vs tabla=${ref.hv}`);
      }
      if (bad.length) return { ok: false, msg: bad.join(' | ') };
      return { ok: true, msg: `${Object.keys(VICKERS_REF).length} materiales OK (<2% de diferencia) ✓` };
    }
  },
  {
    id: 'dz_vickers_formula', group: 'Dureza',
    name: 'Vickers — HV = 1,854·P/d₁² (P convertido de gf a kgf)',
    run: () => {
      // FIX #5: P está en gf en la UI; la fórmula requiere kgf, así que se
      // divide por 1000 antes de aplicar la constante 1,854 (antes este test
      // tenía "hardcodeado" como esperado el resultado SIN esa conversión).
      const HV = 1.854*(100/1000)/(0.03*0.03);
      const expected = 206.0;
      if (Math.abs(HV - expected) > 1) return { ok: false, msg: `HV=${HV.toFixed(1)} ≠ ${expected}` };
      return { ok: true, msg: `HV(P=100gf=0,1kgf, d₁=0,03mm) = ${HV.toFixed(1)} ✓` };
    }
  },
  {
    id: 'dz_ts_correlation', group: 'Dureza',
    name: 'Correlación TS — ejercicio HB=150',
    run: () => {
      const mpa = 3.45*150, psi = 500*150;
      if (Math.abs(mpa - 517.5) > 0.01) return { ok: false, msg: `TS(MPa)=${mpa} ≠ 517.5` };
      if (Math.abs(psi - 75000) > 0.01) return { ok: false, msg: `TS(psi)=${psi} ≠ 75000` };
      if (!(mpa > 130)) return { ok: false, msg: 'TS calculado no supera la Tabla 6.2 (130 MPa) como espera el ejercicio' };
      return { ok: true, msg: `TS=517.5 MPa / 75000 psi, mayor que 130 MPa ✓` };
    }
  },
  {
    id: 'dz_conv_monotonic', group: 'Dureza',
    name: 'Conversión — interpolación monótona HRC→HB',
    run: () => {
      const a = dzInterp('hrc', 25, 'hb');
      const b = dzInterp('hrc', 45, 'hb');
      if (!(b > a)) return { ok: false, msg: `HB(45 HRC)=${b.toFixed(0)} no es mayor que HB(25 HRC)=${a.toFixed(0)}` };
      return { ok: true, msg: `HB crece con HRC: ${a.toFixed(0)} → ${b.toFixed(0)} ✓` };
    }
  },
  {
    id: 'janka_fuerza_negativa', group: 'Dureza',
    name: 'Janka — fuerza negativa no produce NaN (FIX #30)',
    run: () => {
      const F_safe_test = 0.01; // mismo piso que aplica dzUpdateJanka ante F<=0
      const depth = JANKA_HALF * Math.pow(F_safe_test/180, 2/3);
      if (!isFinite(depth)) return { ok: false, msg: `profundidad = ${depth} (no finito)` };
      return { ok: true, msg: `profundidad=${depth.toFixed(4)} mm, finita ✓` };
    }
  },
  // ---- FRACTURA, FATIGA Y FLUENCIA (Unidad 3) ----
  {
    id: 'fr_ki_formula', group: 'Fractura, fatiga y fluencia',
    name: 'K_I = Y·σ·√(π·a) — valor analítico',
    run: () => {
      const Ki = frCalcKi(1.0, 300, 2); // Y=1, σ=300 MPa, a=2 mm
      const analytic = 1.0*300*Math.sqrt(Math.PI*(2/1000));
      if (Math.abs(Ki-analytic) > 0.01) return { ok: false, msg: `esperado ${analytic.toFixed(2)}, obtenido ${Ki.toFixed(2)}` };
      return { ok: true, msg: `K_I=${Ki.toFixed(2)} MPa√m ✓` };
    }
  },
  {
    id: 'fr_ac_roundtrip', group: 'Fractura, fatiga y fluencia',
    name: 'a_c — a la longitud crítica, K_I vuelve a valer K_IC',
    run: () => {
      const kic = 53, Y = 1.0, sigma = 300;
      const ac = frCalcAcMm(kic, Y, sigma);
      const Ki_en_ac = frCalcKi(Y, sigma, ac);
      if (Math.abs(Ki_en_ac-kic) > 0.1) return { ok: false, msg: `K_I(a_c)=${Ki_en_ac.toFixed(2)}, esperado K_IC=${kic}` };
      return { ok: true, msg: `a_c=${ac.toFixed(2)} mm → K_I=K_IC ✓` };
    }
  },
  {
    // FIX (Fase 8, punto 2): regresión sobre frSyncKicPresetValues() -- las 4
    // opciones con [data-material] deben terminar con el MISMO value que
    // PRESETS[x].frac.kic, no un número hardcodeado en el HTML que se pueda
    // desincronizar. Corre en el navegador (necesita el <select> del DOM).
    id: 'fr_kic_preset_sync', group: 'Fractura, fatiga y fluencia',
    name: 'rt_kicPreset — opciones con material se sincronizan con PRESETS[x].frac.kic',
    run: () => {
      const sel = document.getElementById('rt_kicPreset');
      if (!sel) return { warn: true, msg: 'No se encontró #rt_kicPreset (¿pestaña Fractura no cargada en el DOM?)' };
      const conMaterial = Array.from(sel.options).filter(o => o.dataset.material);
      if (conMaterial.length !== 4) return { ok: false, msg: `Se esperaban 4 opciones con [data-material], hay ${conMaterial.length}` };
      const errores = [];
      for (const opt of conMaterial) {
        const kic = PRESETS[opt.dataset.material]?.frac?.kic;
        if (kic === undefined) { errores.push(`${opt.dataset.material}: sin PRESETS[x].frac.kic`); continue; }
        if (Number(opt.value) !== kic) errores.push(`${opt.dataset.material}: option.value=${opt.value} ≠ PRESETS.kic=${kic}`);
      }
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: `${conMaterial.length} opciones sincronizadas con PRESETS[x].frac.kic ✓` };
    }
  },
  {
    id: 'fr_charpy_dbtt', group: 'Fractura, fatiga y fluencia',
    name: 'Charpy — transición dúctil-frágil monótona (hasDBTT) o ~plana (sin DBTT) en todas las familias de FR_IMPACTO_PRESETS',
    // FIX (Fase 9d): antes hardcodeaba solo bajoC (monótona) y fcc (plana) a
    // mano. Ahora recorre TODAS las entradas de FR_IMPACTO_PRESETS y decide
    // qué chequear según su propio flag hasDBTT -- así bajoCFino (Fase 9,
    // grano fino) queda cubierto automáticamente sin duplicar el test, y una
    // 5ta familia futura tampoco va a requerir tocar tests.js.
    run: () => {
      const errores = [];
      Object.entries(FR_IMPACTO_PRESETS).forEach(([key, p]) => {
        const antes = frSigmoid(p.Tmid-40, p.Elow, p.Ehigh, p.Tmid, p.width);
        const enMedio = frSigmoid(p.Tmid, p.Elow, p.Ehigh, p.Tmid, p.width);
        const despues = frSigmoid(p.Tmid+40, p.Elow, p.Ehigh, p.Tmid, p.width);
        if (p.hasDBTT) {
          if (!(antes < enMedio && enMedio < despues)) errores.push(`${key}: no monótona (${antes.toFixed(1)}, ${enMedio.toFixed(1)}, ${despues.toFixed(1)})`);
        } else {
          const rango = despues - antes;
          if (Math.abs(rango) > 15) errores.push(`${key}: debería ser casi plana, varió ${rango.toFixed(1)} J`);
        }
      });
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: `${Object.keys(FR_IMPACTO_PRESETS).length} familias verificadas (monótonas las con DBTT, planas las sin DBTT) ✓` };
    }
  },
  {
    id: 'fr_charpy_grano_fino_vs_grueso', group: 'Fractura, fatiga y fluencia',
    name: 'Charpy — grano fino (Fase 9) tiene menor DBTT y mayor meseta superior que grano grueso (Hall-Petch)',
    run: () => {
      const grueso = FR_IMPACTO_PRESETS.bajoC;
      const fino = FR_IMPACTO_PRESETS.bajoCFino;
      if (!(fino.Tmid < grueso.Tmid)) return { ok: false, msg: `Tmid grano fino (${fino.Tmid}) debería ser menor que grano grueso (${grueso.Tmid})` };
      if (!(fino.Ehigh >= grueso.Ehigh)) return { ok: false, msg: `Ehigh grano fino (${fino.Ehigh}) debería ser ≥ grano grueso (${grueso.Ehigh})` };
      return { ok: true, msg: `DBTT ${fino.Tmid}°C < ${grueso.Tmid}°C, meseta superior ${fino.Ehigh} ≥ ${grueso.Ehigh} J ✓` };
    }
  },
  {
    id: 'ft_basquin_sn', group: 'Fractura, fatiga y fluencia',
    name: 'Basquin — vida a fatiga decrece con σ_a',
    run: () => {
      const p = FT_SN_PRESETS.acero1045;
      const N_alta = ftBasquinN(300, p.sfp, p.b);
      const N_baja = ftBasquinN(150, p.sfp, p.b);
      if (!(N_baja > N_alta)) return { ok: false, msg: `N(150MPa)=${N_baja.toExponential(2)} no es mayor que N(300MPa)=${N_alta.toExponential(2)}` };
      return { ok: true, msg: `N crece al bajar σ_a: ${N_alta.toExponential(2)} → ${N_baja.toExponential(2)} ✓` };
    }
  },
  {
    id: 'ft_paris_monotonic', group: 'Fractura, fatiga y fluencia',
    name: 'Ley de Paris — da/dN crece con ΔK',
    run: () => {
      const { parisC: C, parisM: m } = PRESETS.acero.frac;
      const bajo = ftDadN(10, C, m);
      const alto = ftDadN(30, C, m);
      if (!(alto > bajo)) return { ok: false, msg: `da/dN no crece con ΔK: ${bajo.toExponential(2)} → ${alto.toExponential(2)}` };
      return { ok: true, msg: `da/dN crece con ΔK: ${bajo.toExponential(2)} → ${alto.toExponential(2)} mm/ciclo ✓` };
    }
  },
  {
    id: 'fl_dorn_temp_sensitivity', group: 'Fractura, fatiga y fluencia',
    name: 'Ecuación de Dorn — ε̇_s crece con la temperatura',
    run: () => {
      const mat = { K: PRESETS.aluminio.frac.K, n: PRESETS.aluminio.frac.n, Qc: PRESETS.aluminio.frac.Qc };
      const bajaT = flEpsDot(mat, 100, 300);
      const altaT = flEpsDot(mat, 100, 450);
      if (!(altaT > bajaT)) return { ok: false, msg: `ε̇_s no crece con T: ${bajaT.toExponential(2)} → ${altaT.toExponential(2)}` };
      return { ok: true, msg: `ε̇_s crece con T: ${bajaT.toExponential(2)} → ${altaT.toExponential(2)} /h ✓` };
    }
  },
  {
    id: 'fl_larson_miller_roundtrip', group: 'Fractura, fatiga y fluencia',
    name: 'Larson-Miller — ida y vuelta recupera t_r original',
    run: () => {
      const C = 20, T_K = 900+273.15, trOriginal = 1000;
      const LMP = flLarsonMillerP(T_K, C, trOriginal);
      const trRecuperado = flLarsonMillerTr(LMP, T_K, C);
      const errorPct = Math.abs(trRecuperado-trOriginal)/trOriginal*100;
      if (errorPct > 1) return { ok: false, msg: `t_r original=${trOriginal}, recuperado=${trRecuperado.toFixed(1)} (${errorPct.toFixed(2)}% error)` };
      return { ok: true, msg: `t_r=${trOriginal}h recuperado=${trRecuperado.toFixed(1)}h ✓` };
    }
  },
  {
    id: 'frac_presets_integrados', group: 'Fractura, fatiga y fluencia',
    name: 'PRESETS.frac — integración con tracción/compresión (Fase 1) intacta',
    run: () => {
      const esperado = {
        acero:     ['kic','parisC','parisM'],
        aluminio:  ['kic','parisC','parisM','K','n','Qc'],
        titanio:   ['kic','parisC','parisM'],
        aceroinox: ['K','n','Qc'],
        ceramica:  ['kic'],
      };
      const faltantes = [];
      for (const [mat, campos] of Object.entries(esperado)) {
        if (!PRESETS[mat] || !PRESETS[mat].frac) { faltantes.push(`${mat}.frac no existe`); continue; }
        for (const campo of campos) {
          if (PRESETS[mat].frac[campo] === undefined) faltantes.push(`${mat}.frac.${campo}`);
        }
      }
      if (faltantes.length) return { ok: false, msg: `Faltantes: ${faltantes.join(', ')}` };
      return { ok: true, msg: `PRESETS.frac completo para 5 materiales ✓` };
    }
  },
  {
    id: 'frac_presets_fase5a', group: 'Fractura, fatiga y fluencia',
    name: 'PRESETS.frac — Fase 5a (11 materiales nuevos) según el criterio acordado',
    run: () => {
      const esperado = {
        cobre:      ['parisC','parisM'],
        niquel:     ['parisC','parisM'],
        zinc:       ['K','n','Qc'],
        plomo:      ['K','n','Qc'],
        molibdeno:  ['kic','K','n','Qc'],
        tungsteno:  ['kic','K','n','Qc'],
        laton:      ['kic','parisC','parisM'],
        magnesio:   ['kic','parisC','parisM'],
        fragil:     ['kic'],
        hormigon:   ['kic'],
        nylon:      ['kic'],
      };
      // negativo: estos NO deberían tener .frac -- si aparece, alguien fabricó
      // un valor sin respaldo real (Cu/Ni/Au/Ag son demasiado dúctiles para K_IC
      // convencional; oro/plata/madera/pino/algarrobo/quebracho/carbono no
      // tienen dato real de ningún tipo cargado)
      const sinFrac = ['oro','plata','madera','pino','algarrobo','quebracho','carbono'];
      const faltantes = [];
      for (const [mat, campos] of Object.entries(esperado)) {
        if (!PRESETS[mat] || !PRESETS[mat].frac) { faltantes.push(`${mat}.frac no existe`); continue; }
        for (const campo of campos) {
          if (PRESETS[mat].frac[campo] === undefined) faltantes.push(`${mat}.frac.${campo}`);
        }
        // cobre/niquel no deben tener kic (fundamento: no aplica K_IC convencional en metales muy dúctiles)
        if ((mat==='cobre'||mat==='niquel') && PRESETS[mat].frac.kic !== undefined) faltantes.push(`${mat}.frac.kic no debería existir`);
      }
      for (const mat of sinFrac) {
        if (PRESETS[mat] && PRESETS[mat].frac) faltantes.push(`${mat}.frac no debería existir (sin dato real)`);
      }
      if (faltantes.length) return { ok: false, msg: `Faltantes/inconsistencias: ${faltantes.join(', ')}` };
      return { ok: true, msg: `11 materiales nuevos con el campo correcto, 7 correctamente sin .frac ✓` };
    }
  },
  {
    id: 'rt_export_defined', group: 'Fractura, fatiga y fluencia',
    name: 'Exportación de gráficos (Fase 3) — función definida',
    run: () => {
      if (typeof exportRoturaChart !== 'function') return { ok: false, msg: 'exportRoturaChart no definida' };
      const botones = document.querySelectorAll('[onclick^="exportRoturaChart"]').length;
      if (botones !== 9) return { ok: false, msg: `Botones de exportación: ${botones} (esperado 9, uno por gráfico)` };
      return { ok: true, msg: `exportRoturaChart definida, ${botones}/9 botones ✓` };
    }
  },
  {
    id: 'ficha_material_defined', group: 'Ficha técnica (Fase 4)',
    name: 'openFichaPicker / renderFichaMaterial — funciones y botón de header definidos',
    run: () => {
      if (typeof openFichaPicker !== 'function') return { ok: false, msg: 'openFichaPicker no definida' };
      if (typeof renderFichaMaterial !== 'function') return { ok: false, msg: 'renderFichaMaterial no definida' };
      if (!document.getElementById('fichaHeaderBtn')) return { ok: false, msg: 'Botón de header #fichaHeaderBtn no existe' };
      const nMat = Object.keys(MATERIAL_LABELS).length;
      const nPresets = Object.keys(PRESETS).length;
      if (nMat !== nPresets) return { warn: true, msg: `MATERIAL_LABELS tiene ${nMat} entradas, PRESETS tiene ${nPresets} — revisar si falta alguna etiqueta` };
      return { ok: true, msg: `Funciones y botón OK, ${nMat} materiales con etiqueta ✓` };
    }
  },
  {
    id: 'ficha_disponibilidad_honesta', group: 'Ficha técnica (Fase 4)',
    name: 'Ficha — no inventa Unidad 3 para materiales sin esos datos',
    run: () => {
      // acero: tiene K_IC y Paris, NO tiene fluencia (Fase 1)
      const acero = PRESETS.acero.frac || {};
      if (acero.kic === undefined || acero.parisC === undefined) return { ok: false, msg: 'acero debería tener K_IC y Paris' };
      if (acero.K !== undefined) return { ok: false, msg: 'acero no debería tener parámetros de fluencia (no hay dato real)' };
      // madera: no tiene ningún dato de Unidad 3 -- la ficha debe mostrar el aviso, no fabricar valores
      if (PRESETS.madera.frac !== undefined) return { ok: false, msg: 'madera no debería tener .frac (sin dato real de fractura/fatiga/fluencia)' };
      return { ok: true, msg: 'Disponibilidad por material coincide con los datos reales de PRESETS.frac ✓' };
    }
  },
  {
    // FIX (Fase 8, punto 1): la ficha ahora suma un resumen S-N/Basquin junto
    // al de Paris, SOLO para los 3 materiales mapeados en FICHA_SN_REF, y
    // rotulado con el grado de referencia (ej. "Acero 1045") -- no debe
    // aparecer para materiales sin mapeo (ej. cobre, que sí tiene Paris pero
    // no un grado S-N de referencia asignado).
    id: 'ficha_sn_basquin', group: 'Ficha técnica (Fase 4)',
    name: 'Ficha — resumen S-N/Basquin (Fase 8) presente solo para materiales con grado de referencia',
    run: () => {
      const errores = [];
      try {
        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'acero';
        renderFichaMaterial();
        const htmlAcero = document.getElementById('fichaBody').innerHTML;
        if (!/Curva S-N \(Basquin\)/.test(htmlAcero)) errores.push('acero: falta el resumen S-N');
        if (!htmlAcero.includes(FT_SN_PRESETS.acero1045.label)) errores.push('acero: no cita el grado de referencia (Acero 1045)');
        // Mismo branching que renderFichaMaterial(): con σ_a=200 ≤ S_e=310
        // (Acero 1045) da vida infinita, no un Nf finito.
        const p1045 = FT_SN_PRESETS.acero1045;
        const infinita = p1045.hasLimit && FICHA_SN_SA_EJEMPLO <= p1045.Se;
        const textoEsperado = infinita ? 'mayor a 10⁷ ciclos (infinita)' : ftBasquinN(FICHA_SN_SA_EJEMPLO, p1045.sfp, p1045.b).toExponential(2);
        if (!htmlAcero.includes(textoEsperado)) errores.push(`acero: vida estimada no coincide (esperado "${textoEsperado}")`);

        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'cobre';
        renderFichaMaterial();
        const htmlCobre = document.getElementById('fichaBody').innerHTML;
        if (/Curva S-N \(Basquin\)/.test(htmlCobre)) errores.push('cobre: no debería mostrar resumen S-N (sin grado de referencia mapeado)');
      } finally {
        closeFicha();
      }
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Resumen S-N correcto en acero (con referencia y vida estimada), ausente en cobre ✓' };
    }
  },
  {
    id: 'ficha_hb_correlacion', group: 'Ficha técnica (Fase 4)',
    name: 'Ficha — dureza estimada usa la misma correlación TS≈3.45·HB del ejercicio de dureza',
    run: () => {
      const hbEst = PRESETS.acero.ts/3.45;
      const esperado = 450/3.45;
      if (Math.abs(hbEst-esperado) > 0.01) return { ok: false, msg: `HB estimado=${hbEst.toFixed(1)}, esperado=${esperado.toFixed(1)}` };
      return { ok: true, msg: `HB estimado(acero)=${hbEst.toFixed(0)} (misma correlación que dz_ts_correlation) ✓` };
    }
  },
  {
    id: 'ficha_graficos_fase5b', group: 'Ficha técnica (Fase 4)',
    name: 'Ficha — gráficos (Fase 5b) según los datos disponibles por material',
    run: () => {
      const casos = [
        { mat:'aluminio', esperados:['fichaMatTraccionChart','fichaMatFracChart','fichaMatFatigaChart','fichaMatFluenciaChart'] },
        { mat:'madera',   esperados:['fichaMatTraccionChart'] },
        { mat:'zinc',     esperados:['fichaMatTraccionChart','fichaMatFluenciaChart'] },
        { mat:'cobre',    esperados:['fichaMatTraccionChart','fichaMatFatigaChart'] },
      ];
      const errores = [];
      // FIX (bug real, no cosmético): renderFichaMaterial() reemplaza TODO
      // #fichaBody -- incluido el <select> que crea openFichaPicker(). Antes
      // este test abría el picker una sola vez y reusaba el mismo <select>
      // para los 4 materiales del loop; a partir de la 2da vuelta el select
      // ya no existía (lo había pisado la ficha del material anterior), el
      // test tiraba una excepción, y como esa excepción no pasaba por
      // closeFicha(), el modal quedaba abierto -- por eso al correr "todos
      // los tests" aparecía la ficha completa en pantalla. Ahora se reabre el
      // picker antes de CADA material, y closeFicha() corre siempre (finally).
      try {
        for (const {mat, esperados} of casos) {
          openFichaPicker();
          const sel = document.getElementById('fichaMatSelect');
          if (!sel) { errores.push(`${mat}: no se encontró #fichaMatSelect tras openFichaPicker()`); continue; }
          sel.value = mat;
          try { renderFichaMaterial(); } catch(e) { errores.push(`${mat}: excepción ${e.message}`); continue; }
          const html = document.getElementById('fichaBody').innerHTML;
          for (const id of esperados) if (!html.includes(`id="${id}"`)) errores.push(`${mat}: falta canvas ${id}`);
          const noEsperados = ['fichaMatFracChart','fichaMatFatigaChart','fichaMatFluenciaChart'].filter(id => !esperados.includes(id));
          for (const id of noEsperados) if (html.includes(`id="${id}"`)) errores.push(`${mat}: no debería tener canvas ${id}`);
        }
      } finally {
        closeFicha();
      }
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Canvas correctos para 4 materiales con distinta disponibilidad de datos ✓' };
    }
  },
  {
    id: 'ficha_compresion_cruzada', group: 'Ficha técnica (Fase 4)',
    name: 'Ficha — lee Compresión solo si el material coincide con el seleccionado ahí',
    run: () => {
      const coSel = document.getElementById('co_preset');
      if (!coSel) return { warn: true, msg: 'No se encontró #co_preset (¿pestaña Compresión no cargada en el DOM?)' };
      const original = coSel.value;
      let tieneDatosCoincide = false, tieneAvisoNoCoincide = false;
      // FIX: mismo motivo que en ficha_graficos_fase5b -- hay que reabrir el
      // picker antes de CADA material porque renderFichaMaterial() se come el
      // <select> anterior, y todo va en try/finally para que closeFicha() y
      // la restauración de co_preset corran siempre, incluso si algo falla.
      try {
        openFichaPicker();
        coSel.value = 'acero';
        document.getElementById('fichaMatSelect').value = 'acero';
        renderFichaMaterial();
        const htmlCoincide = document.getElementById('fichaBody').innerHTML;
        tieneDatosCoincide = /Valores tomados de la pestaña Compresión/.test(htmlCoincide);

        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'aluminio';
        renderFichaMaterial();
        const htmlNoCoincide = document.getElementById('fichaBody').innerHTML;
        tieneAvisoNoCoincide = /Sin datos propios de compresión/.test(htmlNoCoincide);
      } finally {
        coSel.value = original;
        closeFicha();
      }
      if (!tieneDatosCoincide) return { ok: false, msg: 'No mostró los datos de Compresión con el material coincidente' };
      if (!tieneAvisoNoCoincide) return { ok: false, msg: 'Mostró datos de Compresión con un material que no coincide' };
      return { ok: true, msg: 'Lectura cruzada con Compresión correcta (coincide → datos, no coincide → aviso) ✓' };
    }
  },
  {
    id: 'dureza_presets_integrados', group: 'Dureza',
    name: 'ROCKWELL_REF/BRINELL_REF/VICKERS_REF — integrados con PRESETS.dureza (Fase 6a)',
    run: () => {
      const casos = [
        ['acero', 'hb', BRINELL_REF, 130], ['acero', 'hv', VICKERS_REF, 135],
        ['aluminio', 'hb', BRINELL_REF, 95], ['titanio', 'hv', VICKERS_REF, 349],
      ];
      const errores = [];
      for (const [mat, campo, ref, esperado] of casos) {
        const presetsVal = PRESETS[mat]?.dureza?.[campo];
        if (presetsVal !== esperado) errores.push(`PRESETS.${mat}.dureza.${campo}=${presetsVal} (esperado ${esperado})`);
        if (ref[mat]?.[campo] !== esperado) errores.push(`${campo==='hb'?'BRINELL_REF':'VICKERS_REF'}.${mat}.${campo}=${ref[mat]?.[campo]} (esperado ${esperado}, debería venir de PRESETS)`);
      }
      const rkAcero = ROCKWELL_REF.acero;
      if (!rkAcero || rkAcero.scale !== 'B' || rkAcero.hr !== 70) errores.push(`ROCKWELL_REF.acero=${JSON.stringify(rkAcero)} (esperado scale:B, hr:70)`);
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Las 3 tablas de dureza leen de PRESETS.dureza, valores consistentes ✓' };
    }
  },
  {
    id: 'dureza_export_defined', group: 'Dureza',
    name: 'Exportación del gráfico de correlación TS-HB (Fase 6b) — función y botón definidos',
    run: () => {
      if (typeof exportTsChart !== 'function') return { ok: false, msg: 'exportTsChart no definida' };
      const boton = document.querySelector('[onclick="exportTsChart()"]');
      if (!boton) return { ok: false, msg: 'No se encontró el botón de exportar en la pestaña Dureza' };
      return { ok: true, msg: 'exportTsChart definida y botón presente ✓' };
    }
  },
  {
    id: 'ficha_dureza_real_vs_estimada', group: 'Ficha técnica (Fase 4)',
    name: 'Ficha — usa HB/HV/HR reales (Fase 6) en vez de la correlación cuando existen',
    run: () => {
      openFichaPicker();
      let errores = [];
      try {
        document.getElementById('fichaMatSelect').value = 'acero';
        renderFichaMaterial();
        const htmlAcero = document.getElementById('fichaBody').innerHTML;
        if (!/HB \(Brinell\)<\/span><span class="fv">130/.test(htmlAcero)) errores.push('acero: no mostró HB real (130)');
        if (/HB estimado/.test(htmlAcero)) errores.push('acero: no debería mostrar el estimado, tiene dato real');

        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'madera';
        renderFichaMaterial();
        const htmlMadera = document.getElementById('fichaBody').innerHTML;
        if (!/HB estimado/.test(htmlMadera)) errores.push('madera: debería mostrar el estimado (no tiene dato real de dureza)');
      } finally {
        closeFicha();
      }
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Ficha prioriza HB/HV/HR real sobre la correlación cuando el material lo tiene ✓' };
    }
  },
  // FIX (Fase 7 — sync cruzado de material, pedido pendiente desde v2.3):
  // tests de assets/material-sync.js. Todos restauran el valor original de
  // cada <select> tocado en un finally, para no dejar el DOM en un estado
  // distinto al que tenía antes de correr la suite (varios tests de arriba,
  // ej. dureza_presets_integrados, asumen los selects en su estado inicial).
  {
    id: 'sync_excluye_2_slots', group: 'Sincronización de material (Fase 7)',
    name: 'Registro de sync NO incluye Comparar/Compuesto (2 materiales a la vez)',
    run: () => {
      const ids = MATERIAL_SYNC_TARGETS.map(t => t.id);
      const noDeberian = ['k1_preset', 'k2_preset']; // Comparar (c1/c2) no tiene <select> con id
      const presentes = noDeberian.filter(id => ids.includes(id));
      if (presentes.length) return { ok: false, msg: `El registro incluye selectores de 2 slots que deberían quedar afuera: ${presentes.join(', ')}` };
      return { ok: true, msg: `Registro con ${ids.length} selectores, ninguno de Comparar/Compuesto ✓` };
    }
  },
  {
    id: 'sync_material_completo', group: 'Sincronización de material (Fase 7)',
    name: 'syncMaterialToAllTests — "Acero" se aplica en las 7 pestañas donde corresponde, no toca Janka/Esclerómetro',
    run: () => {
      const ids = ['e_preset','co_preset','t_preset','dz_rkMat','dz_brMat','dz_vMat','dz_jkMat','dz_scMat','ft_parisMat'];
      const originales = {}; ids.forEach(id => { const el = document.getElementById(id); originales[id] = el ? el.value : undefined; });
      const errores = [];
      try {
        document.getElementById('dz_jkMat').value = 'quebracho'; // material sin relación, para confirmar que NO se pisa
        document.getElementById('dz_scMat').value = ''; // Esclerómetro solo tiene hormigón como opción -- 'acero' nunca puede coincidir
        document.getElementById('e_preset').value = 'acero';
        syncMaterialToAllTests('e_preset');
        const esperanAcero = ['co_preset','t_preset','dz_rkMat','dz_brMat','dz_vMat','ft_parisMat'];
        for (const id of esperanAcero) {
          if (document.getElementById(id).value !== 'acero') errores.push(`${id} no quedó en 'acero'`);
        }
        if (document.getElementById('co_E').value !== String(PRESETS.acero.E)) errores.push('co_E no se actualizó con applyPresetComp0() real');
        if (document.getElementById('dz_jkMat').value !== 'quebracho') errores.push('dz_jkMat se tocó (Janka es solo maderas, "acero" no debería afectarlo)');
        if (document.getElementById('dz_scMat').value !== '') errores.push('dz_scMat se tocó (Esclerómetro es solo hormigón)');
      } finally {
        ids.forEach(id => { const el = document.getElementById(id); if (el && originales[id] !== undefined) el.value = originales[id]; });
      }
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Sync de "Acero" correcto: 6 pestañas actualizadas con valores reales, Janka/Esclerómetro intactos ✓' };
    }
  },
  {
    id: 'sync_material_parcial', group: 'Sincronización de material (Fase 7)',
    name: 'syncMaterialToAllTests — "Oro" no está en Rockwell (metal blando excluido de esa tabla, ver dureza-rockwell.js)',
    run: () => {
      const ids = ['e_preset','dz_rkMat','dz_brMat','dz_vMat'];
      const originales = {}; ids.forEach(id => { const el = document.getElementById(id); originales[id] = el ? el.value : undefined; });
      const errores = [];
      try {
        document.getElementById('dz_rkMat').value = 'aluminio'; // para confirmar que NO se pisa con 'oro'
        document.getElementById('e_preset').value = 'oro';
        syncMaterialToAllTests('e_preset');
        if (document.getElementById('dz_brMat').value !== 'oro') errores.push('dz_brMat debería quedar en "oro" (Brinell sí tiene oro)');
        if (document.getElementById('dz_vMat').value !== 'oro') errores.push('dz_vMat debería quedar en "oro" (Vickers sí tiene oro)');
        if (document.getElementById('dz_rkMat').value !== 'aluminio') errores.push('dz_rkMat se pisó con "oro", pero Rockwell no tiene oro en su <select>');
      } finally {
        ids.forEach(id => { const el = document.getElementById(id); if (el && originales[id] !== undefined) el.value = originales[id]; });
      }
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Sync parcial correcto: Brinell/Vickers reciben "oro", Rockwell queda intacto ✓' };
    }
  },
  {
    id: 'sync_sin_seleccion', group: 'Sincronización de material (Fase 7)',
    name: 'syncMaterialToAllTests — sin material elegido en el origen, no rompe ni toca otras pestañas',
    run: () => {
      const original = document.getElementById('co_preset').value;
      const eOriginal = document.getElementById('e_preset').value;
      let excepcion = null;
      try {
        document.getElementById('e_preset').value = '';
        syncMaterialToAllTests('e_preset');
      } catch (e) { excepcion = e.message; }
      const coSigueIgual = document.getElementById('co_preset').value === original;
      document.getElementById('e_preset').value = eOriginal;
      if (excepcion) return { ok: false, msg: `Tiró una excepción: ${excepcion}` };
      if (!coSigueIgual) return { ok: false, msg: 'Sin material elegido igual modificó Compresión' };
      return { ok: true, msg: 'Selector vacío: no hace nada y no rompe ✓' };
    }
  },
  // FIX (v4.6 — integración Grupo A al sync): tests de los 3 nuevos targets
  // con keyMap (cr_metal/po_polimero/ds_par) y de la exclusión de tr_cal.
  // Mismo criterio de arriba: todo <select> tocado se restaura en un finally.
  {
    id: 'sync_grupoa_excluye_tr', group: 'Sincronización de material (Grupo A, v4.6)',
    name: 'Registro de sync NO incluye tr_cal (geometría de roseta, no es un material)',
    run: () => {
      const ids = MATERIAL_SYNC_TARGETS.map(t => t.id);
      if (ids.includes('tr_cal')) return { ok: false, msg: 'tr_cal está en el registro y no debería (no es un material, ver tensiones-residuales.js)' };
      const incluye = ['cr_metal', 'po_polimero', 'ds_par'].every(id => ids.includes(id));
      if (!incluye) return { ok: false, msg: 'Falta alguno de cr_metal/po_polimero/ds_par en el registro' };
      return { ok: true, msg: 'tr_cal afuera, cr_metal/po_polimero/ds_par adentro ✓' };
    }
  },
  {
    id: 'sync_grupoa_desde_traccion', group: 'Sincronización de material (Grupo A, v4.6)',
    name: 'syncMaterialToAllTests("e_preset") con "Acero" también llega a Corrosión (hierro) y Desgaste (aceroacero), no a Polímeros',
    run: () => {
      const ids = ['e_preset', 'cr_metal', 'po_polimero', 'ds_par'];
      const originales = {}; ids.forEach(id => { const el = document.getElementById(id); originales[id] = el ? el.value : undefined; });
      const errores = [];
      try {
        document.getElementById('e_preset').value = 'acero';
        syncMaterialToAllTests('e_preset');
        if (document.getElementById('cr_metal').value !== 'hierro') errores.push(`cr_metal quedó en "${document.getElementById('cr_metal').value}", esperaba "hierro"`);
        if (document.getElementById('ds_par').value !== 'aceroacero') errores.push(`ds_par quedó en "${document.getElementById('ds_par').value}", esperaba "aceroacero"`);
      } finally {
        ids.forEach(id => { const el = document.getElementById(id); if (el && originales[id] !== undefined) el.value = originales[id]; });
      }
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Acero → Corrosión (hierro) y Desgaste (aceroacero) via keyMap ✓' };
    }
  },
  {
    id: 'sync_grupoa_hacia_traccion', group: 'Sincronización de material (Grupo A, v4.6)',
    name: 'syncMaterialToAllTests("cr_metal") con "Titanio (Ti)" traduce hacia atrás y llega a Tracción como "titanio"',
    run: () => {
      const ids = ['e_preset', 'cr_metal'];
      const originales = {}; ids.forEach(id => { const el = document.getElementById(id); originales[id] = el ? el.value : undefined; });
      const errores = [];
      try {
        document.getElementById('cr_metal').value = 'titanio';
        syncMaterialToAllTests('cr_metal');
        if (document.getElementById('e_preset').value !== 'titanio') errores.push(`e_preset quedó en "${document.getElementById('e_preset').value}", esperaba "titanio"`);
      } finally {
        ids.forEach(id => { const el = document.getElementById(id); if (el && originales[id] !== undefined) el.value = originales[id]; });
      }
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'cr_metal="titanio" traduce correctamente de vuelta a la clave PRESETS "titanio" ✓' };
    }
  },
  {
    id: 'sync_grupoa_parcial', group: 'Sincronización de material (Grupo A, v4.6)',
    name: 'syncMaterialToAllTests — "Cobre" llega a Corrosión pero no a Desgaste ni Polímeros (sin equivalente real en esas tablas)',
    run: () => {
      const ids = ['e_preset', 'cr_metal', 'po_polimero', 'ds_par'];
      const originales = {}; ids.forEach(id => { const el = document.getElementById(id); originales[id] = el ? el.value : undefined; });
      const errores = [];
      try {
        document.getElementById('po_polimero').value = 'pmma'; // para confirmar que NO se pisa
        document.getElementById('ds_par').value = 'ptfe'; // para confirmar que NO se pisa
        document.getElementById('e_preset').value = 'cobre';
        syncMaterialToAllTests('e_preset');
        if (document.getElementById('cr_metal').value !== 'cobre') errores.push('cr_metal debería quedar en "cobre" (Corrosión sí tiene cobre)');
        if (document.getElementById('po_polimero').value !== 'pmma') errores.push('po_polimero se pisó, pero "cobre" no tiene equivalente en la tabla de polímeros');
        if (document.getElementById('ds_par').value !== 'ptfe') errores.push('ds_par se pisó, pero "cobre" no está en DS_KEY_MAP');
      } finally {
        ids.forEach(id => { const el = document.getElementById(id); if (el && originales[id] !== undefined) el.value = originales[id]; });
      }
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Sync parcial correcto: Corrosión recibe "cobre", Desgaste/Polímeros quedan intactos ✓' };
    }
  },
  {
    id: 'ficha_dureza_cruzada', group: 'Ficha técnica (Fase 4)',
    name: 'Ficha — extiende la lectura cruzada de la Fase 5c (Compresión) a Dureza (Brinell/Vickers/Rockwell)',
    run: () => {
      const brSel = document.getElementById('dz_brMat');
      if (!brSel) return { warn: true, msg: 'No se encontró #dz_brMat (¿pestaña Dureza no cargada en el DOM?)' };
      const brOriginal = brSel.value;
      const pOriginal = document.getElementById('dz_brP').value;
      const dOriginal = document.getElementById('dz_brD').value;
      let tieneMedidoCoincide = false, noTieneMedidoNoCoincide = false;
      // FIX: mismo motivo que ficha_compresion_cruzada -- reabrir el picker
      // antes de cada material porque renderFichaMaterial() reemplaza el
      // <select> anterior, todo en try/finally para restaurar el DOM.
      try {
        brSel.value = 'acero';
        dzApplyBrinellMaterial(); // carga P/D de referencia y calcula el HB "medido" en pantalla
        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'acero';
        renderFichaMaterial();
        const htmlCoincide = document.getElementById('fichaBody').innerHTML;
        tieneMedidoCoincide = /HB medido en tu ensayo \(Brinell\)/.test(htmlCoincide);

        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'aluminio'; // Brinell sigue en "acero" -> no debería cruzar
        renderFichaMaterial();
        const htmlNoCoincide = document.getElementById('fichaBody').innerHTML;
        noTieneMedidoNoCoincide = !/HB medido en tu ensayo/.test(htmlNoCoincide);
      } finally {
        brSel.value = brOriginal;
        document.getElementById('dz_brP').value = pOriginal;
        document.getElementById('dz_brD').value = dOriginal;
        closeFicha();
      }
      if (!tieneMedidoCoincide) return { ok: false, msg: 'No mostró el HB medido en Brinell con el material coincidente' };
      if (!noTieneMedidoNoCoincide) return { ok: false, msg: 'Mostró HB medido con un material que no coincide con Brinell' };
      return { ok: true, msg: 'Lectura cruzada con Dureza (Brinell) correcta, mismo patrón que Compresión (Fase 5c) ✓' };
    }
  },
  // FIX (v4.7 — integración Ficha ↔ Grupo A): tests de la nueva sección
  // "Ensayos complementarios (Grupo A)" en la Ficha técnica. Mismo criterio
  // de arriba (try/finally, restaurar el DOM) y mismo criterio de fondo que
  // fractSeccion: material con dato real → se muestra calculado; sin
  // equivalente real en la tabla del módulo → se lista en "Sin datos de".
  {
    id: 'ficha_grupoa_acero', group: 'Ficha técnica ↔ Grupo A (v4.7)',
    name: 'Ficha de "Acero" muestra Desgaste y Corrosión (vía keyMap), no Polímeros',
    run: () => {
      let html = '';
      try {
        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'acero';
        renderFichaMaterial();
        html = document.getElementById('fichaBody').innerHTML;
      } finally {
        closeFicha();
      }
      const errores = [];
      if (!/Acero dulce – Acero dulce/.test(html)) errores.push('No mostró el par de Desgaste correspondiente a "acero" (aceroacero)');
      if (!/Hierro \/ acero al carbono/.test(html)) errores.push('No mostró el metal de Corrosión correspondiente a "acero" (hierro)');
      if (!/Sin datos de:[^<]*Polímeros/.test(html)) errores.push('Debería listar "Polímeros" en "Sin datos de" para acero (no tiene equivalente en PO_KEY_MAP)');
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Ficha de Acero: Desgaste/Corrosión calculados, Polímeros correctamente ausente ✓' };
    }
  },
  {
    id: 'ficha_grupoa_nylon', group: 'Ficha técnica ↔ Grupo A (v4.7)',
    name: 'Ficha de "Nylon PA6" muestra solo Polímeros (nylon→nylon6), no Desgaste ni Corrosión',
    run: () => {
      let html = '';
      try {
        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'nylon';
        renderFichaMaterial();
        html = document.getElementById('fichaBody').innerHTML;
      } finally {
        closeFicha();
      }
      const errores = [];
      if (!/Nylon 6 \(poliamida, seco\)/.test(html)) errores.push('No mostró el polímero correspondiente a "nylon" (nylon6)');
      if (!/Sin datos de:[^<]*Desgaste/.test(html)) errores.push('Debería listar "Desgaste" en "Sin datos de" para nylon');
      if (!/Sin datos de:[^<]*Corrosión/.test(html)) errores.push('Debería listar "Corrosión" en "Sin datos de" para nylon');
      if (errores.length) return { ok: false, msg: errores.join('; ') };
      return { ok: true, msg: 'Ficha de Nylon: solo Polímeros calculado, Desgaste/Corrosión correctamente ausentes ✓' };
    }
  },
  {
    id: 'ficha_grupoa_sin_equivalente', group: 'Ficha técnica ↔ Grupo A (v4.7)',
    name: 'Ficha de un material sin equivalente en ninguna tabla del Grupo A (ej. Cerámica) muestra el aviso genérico',
    run: () => {
      let html = '';
      try {
        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'ceramica';
        renderFichaMaterial();
        html = document.getElementById('fichaBody').innerHTML;
      } finally {
        closeFicha();
      }
      if (!/no tiene un equivalente real en ninguna de las tablas de Desgaste, Corrosión o Polímeros/.test(html)) {
        return { ok: false, msg: 'No mostró el aviso genérico de "sin equivalente" para un material sin datos de Grupo A' };
      }
      return { ok: true, msg: 'Aviso genérico correcto cuando ningún módulo del Grupo A aplica ✓' };
    }
  },
  {
    id: 'ficha_grupoa_lectura_viva', group: 'Ficha técnica ↔ Grupo A (v4.7)',
    name: 'Ficha lee en vivo la fuerza/distancia cargadas en Desgaste cuando el par coincide',
    // FIX (post-v4.7, reporte de Agus): el valor de prueba de ds_distancia
    // tiene que ser múltiplo del step="10" del slider -- el navegador sanea
    // (redondea) el valor asignado por JS al step más cercano, así que un
    // valor como 4444 termina guardado como 4440 y el regex de abajo nunca
    // matcheaba. No era un bug de ficha.js, era este test.
    run: () => {
      const parSel = document.getElementById('ds_par');
      if (!parSel) return { warn: true, msg: 'No se encontró #ds_par (¿pestaña Ensayos complementarios no cargada en el DOM?)' };
      const parOriginal = parSel.value;
      const fOriginal = document.getElementById('ds_fuerza').value;
      const dOriginal = document.getElementById('ds_distancia').value;
      let html = '';
      try {
        parSel.value = 'aceroacero';
        document.getElementById('ds_fuerza').value = '333';
        document.getElementById('ds_distancia').value = '4440';
        openFichaPicker();
        document.getElementById('fichaMatSelect').value = 'acero';
        renderFichaMaterial();
        html = document.getElementById('fichaBody').innerHTML;
      } finally {
        parSel.value = parOriginal;
        document.getElementById('ds_fuerza').value = fOriginal;
        document.getElementById('ds_distancia').value = dOriginal;
        closeFicha();
      }
      if (!/F=333 N, d=4440 m/.test(html)) return { ok: false, msg: 'No tomó F/d en vivo de la pestaña Desgaste con el mismo par cargado ahí' };
      return { ok: true, msg: 'Lectura en vivo de Desgaste correcta (F=333 N, d=4440 m) ✓' };
    }
  },
  {
    // FIX (Fase 8 — corte de columnas al imprimir): este test es una
    // salvaguarda de REGRESIÓN sobre las reglas de styles.css (que las 3
    // reglas del fix sigan presentes), NO una verificación visual. Corre en
    // el navegador (lee document.styleSheets); aun así NO puede confirmar
    // que el texto ya no se corte en una impresión/PDF real -- eso depende
    // del motor de impresión del navegador/SO, algo que ningún test
    // automatizado (navegador o Node) puede reproducir. Verificación manual
    // pendiente: abrir una ficha con datos de fractura/fatiga (ej. aluminio,
    // que tiene K_IC/Paris/fluencia) y usar "Imprimir → Vista previa",
    // revisando que ningún valor con unidad (GPa, MPa·√m, kJ/m³, J/mol)
    // quede cortado contra el borde derecho de la hoja.
    id: 'ficha_print_css_fix', group: 'Ficha técnica (Fase 4)',
    name: 'Ficha — reglas @page/@media print del fix de corte de columnas presentes en styles.css',
    run: () => {
      let printRuleText = '';
      let pageRuleFound = false;
      let sheetsReadable = 0;
      let sheetsBlocked = 0;
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules || sheet.rules;
          sheetsReadable++;
        } catch (e) {
          sheetsBlocked++; // típico bajo file:// (Chrome trata la lectura de cssRules externas como cross-origin)
          continue;
        }
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.type === CSSRule.MEDIA_RULE && /print/.test(rule.conditionText || rule.media?.mediaText || '')) {
            printRuleText += rule.cssText;
          }
          if (rule.type === CSSRule.PAGE_RULE) pageRuleFound = true;
        }
      }
      // FIX: distinguir "no se pudo leer ninguna hoja" (típico al abrir el
      // .html directo con file://, donde Chrome bloquea la lectura de
      // cssRules de hojas externas por su modelo de seguridad para
      // recursos locales) de "se pudo leer, pero la regla no está" -- son
      // diagnósticos distintos y mezclarlos en un solo warning genérico
      // era confuso.
      if (sheetsReadable === 0 && sheetsBlocked > 0) {
        return { warn: true, msg: `No se pudo leer ninguna hoja de estilos (${sheetsBlocked} bloqueada(s)) — normal si abriste el .html con file:// en vez de un servidor local; no es una falla del fix. Confirmar manualmente con Vista previa de impresión.` };
      }
      if (!printRuleText) return { ok: false, msg: 'Las hojas se pudieron leer pero no hay ninguna regla @media print — el fix no está' };
      if (!pageRuleFound) return { ok: false, msg: 'Falta la regla @page (margen de impresión explícito)' };
      if (!/\.ficha\s*{[^}]*grid-template-columns\s*:\s*1fr/.test(printRuleText)) {
        return { ok: false, msg: '.ficha no pasa a 1 columna dentro de @media print' };
      }
      if (!/\.ficha-row\s*{[^}]*flex-wrap\s*:\s*wrap/.test(printRuleText)) {
        return { ok: false, msg: '.ficha-row no permite wrap dentro de @media print' };
      }
      return { ok: true, msg: '@page + .ficha a 1 columna + wrap presentes ✓ (pendiente: confirmar visualmente con Vista previa de impresión)' };
    }
  },
  // ---- PROGRESO (Fase 10) ----
  {
    id: 'prog_formato_vacio', group: 'Progreso (Fase 10)',
    name: 'progVacio() — estructura base correcta',
    run: () => {
      const v = progVacio();
      if (v.version !== 1) return { ok: false, msg: `version esperada 1, vino ${v.version}` };
      if (v.alumno !== '' || v.ultimaPestana !== null) return { ok: false, msg: 'alumno/ultimaPestana deberían arrancar vacíos' };
      if (typeof v.materiales !== 'object' || !Array.isArray(v.eventos)) return { ok: false, msg: 'materiales/eventos con tipo incorrecto' };
      return { ok: true, msg: 'estructura vacía correcta ✓' };
    }
  },
  {
    id: 'prog_guardar_cargar', group: 'Progreso (Fase 10)',
    name: 'progGuardar()/progCargar() — round-trip por localStorage',
    // FIX (Fase 10f): corre contra el localStorage real (mismo patrón que el
    // test 'localstorage' de Configuraciones), pero respalda y restaura el
    // progreso real del usuario en un finally para no perderlo por correr
    // los tests -- mismo cuidado que ya tuvieron con la ficha en v3.11.
    run: () => {
      const backup = localStorage.getItem(PROGRESO_KEY);
      const prevData = PROG_DATA;
      try {
        PROG_DATA = { version:1, alumno:'Test', ultimaPestana:'dureza', materiales:{e_preset:'acero'}, eventos:[{ts:'2026-01-01T00:00:00.000Z',tipo:'material',pestana:'Tracción',material:'acero'}] };
        progGuardar();
        const releido = progCargar();
        if (releido.alumno !== 'Test' || releido.ultimaPestana !== 'dureza') return { ok: false, msg: 'no se releyeron alumno/ultimaPestana' };
        if (releido.materiales.e_preset !== 'acero') return { ok: false, msg: 'no se releyó materiales.e_preset' };
        if (releido.eventos.length !== 1) return { ok: false, msg: `se esperaba 1 evento, vinieron ${releido.eventos.length}` };
        return { ok: true, msg: 'round-trip OK ✓' };
      } finally {
        PROG_DATA = prevData;
        if (backup === null) localStorage.removeItem(PROGRESO_KEY); else localStorage.setItem(PROGRESO_KEY, backup);
      }
    }
  },
  {
    id: 'prog_tope_eventos', group: 'Progreso (Fase 10)',
    name: 'progRegistrar() — tope de 200 eventos, se queda con los últimos',
    run: () => {
      const backup = localStorage.getItem(PROGRESO_KEY);
      const prevData = PROG_DATA;
      try {
        PROG_DATA = progVacio();
        for (let i=0; i<PROG_MAX_EVENTOS+10; i++) progRegistrar('material', { pestana:'Test', material:'m'+i });
        if (PROG_DATA.eventos.length !== PROG_MAX_EVENTOS) return { ok: false, msg: `se esperaban ${PROG_MAX_EVENTOS} eventos, quedaron ${PROG_DATA.eventos.length}` };
        const ultimo = PROG_DATA.eventos[PROG_DATA.eventos.length-1];
        if (ultimo.material !== `m${PROG_MAX_EVENTOS+9}`) return { ok: false, msg: 'no se conservaron los eventos más recientes' };
        return { ok: true, msg: `tope en ${PROG_MAX_EVENTOS} ✓, se descartan los más viejos` };
      } finally {
        PROG_DATA = prevData;
        if (backup === null) localStorage.removeItem(PROGRESO_KEY); else localStorage.setItem(PROGRESO_KEY, backup);
      }
    }
  },
  {
    id: 'prog_sin_localstorage', group: 'Progreso (Fase 10)',
    name: 'progGuardar() — no rompe si localStorage falla (ej. modo incógnito con storage deshabilitado)',
    run: () => {
      const prevData = PROG_DATA;
      const originalSetItem = localStorage.setItem;
      try {
        localStorage.setItem = () => { throw new DOMException('QuotaExceededError simulado'); };
        PROG_DATA = progVacio();
        progGuardar(); // no debería tirar
        return { ok: true, msg: 'progGuardar() no propaga la excepción ✓' };
      } catch(e) {
        return { ok: false, msg: `progGuardar() dejó pasar la excepción: ${e.message}` };
      } finally {
        localStorage.setItem = originalSetItem;
        PROG_DATA = prevData;
      }
    }
  },
  // ---- DESGASTE (v4.1) ----
  {
    id: 'ds_calc_basico', group: 'Desgaste (Archard)',
    name: 'dsCalcVolumen — caso de referencia (Wikipedia "Wear coefficient")',
    run: () => {
      // Acero dulce/acero dulce, HB=120 (→1.176e9 Pa), F=9.8N, d=1m, k=7e-3
      // Resultado esperado del ejemplo de referencia: ≈5.83e-11 m³
      const H_pa = 120 * 9.80665e6;
      const V = dsCalcVolumen(7e-3, 9.8, 1, H_pa);
      const esperado = 5.83e-11;
      const err = Math.abs(V - esperado) / esperado;
      if (err > 0.02) return { ok: false, msg: `V=${V.toExponential(3)} m³, esperado≈${esperado.toExponential(2)} m³ (err ${(err*100).toFixed(1)}%)` };
      return { ok: true, msg: `V=${V.toExponential(3)} m³ ✓` };
    }
  },
  {
    id: 'ds_calc_proporcional', group: 'Desgaste (Archard)',
    name: 'dsCalcVolumen — proporcionalidad directa con F y d, inversa con H',
    run: () => {
      const base = dsCalcVolumen(1e-3, 100, 500, 1e9);
      const dobleF = dsCalcVolumen(1e-3, 200, 500, 1e9);
      const dobleD = dsCalcVolumen(1e-3, 100, 1000, 1e9);
      const dobleH = dsCalcVolumen(1e-3, 100, 500, 2e9);
      if (Math.abs(dobleF - 2*base) > 1e-15) return { ok: false, msg: 'No es proporcional a F' };
      if (Math.abs(dobleD - 2*base) > 1e-15) return { ok: false, msg: 'No es proporcional a d' };
      if (Math.abs(dobleH - base/2) > 1e-15) return { ok: false, msg: 'No es inversamente proporcional a H' };
      return { ok: true, msg: 'V ∝ F·d/H ✓' };
    }
  },
  {
    id: 'ds_calc_dureza_invalida', group: 'Desgaste (Archard)',
    name: 'dsCalcVolumen — dureza cero o negativa devuelve NaN en vez de Infinity/valor engañoso',
    run: () => {
      const v0 = dsCalcVolumen(1e-3, 100, 500, 0);
      const vNeg = dsCalcVolumen(1e-3, 100, 500, -10);
      if (!Number.isNaN(v0)) return { ok: false, msg: `H=0 → ${v0} (esperado NaN)` };
      if (!Number.isNaN(vNeg)) return { ok: false, msg: `H<0 → ${vNeg} (esperado NaN)` };
      return { ok: true, msg: 'H≤0 → NaN en ambos casos ✓' };
    }
  },
  {
    id: 'ds_tabla_k_completa', group: 'Desgaste (Archard)',
    name: 'DS_K_TABLE — 8 pares de materiales, todos con k>0',
    run: () => {
      const keys = Object.keys(DS_K_TABLE);
      if (keys.length !== 8) return { ok: false, msg: `${keys.length} pares (esperados 8)` };
      const malos = keys.filter(k => !(DS_K_TABLE[k].k > 0) || !(DS_K_TABLE[k].hb > 0));
      if (malos.length) return { ok: false, msg: `Pares con k o hb inválido: ${malos.join(', ')}` };
      return { ok: true, msg: '8 pares, todos con k>0 y hb>0 ✓' };
    }
  },
  // ---- TENSIONES RESIDUALES / HOLE-DRILLING (v4.2) ----
  {
    id: 'tr_calc_referencia', group: 'Tensiones residuales (hole-drilling)',
    name: 'trCalcTensiones — recupera el caso de calibración uniaxial de Vishay TN-503 (σc≈69 MPa)',
    run: () => {
      // ε1=-90µε, ε2=-25µε, ε3=39µε con A,B de la roseta Tipo A pasante (TN-503).
      // Debería recuperar σ_max≈σc=68.9MPa (tolerancia amplia por redondeo de A,B
      // a 2 cifras en la fuente), σ_min≈0 y β≈0° (uniaxial alineado con galga 1).
      const cal = TR_CAL_TABLE.tipoA_pasante;
      const r = trCalcTensiones(-90e-6, -25e-6, 39e-6, cal.A, cal.B);
      const maxMPa = r.sigmaMax / 1e6, minMPa = r.sigmaMin / 1e6;
      if (Math.abs(maxMPa - 68.9) > 5) return { ok: false, msg: `σ_max=${maxMPa.toFixed(1)} MPa, esperado≈68.9±5 MPa` };
      if (Math.abs(minMPa) > 5) return { ok: false, msg: `σ_min=${minMPa.toFixed(1)} MPa, esperado≈0±5 MPa` };
      if (Math.abs(r.betaDeg) > 5) return { ok: false, msg: `β=${r.betaDeg.toFixed(1)}°, esperado≈0±5°` };
      return { ok: true, msg: `σ_max=${maxMPa.toFixed(1)} MPa, σ_min=${minMPa.toFixed(1)} MPa, β=${r.betaDeg.toFixed(1)}° ✓` };
    }
  },
  {
    id: 'tr_calc_equibiaxial', group: 'Tensiones residuales (hole-drilling)',
    name: 'trCalcTensiones — tensión equibiaxial (ε1=ε2=ε3) da σ_max=σ_min sin componente de corte',
    run: () => {
      const cal = TR_CAL_TABLE.tipoA_pasante;
      const r = trCalcTensiones(-50e-6, -50e-6, -50e-6, cal.A, cal.B);
      const diff = Math.abs(r.sigmaMax - r.sigmaMin);
      if (diff > 1) return { ok: false, msg: `σ_max-σ_min=${diff.toExponential(2)} Pa (esperado ≈0, caso equibiaxial)` };
      return { ok: true, msg: `σ_max≈σ_min=${(r.sigmaMax/1e6).toFixed(1)} MPa ✓` };
    }
  },
  {
    id: 'tr_calc_sin_deformacion', group: 'Tensiones residuales (hole-drilling)',
    name: 'trCalcTensiones — sin deformación relevada, tensión residual nula',
    run: () => {
      const cal = TR_CAL_TABLE.tipoA_pasante;
      const r = trCalcTensiones(0, 0, 0, cal.A, cal.B);
      if (Math.abs(r.sigmaMax) > 1e-6 || Math.abs(r.sigmaMin) > 1e-6) {
        return { ok: false, msg: `σ_max=${r.sigmaMax}, σ_min=${r.sigmaMin} (esperado 0,0)` };
      }
      return { ok: true, msg: 'ε=0 → σ_max=σ_min=0 ✓' };
    }
  },
  {
    id: 'tr_tabla_cal', group: 'Tensiones residuales (hole-drilling)',
    name: 'TR_CAL_TABLE — al menos 1 geometría con A y B negativos (según Vishay TN-503)',
    run: () => {
      const keys = Object.keys(TR_CAL_TABLE);
      if (keys.length < 1) return { ok: false, msg: 'Sin geometrías cargadas' };
      const malos = keys.filter(k => !(TR_CAL_TABLE[k].A < 0) || !(TR_CAL_TABLE[k].B < 0));
      if (malos.length) return { ok: false, msg: `Geometrías con A o B no negativos: ${malos.join(', ')}` };
      return { ok: true, msg: `${keys.length} geometría(s), A y B negativos ✓` };
    }
  },
  // ---- CORROSIÓN / FARADAY (v4.3) ----
  {
    id: 'cr_calc_proporcional', group: 'Corrosión (Faraday)',
    name: 'crCalcVelocidad — proporcional a i_corr y EW, inversa a la densidad',
    run: () => {
      const base = crCalcVelocidad(5, 30, 8);
      const dobleI = crCalcVelocidad(10, 30, 8);
      const dobleEW = crCalcVelocidad(5, 60, 8);
      const dobleRho = crCalcVelocidad(5, 30, 16);
      if (Math.abs(dobleI - 2 * base) > 1e-12) return { ok: false, msg: 'No es proporcional a i_corr' };
      if (Math.abs(dobleEW - 2 * base) > 1e-12) return { ok: false, msg: 'No es proporcional a EW' };
      if (Math.abs(dobleRho - base / 2) > 1e-12) return { ok: false, msg: 'No es inversamente proporcional a ρ' };
      return { ok: true, msg: 'CR ∝ i_corr·EW/ρ ✓' };
    }
  },
  {
    id: 'cr_calc_orden_magnitud', group: 'Corrosión (Faraday)',
    name: 'crCalcVelocidad — acero al carbono, i_corr=5µA/cm², da un orden de magnitud realista (µm a décimas de mm/año)',
    run: () => {
      const fe = CR_METAL_TABLE.hierro;
      const CR = crCalcVelocidad(5, fe.ew, fe.rho);
      // Corrosión atmosférica moderada de acero: decenas de µm/año, no nm ni cm.
      if (CR < 0.005 || CR > 0.5) return { ok: false, msg: `CR=${CR.toFixed(4)} mm/año, fuera del rango físico esperado (0.005–0.5)` };
      return { ok: true, msg: `CR=${CR.toFixed(4)} mm/año (${(CR*1000).toFixed(1)} µm/año) ✓` };
    }
  },
  {
    id: 'cr_calc_densidad_invalida', group: 'Corrosión (Faraday)',
    name: 'crCalcVelocidad — densidad cero o negativa devuelve NaN',
    run: () => {
      const v0 = crCalcVelocidad(5, 30, 0);
      const vNeg = crCalcVelocidad(5, 30, -1);
      if (!Number.isNaN(v0)) return { ok: false, msg: `ρ=0 → ${v0} (esperado NaN)` };
      if (!Number.isNaN(vNeg)) return { ok: false, msg: `ρ<0 → ${vNeg} (esperado NaN)` };
      return { ok: true, msg: 'ρ≤0 → NaN en ambos casos ✓' };
    }
  },
  {
    id: 'cr_tabla_metales', group: 'Corrosión (Faraday)',
    name: 'CR_METAL_TABLE — 7 metales, todos con EW y ρ positivos',
    run: () => {
      const keys = Object.keys(CR_METAL_TABLE);
      if (keys.length !== 7) return { ok: false, msg: `${keys.length} metales (esperados 7)` };
      const malos = keys.filter(k => !(CR_METAL_TABLE[k].ew > 0) || !(CR_METAL_TABLE[k].rho > 0));
      if (malos.length) return { ok: false, msg: `Metales con EW o ρ inválido: ${malos.join(', ')}` };
      return { ok: true, msg: '7 metales, todos con EW>0 y ρ>0 ✓' };
    }
  },
  // ---- POLÍMEROS / CURVA DMA (v4.4, cierra el Grupo A) ----
  {
    id: 'po_calc_punto_medio', group: 'Polímeros (curva DMA)',
    name: "poCalcModulo — en T=Tg, E' es exactamente el punto medio entre vítreo y gomoso",
    run: () => {
      const Eg = 3e9, Er = 5e6, Tg = 105, w = 10;
      const Ep = poCalcModulo(Tg, Tg, Eg, Er, w);
      const esperado = (Eg + Er) / 2;
      if (Math.abs(Ep - esperado) > 1) return { ok: false, msg: `E'(Tg)=${Ep.toExponential(3)}, esperado ${esperado.toExponential(3)}` };
      return { ok: true, msg: `E'(Tg)=${(Ep/1e6).toFixed(1)} MPa = punto medio ✓` };
    }
  },
  {
    id: 'po_calc_asintotas', group: 'Polímeros (curva DMA)',
    name: "poCalcModulo — lejos de Tg, E' tiende al módulo vítreo o gomoso según corresponda",
    run: () => {
      const Eg = 3e9, Er = 5e6, Tg = 105, w = 10;
      const lejosAbajo = poCalcModulo(Tg - 100, Tg, Eg, Er, w);
      const lejosArriba = poCalcModulo(Tg + 100, Tg, Eg, Er, w);
      if (Math.abs(lejosAbajo - Eg) / Eg > 0.01) return { ok: false, msg: `T≪Tg: E'=${lejosAbajo.toExponential(3)}, esperado≈Eg=${Eg.toExponential(2)}` };
      if (Math.abs(lejosArriba - Er) / Er > 0.05) return { ok: false, msg: `T≫Tg: E'=${lejosArriba.toExponential(3)}, esperado≈Er=${Er.toExponential(2)}` };
      return { ok: true, msg: 'T≪Tg → E_vítreo, T≫Tg → E_gomoso ✓' };
    }
  },
  {
    id: 'po_calc_ancho_invalido', group: 'Polímeros (curva DMA)',
    name: "poCalcModulo — ancho de transición cero o negativo devuelve NaN",
    run: () => {
      const v0 = poCalcModulo(105, 105, 3e9, 5e6, 0);
      const vNeg = poCalcModulo(105, 105, 3e9, 5e6, -5);
      if (!Number.isNaN(v0)) return { ok: false, msg: `w=0 → ${v0} (esperado NaN)` };
      if (!Number.isNaN(vNeg)) return { ok: false, msg: `w<0 → ${vNeg} (esperado NaN)` };
      return { ok: true, msg: 'w≤0 → NaN en ambos casos ✓' };
    }
  },
  {
    id: 'po_tabla_polimeros', group: 'Polímeros (curva DMA)',
    name: 'PO_POLIMERO_TABLE — 7 polímeros, todos con E_vítreo > E_gomoso > 0',
    run: () => {
      const keys = Object.keys(PO_POLIMERO_TABLE);
      if (keys.length !== 7) return { ok: false, msg: `${keys.length} polímeros (esperados 7)` };
      const malos = keys.filter(k => !(PO_POLIMERO_TABLE[k].eg > PO_POLIMERO_TABLE[k].er) || !(PO_POLIMERO_TABLE[k].er > 0));
      if (malos.length) return { ok: false, msg: `Polímeros con eg≤er o er≤0: ${malos.join(', ')}` };
      return { ok: true, msg: '7 polímeros, todos con E_vítreo > E_gomoso > 0 ✓' };
    }
  },
  // FIX (v4.7 — botones de ayuda + minitexto de fórmula en el Grupo A): los 4
  // módulos (Desgaste, Tensiones residuales, Corrosión, Polímeros) se armaron
  // en v4.1-v4.4 sin botón de ayuda en sus inputs -- quedó pendiente hasta
  // ahora. El primer test es una comprobación GENERAL (no específica del
  // Grupo A): cualquier botón .help-btn en el DOM, sea de la fase que sea,
  // tiene que apuntar a una clave real de HELP_DATA -- barata de mantener y
  // atrapa errores de tipeo en cualquier módulo futuro, no solo este.
  {
    id: 'help_data_cobertura', group: 'Ayuda contextual (v4.7)',
    name: 'Todo botón de ayuda (?) del DOM tiene su entrada correspondiente en HELP_DATA',
    run: () => {
      const botones = document.querySelectorAll('.help-btn');
      if (!botones.length) return { warn: true, msg: 'No se encontraron botones .help-btn en el DOM' };
      const faltantes = new Set();
      botones.forEach(b => {
        const m = (b.getAttribute('onclick') || '').match(/showHelp\('([^']+)'/);
        if (m && !HELP_DATA[m[1]]) faltantes.add(m[1]);
      });
      if (faltantes.size) return { ok: false, msg: `Faltan en HELP_DATA: ${Array.from(faltantes).join(', ')}` };
      return { ok: true, msg: `${botones.length} botones de ayuda, todos con entrada en HELP_DATA ✓` };
    }
  },
  {
    id: 'help_grupoa_presente', group: 'Ayuda contextual (v4.7)',
    name: 'Los 14 inputs del sidebar del Grupo A tienen botón de ayuda',
    run: () => {
      const ids = ['ds_par','ds_fuerza','ds_distancia','ds_dureza','tr_cal','tr_e1','tr_e2','tr_e3','cr_metal','cr_icorr','cr_tiempo','po_polimero','po_temp','po_ancho'];
      const faltantes = ids.filter(id => {
        const el = document.getElementById(id);
        if (!el) return true; // sin selector en el DOM = falla igual
        const label = el.closest('.field')?.querySelector('label');
        return !label || !label.querySelector('.help-btn');
      });
      if (faltantes.length) return { ok: false, msg: `Sin botón de ayuda: ${faltantes.join(', ')}` };
      return { ok: true, msg: '14/14 inputs del Grupo A tienen botón de ayuda ✓' };
    }
  },
  {
    id: 'formula_mini_grupoa', group: 'Ayuda contextual (v4.7)',
    name: 'Los 4 paneles del Grupo A muestran el minitexto de fórmula (.formula-mini)',
    run: () => {
      const panelesEsperados = {
        cm_panel_desgaste: 'V = k',
        cm_panel_tensiones: 'σ_max,min',
        cm_panel_corrosion: 'CR = K₁',
        cm_panel_polimeros: "E'(T)",
      };
      const faltantes = [];
      Object.entries(panelesEsperados).forEach(([panelId, esperado]) => {
        const panel = document.getElementById(panelId);
        const f = panel && panel.querySelector('.formula-mini');
        if (!f || !f.textContent.includes(esperado)) faltantes.push(panelId);
      });
      if (faltantes.length) return { ok: false, msg: `Sin minitexto de fórmula esperado en: ${faltantes.join(', ')}` };
      return { ok: true, msg: 'Minitexto de fórmula presente en los 4 paneles del Grupo A ✓' };
    }
  },
];

function runAllTests() {
  const panel = document.getElementById('testPanel');
  if (panel) panel.style.display = 'block';
  const body = document.getElementById('testPanelBody');
  if (body) body.classList.add('open');
  const icon = document.getElementById('tpToggleIcon');
  if (icon) icon.textContent = '▲';

  const grid   = document.getElementById('testGrid');
  const log    = document.getElementById('testLog');
  const summary= document.getElementById('testSummary');
  const badge  = document.getElementById('tpBadge');
  
  let passed = 0, failed = 0, warned = 0;
  const logLines = [];
  grid.innerHTML = '';
  log.innerHTML  = '';
  summary.innerHTML = '';

  for (const test of testSuite) {
    let result;
    try {
      result = test.run();
    } catch(e) {
      result = { ok: false, msg: `Error: ${e.message}` };
    }

    const status = result.ok ? 'pass' : (result.warn ? 'warn' : 'fail');
    if (status === 'pass') passed++;
    else if (status === 'fail') failed++;
    else warned++;

    // Card
    const card = document.createElement('div');
    card.className = 'test-card';
    card.innerHTML = `<div class="tc-name">${test.group}</div>
      <div class="tc-val">${test.name}</div>
      <div class="tc-status tc-${status}">${status === 'pass' ? '✓ OK' : status === 'warn' ? '⚠ WARN' : '✗ FAIL'}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px">${result.msg}</div>`;
    grid.appendChild(card);

    // Log
    const cls = status === 'pass' ? 'tl-pass' : status === 'warn' ? 'tl-warn' : 'tl-fail';
    const icon_char = status === 'pass' ? '✓' : status === 'warn' ? '⚠' : '✗';
    logLines.push(`<span class="${cls}">[${icon_char}] ${test.name}: ${result.msg}</span>`);
  }

  log.innerHTML = logLines.join('\n');

  const total = passed + failed + warned;
  const pct = Math.round(passed / total * 100);
  
  summary.innerHTML = `
    <span class="ts-item" style="color:#1a8c5e">✓ ${passed} OK</span>
    ${warned ? `<span class="ts-item" style="color:#c8780a">⚠ ${warned} WARN</span>` : ''}
    ${failed ? `<span class="ts-item" style="color:#c43535">✗ ${failed} FAIL</span>` : ''}
    <span class="ts-item" style="color:var(--muted)">— ${total} total, ${pct}% OK</span>`;

  badge.textContent = `${passed}/${total}`;
  badge.style.background = failed > 0 ? 'rgba(196,53,53,.12)' : warned > 0 ? 'rgba(200,120,10,.12)' : 'rgba(26,140,94,.12)';
  badge.style.color = failed > 0 ? '#c43535' : warned > 0 ? '#c8780a' : '#1a8c5e';

  log.scrollTop = 0;
}

/* FIX #9: antes la suite de tests corría automáticamente 800ms después de
   cargar la página, para CUALQUIERA que abriera el simulador -- aunque el
   panel estuviera oculto, la suite igual se ejecutaba entera en segundo
   plano sin ningún motivo (gasta recursos del alumno para nada, ya que
   nadie ve el resultado). Ahora los tests solo corren cuando se abre el
   panel (ver toggleTestPanelFromHeader más abajo), que a su vez solo es
   alcanzable en modo desarrollador (5 clicks en el número de versión). */


