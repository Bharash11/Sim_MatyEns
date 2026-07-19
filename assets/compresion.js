// compresion.js — Tab 2: motor de curvas de compresión (genCompCurve), gráfico, animación

/* ============================================================ TAB 2: COMPRESIÓN */
let compPlaying=false, compAnimId=null, compProgress=0, compCurve=[];

function genCompCurve(E_GPa, syc, sc, frag_yn) {
  // FIX #4: mismo blindaje anti-E<=0 que ya tiene genCurve() (tracción). Sin esto,
  // un E inválido (0, negativo, o un campo vacío que se evalúa como 0) hacía que
  // eyc=syc/E diera Infinity/NaN (curva vacía) o invirtiera el signo de la
  // deformación elástica (curva "estirándose" en vez de comprimirse).
  const E_GPa_safe = (isFinite(E_GPa) && E_GPa>0) ? E_GPa : 1;
  const E=E_GPa_safe*1000, pts=[];
  const frag = frag_yn==='si';
  // FIX #28: blindaje anti σc<=0 y σyc<0 tipeados a mano (bypasean el min="0"/"1"
  // del HTML). Sin esto, un σc negativo hacía que Math.min(-eps·E, sc) devolviera
  // siempre sc (porque un negativo es "menor" que cualquier tensión positiva
  // calculada), y al aplicarle el signo exterior la curva salía con tensión
  // POSITIVA y constante en todo el ensayo. Un σyc negativo invertía el signo de
  // la deformación elástica, haciendo que la curva avanzara y retrocediera en X
  // (no monotónica) en vez de comprimirse siempre en la misma dirección.
  const sc_safe = (isFinite(sc) && sc>0) ? sc : 1;
  const syc_floor = (isFinite(syc) && syc>0) ? syc : 0.01;
  if (frag) {
    // FIX #4: antes el rango de deformación elástica era un valor fijo de
    // -0.3%, sin importar la relación entre sc y E. Con materiales de sc alto
    // respecto a E (ej. fibra de carbono: sc=3500 MPa, E=230 GPa) la curva
    // nunca alcanzaba sc dentro de ese 0.3%, y el punto de fractura saltaba de
    // golpe a -sc (llegamos a ver saltos de ~5x). Ahora el rango se calcula en
    // función de sc/E (con un piso de 0.3% para no achicar el rango en los
    // materiales que ya andaban bien, como hormigón o cerámica), así la curva
    // siempre llega de forma continua hasta sc antes del punto de fractura.
    const epsMax = Math.max(0.003, (sc_safe/E)*1.15);
    for(let i=0;i<=60;i++){
      const t=i/60, eps=-t*epsMax;
      const sig=-Math.min(-eps*E, sc_safe);
      pts.push({x:+eps.toFixed(7),y:+sig.toFixed(2),phase:'elastic'});
    }
    pts.push({x:-epsMax,y:-sc_safe,phase:'fracture'});
    return pts;
  }
  // FIX (compresión): σyc (límite elástico) nunca puede ser físicamente mayor
  // que σc (resistencia última). Si el usuario carga un valor inconsistente
  // (ej. σyc=300 con σc=250), antes la curva "ablandaba" en vez de endurecer.
  // Se acota σyc a σc como tope de seguridad (y ahora también a un piso positivo,
  // ver FIX #28 más arriba).
  const syc_safe = Math.min(syc_floor, sc_safe);
  const eyc = syc_safe/E;
  for(let i=0;i<=40;i++){const eps=-(i/40)*eyc; pts.push({x:+eps.toFixed(7),y:+(eps*E).toFixed(2),phase:'elastic'});}
  for(let i=1;i<=100;i++){
    const t=i/100, eps=-(eyc+t*0.08);
    const sig=-(syc_safe+(sc_safe-syc_safe)*(1-Math.pow(1-t,1.5)));
    pts.push({x:+eps.toFixed(7),y:+Math.min(0,sig).toFixed(2),phase:i===100?'fracture':'plastic'});
  }
  return pts;
}

function toggleCompPlay(){
  if(!compPlaying && compProgress>=compCurve.length && compCurve.length>0){resetComp();return;}
  if(!compCurve.length) buildCompCurve();
  compPlaying=!compPlaying;
  document.getElementById('co_playBtn').textContent=compPlaying?'⏸ Pausar':'▶ Continuar';
  if(compPlaying) tickComp();
}

function resetComp(){
  compPlaying=false; cancelAnimationFrame(compAnimId); compProgress=0; compCurve=[];
  if(compChartInst){compChartInst.data.datasets.forEach(d=>d.data=[]); compChartInst.update('none');}
  document.getElementById('co_playBtn').textContent='▶ Iniciar ensayo';
  ['co_mF','co_mSig','co_mDh','co_mEps'].forEach(id=>document.getElementById(id).textContent=id.includes('Eps')?'0.0000':'0');
  document.getElementById('co_infoBar').textContent='Configurá el material y comenzá el ensayo de compresión.';
  document.getElementById('co_probState').textContent='Sin carga';
  drawCompProbeta(0);
  ['co_rE','co_rSy','co_rSc','co_rFmax'].forEach(id=>document.getElementById(id).textContent='—');
}

