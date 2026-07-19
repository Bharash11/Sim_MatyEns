// dureza-rockwell.js — escala Rockwell (normal y superficial)

const ROCKWELL_REF = {
  acero:      {scale:'B', hr:70, slider:61},
  aceroinox:  {scale:'B', hr:80, slider:74},
  fragil:     {scale:'C', hr:20, slider:16},
  aluminio:   {scale:'B', hr:60, slider:48},
  titanio:    {scale:'C', hr:34, slider:31},
  niquel:     {scale:'B', hr:45, slider:29},
  molibdeno:  {scale:'B', hr:75, slider:68},
  magnesio:   {scale:'B', hr:50, slider:36},
  zinc:       {scale:'B', hr:35, slider:16},
  tungsteno:  {scale:'C', hr:22, slider:18},
  laton:      {scale:'B', hr:55, slider:42},
};
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
  // FIX #9 (y de paso corrige el glitch visual #25): la profundidad ahora se
  // normaliza a una fracción 0..1 de la altura del recuadro y se acota, así
  // la marca de indentación nunca queda dibujada fuera del recuadro "MATERIAL".
  const top=30, bottom=120;
  const depth = top + depthFrac*(bottom-top-2); // -2 de margen para no tocar el borde
  const svg = document.getElementById('dz_rkDepthSvg');
  svg.innerHTML = `
    <rect x="20" y="30" width="220" height="90" fill="var(--surface)" stroke="var(--border)"/>
    <text x="130" y="20" text-anchor="middle" fill="var(--muted)" font-size="10">MATERIAL</text>
    <polygon points="130,10 145,${depth} 115,${depth}" fill="var(--neck)" opacity="0.9"/>
    <ellipse cx="130" cy="${depth}" rx="16" ry="4" fill="var(--frac)" opacity="0.8"/>
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
