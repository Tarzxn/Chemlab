import {labKey,labObject,normaliseAssembly,moveAssembly,detachLabObject,findLabSnap,commitLabSnap} from './assembly.js';
import {chemicals} from './data.js';
import {esc,fmt,glassware,icon} from './ui.js';
import {appearance,resolve,molarMass} from './chemistry.js';

export const apparatusKinds={bottle:{name:'Reagent bottle',width:100,height:155},burner:{name:'Bunsen burner',width:100,height:135},burette:{name:'Burette',width:85,height:270},syringe:{name:'Gas syringe',width:220,height:90},funnel:{name:'Filter funnel',width:105,height:150},thermometer:{name:'Thermometer',width:70,height:190},balance:{name:'Balance',width:160,height:120},stand:{name:'Retort stand',width:150,height:280},stopwatch:{name:'Stopwatch',width:110,height:120}};
export function newSandbox(){return {version:1,zoom:.8,panX:-40,panY:-30,nextId:1,items:[],attachments:[],selectedItem:null,dosing:{volume:10,mass:.1,gas:10,concentration:.1,transfer:50}};}
export function fitSandbox(state,width=600,height=650){
 const objects=[...state.vessels.map(v=>({x:v.x,y:v.y,w:160,h:260})),...state.sandbox.items.map(i=>({x:i.x,y:i.y,w:apparatusKinds[i.kind].width,h:apparatusKinds[i.kind].height+65}))];
 if(!objects.length){state.sandbox.zoom=.8;state.sandbox.panX=0;state.sandbox.panY=0;return;}
 const minX=Math.min(...objects.map(o=>o.x)),maxX=Math.max(...objects.map(o=>o.x+o.w)),minY=Math.min(...objects.map(o=>o.y)),maxY=Math.max(...objects.map(o=>o.y+o.h));
 const zoom=Math.max(.35,Math.min(1.25,width/(maxX-minX+100),(height-60)/(maxY-minY+100)));
 state.sandbox.zoom=zoom;state.sandbox.panX=(width-(minX+maxX)*zoom)/2;state.sandbox.panY=(height-60-(minY+maxY)*zoom)/2;state.sandbox.fitted=true;
}
export function zoomSandbox(state,factor,width=600,height=650){
 const old=state.sandbox.zoom,next=Math.max(.35,Math.min(1.75,old*factor)),ratio=next/old;
 state.sandbox.panX=width/2-(width/2-state.sandbox.panX)*ratio;state.sandbox.panY=height/2-(height/2-state.sandbox.panY)*ratio;state.sandbox.zoom=next;
}
export function normaliseSandbox(state){
 const s=state.sandbox||newSandbox(),numeric=(x,lo,hi,fallback)=>Number.isFinite(x)&&x>=lo&&x<=hi?x:fallback;
 s.zoom=numeric(s.zoom,.35,1.75,.8);s.panX=numeric(s.panX,-2000,1000,-40);s.panY=numeric(s.panY,-1200,800,-30);s.nextId=numeric(s.nextId,1,100000,1);
 const ids=new Set();s.items=Array.isArray(s.items)?s.items.slice(0,30).filter(x=>x&&apparatusKinds[x.kind]&&Number.isInteger(x.id)&&x.id>0&&!ids.has(x.id)&&ids.add(x.id)).map(item=>({id:item.id,kind:item.kind,x:numeric(item.x,0,1450,600),y:numeric(item.y,0,800,250),on:Boolean(item.on),targetId:state.vessels.some(v=>v.id===item.targetId)?item.targetId:null,sourceId:state.vessels.some(v=>v.id===item.sourceId)?item.sourceId:null,loadedId:typeof item.loadedId==='string'&&/^[a-z0-9_]{1,40}$/.test(item.loadedId)?item.loadedId:null,concentration:numeric(item.concentration,.001,2,.1),remainingMl:numeric(item.remainingMl,0,50,0),deliveredMl:numeric(item.deliveredMl,0,100000,0),elapsed:numeric(item.elapsed,0,1000000,0),mountedId:Number.isInteger(item.mountedId)?item.mountedId:null})):[];
 s.nextId=Math.max(s.nextId,...s.items.map(i=>i.id+1));
 state.vessels.forEach((v,i)=>{v.x=numeric(v.x,0,1440,260+(i%5)*200);v.y=numeric(v.y,0,760,220+Math.floor(i/5)*270);});state.sandbox=s;s.selectedItem=s.items.some(i=>i.id===s.selectedItem)?s.selectedItem:null;const d=s.dosing||{};s.dosing={volume:numeric(d.volume,.001,500,10),mass:numeric(d.mass,.001,100,.1),gas:numeric(d.gas,.001,1000,10),concentration:numeric(d.concentration,.001,2,.1),transfer:numeric(d.transfer,.1,100,50)};normaliseAssembly(state);return s;
}
export function moveLabObject(state,type,id,x,y){moveAssembly(state,type,id,x,y);}
export function nearestVessel(state,item){
 return [...state.vessels].filter(v=>Math.abs(v.x+80-item.x-apparatusKinds[item.kind].width/2)<125&&v.y>item.y+30&&v.y<item.y+480).sort((a,b)=>Math.abs(a.x-item.x)-Math.abs(b.x-item.x))[0]||null;
}
export function tickSandbox(state,seconds){
 let changed=false;
 for(const item of state.sandbox?.items||[]){
  if(item.kind==='stopwatch'&&item.on){item.elapsed+=seconds;changed=true;}
  if(item.kind==='burner'&&item.on){const v=state.vessels.find(v=>v.id===item.targetId);if(v){const next=Math.min(v.volume>0?100:500,v.temp+3*seconds);if(next!==v.temp){v.temp=next;v.heated=true;resolve(v);changed=true;}}}
 }return changed;
}
function apparatusSVG(item,state,elements){
 const v=state.vessels.find(v=>v.id===item.targetId),k=item.kind;
 let body='',text='';
 if(k==='bottle'){const c=chemicals.find(c=>c.id===item.loadedId);body=`<rect x="31" y="5" width="38" height="15" rx="4" fill="#8093a7"/><path d="M34 20h32v17l16 13v88q0 8-8 8H26q-8 0-8-8V50l16-13Z" fill="${c?.color||'#abd6de'}85" stroke="#879fb5"/><path d="M27 58v72" stroke="#fff9" stroke-width="4"/><rect x="24" y="71" width="52" height="39" rx="3" fill="#f5f8f5e8"/><text x="50" y="95" text-anchor="middle" font-size="10" fill="#526a80">${esc(c?.formula||'Reagent')}</text>`;text=c?.state==='solid'?'Drag over a vessel to add solid':'Drag over a vessel to pour';}
 if(k==='burner'){body=`<path d="M15 117h70l9 13H6z" fill="#8198ae"/><rect x="42" y="52" width="16" height="67" rx="4" fill="#a7bbcd" stroke="#728aa3"/><rect x="38" y="96" width="24" height="12" rx="3" fill="#718ba4"/>${item.on?'<path class="flame" d="M50 53C22 43 35 16 49 3C46 26 70 29 50 53Z" fill="#6198ed"/><path class="flame" d="M50 52C41 45 47 33 50 29C56 42 58 46 50 52Z" fill="#bde4fa"/>':''}`;text=item.on?'Flame on':'Flame off';}
 if(k==='burette'){body=`<path d="M31 5h23v221H31z" fill="#ffffff60" stroke="#7898b4"/><rect x="33" y="${224-item.remainingMl/50*210}" width="19" height="${item.remainingMl/50*210}" fill="#8bbadd7a"/><path d="M25 228h35M43 227v35" stroke="#7898b4" stroke-width="3"/>${Array.from({length:10},(_,i)=>`<path d="M44 ${18+i*20}h9" stroke="#7898b4"/>`).join('')}`;text=fmt(item.remainingMl)+' mL remaining';}
 if(k==='syringe'){const ml=v?Math.min(100,Object.values(v.gas).reduce((a,n)=>a+n,0)*24000):0;body=`<rect x="18" y="24" width="150" height="45" rx="4" fill="#ffffff6a" stroke="#7793ad"/><rect x="18" y="26" width="${Math.max(2,ml/100*140)}" height="41" fill="#a0c9e35a"/><path d="M${23+ml/100*138} 28v37M${23+ml/100*138} 46H207m0-22v45M2 42h17" stroke="#6f8aa5" stroke-width="3"/>${Array.from({length:9},(_,i)=>`<path d="M${34+i*14} 25v9" stroke="#7793ad"/>`).join('')}`;text=(v?fmt(ml)+' / 100 mL':'Connect a gas source');}
 if(k==='funnel'){body='<path d="M5 15h95L60 70v66H45V70Z" fill="#ffffff65" stroke="#86a1b7"/><path d="M14 24h75L52 70Z" fill="#f7f8fa" stroke="#b9c5d4"/>';text='Filter into receiver';}
 if(k==='thermometer'){const t=v?v.temp:20;body=`<rect x="27" y="8" width="17" height="135" rx="8" fill="#ffffff70" stroke="#90a5bb"/><circle cx="35" cy="153" r="17" fill="#ffffff70" stroke="#90a5bb"/><path d="M35 150V${142-Math.min(120,t)}" stroke="#d5829e" stroke-width="6" stroke-linecap="round"/><circle cx="35" cy="153" r="10" fill="#d5829e"/>`;text=v?fmt(t,1)+' °C':'Connect a sample';}
 if(k==='balance'){let mass=0;if(v)for(const s of v.contents.filter(s=>s.chem.state==='solid')){try{mass+=s.n*molarMass(s.chem.formula,elements);}catch{}}body=`<path d="M21 30h118v9H21z" fill="#bccbd5" stroke="#89a0b3"/><path d="M37 39h86l18 53H19Z" fill="#c8d6e3" stroke="#8fa6bd"/><rect x="40" y="58" width="80" height="25" rx="4" fill="#eff7f6"/><text x="80" y="75" text-anchor="middle" font-size="13" fill="#648b8a">${fmt(mass,3)} g</text>`;text='Solid sample mass';}
 if(k==='stand'){body='<path d="M20 262h115l10 12H10z" fill="#a0b3c5" stroke="#849cb3"/><path d="M42 264V8M42 70h82" stroke="#7c94ab" stroke-width="7"/><circle cx="122" cy="70" r="11" stroke="#7c94ab" fill="none" stroke-width="4"/>';text=item.mountedId?'Burette mounted':'Mount a burette';}
 if(k==='stopwatch'){body=`<rect x="17" y="20" width="79" height="85" rx="22" fill="#c8d7e7" stroke="#91a8bd"/><path d="M47 11h20" stroke="#91a8bd" stroke-width="7"/><rect x="28" y="43" width="57" height="33" rx="8" fill="#f5f8fd"/><text x="56" y="65" text-anchor="middle" font-size="14" fill="#6285a6">${Math.floor(item.elapsed/60).toString().padStart(2,'0')}:${Math.floor(item.elapsed%60).toString().padStart(2,'0')}</text>`;text=item.on?'Running':'Paused';}
 const spec=apparatusKinds[k];return `<svg viewBox="0 0 ${spec.width} ${spec.height}" aria-label="${spec.name}" role="img">${body}</svg><span class="object-name">${esc(k==='bottle'?chemicals.find(c=>c.id===item.loadedId)?.name||spec.name:spec.name)}</span><span class="object-status">${esc(text)}</span>${v?`<span class="object-connection">→ ${esc(v.name)}</span>`:''}`;
}
function labObjectTools(item,state){
 if(state.sandbox.selectedItem!==item.id)return '';
 const controls=item.kind==='burner'||item.kind==='stopwatch'?`<button data-act="apparatus-toggle" data-id="${item.id}" aria-label="${item.on?'Switch off or pause':'Light burner or start timer'}">${item.on?'Ⅱ':item.kind==='burner'?'Light':'Start'}</button>${item.kind==='stopwatch'?`<button data-act="stopwatch-reset" data-id="${item.id}">Reset</button>`:''}`:item.kind==='burette'?[.1,1,5].map(n=>`<button data-act="burette-dose" data-id="${item.id}:${n}">${n} mL</button>`).join(''):item.kind==='bottle'?`<button data-act="bottle-dose" data-id="${item.id}">Add dose</button>`:'';
 const spec=apparatusKinds[item.kind];return `<div class="object-tools" data-follow="${item.id}" style="left:${item.x+spec.width/2}px;top:${item.y+spec.height+74}px">${controls}<button data-act="apparatus-detach" data-id="${item.id}" aria-label="Detach apparatus">↗</button></div>`;
}
export function sandboxStageHTML(state,elements){
 const s=normaliseSandbox(state);
 const lines=s.items.filter(i=>i.kind==='syringe'&&i.targetId).map(i=>{const v=state.vessels.find(v=>v.id===i.targetId);return v?`<path data-gas-link="${i.id}" d="${gasTubePath(i,v)}" class="apparatus-line gas-line"/>`:'';}).join('');
 const vessels=state.vessels.map(v=>{const a=appearance(v);return `<button class="lab-object lab-vessel ${state.selected===v.id&&!s.selectedItem?'selected':''}" data-kind="vessel" data-object="${v.id}" data-act="select-vessel" data-id="${v.id}" aria-pressed="${state.selected===v.id&&!s.selectedItem}" style="left:${v.x}px;top:${v.y}px" aria-label="${esc(v.name)}. Drag to arrange, snap or pour.">${glassware(v.shape,a.color,v.volume/v.capacity,a.precip[0]?.chem.color,a.precip.length>0,Object.keys(v.gas).length>0,v.heated)}<span class="object-name">${esc(v.name)}</span><span class="object-status">${fmt(v.volume)} mL · ${fmt(v.temp,1)} °C</span></button>`;}).join('');
 const equipment=s.items.map(item=>`<button class="lab-object lab-apparatus ${item.on?'apparatus-on':''} ${s.selectedItem===item.id?'selected':''}" data-kind="apparatus" data-object="${item.id}" data-act="apparatus-menu" data-id="${item.id}" aria-pressed="${s.selectedItem===item.id}" style="left:${item.x}px;top:${item.y}px;width:${apparatusKinds[item.kind].width}px" aria-label="${esc(item.kind==='bottle'?chemicals.find(c=>c.id===item.loadedId)?.name||'Reagent bottle':apparatusKinds[item.kind].name)}. Drag near compatible apparatus to snap.">${apparatusSVG(item,state,elements)}</button>${labObjectTools(item,state)}`).join('');
 return `<div class="sandbox-viewport" id="sandbox-viewport" tabindex="0" aria-label="Sandbox. Drag compatible apparatus together to snap. Pull a part away to detach. Drag empty space to pan."><div class="sandbox-world" id="sandbox-world" style="transform:translate(${s.panX}px,${s.panY}px) scale(${s.zoom})"><div class="sandbox-grid"></div><svg class="sandbox-connections" viewBox="0 0 1600 1000" aria-hidden="true">${lines}</svg>${vessels}${equipment}<div class="snap-point" id="snap-point" hidden aria-hidden="true"></div></div><div class="snap-hint" id="snap-hint" role="status" aria-live="polite" hidden></div><div class="sandbox-corner"><span>Bring parts together to snap · pull apart to detach</span><div class="sandbox-view-controls"><button data-act="zoom-out" aria-label="Zoom out">−</button><span>${Math.round(s.zoom*100)}%</span><button data-act="zoom-in" aria-label="Zoom in">＋</button><button data-act="sandbox-home" aria-label="Centre the scene">⌖</button></div></div>${!state.vessels.length&&!s.items.length?'<div class="sandbox-empty"><h2>Your experiment<br>starts here.</h2><p>Drag apparatus and reagent bottles from the library.</p></div>':''}</div>`;
}
function gasTubePath(item,v){return `M${v.x+80} ${v.y+25}C${v.x+80} ${v.y-50},${item.x-35} ${item.y+46},${item.x+8} ${item.y+46}`;}
export function attachSandbox(state,{save,checkpoint,render,onDose,onAddReagent,onSelect,onObjectDrop=()=>{},onError=()=>{}}){
 const view=document.querySelector('#sandbox-viewport'),world=document.querySelector('#sandbox-world');if(!view||!view.addEventListener)return;
 const hint=document.querySelector('#snap-hint'),point=document.querySelector('#snap-point');let drag=null,suppress=false;
 function updateScene(){
  for(const el of world.querySelectorAll('.lab-object')){const obj=labObject(state,labKey(el.dataset.kind,Number(el.dataset.object)));if(obj){el.style.left=obj.x+'px';el.style.top=obj.y+'px';}}
  for(const el of world.querySelectorAll('.object-tools'))if(el.dataset.follow){const item=labObject(state,'a:'+el.dataset.follow);if(item){el.style.left=(item.x+apparatusKinds[item.kind].width/2)+'px';el.style.top=(item.y+apparatusKinds[item.kind].height+74)+'px';}}
  for(const el of world.querySelectorAll('[data-gas-link]'))if(el.dataset.gasLink){const item=labObject(state,'a:'+el.dataset.gasLink),v=state.vessels.find(v=>v.id===item?.targetId);if(v)el.setAttribute('d',gasTubePath(item,v));}
 }
 function preview(snap){
  if(hint){hint.hidden=!snap;hint.textContent=snap?'Release · '+snap.label:'';}
  if(point){point.hidden=!snap;if(snap){point.style.left=(snap.x+50)+'px';point.style.top=(snap.y+25)+'px';}}
  for(const el of world.querySelectorAll('.lab-object'))if(el.classList){el.classList.toggle('snap-target',Boolean(snap&&labKey(el.dataset.kind,Number(el.dataset.object))===snap.targetKey));el.classList.toggle('pour-preview',Boolean(snap&&snap.kind!=='attach'&&drag&&Number(el.dataset.object)===drag.id&&el.dataset.kind===drag.type));}
 }
 view.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('.sandbox-view-controls')||e.target.closest('.object-tools'))return;
  const target=e.target.closest('.lab-object');drag={id:target?Number(target.dataset.object):null,type:target?.dataset.kind,x:e.clientX,y:e.clientY,panX:state.sandbox.panX,panY:state.sandbox.panY,moved:false};
  if(target){const obj=labObject(state,labKey(drag.type,drag.id));drag.ox=obj.x;drag.oy=obj.y;if(drag.type==='vessel'){state.selected=drag.id;state.sandbox.selectedItem=null;}else state.sandbox.selectedItem=drag.id;onSelect();}
  view.classList.add('is-dragging');
 });
 view.addEventListener('pointermove',e=>{
  if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.moved&&Math.abs(dx)+Math.abs(dy)>5){drag.before=JSON.stringify({vessels:state.vessels,sandbox:state.sandbox});checkpoint();drag.moved=true;if(drag.id)detachLabObject(state,drag.type,drag.id);view.setPointerCapture(e.pointerId);}
  if(!drag.moved)return;
  if(drag.id){moveLabObject(state,drag.type,drag.id,drag.ox+dx/state.sandbox.zoom,drag.oy+dy/state.sandbox.zoom);updateScene();preview(findLabSnap(state,drag.type,drag.id,Math.min(90,50/state.sandbox.zoom)));}
  else{state.sandbox.panX=Math.max(-2000,Math.min(1000,drag.panX+dx));state.sandbox.panY=Math.max(-1200,Math.min(800,drag.panY+dy));world.style.transform=`translate(${state.sandbox.panX}px,${state.sandbox.panY}px) scale(${state.sandbox.zoom})`;}
 });
 const finish=e=>{
  if(!drag)return;const ended=drag;drag=null;view.classList.remove('is-dragging');
  if(ended.moved){suppress=true;
   if(e.type==='pointercancel'){const old=JSON.parse(ended.before);state.vessels=old.vessels;state.sandbox=old.sandbox;}
   else if(ended.id){const snap=findLabSnap(state,ended.type,ended.id,Math.min(90,50/state.sandbox.zoom));if(snap){if(snap.kind==='attach')commitLabSnap(state,ended.type,ended.id,snap);else{moveLabObject(state,ended.type,ended.id,ended.ox,ended.oy);try{onObjectDrop(snap);}catch(error){onError(error.message);}}}}
   preview(null);save();setTimeout(()=>{suppress=false;render();},0);
  }
  if(view.hasPointerCapture(e.pointerId))view.releasePointerCapture(e.pointerId);
 };
 view.addEventListener('pointerup',finish);view.addEventListener('pointercancel',finish);
 view.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopPropagation();}},true);
 view.addEventListener('keydown',e=>{
  const object=e.target.closest('.lab-object');if(!object)return;
  const kind=object.dataset.kind,id=Number(object.dataset.object);
  if(e.key==='Escape'){e.preventDefault();checkpoint();detachLabObject(state,kind,id,true);save();render();return;}
  if(e.key==='Enter'&&e.shiftKey){e.preventDefault();const snap=findLabSnap(state,kind,id,90);if(snap){checkpoint();if(snap.kind==='attach')commitLabSnap(state,kind,id,snap);else try{onObjectDrop(snap);}catch(error){onError(error.message);}save();render();}return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();checkpoint();detachLabObject(state,kind,id);const obj=labObject(state,labKey(kind,id)),step=e.shiftKey?40:10;moveLabObject(state,kind,id,obj.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),obj.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));save();render();document.querySelector(`[data-kind="${kind}"][data-object="${id}"]`)?.focus();
 });
 view.addEventListener('wheel',e=>{e.preventDefault();const bounds=view.getBoundingClientRect(),x=e.clientX-bounds.left,y=e.clientY-bounds.top,old=state.sandbox.zoom,next=Math.max(.35,Math.min(1.75,old*Math.exp(-e.deltaY*.0015))),ratio=next/old;state.sandbox.panX=Math.max(-2000,Math.min(1000,x-(x-state.sandbox.panX)*ratio));state.sandbox.panY=Math.max(-1200,Math.min(800,y-(y-state.sandbox.panY)*ratio));state.sandbox.zoom=next;world.style.transform=`translate(${state.sandbox.panX}px,${state.sandbox.panY}px) scale(${next})`;const readout=view.querySelector?.('.sandbox-view-controls span');if(readout)readout.textContent=Math.round(next*100)+'%';save();},{passive:false});
 view.addEventListener('dragover',e=>{e.preventDefault();});
 view.addEventListener('drop',e=>{e.preventDefault();const reagent=e.dataTransfer.getData('text/plain'),vessel=e.target.closest('.lab-vessel'),equipment=e.target.closest('.lab-apparatus'),bounds=view.getBoundingClientRect(),position={x:(e.clientX-bounds.left-state.sandbox.panX)/state.sandbox.zoom,y:(e.clientY-bounds.top-state.sandbox.panY)/state.sandbox.zoom};if(reagent.startsWith('vessel:')||reagent.startsWith('apparatus:'))onAddReagent(reagent,null,position);else if(vessel){state.selected=Number(vessel.dataset.object);state.sandbox.selectedItem=null;onDose(reagent);}else if(equipment)onAddReagent(reagent,Number(equipment.dataset.object));else onAddReagent(reagent,null,position);});
}