let compChartInst=null;
function buildCompCurve(){
  const E=numOrDefault('co_E',207);
  const syc=numOrDefault('co_syc',250);
  const sc=numOrDefault('co_sc',350);
  const frag=document.getElementById('co_frag').value;
  // FIX #31: mismo aviso que ya tiene Tracción (e_warnSyTs) para σy>TS, pero acá
  // para σyc>σc. Antes el dato inconsistente se clampaba en silencio dentro de
  // genCompCurve (Math.min(syc,sc)) sin que el usuario se enterara.
  const warnSycSc = document.getElementById('co_warnSycSc');
  if (syc > 0 && syc > sc) {
    warnSycSc.style.display = 'block';
    warnSycSc.innerHTML = `<strong>Dato inconsistente:</strong> σ_yc (${syc} MPa) no puede ser mayor que σ_c (${sc} MPa). Revisá los valores.`;
  } else {
    warnSycSc.style.display = 'none';
  }
  compCurve=genCompCurve(E,syc,sc,frag);
  const d0=numOrDefault('co_d0',15);
  const a0=Math.PI*(d0/2)**2;
  if(!compChartInst){
    compChartInst=new Chart(document.getElementById('compChart').getContext('2d'),{
      type:'line',data:{datasets:[
        {label:'Elástica',data:[],borderColor:'#2176ae',borderWidth:2.5,pointRadius:0,tension:0,fill:false},
        {label:'Fluencia',data:[],borderColor:'#1a8c5e',borderWidth:2.5,pointRadius:0,tension:0.2,fill:false},
        {label:'Fractura',data:[],borderColor:'#c43535',borderWidth:2.5,pointRadius:6,pointBackgroundColor:'#c43535',tension:0,fill:false},
      ]},
      options:{responsive:true,maintainAspectRatio:false,animation:{duration:0},
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` σ=${c.parsed.y.toFixed(1)} MPa  ε=${c.parsed.x.toFixed(5)}`}}},
        scales:{
          x:{type:'linear',title:{display:true,text:'Deformación ε (negativa = compresión)',color:tc,font:{size:12}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:8,callback:v=>v.toFixed(4)}},
          y:{title:{display:true,text:'Tensión σ (MPa, negativa)',color:tc,font:{size:12}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:8}}
        }}
    });
  }
  compChartInst.options.scales.x.min=compCurve[compCurve.length-1].x*1.1;
  compChartInst.options.scales.y.min=-sc*1.2;
  document.getElementById('co_rE').textContent=E+' GPa';
  document.getElementById('co_rSy').textContent=syc+' MPa';
  document.getElementById('co_rSc').textContent=sc+' MPa';
  document.getElementById('co_rFmax').textContent=((sc*a0)/1000).toFixed(2);
}

function tickComp(){
  if(!compPlaying) return;
  const speed=+document.getElementById('co_speed').value;
  const n=Math.min(compCurve.length,Math.floor(compProgress));
  const vis=compCurve.slice(0,n);
  const el=vis.filter(p=>p.phase==='elastic');
  const pl=vis.filter(p=>p.phase==='plastic');
  const fr=vis.filter(p=>p.phase==='fracture');
  let lEl=el[el.length-1];
  const plPts=lEl?[lEl,...pl]:pl;
  let lPl=plPts[plPts.length-1];
  const frPts=lPl&&fr.length?[lPl,...fr]:fr;
  compChartInst.data.datasets[0].data=el.map(p=>({x:p.x,y:p.y}));
  compChartInst.data.datasets[1].data=plPts.map(p=>({x:p.x,y:p.y}));
  compChartInst.data.datasets[2].data=frPts.map(p=>({x:p.x,y:p.y}));
  compChartInst.update('none');
  const last=vis[vis.length-1];
  if(last){
    const d0=numOrDefault('co_d0',15);
    const a0=Math.PI*(d0/2)**2;
    document.getElementById('co_mSig').textContent=Math.abs(last.y).toFixed(1);
    document.getElementById('co_mEps').textContent=last.x.toFixed(5);
    const h0=numOrDefault('co_h0',30);
    document.getElementById('co_mDh').textContent=(Math.abs(last.x)*h0).toFixed(3);
    document.getElementById('co_mF').textContent=((Math.abs(last.y)*a0)/1000).toFixed(2);
    // FIX #7: co_frag se necesita ahora también para el texto de "Falla" (antes
    // solo se usaba más abajo para el dibujo SVG, que sí distinguía dúctil/frágil).
    const co_frag=document.getElementById('co_frag').value==='si';
    document.getElementById('co_infoBar').innerHTML=last.phase==='elastic'?'<strong>Zona elástica</strong> — la probeta se aplasta y recupera su forma al retirar la carga.':last.phase==='plastic'?'<strong>Fluencia</strong> — el aplastamiento es permanente. La probeta se ensancha lateralmente (Poisson).':(co_frag?'<strong>Falla</strong> — fractura en compresión. Los materiales frágiles fallan en planos de 45° por corte.':'<strong>Falla</strong> — fractura en compresión. Un material dúctil tiende a "barrilarse" y agrietarse en el ecuador de la probeta, sin un plano de corte neto a 45°.');
    document.getElementById('co_probState').textContent=last.phase==='elastic'?'Elástica':last.phase==='plastic'?'Plástica':'Falla';
    drawCompProbeta(last.x, last.phase, co_frag);
  }
  if(compProgress<compCurve.length){compProgress+=speed; compAnimId=requestAnimationFrame(tickComp);}
  else{compPlaying=false; document.getElementById('co_playBtn').textContent='↺ Reiniciar';}
}

