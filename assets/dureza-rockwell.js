// dureza-rockwell.js — escala Rockwell (normal y superficial)

// FIX (Fase 6a): antes cada entrada tenía su propio {scale, hr, slider}
// desconectado de PRESETS -- ahora scale/hr salen de PRESETS[x].dureza.hr
// (misma fuente que Brinell/Vickers usan para hb/hv); slider es específico
// de ESTE control de UI (posición del dial), así que se queda acá.
// ROCKWELL_REF se arma combinando ambas, mismo shape {scale,hr,slider} que
// tenía antes.
const ROCKWELL_SLIDER = {
  acero:61, aceroinox:74, fragil:16, aluminio:48, titanio:31,
  niquel:29, molibdeno:68, magnesio:36, zinc:16, tungsteno:18, laton:42,
  // FIX (v4.10): valores de slider calculados (no adivinados) resolviendo la
  // misma fórmula que usa dzUpdateRk() para el HR objetivo de cada material
  // (PRESETS[x].dureza.hr) en su escala real -- mismo método con el que se
  // verificaron los 11 valores de arriba antes de agregar estos.
  aisi1045:85, acero4140:26, aluminio7075:83, aluminio2024:68,
  broncefosforico:85, hierronodular:78, inconel718:37, titaniocp2:68,
};
const ROCKWELL_REF = {};
for (const [key, slider] of Object.entries(ROCKWELL_SLIDER)) {
  const hr = PRESETS[key]?.dureza?.hr;
  if (hr) ROCKWELL_REF[key] = { scale: hr.scale, hr: hr.value, slider };
}
function dzApplyRockwellMaterial(){
  const key = document.getElementById('dz_rkMat').value;
  const ref = ROCKWELL_REF[key];
  if(!ref){ dzUpdateRk(); return; }
  document.getElementById('dz_rkType').value = 'normal';
  dzRenderRkTable();
  const body = document.getElementById('dz_rkBody');
  const row = Array.from(body.children).find(tr => tr.querySelector('td.mono').textContent === ref.scale);
  if(row) row.dispatchEvent(new Event('click'));
  document.getElementById('dz_rkSlider').value = ref.slider;
  dzUpdateRk();
}
function dzRenderRkTable(){
  const isNormal = document.getElementById('dz_rkType').value === 'normal';
  const data = isNormal ? DZ_RK_NORMAL : DZ_RK_SUPERFICIAL;
  const cargaMenor = isNormal ? 10 : 3;
  document.getElementById('dz_rkHead').innerHTML = `<tr><th>Escala</th><th>Penetrador</th><th>Carga menor (kg)</th><th>Carga mayor (kg)</th></tr>`;
  const body = document.getElementById('dz_rkBody');
  body.innerHTML='';
  data.forEach(([sym,pen,cm])=>{
    const tr = document.createElement('tr');
    tr.className = 'dz-row-sel';
    tr.innerHTML = `<td class="mono">${sym}</td><td>${pen}</td><td class="mono">${cargaMenor}</td><td class="mono">${cm}</td>`;
    tr.addEventListener('click', ()=>{
      Array.from(body.children).forEach(t=>t.classList.remove('on'));
      tr.classList.add('on');
      dzRkSelected = {sym, pen, cm, cmen:cargaMenor};
      document.getElementById('dz_rkSelectedInfo').innerHTML =
        `Escala <strong style="color:var(--accent)">${sym}</strong> — penetrador: ${pen}, carga menor ${cargaMenor} kg, carga mayor ${cm} kg.`;
      dzUpdateRk();
    });
    body.appendChild(tr);
  });
  dzRkSelected = null;
  document.getElementById('dz_rkSelectedInfo').textContent = 'Elegí una fila de la tabla ↑';
  dzUpdateRk();
}
function dzUpdateRk(){
  const slider = parseInt(document.getElementById('dz_rkSlider').value);
  const numEl = document.getElementById('dz_rkNumber');
  const cmpEl = document.getElementById('dz_rkMatCompare');
  const matKey = document.getElementById('dz_rkMat').value;
  const ref = ROCKWELL_REF[matKey];
  // FIX #9: antes, hrValue=Math.round(slider*0.95) era el mismo número sin
  // importar la fila de escala elegida (A, C, 15N, etc.) -- solo cambiaba el
  // sufijo de texto. Ahora se incorpora la carga mayor (cm) de la fila
  // seleccionada: a mayor carga, mayor penetración simulada, y por lo tanto
  // menor número Rockwell para la misma posición de "dureza" del slider --
  // igual que las escalas superficiales (cargas chicas) suelen leer más alto
  // que las normales (cargas grandes) para un material similar. Sigue siendo
  // una aproximación ilustrativa (así lo aclara el texto de ayuda), pero ahora
  // cambiar de escala sí cambia el resultado.
  const refLoad = 150; // carga mayor normal más alta (referencia)
  let loadFactor = 1, depthFrac;
  if(!dzRkSelected){
    numEl.textContent='—';
    depthFrac = (100 - slider) / 100;
    if(cmpEl) cmpEl.style.display='none';
  } else {
    loadFactor = Math.sqrt(dzRkSelected.cm / refLoad);
    const depthRaw = (100 - slider) * loadFactor; // 0 (duro/carga chica) .. ~100 (blando/carga grande)
    depthFrac = Math.min(1, Math.max(0, depthRaw / 100));
    const hrValue = Math.max(0, Math.min(100, Math.round(100 - depthRaw*0.95)));
    numEl.textContent = `${hrValue} HR${dzRkSelected.sym}`;
    if(!ref){
      if(cmpEl) cmpEl.style.display='none';
    } else if(dzRkSelected.sym===ref.scale){
      const diff = hrValue - ref.hr;
      const cerca = Math.abs(diff) <= 5;
      cmpEl.style.display='block';
      cmpEl.innerHTML = `<strong>Referencia bibliográfica para este material: ≈${ref.hr} HR${ref.scale}</strong> (valor típico de tabla, modelo ilustrativo). `
        + (cerca ? `Tu ensayo dio un valor cercano.`
                 : `Tu ensayo dio un valor ${diff>0?'más alto':'más bajo'} (diferencia de ${Math.abs(diff)} puntos) -- normal si moviste el control respecto del ensayo guiado.`);
    } else {
      cmpEl.style.display='block';
      cmpEl.innerHTML = `La referencia de este material es en escala HR${ref.scale} -- elegí esa fila en la tabla para comparar.`;
    }
  }
  // FIX v4.9 (reemplaza el FIX #9/#25 anterior): el dibujo viejo tenía el
  // penetrador dibujado al revés -- un triángulo con la punta ARRIBA (fuera
  // del material) que se iba ENSANCHANDO a medida que "bajaba" adentro del
  // material, como un carámbano invertido. Un penetrador cónico real es al
  // revés: la punta (angosta) es la que entra al material, y la parte ancha
  // (el cuerpo del penetrador) queda afuera, por encima de la superficie.
  // Ahora se dibujan DOS formas separadas, con esa orientación correcta:
  // 1) la herramienta (fija, solo su contorno, apoyada sobre la superficie),
  // 2) la huella que deja adentro del material (un triángulo angosto que
  //    SÍ crece en profundidad Y en ancho de superficie a medida que penetra
  //    más -- igual que la huella real de un cono se ve más ancha cuanto más
  //    se hunde).
  const rectX=20, rectY=34, rectW=220, rectH=82, rectBottom=rectY+rectH;
  const cx=130;
  const tipY = rectY + depthFrac*(rectH-8); // punta de la huella, nunca toca el borde inferior
  const rimR = 7 + depthFrac*24; // ancho de la huella en la superficie: crece con la profundidad
  const svg = document.getElementById('dz_rkDepthSvg');
  svg.innerHTML = `
    <rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" fill="var(--surface)" stroke="var(--border)"/>
    <text x="${rectX+8}" y="${rectY+15}" text-anchor="start" fill="var(--muted)" font-size="9" letter-spacing="1">MATERIAL</text>
    <!-- huella dentro del material: punta abajo, se ensancha hacia la superficie -->
    <polygon points="${cx},${tipY} ${cx-rimR},${rectY} ${cx+rimR},${rectY}" fill="var(--neck)" opacity="0.55" stroke="var(--neck)" stroke-width="1"/>
    <!-- guía de profundidad -->
    <line x1="${cx}" y1="${rectY}" x2="${cx}" y2="${tipY}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>
    <!-- marca visible en la superficie (vista desde arriba, aplastada) -->
    <ellipse cx="${cx}" cy="${rectY}" rx="${rimR}" ry="3.5" fill="var(--frac)" opacity="0.85"/>
    <!-- herramienta: cuerpo fijo por encima de la superficie, apoyando la punta justo en el borde -->
    <polygon points="${cx},${rectY} ${cx-15},${rectY-22} ${cx+15},${rectY-22}" fill="none" stroke="var(--text)" stroke-width="1.5" opacity="0.75"/>
    <rect x="${cx-6}" y="${rectY-30}" width="12" height="9" fill="var(--surface3)" stroke="var(--text)" stroke-width="1" opacity="0.75"/>
    <text x="${rectX+rectW-6}" y="${rectY+15}" text-anchor="end" fill="var(--muted)" font-size="8">profundidad</text>
    <text x="130" y="150" text-anchor="middle" fill="var(--muted)" font-size="10">${slider<40?'material blando: huella profunda':(slider>70?'material duro: huella superficial':'material intermedio')}</text>
  `;
}

/* ---------------- 3. BRINELL ---------------- */
// Integración con los materiales metálicos de Tracción: valores de dureza
// Brinell de referencia bibliográfica (condición típica, ej. recocido/laminado
// según el material) y una combinación real de carga estándar P (kg, D=10mm)
// + diámetro de huella d que reproduce ese HB. Son valores de referencia
// aproximados de tablas de materiales (ASM, Callister y similares), no una
// medición certificada -- varían con el tratamiento térmico/conformado real
// de cada pieza. Hormigón, madera, cerámica, fibra de carbono, nylon y plomo
// quedan afuera: en la práctica no se miden así (o, en el caso del plomo,
// son demasiado blandos incluso para la carga más chica disponible acá).
