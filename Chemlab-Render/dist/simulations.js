import {clamp} from './chemistry.js';
import {testCases,organicReactions} from './curriculum.js';
import {esc,fmt,glassware,chart} from './ui.js';
const range=(key,label,min,max,step,value,unit='')=>({key,label,min,max,step,value,unit});
const select=(key,label,options,value=0)=>({key,label,options,value});
export const controls={
 titration:[range('acidC','Acid concentration',.05,.5,.05,.1,'mol/dm³'),range('baseC','Alkali concentration',.05,.5,.05,.1,'mol/dm³'),range('acidV','Acid volume',10,50,5,25,'mL'),range('added','NaOH added',0,750,.05,0,'mL')],
 rates:[range('conc','HCl concentration',.1,2,.1,1,'mol/dm³'),range('mass','Marble mass',.05,1,.05,.2,'g'),range('surface','Relative surface area',1,5,1,1,'×'),range('temp','Temperature',10,60,5,20,'°C'),range('time','Time',0,120,1,30,'s')],
 peroxide:[range('conc','H₂O₂ concentration',.1,1,.1,.5,'mol/dm³'),select('catalyst','Solid catalyst',['None','MnO₂','CuO','Sand'],1),range('time','Time',0,120,1,30,'s')],
 chromatography:[range('front','Solvent-front distance',2,10,.2,8,'cm'),select('ink','Sample',['Mixed ink A','Mixed ink B','Reference dye C'])],
 electrolysis:[select('solution','Electrolyte & electrodes',['Concentrated NaCl · inert','Dilute NaCl · inert','CuSO₄ · inert','CuSO₄ · copper','Molten PbBr₂ · inert']),range('current','Current',.1,2,.1,1,'A'),range('time','Time',10,300,10,60,'s')],
 energetics:[select('kind','Experiment',['Neutralisation','Zinc + copper sulfate','Ammonium nitrate dissolving','Ethanol combustion']),range('mass','Water / solution mass',50,250,10,100,'g'),range('amount','Amount reacted',.001,.02,.001,.005,'mol'),range('efficiency','Heat retained',30,100,5,80,'%')],
 solubility:[range('temp','Temperature',0,100,5,40,'°C'),range('water','Water mass',10,100,5,50,'g'),range('solute','Solute added',5,100,1,30,'g')],
 oxide:[range('metal','Magnesium mass',.12,1.2,.12,.24,'g'),range('final','Magnesium oxide mass',.2,2,.02,.4,'g')],
 oxygen:[range('initial','Initial air volume',50,200,10,100,'mL'),range('removed','Measured volume decrease',0,50,1,21,'mL')],
 metals:[select('metal','Metal',['Magnesium','Zinc','Iron','Copper']),range('conc','HCl concentration',.1,2,.1,1,'mol/dm³'),range('time','Time',0,120,1,30,'s')],
 crystals:[range('acid','Sulfuric acid volume',10,100,5,50,'mL'),range('conc','Acid concentration',.1,1,.1,.5,'mol/dm³'),range('oxide','CuO mass',.1,6,.1,3,'g'),range('recovery','Crystal recovery',20,90,5,70,'%')],
 precipitation:[range('lead','0.10 M Pb(NO₃)₂ volume',5,100,5,25,'mL'),range('sulfate','0.10 M Na₂SO₄ volume',5,100,5,25,'mL')],
 ester:[range('acid','Initial ethanoic acid',.01,.1,.01,.05,'mol'),range('alcohol','Initial ethanol',.01,.1,.01,.05,'mol')],
 analysis:[select('ion','Sample',testCases.map(t=>t.ion)),select('reagent','Reagent set',[...new Set(testCases.map(t=>t.reagent))])],
 flames:[select('ion','Cation',['Lithium','Sodium','Potassium','Calcium','Copper(II)'])],
 equilibrium:[range('temp','Temperature',200,600,20,400,'°C'),range('pressure','Pressure',1,300,10,101,'atm'),select('catalyst','Catalyst',['Absent','Present'])],
 particles:[select('state','State',['Solid','Liquid','Gas']),range('temp','Relative particle energy',1,5,1,2,'×')],
 organic:[select('reaction','Reaction family',organicReactions.map(r=>r[0]))]
};
export const defaults=id=>Object.fromEntries(controls[id].map(c=>[c.key,c.value]));
const curve=(max,k)=>Array.from({length:61},(_,i)=>[i*2,max*(1-Math.exp(-k*i*2))]);
export function titrationPH(aV,aC,bV,bC){const net=(aV*aC-bV*bC)/1000,L=(aV+bV)/1000,charge=net/L,H=(charge+Math.sqrt(charge*charge+4e-14))/2;return charge>=0?-Math.log10(H):14+Math.log10((-charge+Math.sqrt(charge*charge+4e-14))/2);}
export function simulate(id,p){
 let metrics=[],points=null,xLabel='Time / s',yLabel='Gas volume / mL',text='',equation='',color='#69b6dc',marker=null;
 const m=(k,v)=>metrics.push([k,v]);
 if(id==='titration'){
  const ph=titrationPH(p.acidV,p.acidC,p.added,p.baseC),eq=p.acidV*p.acidC/p.baseC;
  m('pH (25°C, ideal)',fmt(ph,2));m('Equivalence volume',fmt(eq)+' mL');m('NaOH delivered',fmt(p.added)+' mL');
  text=p.added<eq?'Acid is in excess. Add alkali slowly as you approach equivalence.':Math.abs(p.added-eq)<.0001?'Stoichiometric equivalence: pH 7 for this strong acid–strong base pair.':'Alkali is in excess.';
  const maxV=Math.max(100,eq*1.4,p.added);points=Array.from({length:401},(_,i)=>[i*maxV/400,titrationPH(p.acidV,p.acidC,i*maxV/400,p.baseC)]);points.push([eq,7]);points.sort((a,b)=>a[0]-b[0]);xLabel='NaOH added / mL';yLabel='pH';marker=[p.added,ph];color=ph<6?'#eccb72':ph>8?'#dc80bc':'#8bc9a4';
 }
 if(id==='rates'){
  const n=Math.min(p.mass/100.09,.025*p.conc/2),max=n*24000,k=.025*p.conc*p.surface*2**((p.temp-20)/10),v=max*(1-Math.exp(-k*p.time));
  m('CO₂ at selected time',fmt(v)+' mL');m('Theoretical final CO₂',fmt(max)+' mL');m('Initial rate',fmt(max*k)+' mL/s');text='25 mL HCl; calcium carbonate molar mass 100.09 g/mol. Rate constants are illustrative; gas volumes use stoichiometry at room conditions.';points=curve(max,k);marker=[p.time,v];
 }
 if(id==='peroxide'){
  const max=.025*p.conc/2*24000,k=[.002,.065,.025,.002][p.catalyst],v=max*(1-Math.exp(-k*p.time));m('O₂ at selected time',fmt(v)+' mL');m('Final O₂ (25 mL sample)',fmt(max)+' mL');m('Catalyst consumed','0 mol');text='Illustrative catalyst rate constants. The same peroxide amount gives the same final oxygen amount.';points=curve(max,k);marker=[p.time,v];
 }
 if(id==='metals'){
  const k=[.08,.025,.009,0][p.metal]*p.conc,max=p.metal===3?0:.025*p.conc/2*24000,v=max*(1-Math.exp(-k*p.time));m('Hydrogen collected',fmt(v)+' mL');m('Limiting acid volume','25 mL');m('Acid-limited maximum',fmt(max)+' mL');text=p.metal===3?'Copper gives no hydrogen with dilute hydrochloric acid.':'Metal is in excess with comparable exposed surface. Illustrative rates; the model compares trends.';points=curve(max,k);marker=[p.time,v];
 }
 if(id==='chromatography'){
  const rf=[[.22,.52,.81],[.22,.65],[.52]][p.ink];rf.forEach((r,i)=>m('Spot '+(i+1),fmt(p.front*r)+' cm · Rf '+r));m('Solvent front',fmt(p.front)+' cm');text='Distances measured from the pencil baseline. Samples sharing a spot may share a component; identification needs matching conditions.';
 }
 if(id==='electrolysis'){
  const cases=[['Hydrogen','Chlorine','2H₂O + 2e⁻ → H₂ + 2OH⁻','2Cl⁻ → Cl₂ + 2e⁻'],['Hydrogen','Oxygen','2H₂O + 2e⁻ → H₂ + 2OH⁻','4OH⁻ → O₂ + 2H₂O + 4e⁻'],['Copper','Oxygen','Cu²⁺ + 2e⁻ → Cu','4OH⁻ → O₂ + 2H₂O + 4e⁻'],['Copper','Copper dissolves','Cu²⁺ + 2e⁻ → Cu','Cu → Cu²⁺ + 2e⁻'],['Lead','Bromine','Pb²⁺ + 2e⁻ → Pb','2Br⁻ → Br₂ + 2e⁻']];
  const c=cases[p.solution],ne=p.current*p.time/96485;m('Cathode (−)',c[0]);m('Anode (+)',c[1]);m('Charge transferred',fmt(p.current*p.time)+' C');m('Moles of electrons',ne.toExponential(3)+' mol');equation='Cathode: '+c[2]+'\nAnode: '+c[3];text='Products assume the named conditions. Ideal Faraday calculation, 100% current efficiency; extension beyond the required quantitative syllabus. Electrode choice matters.';
 }
 if(id==='energetics'){
  const dh=[-57,-218,25.7,-1367][p.kind],q=-dh*1000*p.amount*p.efficiency/100,dt=q/(p.mass*4.18);m('Final temperature',fmt(20+dt)+' °C');m('Temperature change',fmt(dt)+' °C');m('Heat gained by water',fmt(q)+' J');m('Apparent ΔH',fmt(-q/p.amount/1000)+' kJ/mol');text='Illustrative molar enthalpies, initial temperature 20°C, c = 4.18 J g⁻¹ °C⁻¹. Negative ΔH is exothermic. Heat retained models losses.';color=dt>=0?'#dfb287':'#83b4e8';
 }
 if(id==='solubility'){
  const sol=t=>20+.7*t+.004*t*t,capacity=sol(p.temp)*p.water/100,dissolved=Math.min(p.solute,capacity),cool=Math.max(0,dissolved-sol(20)*p.water/100);m('Solubility at this temperature',fmt(sol(p.temp))+' g / 100 g water');m('Dissolved',fmt(dissolved)+' g');m('Undissolved residue',fmt(p.solute-dissolved)+' g');m('Crystals on cooling to 20°C',p.temp>=20?fmt(cool)+' g':'Warm to 20°C; no cooling yield');text='Synthetic teaching dataset for a model solute; this curve is not a measured real chemical. Saturation and mass-balance calculations are exact for this dataset.';points=Array.from({length:21},(_,i)=>[i*5,sol(i*5)]);xLabel='Temperature / °C';yLabel='g solute per 100 g water';marker=[p.temp,sol(p.temp)];
 }
 if(id==='oxide'){
  const o=p.final-p.metal,ratio=o>0?(o/16)/(p.metal/24):0;m('Oxygen gained',fmt(o,3)+' g');m('Moles of magnesium',fmt(p.metal/24,4));m('Moles of oxygen atoms',o>0?fmt(o/16,4):'Invalid final mass');m('Mg : O mole ratio',o>0?'1 : '+fmt(ratio):'—');text=o<=0?'Final oxide mass must exceed starting magnesium mass.':Math.abs(ratio-1)<.1?'The ratio supports the empirical formula MgO (Ar: Mg 24, O 16).':'The data do not give a 1:1 ratio. Consider incomplete reaction, product loss or measurement errors.';
 }
 if(id==='oxygen'){m('Final air volume',fmt(p.initial-p.removed)+' mL');m('Measured oxygen fraction',fmt(p.removed/p.initial*100)+'%');text='A good experimental result is near 21%. This calculation uses your measured decrease; it does not force the expected answer. Equal temperature and pressure are assumed.';}
 if(id==='crystals'){
  const acid=p.acid/1000*p.conc,oxide=p.oxide/79.55,n=Math.min(acid,oxide);m('Limiting reactant',acid<oxide?'Sulfuric acid':'Copper(II) oxide');m('Excess oxide residue',fmt(Math.max(0,oxide-acid)*79.55)+' g');m('CuSO₄·5H₂O theoretical',fmt(n*249.68)+' g');m('Expected recovered crystals',fmt(n*249.68*p.recovery/100)+' g');text='Product is copper(II) sulfate pentahydrate. A recovery setting represents crystallisation and transfer losses. Filter excess CuO before crystallising.';color='#4d9ed2';
 }
 if(id==='precipitation'){const n=Math.min(p.lead,p.sulfate)*.1/1000;m('PbSO₄ formed',fmt(n*303.26,3)+' g');m('Precipitate amount',n.toExponential(3)+' mol');m('Limiting solution',p.lead===p.sulfate?'Both in stoichiometric ratio':p.lead<p.sulfate?'Lead nitrate':'Sodium sulfate');text='White lead(II) sulfate is the residue. Wash it to remove soluble sodium nitrate. This is a virtual representation; lead compounds are toxic.';color='#c9d9e1';}
 if(id==='ester'){
  // K = x² / ((a-x)(b-x)) = 4 for this ideal teaching mixture.
  let lo=0,hi=Math.min(p.acid,p.alcohol);for(let i=0;i<80;i++){let x=(lo+hi)/2;if(x*x/((p.acid-x)*(p.alcohol-x))>4)hi=x;else lo=x;}const x=(lo+hi)/2;
  m('Equilibrium ethyl ethanoate',fmt(x,4)+' mol');m('Ethanoic acid remaining',fmt(p.acid-x,4)+' mol');m('Ethanol remaining',fmt(p.alcohol-x,4)+' mol');text='Idealised reversible reaction with teaching value K = 4 and no initial water or ester. This is illustrative, not an experimental prediction. A catalyst changes rate, not this equilibrium.';
 }
 if(id==='analysis'){const t=testCases[p.ion],chosen=[...new Set(testCases.map(t=>t.reagent))][p.reagent],match=t.reagent===chosen;m('Sample',t.ion);m('Reagent',chosen);m('Interpretation',match?'Characteristic positive test':'Choose the matching reagent for a diagnostic result');text=match?t.obs:'This combination is not a diagnostic test in this exercise. It does not assert that no chemistry would occur.';equation=match?t.eq:'';color=match?t.color:'#bdcfda';}
 if(id==='flames'){const f=[['crimson red','#ed6371'],['yellow','#eac14e'],['lilac','#b49ae3'],['orange-red','#ed9060'],['blue-green','#54c8bc']][p.ion];m('Cation',['Li⁺','Na⁺','K⁺','Ca²⁺','Cu²⁺'][p.ion]);m('Characteristic flame',f[0]);text='Clean the wire loop to avoid contamination. Screen colours approximate the visual observations and depend on your display.';color=f[1];}
 if(id==='equilibrium'){m('Pressure effect',p.pressure>101?'Shifts towards NH₃':p.pressure<101?'Shifts towards N₂ + H₂':'Reference pressure');m('Temperature effect',p.temp>400?'Shifts towards N₂ + H₂':p.temp<400?'Shifts towards NH₃':'Reference temperature');m('Catalyst effect',p.catalyst?'Faster equilibrium; no position change':'Slower approach to equilibrium');text='Qualitative predictions relative to 400°C and 101 atm, considered independently. Combined changes cannot be ranked without thermodynamic data. No equilibrium yield is asserted.';}
 if(id==='particles'){m('State',['Solid','Liquid','Gas'][p.state]);m('Arrangement',['Regular and closely packed','Close, irregular and mobile','Widely spaced and mobile'][p.state]);text=['Particles vibrate about fixed positions.','Particles move past one another.','Particles move randomly in all directions.'][p.state]+' Animation illustrates motion; it is not a molecular dynamics calculation.';}
 if(id==='organic'){const r=organicReactions[p.reaction];m('Reaction',r[0]);equation=r[1];text=r[2];}
 return {metrics,points,xLabel,yLabel,text,equation,color,marker};
}
export function controlHTML(id,p){return controls[id].map(c=>`<div class="field"><label for="sim-${c.key}">${esc(c.label)}${!c.options?`<output>${fmt(p[c.key],3)} ${esc(c.unit)}</output>`:''}</label>${c.options?`<select id="sim-${c.key}" data-param="${c.key}">${c.options.map((o,i)=>`<option value="${i}" ${p[c.key]===i?'selected':''}>${esc(o)}</option>`).join('')}</select>`:`<input id="sim-${c.key}" data-param="${c.key}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${p[c.key]}">`}</div>`).join('');}
export function stageHTML(id,p,r){
 let art=glassware('flask',r.color,.45,'#edf1f5',id==='precipitation',id==='rates'||id==='peroxide',id==='ester');
 if(id==='chromatography'){
  const rf=[[.22,.52,.81],[.22,.65],[.52]][p.ink],front=45+(10-p.front)*10;
  art=`<svg class="sim-svg" viewBox="0 0 320 220" role="img" aria-label="Chromatogram with separated spots"><rect x="94" y="14" width="132" height="190" rx="7" fill="#ffffffad" stroke="#9eb8c9"/><path d="M95 182h130" stroke="#7e92a6" stroke-dasharray="3 3"/><text x="232" y="185" font-size="9" fill="#8395a8">baseline</text><path d="M95 ${front}h130" stroke="#73a6cb" stroke-dasharray="4 3"/><text x="232" y="${front+3}" font-size="9" fill="#8395a8">front</text>${rf.map((v,i)=>`<ellipse cx="160" cy="${182-(182-front)*v}" rx="14" ry="6" fill="${['#6ca4d5','#ca8fb9','#d9bc64'][i]}" opacity=".7"/>`).join('')}<path d="M79 208h162" stroke="#adbfcd"/></svg>`;
 }else if(id==='electrolysis')art=`<svg class="sim-svg" viewBox="0 0 320 220" role="img" aria-label="Electrolysis cell: negative cathode and positive anode"><path d="M55 83V188Q55 203 70 203H250Q265 203 265 188V83" fill="#9bc9e450" stroke="#8caec7"/><rect x="57" y="123" width="206" height="67" fill="#66aedc40"/><path d="M105 165V50H215V165" fill="none" stroke="#95aac1" stroke-width="3"/><path d="M105 90v84M215 90v84" stroke="${p.solution===3?'#be956c':'#536b85'}" stroke-width="10"/><rect x="143" y="34" width="35" height="32" rx="7" fill="#fff" stroke="#9eafc2"/><text x="90" y="33" font-size="16" fill="#6593cf">−</text><text x="208" y="33" font-size="16" fill="#bd7b96">+</text><text x="160" y="54" text-anchor="middle" font-size="12" fill="#7895b3">DC</text>${Array.from({length:8},(_,i)=>`<circle class="bubble" cx="${i%2?109:213}" cy="${170-i*5}" r="3" fill="white" style="animation-delay:-${i*.2}s"/>`).join('')}</svg>`;
 else if(id==='flames')art=`<svg class="sim-svg" viewBox="0 0 320 220" role="img" aria-label="${esc(r.metrics[1][1])} flame"><ellipse cx="160" cy="203" rx="65" ry="7" fill="#6b879b20"/><path d="M140 186h40l13 16h-66Z" fill="#8b9fb4"/><rect x="151" y="141" width="18" height="48" rx="3" fill="#b5c3cf" stroke="#8a9eb4"/><path class="flame" d="M160 142C122 130 138 85 155 70C147 96 189 101 160 142Z" fill="${r.color}" opacity=".85"/><path class="flame" d="M160 142C145 130 153 114 160 107C163 119 173 129 160 142Z" fill="#ffffffab"/></svg>`;
 else if(id==='particles')art=`<svg class="sim-svg" viewBox="0 0 320 220" role="img" aria-label="Particle arrangement"><rect x="40" y="10" width="240" height="195" rx="20" fill="#ffffff40" stroke="#9db4c8"/>${Array.from({length:24},(_,i)=>{const state=['solid','liquid','gas'][p.state],x=p.state===2?60+(i*67)%198:78+(i%6)*32,y=p.state===0?75+Math.floor(i/6)*31:p.state===1?85+Math.floor(i/6)*28+(i%2)*7:28+(i*41)%155;return `<circle class="particle ${state}" cx="${x}" cy="${y}" r="8" fill="#72acd8" stroke="#ffffff90" style="--dx:${(i%2?1:-1)*(p.state===2?18:5)}px;--dy:${(i%3-1)*(p.state===2?20:6)}px;animation-duration:${(p.state===2?4:8)/p.temp}s;animation-delay:-${i*.3}s"/>`;}).join('')}</svg>`;
 else if(id==='titration')art=`<div style="position:relative;height:215px;width:180px"><svg style="height:95px;width:100%;position:absolute;top:0" viewBox="0 0 180 100" aria-hidden="true"><path d="M85 0v66h10V0M90 66v23m-7-20h14" fill="#c6dfef80" stroke="#86a5bf"/><circle cx="90" cy="97" r="2.5" fill="#85b6db"/></svg><div style="position:absolute;top:75px;left:20px;width:140px;height:140px">${glassware('flask',r.color,.4)}</div></div>`;
 else art=`<div style="height:210px;width:175px">${art}</div>`;
 const title=id==='particles'?['Solid','Liquid','Gas'][p.state]:id==='flames'?r.metrics[1][1]:id==='titration'?'pH '+r.metrics[0][1]:r.metrics[0]?.[1]||'';
 return `${art}<h2>${esc(title)}</h2><p>${esc(id==='flames'?r.metrics[0][1]:id==='titration'?'HCl + NaOH · universal indicator visual':r.metrics[0]?.[0]||'')}</p>`;
}
export function graphHTML(r,compare){return r.points?chart(r.points,{xLabel:r.xLabel,yLabel:r.yLabel,compare:compare?.points||null,marker:r.marker}):'';}
