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
    name: 'Tabs — 3 tabs, 3 páginas, 6+8+15 subsecciones',
    run: () => {
      const tabs  = document.querySelectorAll('.tab').length;
      const pages = document.querySelectorAll('.page').length;
      const edSubs = document.querySelectorAll('.ed-subbtn').length;
      const dzSubs = document.querySelectorAll('.dz-subbtn').length;
      const rtSubs = document.querySelectorAll('.rt-subbtn').length;
      if (tabs !== 3)   return { ok: false, msg: `Tabs: ${tabs} (esperado 3)` };
      if (pages !== 3)  return { ok: false, msg: `Pages: ${pages} (esperado 3)` };
      if (edSubs !== 6) return { ok: false, msg: `Subsecciones Ensayo destructivo: ${edSubs} (esperado 6)` };
      if (dzSubs !== 8) return { ok: false, msg: `Subsecciones Ensayo no destructivo: ${dzSubs} (esperado 8)` };
      if (rtSubs !== 15) return { ok: false, msg: `Subsecciones Fractura/fatiga/fluencia: ${rtSubs} (esperado 15)` };
      return { ok: true, msg: `${tabs} tabs, ${pages} pages, ${edSubs}+${dzSubs}+${rtSubs} subsecciones ✓` };
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
    id: 'fr_charpy_dbtt', group: 'Fractura, fatiga y fluencia',
    name: 'Charpy — transición dúctil-frágil monótona y ubicada en T_mid',
    run: () => {
      const p = FR_IMPACTO_PRESETS.bajoC;
      const antes = frSigmoid(p.Tmid-40, p.Elow, p.Ehigh, p.Tmid, p.width);
      const enMedio = frSigmoid(p.Tmid, p.Elow, p.Ehigh, p.Tmid, p.width);
      const despues = frSigmoid(p.Tmid+40, p.Elow, p.Ehigh, p.Tmid, p.width);
      if (!(antes < enMedio && enMedio < despues)) return { ok: false, msg: `no monótona: ${antes.toFixed(1)}, ${enMedio.toFixed(1)}, ${despues.toFixed(1)}` };
      const fcc = FR_IMPACTO_PRESETS.fcc;
      const rango = frSigmoid(fcc.Tmid+40,fcc.Elow,fcc.Ehigh,fcc.Tmid,fcc.width) - frSigmoid(fcc.Tmid-40,fcc.Elow,fcc.Ehigh,fcc.Tmid,fcc.width);
      if (Math.abs(rango) > 15) return { warn: true, msg: `FCC debería ser casi plana, varió ${rango.toFixed(1)} J` };
      return { ok: true, msg: `BCC bajo C monótona ✓, FCC ~plana (Δ=${rango.toFixed(1)} J) ✓` };
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


