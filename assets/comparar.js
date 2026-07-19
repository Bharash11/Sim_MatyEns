// comparar.js — Tab 3: comparación de dos materiales

/* ============================================================ TAB 3: COMPARE */
let compareChartInst=null;

function renderCompare(){
  const m1={E:+document.getElementById('c1_E').value,sy:+document.getElementById('c1_sy').value,ts:+document.getElementById('c1_ts').value,el:+document.getElementById('c1_el').value};
  const m2={E:+document.getElementById('c2_E').value,sy:+document.getElementById('c2_sy').value,ts:+document.getElementById('c2_ts').value,el:+document.getElementById('c2_el').value};
  // FIX #5: el campo %EL tiene min="0.1" en el HTML, pero eso no bloquea que
  // alguien tipee "0" directamente -- con %EL=0, genCurve() colapsaba TODA la
  // curva en una línea vertical pegada a x=0 (ey=min(sy/E,0)=0). Se le pone un
  // piso de 0.01% (ductilidad casi nula, no nula), igual que ya hace el
  // Material compuesto.
  if(m1.el<=0) m1.el=0.01;
  if(m2.el<=0) m2.el=0.01;
  // FIX #6: faltaba la validación de σ_y > TS que sí existe en Tracción --
  // se podía cargar un dato físicamente imposible sin ningún aviso.
  const warnEl = document.getElementById('c_warnSyTs');
  const bad1 = m1.sy>0 && m1.sy>m1.ts, bad2 = m2.sy>0 && m2.sy>m2.ts;
  if (bad1 || bad2) {
    warnEl.style.display='block';
    const partes=[];
    if(bad1) partes.push(`M1: σ_y (${m1.sy} MPa) > TS (${m1.ts} MPa)`);
    if(bad2) partes.push(`M2: σ_y (${m2.sy} MPa) > TS (${m2.ts} MPa)`);
    warnEl.innerHTML = `<strong>Dato inconsistente:</strong> ${partes.join(' · ')}. Revisá los valores.`;
  } else {
    warnEl.style.display='none';
  }
  const c1=genCurve(m1.E,m1.sy,m1.ts,m1.el,false);
  const c2=genCurve(m2.E,m2.sy,m2.ts,m2.el,false);
  const maxX=Math.max(m1.el,m2.el)/100*1.12, maxY=Math.max(m1.ts,m2.ts)*1.18;
  if(!compareChartInst){
    compareChartInst=new Chart(document.getElementById('compareChart').getContext('2d'),{
      type:'line',data:{datasets:[
        {label:'M1',data:[],borderColor:'#2176ae',borderWidth:2.5,pointRadius:0,tension:0.15,fill:false},
        {label:'M2',data:[],borderColor:'#7b2fa8',borderWidth:2.5,pointRadius:0,tension:0.15,fill:false},
        {label:'M1f',data:[],borderColor:'#2176ae',borderWidth:2.5,pointRadius:6,pointBackgroundColor:'#2176ae',tension:0,fill:false},
        {label:'M2f',data:[],borderColor:'#7b2fa8',borderWidth:2.5,pointRadius:6,pointBackgroundColor:'#7b2fa8',tension:0,fill:false},
      ]},
      options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` σ=${c.parsed.y.toFixed(1)} MPa  ε=${c.parsed.x.toFixed(5)}`}}},
        scales:{x:{type:'linear',title:{display:true,text:'Deformación nominal ε',color:tc,font:{size:12}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:8,callback:v=>v.toFixed(3)}},
                y:{title:{display:true,text:'Tensión σ (MPa)',color:tc,font:{size:12}},grid:{color:gc},ticks:{color:tc,maxTicksLimit:8}}}}
    });
  }
  compareChartInst.data.datasets[0].data=c1.filter(p=>p.phase!=='fracture').map(p=>({x:p.x,y:p.y}));
  compareChartInst.data.datasets[1].data=c2.filter(p=>p.phase!=='fracture').map(p=>({x:p.x,y:p.y}));
  compareChartInst.data.datasets[2].data=[{x:c1[c1.length-1].x,y:c1[c1.length-1].y}];
  compareChartInst.data.datasets[3].data=[{x:c2[c2.length-1].x,y:c2[c2.length-1].y}];
  compareChartInst.options.scales.x.max=maxX;
  compareChartInst.options.scales.y.max=maxY;
  compareChartInst.update();
  const ten1=calcTenacity(c1),ten2=calcTenacity(c2);
  const res1=calcResilience(c1),res2=calcResilience(c2);
  document.getElementById('compareResults').innerHTML=`
  <div class="rcard"><div class="rl" style="color:#2176ae">M1 — E${hb('E')}</div><div class="rv">${m1.E} GPa</div></div>
  <div class="rcard"><div class="rl" style="color:#7b2fa8">M2 — E${hb('E')}</div><div class="rv">${m2.E} GPa</div></div>
  <div class="rcard"><div class="rl" style="color:#2176ae">M1 — σ_y${hb('sy')}</div><div class="rv">${m1.sy>0?m1.sy+' MPa':'— (frágil)'}</div></div>
  <div class="rcard"><div class="rl" style="color:#7b2fa8">M2 — σ_y${hb('sy')}</div><div class="rv">${m2.sy>0?m2.sy+' MPa':'— (frágil)'}</div></div>
  <div class="rcard"><div class="rl" style="color:#2176ae">M1 — TS${hb('ts')}</div><div class="rv">${m1.ts} MPa</div></div>
  <div class="rcard"><div class="rl" style="color:#7b2fa8">M2 — TS${hb('ts')}</div><div class="rv">${m2.ts} MPa</div></div>
  <div class="rcard"><div class="rl" style="color:#2176ae">M1 — Tenacidad${hb('tenacidad')}</div><div class="rv">${ten1.toFixed(3)} MJ/m³</div></div>
  <div class="rcard"><div class="rl" style="color:#7b2fa8">M2 — Tenacidad${hb('tenacidad')}</div><div class="rv">${ten2.toFixed(3)} MJ/m³</div></div>
  <div class="rcard"><div class="rl" style="color:#2176ae">M1 — Resiliencia${hb('resiliencia')}</div><div class="rv">${m1.sy>0?(res1*1000).toFixed(2)+' kJ/m³':'— frágil'}</div></div>
  <div class="rcard"><div class="rl" style="color:#7b2fa8">M2 — Resiliencia${hb('resiliencia')}</div><div class="rv">${m2.sy>0?(res2*1000).toFixed(2)+' kJ/m³':'— frágil'}</div></div>
  <div class="rcard"><div class="rl" style="color:#2176ae">M1 — %EL${hb('el')}</div><div class="rv">${m1.el}%</div></div>
  <div class="rcard"><div class="rl" style="color:#7b2fa8">M2 — %EL${hb('el')}</div><div class="rv">${m2.el}%</div></div>`;
}

