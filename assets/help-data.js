// help-data.js — textos de los botones de ayuda (?) de toda la app

var HELP_DATA = {
  l0:{t:"Longitud original (l₀)",b:"Distancia inicial entre las marcas de referencia de la probeta, antes de aplicar carga. Se usa como base para calcular la deformación ε = Δl/l₀. Probetas más largas dan lecturas de deformación más precisas, pero requieren mayor desplazamiento para el mismo ensayo."},
  d0:{t:"Diámetro (d₀)",b:"Diámetro de la sección transversal de la probeta sin cargar. Determina el área A₀ = π·d₀²/4, que se usa para calcular la tensión σ = F/A₀. A mayor diámetro, mayor área y por lo tanto se necesita más fuerza para alcanzar la misma tensión."},
  a0:{t:"Área directa (A₀)",b:"Área de la sección transversal inicial de la probeta. Si se deja vacío, se calcula automáticamente a partir del diámetro (A₀ = π·d₀²/4). Es el denominador del cálculo de tensión nominal σ = F/A₀: a mayor A₀, menor tensión para una misma fuerza."},
  preset:{t:"Preset de material",b:"Selecciona un material predefinido (acero, aluminio, cobre, etc.) que carga automáticamente sus propiedades típicas: E, σ_y, TS y %EL. Podés modificar cualquiera de estos valores manualmente después de elegir un preset."},
  E:{t:"Módulo de elasticidad (E)",b:"Mide la rigidez del material en la zona elástica: cuánto se resiste a deformarse elásticamente. Es la pendiente de la recta σ = E·ε (Ley de Hooke). Cuanto mayor es E, más rígido es el material y menos se deforma para una misma tensión aplicada."},
  sy:{t:"Límite elástico (σ_y)",b:"Tensión a partir de la cual el material comienza a deformarse plásticamente (de forma permanente). Por debajo de este valor, si se retira la carga, la probeta recupera su forma original. Se ingresa 0 si el material es frágil (sin fluencia definida, como cerámicas o hierro fundido)."},
  ts:{t:"Resistencia a la tracción (TS)",b:"Tensión máxima que soporta el material durante el ensayo, en el punto más alto de la curva σ-ε. A partir de ahí suele comenzar la estricción (adelgazamiento localizado) hasta llegar a la fractura."},
  el:{t:"Ductilidad (%EL)",b:"Porcentaje de alargamiento que sufre la probeta hasta la fractura, respecto a su longitud original. Indica cuánto puede deformarse plásticamente el material antes de romperse. Valores altos = material dúctil; valores bajos = material frágil."},
  nu:{t:"Coeficiente de Poisson (ν)",b:"Relación entre la deformación lateral (contracción del diámetro) y la deformación axial (alargamiento) en la zona elástica. La mayoría de los metales tienen ν entre 0.25 y 0.35 (valor típico en aceros: 0.30)."},
  fluencia:{t:"Discontinuidad de fluencia",b:"Algunos materiales (como aceros de bajo carbono) muestran una caída brusca de tensión al alcanzar el límite elástico, antes de seguir deformándose plásticamente. Esta opción activa o desactiva ese efecto visual en la curva."},
  speed:{t:"Velocidad de ensayo",b:"Controla la rapidez con la que avanza la animación del ensayo en pantalla. No afecta los resultados físicos ni las propiedades del material, solo la velocidad de reproducción."},
  F:{t:"Fuerza (F)",b:"Carga aplicada en cada instante del ensayo, medida por la máquina de ensayos. Es el dato bruto a partir del cual se calcula la tensión: σ = F/A₀."},
  sigma:{t:"Tensión (σ = F/A₀)",b:"Fuerza aplicada dividida por el área de la sección transversal original de la probeta. Es la variable que se grafica en el eje Y del diagrama tensión-deformación."},
  dl:{t:"Alargamiento (Δl)",b:"Variación de longitud de la probeta respecto a su longitud original l₀, medida durante el ensayo: Δl = l − l₀."},
  eps:{t:"Deformación (ε = Δl/l₀)",b:"Alargamiento relativo de la probeta respecto a su longitud original. Es adimensional (o se expresa en %) y es la variable que se grafica en el eje X del diagrama tensión-deformación."},
  ar:{t:"%AR — Reducción de área",b:"Porcentaje de reducción del área de la sección transversal en la zona de fractura, respecto al área original. Junto con %EL, es una medida de la ductilidad del material."},
  fmax:{t:"Fuerza máxima (F_max)",b:"Mayor fuerza registrada durante el ensayo, correspondiente al punto de resistencia máxima (TS) en la curva tensión-deformación."},
  tenacidad:{t:"Tenacidad",b:"Energía total absorbida por el material antes de fracturarse, representada por el área bajo toda la curva tensión-deformación. Combina resistencia y ductilidad: indica la capacidad del material de absorber energía antes de romperse."},
  resiliencia:{t:"Resiliencia",b:"Energía elástica que puede absorber el material sin sufrir deformación permanente, representada por el área bajo la curva en la zona elástica (hasta σ_y). Indica cuánta energía puede absorber el material y aun así recuperar su forma."},
  dltot:{t:"Alargamiento total (Δl total)",b:"Variación total de longitud de la probeta desde el inicio del ensayo hasta el instante de la fractura."},
  efrac:{t:"Deformación de fractura (ε_fractura)",b:"Valor de deformación (ε) en el instante en que se produce la rotura de la probeta. Cuanto mayor es este valor, más dúctil es el material."},
  tipo_fractura:{t:"Tipo de fractura",b:"Clasifica cómo se rompió la probeta: 'Dúctil' (con estricción y deformación plástica visible, típico de metales) o 'Frágil' (rotura súbita sin deformación plástica apreciable, típico de cerámicas, vidrios o hierro fundido)."},
  h0:{t:"Longitud original (h₀)",b:"Altura inicial de la probeta de compresión antes de aplicar carga. Junto con d₀, define la relación de esbeltez h₀/d₀, importante para evitar el pandeo durante el ensayo."},
  ratio_hd:{t:"Relación h₀/d₀",b:"Relación entre la altura y el diámetro de la probeta de compresión. Si es muy alta, la probeta puede pandear (flexionar) en vez de aplastarse uniformemente. Se recomiendan valores entre 1 y 3 para un ensayo de compresión válido."},
  mohs:{t:"Escala de Mohs (1822)",b:"Escala puramente ordinal (no lineal) de dureza por rayado: cada mineral de la lista raya a todos los de dureza menor y es rayado por todos los de dureza mayor. La diferencia real de dureza entre escalones no es pareja (por ejemplo, la distancia entre 9-Corindón y 10-Diamante es mucho mayor que entre 1-Talco y 2-Yeso). Se usa sobre todo en mineralogía y geología, más que en ingeniería de materiales."},
  sigma_c:{t:"Tensión de compresión (σ_c)",b:"Fuerza de compresión dividida por el área de la sección transversal. Se representa como tensión negativa porque comprime la probeta en vez de estirarla."},
  sigma_yc:{t:"Límite elástico en compresión (σ_yc)",b:"Tensión de compresión a partir de la cual el material comienza a deformarse plásticamente de forma permanente."},
  fragil_comp:{t:"¿Material frágil en compresión?",b:"Los materiales frágiles (hormigón, cerámicas) no presentan fluencia y rompen de forma súbita, pero suelen soportar tensiones de compresión mucho mayores que de tracción. La madera es un caso particular: es más resistente a tracción que a compresión (lo opuesto al hormigón), y en compresión falla de forma más gradual (aplastamiento de fibras) que un material verdaderamente frágil. Los materiales dúctiles (metales) se comportan de forma similar en ambos ensayos."},
  dh:{t:"Acortamiento (Δh)",b:"Reducción de altura de la probeta respecto a su altura original h₀, medida durante el ensayo de compresión."},
  eps_c:{t:"Deformación de compresión (ε_c = Δh/h₀)",b:"Acortamiento relativo de la probeta respecto a su altura original. Se expresa como valor negativo para diferenciarla de la deformación en tracción."},
  f2:{t:"Fracción volumétrica del refuerzo (f₂)",b:"Proporción del volumen total del material compuesto que ocupa el componente de refuerzo (por ejemplo, fibras). f₁ + f₂ = 1. A mayor f₂, mayor influencia del refuerzo en las propiedades finales del compuesto."},
  temp_test:{t:"Temperatura de ensayo",b:"Temperatura a la que se somete la probeta en el ensayo simulado. Al aumentar la temperatura, el material suele volverse más dúctil (mayor %EL) pero pierde rigidez y resistencia (bajan E, σ_y y TS). A temperaturas muy bajas, el material puede volverse frágil."},
  cfg_name:{t:"Nombre de la configuración",b:"Identificador que le asignás a un conjunto de parámetros guardados (por ejemplo, el nombre de un grupo o material) para poder reconocerlo y recuperarlo fácilmente más tarde en la lista de configuraciones guardadas."},
  dz_rk:{t:"Dureza simulada del material",b:"Control ilustrativo: desliza entre un material blando y uno duro para ver, de forma cualitativa, cómo cambiaría la profundidad de la huella y el número Rockwell aproximado en la escala elegida. No reemplaza al ensayo real ni a las tablas de calibración."},
  rt_kic:{t:"Tenacidad a la fractura (K_IC)",b:"Propiedad del material que indica su resistencia a la propagación inestable de una grieta, en condiciones de deformación plana. Cuanto mayor es K_IC, más tolerante es el material a defectos y grietas antes de romperse de forma catastrófica. Se mide en MPa·√m."},
  rt_sigma:{t:"Tensión aplicada (σ)",b:"Tensión nominal (remota) aplicada a la pieza, lejos de la grieta. Junto con la longitud de grieta y la geometría, determina la severidad del campo de tensiones en la punta de la grieta (K_I)."},
  rt_a:{t:"Longitud de grieta (a)",b:"Tamaño del defecto o grieta preexistente en la pieza (semi-longitud, para una grieta interna pasante). Cuanto mayor es a, mayor es K_I para una misma tensión aplicada."},
  rt_y:{t:"Factor geométrico (Y)",b:"Factor adimensional que depende de la geometría de la pieza y la grieta (posición, forma, relación entre el tamaño de la grieta y las dimensiones de la pieza). Y≈1 es una aproximación típica para una grieta pasante centrada en una placa muy ancha respecto al tamaño de la grieta."},
  rt_ki:{t:"Factor de intensidad de tensiones (K_I)",b:"Cuantifica la magnitud del campo de tensiones en la punta de una grieta, en función de la tensión aplicada, el tamaño de la grieta y la geometría: K_I = Y·σ·√(π·a). Cuando K_I alcanza el valor crítico K_IC del material, la grieta se propaga de forma inestable."},
  ft_smax:{t:"Tensión máxima (σ_max)",b:"Valor más alto que alcanza la tensión durante un ciclo de carga."},
  ft_smin:{t:"Tensión mínima (σ_min)",b:"Valor más bajo que alcanza la tensión durante un ciclo de carga. Puede ser negativa (compresión) en ciclos alternados."},
  ft_sa:{t:"Amplitud de tensión (σ_a)",b:"Semi-diferencia entre la tensión máxima y mínima del ciclo: σ_a=(σ_max−σ_min)/2. Es el parámetro que se grafica en el eje vertical de la curva S-N."},
  ft_nf:{t:"Ciclos a rotura (N)",b:"Número de ciclos de carga que el material soporta, en promedio, antes de fallar por fatiga a la amplitud de tensión indicada. Se obtiene de la curva S-N (o de la ecuación de Basquin) del material."},
  ft_dadn:{t:"Velocidad de propagación de grieta (da/dN)",b:"Incremento de longitud de grieta por cada ciclo de carga, en la región estable (Región II) descripta por la ley de Paris: da/dN = C·(ΔK)^m."},
  ft_parisC:{t:"Constante C de la ley de Paris",b:"Constante empírica del material que, junto con el exponente m, define la pendiente y posición de la recta da/dN vs. ΔK en escala log-log. Depende del material, el medio ambiente y la relación de tensiones R."},
  ft_parisM:{t:"Exponente m de la ley de Paris",b:"Exponente empírico que determina qué tan sensible es la velocidad de propagación de grieta a cambios en ΔK. Valores típicos: ~3 para aceros, ~3-4 para aluminios."},
  ft_sebase:{t:"Límite de fatiga base (S_e')",b:"Límite de fatiga medido en condiciones ideales de laboratorio: probeta pulida, de tamaño estándar, cargada en flexión rotativa, a temperatura ambiente y con 50% de confiabilidad."},
  ft_ka:{t:"Factor de acabado superficial (k_a)",b:"Corrige el límite de fatiga según la rugosidad real de la superficie de la pieza. Superficies más rugosas (forjado, laminado) introducen más concentradores de tensión microscópicos que una superficie pulida."},
  ft_kb:{t:"Factor de tamaño (k_b)",b:"Corrige el límite de fatiga según el tamaño de la pieza: piezas de mayor diámetro/sección tienen más volumen sometido a tensión alta, aumentando la probabilidad estadística de encontrar un defecto crítico."},
  fl_mat:{t:"Material",b:"Selecciona el material para calcular su velocidad de fluencia según la ecuación de Dorn. Los valores de K, n y Q_c son ilustrativos con fines didácticos."},
  fl_sigma:{t:"Tensión aplicada (σ)",b:"Tensión constante (nominal) a la que está sometido el componente durante el servicio en caliente."},
  fl_temp:{t:"Temperatura (T)",b:"Temperatura de servicio del componente. La fluencia es relevante cuando T supera, aproximadamente, el 40% de la temperatura de fusión del material (en escala absoluta)."},
  fl_lmc:{t:"Constante C de Larson-Miller",b:"Constante empírica del material (típicamente entre 15 y 25, con ≈20 como valor frecuente para muchos aceros y aleaciones) usada en el parámetro de Larson-Miller para correlacionar tiempo a rotura y temperatura."}
};
function showHelp(key,evt){
  if(evt){evt.preventDefault();evt.stopPropagation();}
  var d=HELP_DATA[key];
  if(!d)return;
  document.getElementById('helpTitle').textContent=d.t;
  document.getElementById('helpBody').textContent=d.b;
  document.getElementById('helpOverlay').classList.add('open');
}
function closeHelp(evt){
  if(evt)evt.stopPropagation();
  document.getElementById('helpOverlay').classList.remove('open');
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeHelp();});
function hb(key){return '<button type="button" class="help-btn" onclick="showHelp(\''+key+'\',event)">?</button>';}
