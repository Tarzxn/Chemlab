import {esc,fmt,glassware,icon} from './ui.js';
import {appearance,resolve,molarMass} from './chemistry.js';

export const apparatusKinds={burner:{name:'Bunsen burner',width:100,height:135},burette:{name:'Burette',width:85,height:270},syringe:{name:'Gas syringe',width:220,height:90},funnel:{name:'Filter funnel',width:105,height:150},thermometer:{name:'Thermometer',width:70,height:190},balance:{name:'Balance',width:160,height:120},stand:{name:'Retort stand',width:150,height:280},stopwatch:{name:'Stopwatch',width:110,height:120}};
export function newSandbox(){return {version:1,zoom:.8,panX:-40,panY:-30,nextId:1,items:[]};}
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
 state.vessels.forEach((v,i)=>{v.x=numeric(v.x,0,1440,260+(i%5)*200);v.y=numeric(v.y,0,760,220+Math.floor(i/5)*270);});state.sandbox=s;return s;
}
export function moveLabObject(state,type,id,x,y){
 const item=type==='vessel'?state.vessels.find(v=>v.id===id):state.sandbox.items.find(i=>i.id===id);if(!item)return;
 const nx=Math.max(0,Math.min(1440,x)),ny=Math.max(0,Math.min(760,y)),dx=nx-item.x,dy=ny-item.y;item.x=nx;item.y=ny;
 if(type==='apparatus'&&item.kind==='stand'&&item.mountedId){const held=state.sandbox.items.find(i=>i.id===item.mountedId);if(held){held.x=Math.max(0,Math.min(1440,held.x+dx));held.y=Math.max(0,Math.min(760,held.y+dy));}}
}
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
 if(k==='burner'){body=`<path d="M15 117h70l9 13H6z" fill="#8198ae"/><rect x="42" y="52" width="16" height="67" rx="4" fill="#a7bbcd" stroke="#728aa3"/><rect x="38" y="96" width="24" height="12" rx="3" fill="#718ba4"/>${item.on?'<path class="flame" d="M50 53C22 43 35 16 49 3C46 26 70 29 50 53Z" fill="#6198ed"/><path class="flame" d="M50 52C41 45 47 33 50 29C56 42 58 46 50 52Z" fill="#bde4fa"/>':''}`;text=item.on?'Flame on':'Flame off';}
 if(k==='burette'){body=`<path d="M31 5h23v221H31z" fill="#ffffff60" stroke="#7898b4"/><rect x="33" y="${224-item.remainingMl/50*210}" width="19" height="${item.remainingMl/50*210}" fill="#8bbadd7a"/><path d="M25 228h35M43 227v35" stroke="#7898b4" stroke-width="3"/>${Array.from({length:10},(_,i)=>`<path d="M44 ${18+i*20}h9" stroke="#7898b4"/>`).join('')}`;text=fmt(item.remainingMl)+' mL remaining';}
 if(k==='syringe'){const ml=v?Math.min(100,Object.values(v.gas).reduce((a,n)=>a+n,0)*24000):0;body=`<rect x="18" y="24" width="150" height="45" rx="4" fill="#ffffff6a" stroke="#7793ad"/><rect x="18" y="26" width="${Math.max(2,ml/100*140)}" height="41" fill="#a0c9e35a"/><path d="M${23+ml/100*138} 28v37M${23+ml/100*138} 46H207m0-22v45M2 42h17" stroke="#6f8aa5" stroke-width="3"/>${Array.from({length:9},(_,i)=>`<path d="M${34+i*14} 25v9" stroke="#7793ad"/>`).join('')}`;text=(v?fmt(ml)+' / 100 mL':'Connect a gas source');}
 if(k==='funnel'){body='<path d="M5 15h95L60 70v66H45V70Z" fill="#ffffff65" stroke="#86a1b7"/><path d="M14 24h75L52 70Z" fill="#f7f8fa" stroke="#b9c5d4"/>';text='Filter into receiver';}
 if(k==='thermometer'){const t=v?v.temp:20;body=`<rect x="27" y="8" width="17" height="135" rx="8" fill="#ffffff70" stroke="#90a5bb"/><circle cx="35" cy="153" r="17" fill="#ffffff70" stroke="#90a5bb"/><path d="M35 150V${142-Math.min(120,t)}" stroke="#d5829e" stroke-width="6" stroke-linecap="round"/><circle cx="35" cy="153" r="10" fill="#d5829e"/>`;text=v?fmt(t,1)+' °C':'Connect a sample';}
 if(k==='balance'){let mass=0;if(v)for(const s of v.contents.filter(s=>s.chem.state==='solid')){try{mass+=s.n*molarMass(s.chem.formula,elements);}catch{}}body=`<path d="M21 30h118v9H21z" fill="#bccbd5" stroke="#89a0b3"/><path d="M37 39h86l18 53H19Z" fill="#c8d6e3" stroke="#8fa6bd"/><rect x="40" y="58" width="80" height="25" rx="4" fill="#eff7f6"/><text x="80" y="75" text-anchor="middle" font-size="13" fill="#648b8a">${fmt(mass,3)} g</text>`;text='Solid sample mass';}
 if(k==='stand'){body='<path d="M20 262h115l10 12H10z" fill="#a0b3c5" stroke="#849cb3"/><path d="M42 264V8M42 70h82" stroke="#7c94ab" stroke-width="7"/><circle cx="122" cy="70" r="11" stroke="#7c94ab" fill="none" stroke-width="4"/>';text=item.mountedId?'Burette mounted':'Mount a burette';}
 if(k==='stopwatch'){body=`<rect x="17" y="20" width="79" height="85" rx="22" fill="#c8d7e7" stroke="#91a8bd"/><path d="M47 11h20" stroke="#91a8bd" stroke-width="7"/><rect x="28" y="43" width="57" height="33" rx="8" fill="#f5f8fd"/><text x="56" y="65" text-anchor="middle" font-size="14" fill="#6285a6">${Math.floor(item.elapsed/60).toString().padStart(2,'0')}:${Math.floor(item.elapsed%60).toString().padStart(2,'0')}</text>`;text=item.on?'Running':'Paused';}
 const spec=apparatusKinds[k];return `<svg viewBox="0 0 ${spec.width} ${spec.height}" aria-label="${spec.name}" role="img">${body}</svg><span class="object-name">${spec.name}</span><span class="object-status">${esc(text)}</span>${v?`<span class="object-connection">→ ${esc(v.name)}</span>`:''}`;
}
export function sandboxStageHTML(state,elements){
 const s=normaliseSandbox(state);
 const lines=s.items.filter(i=>i.targetId).map(i=>{const v=state.vessels.find(v=>v.id===i.targetId);if(!v)return '';const x=i.x+apparatusKinds[i.kind].width/2,y=i.y+apparatusKinds[i.kind].height/2;return `<path d="M${x} ${y}C${x} ${v.y-30},${v.x+80} ${y},${v.x+80} ${v.y+25}" class="apparatus-line ${i.kind==='syringe'?'gas-line':''}"/>`;}).join('');
 return `<div class="sandbox-viewport" id="sandbox-viewport" tabindex="0" aria-label="Sandbox canvas. Drag apparatus to move. Drag empty space to pan. Use arrow keys to move a focused object."><div class="sandbox-world" id="sandbox-world" style="transform:translate(${s.panX}px,${s.panY}px) scale(${s.zoom})"><div class="sandbox-grid"></div><svg class="sandbox-connections" viewBox="0 0 1600 1000" aria-hidden="true">${lines}</svg>${state.vessels.map(v=>{const a=appearance(v);return `<button class="lab-object lab-vessel ${state.selected===v.id?'selected':''}" data-kind="vessel" data-object="${v.id}" data-act="select-vessel" data-id="${v.id}" style="left:${v.x}px;top:${v.y}px" aria-label="${esc(v.name)}. Drag to move.">${glassware(v.shape,a.color,v.volume/v.capacity,a.precip[0]?.chem.color,a.precip.length>0,Object.keys(v.gas).length>0,v.heated)}<span class="object-name">${esc(v.name)}</span><span class="object-status">${fmt(v.volume)} mL · ${fmt(v.temp,1)} °C</span></button>`;}).join('')}${s.items.map(item=>`<button class="lab-object lab-apparatus ${item.on?'apparatus-on':''}" data-kind="apparatus" data-object="${item.id}" data-act="apparatus-menu" data-id="${item.id}" style="left:${item.x}px;top:${item.y}px;width:${apparatusKinds[item.kind].width}px" aria-label="${apparatusKinds[item.kind].name}. Drag to move; activate for controls.">${apparatusSVG(item,state,elements)}</button>`).join('')}</div><div class="sandbox-corner"><span>Drag to arrange · empty space to pan</span><div class="sandbox-view-controls"><button data-act="zoom-out" aria-label="Zoom out">−</button><span>${Math.round(s.zoom*100)}%</span><button data-act="zoom-in" aria-label="Zoom in">＋</button><button data-act="sandbox-home" aria-label="Centre the scene">⌖</button></div></div>${!state.vessels.length&&!s.items.length?'<div class="sandbox-empty"><h2>A blank bench.<br>A fresh question.</h2><p>Add apparatus or drag a reagent into the workspace.</p></div>':''}</div>`;
}
export function attachSandbox(state,{save,checkpoint,render,onDose,onAddReagent,onSelect}){
 const view=document.querySelector('#sandbox-viewport'),world=document.querySelector('#sandbox-world');if(!view||!view.addEventListener)return;
 let drag=null,suppress=false;
 view.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('.sandbox-view-controls'))return;
  const target=e.target.closest('.lab-object');drag={id:target?Number(target.dataset.object):null,type:target?.dataset.kind,x:e.clientX,y:e.clientY,panX:state.sandbox.panX,panY:state.sandbox.panY,moved:false};
  if(target){const obj=drag.type==='vessel'?state.vessels.find(v=>v.id===drag.id):state.sandbox.items.find(i=>i.id===drag.id);drag.ox=obj.x;drag.oy=obj.y;if(drag.type==='vessel'){state.selected=drag.id;onSelect();}}
  view.classList.add('is-dragging');
 });
 view.addEventListener('pointermove',e=>{
  if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.moved&&Math.abs(dx)+Math.abs(dy)>5){checkpoint();drag.moved=true;view.setPointerCapture(e.pointerId);}
  if(!drag.moved)return;
  if(drag.id){moveLabObject(state,drag.type,drag.id,drag.ox+dx/state.sandbox.zoom,drag.oy+dy/state.sandbox.zoom);for(const el of world.querySelectorAll('.lab-object')){const type=el.dataset.kind,id=Number(el.dataset.object),obj=type==='vessel'?state.vessels.find(v=>v.id===id):state.sandbox.items.find(i=>i.id===id);if(obj){el.style.left=obj.x+'px';el.style.top=obj.y+'px';}}}
  else{state.sandbox.panX=Math.max(-2000,Math.min(1000,drag.panX+dx));state.sandbox.panY=Math.max(-1200,Math.min(800,drag.panY+dy));world.style.transform=`translate(${state.sandbox.panX}px,${state.sandbox.panY}px) scale(${state.sandbox.zoom})`;}
 });
 const finish=e=>{if(!drag)return;const moved=drag.moved;drag=null;view.classList.remove('is-dragging');if(moved){suppress=true;save();setTimeout(()=>{suppress=false;render();},0);}if(view.hasPointerCapture(e.pointerId))view.releasePointerCapture(e.pointerId);};
 view.addEventListener('pointerup',finish);view.addEventListener('pointercancel',finish);
 view.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopPropagation();}},true);
 view.addEventListener('keydown',e=>{const object=e.target.closest('.lab-object');if(!object||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();checkpoint();const kind=object.dataset.kind,id=Number(object.dataset.object),obj=kind==='vessel'?state.vessels.find(v=>v.id===id):state.sandbox.items.find(i=>i.id===id),step=e.shiftKey?40:10;moveLabObject(state,kind,obj.id,obj.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),obj.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));save();render();document.querySelector(`[data-kind="${kind}"][data-object="${id}"]`)?.focus();});
 view.addEventListener('dragover',e=>{e.preventDefault();});
 view.addEventListener('drop',e=>{e.preventDefault();const reagent=e.dataTransfer.getData('text/plain'),vessel=e.target.closest('.lab-vessel'),equipment=e.target.closest('.lab-apparatus'),bounds=view.getBoundingClientRect(),position={x:(e.clientX-bounds.left-state.sandbox.panX)/state.sandbox.zoom,y:(e.clientY-bounds.top-state.sandbox.panY)/state.sandbox.zoom};if(reagent.startsWith('vessel:')||reagent.startsWith('apparatus:')){onAddReagent(reagent,null,position);}else if(vessel){state.selected=Number(vessel.dataset.object);onDose(reagent);}else if(equipment){onAddReagent(reagent,Number(equipment.dataset.object));}else{onAddReagent(reagent,null,position);}});
}
