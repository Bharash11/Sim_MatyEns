// dureza-janka.js — dureza Janka (maderas)

const JANKA_REF = {
  pino:      {kgf:180,  lbf:400},
  madera:    {kgf:585,  lbf:1290},  // Roble
  algarrobo: {kgf:1134, lbf:2500},
  quebracho: {kgf:2177, lbf:4800},
};
const JANKA_BALL_D = 11.28, JANKA_HALF = JANKA_BALL_D/2; // 5.64 mm
function dzApplyJankaMaterial(){
  const key = document.getElementById('dz_jkMat').value;
  const ref = JANKA_REF[key];
  if(!ref){ dzUpdateJanka(); return; }
  document.getElementById('dz_jkF').value = ref.kgf;
  dzUpdateJanka();
}
function dzUpdateJanka(){
  const F = parseFloat(document.getElementById('dz_jkF').value);
  document.getElementById('dz_jkVal').textContent = F;
  const matKey = document.getElementById('dz_jkMat').value;
  const ref = JANKA_REF[matKey];
  const forceEl = document.getElementById('dz_jkForce');
  const depthEl = document.getElementById('dz_jkDepth');
  const cmpEl = document.getElementById('dz_jkMatCompare');
  forceEl.textContent = `${F.toFixed(0)} kgf (${(F*9.80665).toFixed(0)} N)`;
  if(!ref){
    depthEl.textContent = '—';
    cmpEl.style.display='block';
    cmpEl.innerHTML = 'Elegí una especie de madera para simular la penetración -- este ensayo se define de forma distinta para cada especie, no hay una curva "genérica" sin calibrar.';
    dzDrawJankaSvg(0);
    return;
  }
  // FIX #30: blindaje anti F<=0/NaN tipeado a mano (el input tiene min="10" pero
  // eso no bloquea el tipeo directo ni un campo vacío). Sin esto, Math.pow() de
  // una base negativa con exponente fraccionario (2/3) da NaN en JavaScript, y el
  // cuadro de profundidad mostraba literalmente "NaN mm" mientras la bola del
  // dibujo SVG desaparecía (su posición también quedaba en NaN).
  const F_safe = (isFinite(F) && F>0) ? F : 0.01;
  const depthRaw = JANKA_HALF * Math.pow(F_safe/ref.kgf, 2/3);
  const depthCapped = Math.min(depthRaw, 10); // tope solo para que el dibujo no se vaya de rango
  depthEl.textContent = depthRaw.toFixed(2)+' mm';
  const atTarget = Math.abs(depthRaw-JANKA_HALF) < 0.15;
  cmpEl.style.display='block';
  if(atTarget){
    cmpEl.innerHTML = `<strong>¡Profundidad = mitad del diámetro (${JANKA_HALF.toFixed(2)} mm)!</strong> Por definición, esta fuerza (≈${ref.kgf} kgf / ${ref.lbf} lbf de tabla) ES la dureza Janka de esta madera.`;
  } else if(depthRaw<JANKA_HALF){
    cmpEl.innerHTML = `Profundidad alcanzada: ${depthRaw.toFixed(2)} mm, todavía menos que la mitad del diámetro (${JANKA_HALF.toFixed(2)} mm). Hace falta más fuerza para llegar al criterio Janka (≈${ref.kgf} kgf de referencia).`;
  } else {
    cmpEl.innerHTML = `Profundidad alcanzada: ${depthRaw.toFixed(2)} mm, ya superaste la mitad del diámetro (${JANKA_HALF.toFixed(2)} mm). Con menos fuerza (≈${ref.kgf} kgf de referencia) alcanzarías justo el criterio Janka.`;
  }
  dzDrawJankaSvg(depthCapped);
}
function dzDrawJankaSvg(depth){
  const svg = document.getElementById('dz_jkSvg');
  if(!svg) return;
  const scale = 6;
  const r = JANKA_HALF*scale;
  const woodTop = 55, woodBottom = 170, woodLeft = 20, woodRight = 240;
  const targetY = woodTop + JANKA_HALF*scale;
  const ballCY = woodTop - r + (depth||0)*scale;
  svg.innerHTML = `
    <rect x="${woodLeft}" y="${woodTop}" width="${woodRight-woodLeft}" height="${woodBottom-woodTop}" fill="#c8a165" stroke="var(--border)"/>
    <text x="130" y="${woodTop-8}" text-anchor="middle" fill="var(--muted)" font-size="10">MADERA</text>
    <line x1="${woodLeft}" y1="${targetY}" x2="${woodRight}" y2="${targetY}" stroke="var(--frac)" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="${woodRight+2}" y="${targetY+3}" font-size="8" fill="var(--frac)">½ D</text>
    <circle cx="130" cy="${ballCY}" r="${r}" fill="#9aa5ad" stroke="#5a6570" stroke-width="1.5"/>
  `;
}

/* ---------------- 8. ESCLEROMETRO ---------------- */
// Igual que Janka, no es una formula unica: es un metodo INDIRECTO en dos
// pasos. 1) el numero de rebote crudo se corrige segun la orientacion del
// martillo (la gravedad ayuda o se opone al retroceso de la masa interna
// segun hacia donde apunte), y 2) el numero corregido (equivalente
// horizontal) se lee en una curva de correlacion empirica hacia resistencia.
// Tanto la correccion angular como la curva son aproximadas -- cada norma o
// fabricante publica la propia, y dependen ademas de la edad/humedad real
// del hormigon. El valor de referencia (R=30 -> 25 MPa) esta calibrado para
// coincidir con el preset de Hormigon ya usado en Traccion/Compresion.
