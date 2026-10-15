/* Deterministic school-level chemistry. Amounts in mol, volumes in mL. */
export const cations={
 'Na+':['Na',1,'sodium'],'K+':['K',1,'potassium'],'Li+':['Li',1,'lithium'],'H+':['H',1,'hydrogen'],'NH4+':['NH4',1,'ammonium'],
 'Ca2+':['Ca',2,'calcium'],'Mg2+':['Mg',2,'magnesium'],'Ba2+':['Ba',2,'barium'],'Al3+':['Al',3,'aluminium'],'Zn2+':['Zn',2,'zinc'],'Fe2+':['Fe',2,'iron(II)'],'Fe3+':['Fe',3,'iron(III)'],'Cu2+':['Cu',2,'copper(II)'],'Ag+':['Ag',1,'silver'],'Pb2+':['Pb',2,'lead(II)'],'Ni2+':['Ni',2,'nickel(II)'],'Co2+':['Co',2,'cobalt(II)'],'Mn2+':['Mn',2,'manganese(II)'],'Sn2+':['Sn',2,'tin(II)'],'Cr3+':['Cr',3,'chromium(III)']
};
export const anions={
 'Cl-':['Cl',1,'chloride'],'Br-':['Br',1,'bromide'],'I-':['I',1,'iodide'],'F-':['F',1,'fluoride'],'NO3-':['NO3',1,'nitrate'],'SO4^2-':['SO4',2,'sulfate'],'CO3^2-':['CO3',2,'carbonate'],'HCO3-':['HCO3',1,'hydrogencarbonate'],'OH-':['OH',1,'hydroxide'],'CH3COO-':['CH3COO',1,'ethanoate'],'SO3^2-':['SO3',2,'sulfite'],'PO4^3-':['PO4',3,'phosphate'],'S2O3^2-':['S2O3',2,'thiosulfate'],'MnO4-':['MnO4',1,'manganate(VII)'],'Cr2O7^2-':['Cr2O7',2,'dichromate(VI)']
};
export const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function salt(c,a){
 if(!cations[c]||!anions[a])throw Error('Unsupported ion pair');
 const [cf,cq,cn]=cations[c],[af,aq,an]=anions[a],g=gcd(cq,aq),nc=aq/g,na=cq/g;
 const part=(f,n)=>n===1?f:(/^[A-Z][a-z]?$/.test(f)?f:`(${f})`)+n;
 return {id:`salt:${c}:${a}`,formula:part(cf,nc)+part(af,na),name:cn+' '+an,category:'salt',cation:c,anion:a,state:soluble(c,a)?'aqueous':'solid',color:precipColor(c,a),nc,na};
}
export function soluble(c,a){
 if(['Na+','K+','Li+','NH4+','H+'].includes(c)||a==='NO3-'||a==='CH3COO-')return true;
 if(['Cl-','Br-','I-'].includes(a))return !['Ag+','Pb2+'].includes(c);
 if(a==='SO4^2-')return !['Ba2+','Ca2+','Pb2+'].includes(c);
 if(a==='OH-')return ['Ca2+','Ba2+'].includes(c);
 if(['CO3^2-','PO4^3-','SO3^2-'].includes(a))return false;
 return true;
}
export function precipColor(c,a){
 if(c==='Cu2+')return a==='OH-'?'#54a8ec':a==='CO3^2-'?'#42b49d':'#269cdb';
 if(c==='Fe2+')return '#8ba96a';if(c==='Fe3+')return a==='OH-'?'#af673d':'#e3b955';
 if(c==='Ag+'&&a==='Br-')return '#e9dfb7';if((c==='Ag+'||c==='Pb2+')&&a==='I-')return '#f1d44a';
 return '#edf4f5';
}
export function parseFormula(formula){
 if(typeof formula!=='string'||formula.length>250)throw Error('Use a formula of at most 250 characters.');
 const clean=formula.replace(/\((aq|s|l|g)\)/g,'').replace(/\s/g,'');
 if(!clean)throw Error('Enter a chemical formula.');
 const result={};
 for(const segment of clean.split(/[·.]/)){
  const lead=segment.match(/^([0-9]+)(?=[A-Z(])/),mult=lead?Number(lead[1]):1,s=lead?segment.slice(lead[1].length):segment;
  let pos=0;
  function group(nested=false){
   const out={};
   while(pos<s.length&&s[pos]!==')'){
    let atoms;
    if(s[pos]==='('){pos++;atoms=group(true);if(s[pos]!==')')throw Error('Unmatched bracket');pos++;}
    else {const m=s.slice(pos).match(/^[A-Z][a-z]?/);if(!m)throw Error('Use element symbols and round brackets only.');pos+=m[0].length;atoms={[m[0]]:1};}
    const m=s.slice(pos).match(/^\d+/);let n=m?Number(m[0]):1;if(m)pos+=m[0].length;if(!n||n>10000)throw Error('Invalid subscript');
    for(const [e,v]of Object.entries(atoms))out[e]=(out[e]||0)+v*n;
   }
   if(!nested&&pos!==s.length)throw Error('Unmatched bracket');return out;
  }
  for(const [e,v]of Object.entries(group()))result[e]=(result[e]||0)+v*mult;
 }return result;
}
export function molarMass(formula,elements){const atoms=parseFormula(formula);return Object.entries(atoms).reduce((sum,[s,n])=>{const el=elements.find(e=>e.s===s);if(!el)throw Error(`Unknown element: ${s}`);return sum+Number(String(el.m).replace(/[()]/g,''))*n;},0);}
export function balance(left,right){
 const species=[...left,...right].map(parseFormula),els=[...new Set(species.flatMap(Object.keys))],cols=species.length;
 const a=els.map(e=>species.map((sp,j)=>(sp[e]||0)*(j<left.length?1:-1)));
 let row=0,pivots=[];
 for(let col=0;col<cols&&row<a.length;col++){
  let k=a.findIndex((r,i)=>i>=row&&Math.abs(r[col])>1e-10);if(k<0)continue;
  [a[row],a[k]]=[a[k],a[row]];const d=a[row][col];a[row]=a[row].map(v=>v/d);
  for(let i=0;i<a.length;i++)if(i!==row){const f=a[i][col];a[i]=a[i].map((v,j)=>v-f*a[row][j]);}
  pivots.push(col);row++;
 }
 const free=Array.from({length:cols},(_,i)=>i).filter(i=>!pivots.includes(i));if(free.length!==1)throw Error('This equation needs one unique balance; check the species.');
 let x=Array(cols).fill(0);x[free[0]]=1;for(let i=pivots.length-1;i>=0;i--)x[pivots[i]]=-a[i].reduce((s,v,j)=>j===pivots[i]?s:s+v*x[j],0);
 let ints;for(let d=1;d<=10000;d++){if(x.every(v=>Math.abs(v*d-Math.round(v*d))<1e-7)){ints=x.map(v=>Math.round(v*d));break;}}
 if(!ints||ints.some(v=>v<=0))throw Error('No positive balance exists for these species.');
 const g=ints.reduce(gcd);ints=ints.map(v=>v/g);
 for(const e of els)if(species.reduce((s,sp,j)=>s+(sp[e]||0)*ints[j]*(j<left.length?1:-1),0)!==0)throw Error('Could not verify balance.');
 return {coefficients:ints,text:[left.map((f,j)=>(ints[j]===1?'':ints[j])+f).join(' + '),right.map((f,j)=>(ints[j+left.length]===1?'':ints[j+left.length])+f).join(' + ')].join(' → ')};
}
const acidAnion={hcl:'Cl-',h2so4:'SO4^2-',hno3:'NO3-',acetic:'CH3COO-'},baseCation={naoh:'Na+',koh:'K+',caoh2:'Ca2+',baoh2:'Ba2+',mgoh2:'Mg2+',nh3:'NH4+'},metalCation={k:'K+',na:'Na+',li:'Li+',ca:'Ca2+',mg:'Mg2+',al:'Al3+',zn:'Zn2+',fe:'Fe2+',pb:'Pb2+',cu:'Cu2+',ag:'Ag+'};
const oxideCation={cuo:'Cu2+',mgo:'Mg2+',zno:'Zn2+',fe2o3:'Fe3+'};
export function makeVessel(id=1,shape='beaker'){return {id,shape,name:`${shape==='flask'?'Flask':shape==='tube'?'Test tube':shape==='dish'?'Dish':'Beaker'} ${id}`,capacity:shape==='tube'?50:shape==='dish'?100:250,volume:0,waterVolume:0,waterConsumed:0,temp:20,contents:[],events:[],gas:{},heated:false};}
export function addSpecies(v,chem,n){if(n<1e-12)return;const old=v.contents.find(s=>s.chem.id===chem.id&&s.chem.state===chem.state);if(old)old.n+=n;else v.contents.push({chem:{...chem},n});}
export function dose(v,c,amount,concentration,elements){
 if(!Number.isFinite(amount)||amount<=0||amount>1000)throw Error('Choose a positive amount up to 1000.');
 if(c.state==='aqueous'&&(!Number.isFinite(concentration)||concentration<=0||concentration>2))throw Error('Concentration must be between 0 and 2 mol/dm³.');
 const liquid=c.state==='aqueous'||c.state==='liquid';if(liquid&&v.volume+amount>v.capacity+1e-8)throw Error(`This vessel holds ${v.capacity} mL. Choose a smaller dose.`);
 let n=c.category==='indicator'?0:liquid?(c.id==='water'?0:amount*(c.state==='aqueous'?concentration:(c.density||0.79)*1000/molarMass(c.formula,elements))/1000):c.state==='gas'?amount/24000:amount/molarMass(c.formula,elements);
 if(c.category==='indicator')v.indicator=c.id;else if(c.state==='gas')v.gas[c.formula]=(v.gas[c.formula]||0)+n;else if(c.id!=='water')addSpecies(v,c,n);
 if(liquid)v.volume+=amount;if(c.state==='aqueous'||c.id==='water')v.waterVolume=(v.waterVolume||0)+amount;
 v.events.push({time:new Date().toISOString(),type:'addition',text:`Added ${amount} ${liquid?'mL':c.state==='gas'?'mL gas':'g'} ${c.name}${c.state==='aqueous'&&c.category!=='indicator'?` (${concentration} mol/dm³)`:''}.`});
 if(v.events.length>200)v.events.splice(0,v.events.length-200);return resolve(v);
}
function product(formula,name,state='gas',color='#edf4f5'){return {id:`product:${formula}`,formula,name,state,color,category:state==='gas'?'gas':'other'};}
function reaction(a,b,v){
 const ca=a.chem,cb=b?.chem,acid=acidAnion[ca.id]?ca:cb&&acidAnion[cb.id]?cb:null,other=acid?(acid===ca?cb:ca):null;
 if(acid&&other){
 const an=acidAnion[acid.id],cat=baseCation[other.id]||oxideCation[other.id]||(other.anion==='OH-'?other.cation:null)||Object.entries(oxideCation).find(([id])=>({cuo:'CuO',mgo:'MgO',zno:'ZnO',fe2o3:'Fe2O3'})[id]===other.formula)?.[1];
  if(cat){const s=salt(cat,an);return {left:[acid,other],right:[s,...(other.id==='nh3'?[]:[product('H2O','water','liquid')])],kind:'Neutralisation',ionic:'H⁺(aq) + OH⁻(aq) → H₂O(l) (alkalis)',observation:`${s.name} forms${oxideCation[other.id]?' as the oxide dissolves':''}.`,heat:'exothermic'};}
  if(other.anion==='CO3^2-'||other.anion==='HCO3-'){const s=salt(other.cation,an);return {left:[acid,other],right:[s,product('CO2','carbon dioxide'),product('H2O','water','liquid')],kind:'Acid + carbonate',ionic:'CO₃²⁻ + 2H⁺ → CO₂ + H₂O',observation:'Effervescence: carbon dioxide is released.',heat:'not modelled'};}
  if(metalCation[other.id]&&acid.id!=='hno3'){
   if(['cu','ag','au'].includes(other.id))return null;
   if(other.id==='pb'&&['hcl','h2so4'].includes(acid.id))return null;
   const s=salt(metalCation[other.id],an);return {left:[acid,other],right:[s,product('H2','hydrogen')],kind:'Metal + acid',ionic:'Metal atoms lose electrons; H⁺ gains electrons to form H₂.',observation:'Bubbles of hydrogen form; the metal is consumed up to the limiting amount. Aluminium can show a delay due to its oxide layer.',heat:'exothermic'};
  }
 }
 if(cb&&((ca.id==='h2o2'&&['mno2_cat','mno2'].includes(cb.id))||(cb.id==='h2o2'&&['mno2_cat','mno2'].includes(ca.id)))){const p=ca.id==='h2o2'?ca:cb;return {left:[p],right:[product('H2O','water','liquid'),product('O2','oxygen')],kind:'Catalytic decomposition',observation:'Oxygen bubbles form. MnO₂ remains chemically unchanged.',condition:'MnO₂ catalyst',heat:'exothermic'};}
 if(cb&&((metalCation[ca.id]&&cb.category==='salt')||(metalCation[cb.id]&&ca.category==='salt'))){
  const m=metalCation[ca.id]?ca:cb,s=m===ca?cb:ca;const order=['K+','Na+','Li+','Ca2+','Mg2+','Al3+','Zn2+','Fe2+','Pb2+','Cu2+','Ag+'];
  if(s.state==='aqueous'&&s.cation&&order.includes(s.cation)&&order.indexOf(metalCation[m.id])<order.indexOf(s.cation)&&!['k','na','li','ca'].includes(m.id)){
   const deposited=Object.entries(metalCation).find(([,c])=>c===s.cation)?.[0];
   if(deposited){let p=product(cations[s.cation][0],cations[s.cation][2],'solid',s.cation==='Cu2+'?'#c88458':'#aab8c4');p.category='metal';p.id=deposited;return {left:[m,s],right:[salt(metalCation[m.id],s.anion),p],kind:'Metal displacement',observation:`${p.name} deposits on the more reactive metal.`,heat:'exothermic'};}
  }
 }
 if(cb&&((ca.category==='halogen'&&cb.anion)||(cb.category==='halogen'&&ca.anion))){
  const h=ca.category==='halogen'?ca:cb,s=h===ca?cb:ca,rank={'Cl-':1,'Br-':2,'I-':3},released={'Br-':['Br2','bromine','#bd743c'],'I-':['I2','iodine','#9c6541']};
  if(h.halogen_rank<rank[s.anion]&&released[s.anion]&&s.state==='aqueous'){
   const f=released[s.anion],an=h.halogen_rank===1?'Cl-':'Br-';return {left:[h,s],right:[salt(s.cation,an),product(f[0],f[1],'aqueous',f[2])],kind:'Halogen displacement',observation:`${f[1]} forms; the solution changes colour.`,heat:'not modelled'};
  }
 }
 if(cb&&ca.state==='aqueous'&&cb.state==='aqueous'&&ca.cation&&ca.anion&&cb.cation&&cb.anion&&ca.cation!==cb.cation&&ca.anion!==cb.anion){
  if((ca.cation==='NH4+'&&cb.anion==='OH-')||(cb.cation==='NH4+'&&ca.anion==='OH-')){
   if(!v.heated)return null;const am=ca.cation==='NH4+'?ca:cb,base=am===ca?cb:ca;return {left:[am,base],right:[salt(base.cation,am.anion),product('NH3','ammonia'),product('H2O','water','liquid')],kind:'Ammonium test',observation:'Ammonia is released on warming; damp red litmus turns blue.',condition:'warm gently',heat:'not modelled'};
  }
  const s1=salt(ca.cation,cb.anion),s2=salt(cb.cation,ca.anion);if(s1.state==='solid'||s2.state==='solid')return {left:[ca,cb],right:[s1,s2],kind:'Precipitation',observation:`An insoluble ${(s1.state==='solid'?s1:s2).name} precipitate forms.`,heat:'not modelled'};
 }
 if(!cb&&['k','na','li','ca'].includes(ca.id)&&(v.waterVolume||0)/18.015>(v.waterConsumed||0)+1e-10&&!v.contents.some(s=>s.chem.category==='acid')){
  const hydroxide=salt(metalCation[ca.id],'OH-');hydroxide.id=({k:'koh',na:'naoh',li:'salt:Li+:OH-',ca:'caoh2'})[ca.id];hydroxide.category='base';
  const water={...product('H2O','water','liquid'),solvent:true};return {left:[ca,water],right:[hydroxide,product('H2','hydrogen')],kind:'Metal + water',observation:'Hydrogen and an alkaline metal hydroxide form. Relative violence, ignition and reaction speed are not simulated.',heat:'exothermic'};
 }
 if(!cb&&v.heated&&['cuco3','caco3','mgco3'].includes(ca.id)&&v.temp>=250){const ox=ca.id==='cuco3'?'CuO':ca.id==='caco3'?'CaO':'MgO';return {left:[ca],right:[product(ox,ox==='CuO'?'copper(II) oxide':'metal oxide','solid',ox==='CuO'?'#263444':'#eeeeee'),product('CO2','carbon dioxide')],kind:'Thermal decomposition',observation:'Carbon dioxide is released. The model uses a fixed heating threshold, not a real decomposition temperature.',condition:'strong heat (simplified)',heat:'endothermic'};}
 return null;
}
export function resolve(v){
 if((v.waterVolume||0)>0)for(const s of v.contents){const c=s.chem;if(c.state==='solid'&&c.category==='salt'&&c.cation&&c.anion&&soluble(c.cation,c.anion))c.state='aqueous';}
 let count=0;
 while(count++<40){
  let chosen=null;const live=v.contents.filter(s=>s.n>1e-10);
  outer:for(let i=0;i<live.length;i++){for(let j=i+1;j<live.length;j++){const r=reaction(live[i],live[j],v);if(r){chosen=r;break outer;}}const r=reaction(live[i],null,v);if(r){chosen=r;break;}}
  if(!chosen)break;
  const r=chosen;let eq;try{eq=balance(r.left.map(c=>c.formula),r.right.map(c=>c.formula));}catch{break;}
  const substrates=r.left.map(c=>c.solvent?{chem:c,n:Math.max(0,(v.waterVolume||0)/18.015-(v.waterConsumed||0)),solvent:true}:v.contents.find(s=>s.chem.id===c.id&&s.n>1e-10));
  const extent=Math.min(...substrates.map((s,i)=>s.n/eq.coefficients[i]));if(!Number.isFinite(extent)||extent<1e-12)break;
  substrates.forEach((s,i)=>{const used=extent*eq.coefficients[i];if(s.solvent)v.waterConsumed=(v.waterConsumed||0)+used;s.n=Math.max(0,s.n-used);});
  r.right.forEach((c,i)=>{const n=extent*eq.coefficients[i+r.left.length];if(c.state==='gas')v.gas[c.formula]=(v.gas[c.formula]||0)+n;else if(c.formula!=='H2O')addSpecies(v,c,n);});
  const states=r.left.map(c=>c.state).concat(r.right.map(c=>c.state));const phase={aqueous:'aq',solid:'s',liquid:'l',gas:'g'};
  const stateEquation=[r.left.map((c,i)=>(eq.coefficients[i]===1?'':eq.coefficients[i])+c.formula+`(${phase[states[i]]})`).join(' + '),r.right.map((c,i)=>{const j=i+r.left.length;return (eq.coefficients[j]===1?'':eq.coefficients[j])+c.formula+`(${phase[states[j]]})`;}).join(' + ')].join(' → ');
  v.events.push({time:new Date().toISOString(),type:'reaction',text:r.observation,kind:r.kind,equation:stateEquation,ionic:r.ionic||'',condition:r.condition||'',heat:r.heat,extent,limiting:substrates.filter(s=>s.n<1e-10).map(s=>s.chem.name).join(', ')});
 }
 v.contents=v.contents.filter(s=>s.n>1e-10);if(v.events.length>200)v.events.splice(0,v.events.length-200);return v;
}
// Charge balance at 25°C, ideal concentrations. Acetate/ammonium equilibria included.
export function ph(v){
 if(v.volume<=0)return null;let fixed=0,wa=0,wb=0;let unknown=false;
 for(const {chem:c,n} of v.contents){
  if(c.state!=='aqueous'||c.category==='indicator')continue;
  if(acidAnion[c.id]){if(c.id==='acetic')wa+=n;else fixed-=n*(c.id==='h2so4'?2:1);}
  else if(baseCation[c.id]){if(c.id==='nh3')wb+=n;else fixed+=n*cations[baseCation[c.id]][1];}
  else if(c.cation&&c.anion&&cations[c.cation]&&anions[c.anion]){
   const s=salt(c.cation,c.anion);if(c.cation==='NH4+')wb+=s.nc*n;else fixed+=s.nc*n*cations[c.cation][1];
 if(c.anion==='CH3COO-')wa+=s.na*n;else if(c.anion!=='OH-')fixed-=s.na*n*anions[c.anion][1];
 if(!['Na+','K+','Li+','Ca2+','Ba2+','NH4+'].includes(c.cation)||!['Cl-','Br-','I-','NO3-','SO4^2-','CH3COO-','OH-'].includes(c.anion))unknown=true;
  }else if(!['water','product:I2','product:Br2'].includes(c.id))unknown=true;
 }
 if(unknown)return null;
 const L=v.volume/1000,Ka=1.75e-5,KbAcid=5.6e-10;
 const charge=p=>{const H=10**(-p);return H-1e-14/H+fixed/L+wb/L*H/(H+KbAcid)-wa/L*Ka/(Ka+H);};
 let lo=-2,hi=16;for(let i=0;i<100;i++){const p=(lo+hi)/2;if(charge(p)>0)lo=p;else hi=p;}return (lo+hi)/2;
}
export function indicatorColor(id,p){
 if(p===null)return '#c4d8e8';
 if(id==='phenol')return p>=8.2?'#ed71b4':'#d9edf4';
 if(id==='methylorange')return p<3.1?'#f36a67':p<=4.4?'#f49e48':'#f0ce49';
 if(id==='litmus')return p<5?'#ed7893':p>8?'#688eef':'#ac82d3';
 if(id==='bromothymol')return p<6?'#e4cd48':p>7.6?'#448ed1':'#65ae79';
 if(id==='methylred')return p<4.4?'#f16b78':p>6.2?'#e8cf56':'#ef9d59';
 const stops=['#ef7274','#f18958','#efbb46','#d7cc55','#67b881','#47b8b0','#518cc9','#8e70b9'];return stops[clamp(Math.floor(p/2),0,7)];
}
export function appearance(v){
 const p=ph(v),last=[...v.events].reverse().find(e=>e.type==='reaction');let color='#a9dceb';
 const coloured=v.contents.find(s=>{if(s.chem.state!=='aqueous')return false;const rgb=s.chem.color.match(/[a-f0-9]{2}/gi)?.map(x=>parseInt(x,16));return rgb&&Math.max(...rgb)-Math.min(...rgb)>50;});if(coloured)color=coloured.chem.color;
 if(v.indicator)color=indicatorColor(v.indicator,p);
 return {ph:p,color,precip:v.contents.filter(s=>s.chem.state==='solid'),last};
}
export function transfer(source,target,percent){
 if(!Number.isFinite(percent)||percent<=0||percent>100)throw Error('Choose a percentage between 0 and 100.');
 if(source===target)throw Error('Choose a different receiving vessel.');if(source.volume<=0)throw Error('The source has no liquid to transfer.');
 const f=percent/100,ml=source.volume*f;if(target.volume+ml>target.capacity+1e-8)throw Error('The receiving vessel would overflow.');
 const oldTarget=target.volume;target.temp=(target.temp*oldTarget+source.temp*ml)/(oldTarget+ml);target.volume+=ml;source.volume-=ml;
 const water=(source.waterVolume||0)*f,used=(source.waterConsumed||0)*f;target.waterVolume=(target.waterVolume||0)+water;source.waterVolume=(source.waterVolume||0)-water;target.waterConsumed=(target.waterConsumed||0)+used;source.waterConsumed=(source.waterConsumed||0)-used;
 for(const s of source.contents){addSpecies(target,s.chem,s.n*f);s.n*=1-f;}source.contents=source.contents.filter(s=>s.n>1e-10);
 if(source.indicator)target.indicator=source.indicator;if(f===1)delete source.indicator;
 target.events.push({time:new Date().toISOString(),type:'transfer',text:`Transferred ${ml.toFixed(2)} mL (${percent}% of a stirred mixture) from ${source.name}.`});source.events.push({time:new Date().toISOString(),type:'transfer',text:`Transferred ${ml.toFixed(2)} mL to ${target.name}.`});resolve(target);
}
export function filterVessel(source,target){
 if(source===target||source.volume<=0)throw Error('Choose a different vessel and a liquid mixture.');
 if(target.volume+source.volume>target.capacity)throw Error('The receiving vessel would overflow.');
 const solids=source.contents.filter(s=>s.chem.state==='solid'),liquid=source.contents.filter(s=>s.chem.state!=='solid');
 if(!solids.length)throw Error('There is no solid residue to filter.');
 const t=(source.temp*source.volume+target.temp*target.volume)/(source.volume+target.volume);for(const s of liquid)addSpecies(target,s.chem,s.n);target.volume+=source.volume;target.temp=t;source.volume=0;source.contents=solids;if(source.indicator)target.indicator=source.indicator;delete source.indicator;
 target.waterVolume=(target.waterVolume||0)+(source.waterVolume||0);target.waterConsumed=(target.waterConsumed||0)+(source.waterConsumed||0);source.waterVolume=0;source.waterConsumed=0;
 source.events.push({time:new Date().toISOString(),type:'separation',text:`Filtered into ${target.name}; insoluble solid retained here as residue.`});target.events.push({time:new Date().toISOString(),type:'separation',text:`Filtrate collected from ${source.name}.`});resolve(target);
}
export const gasTests={H2:['Lighted splint','A squeaky pop.'],O2:['Glowing splint','The splint relights.'],CO2:['Bubble through limewater','Limewater turns cloudy as CaCO₃ forms.'],NH3:['Damp red litmus','The paper turns blue.'],Cl2:['Damp blue litmus','The paper turns red, then bleaches white.']};
export function evaporate(v,ml){
 if(!Number.isFinite(ml)||ml<=0||ml>v.volume)throw Error('Remove a positive volume no larger than the liquid present.');
 if(v.volume-(v.waterVolume||0)>1e-6)throw Error('This evaporation model is for aqueous samples, not organic solvent mixtures.');
 if(Math.abs(ml-v.volume)<1e-8&&v.contents.some(s=>s.chem.state!=='solid'&&s.chem.category!=='salt'))throw Error('For this model, evaporate to dryness only when the solution contains salts. Use partial evaporation for other mixtures.');
 const fraction=ml/v.volume;v.waterVolume=Math.max(0,(v.waterVolume||0)*(1-fraction));v.waterConsumed=(v.waterConsumed||0)*(1-fraction);v.volume=Math.max(0,v.volume-ml);v.temp=100;v.heated=true;
 if(v.volume<1e-8){v.volume=0;v.waterVolume=0;v.waterConsumed=0;v.contents.forEach(s=>s.chem.state='solid');delete v.indicator;}
 v.events.push({time:new Date().toISOString(),type:'evaporation',text:`Removed ${fmtVolume(ml)} mL water (controlled solvent-removal model). ${v.volume===0?'Non-volatile residue remains; hydrated salt dehydration is outside this model.':'Solutes are more concentrated. Solubility limits are not applied.'}`});
}
function fmtVolume(n){return Number(n.toFixed(3));}
