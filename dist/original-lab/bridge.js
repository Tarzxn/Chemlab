import {validateOriginalWorkspace,originalLabProfile} from '../original-lab.js';

let originalBridgeStarted=false,originalBridgeProfile='guest',originalBridgeTheme='light',originalBridgeMotion=false,originalBridgeSignature='';
const originalBridgeStorage={get:Storage.prototype.getItem,set:Storage.prototype.setItem};
function labRead(key){try{return originalBridgeStorage.get.call(localStorage,key);}catch{return null;}}
function labWrite(key,value){try{originalBridgeStorage.set.call(localStorage,key,value);}catch{}}
function labPost(type,data={}){if(parent!==window)parent.postMessage({source:'chemlab-original',type,profile:originalBridgeProfile,...data},location.origin);}
function labSnapshot(){
 if(typeof window.serializeWorkspace!=='function')return null;
 return validateOriginalWorkspace(window.serializeWorkspace());
}
function labSave(){
 const data=labSnapshot();if(!data)return;
 const signature=JSON.stringify({...data,savedAt:''});if(signature===originalBridgeSignature)return;
 originalBridgeSignature=signature;labWrite('chemlab.original.workspace:'+originalBridgeProfile,JSON.stringify(data));labPost('workspace',{workspace:data});
}
function labAppearance(theme,motion){originalBridgeTheme=theme==='dark'?'dark':'light';originalBridgeMotion=Boolean(motion);document.documentElement.classList.toggle('dark',originalBridgeTheme==='dark');document.body.classList.toggle('reduce-motion',originalBridgeMotion);if(typeof window.applyDark==='function')window.applyDark(originalBridgeTheme==='dark');}
function labPrepareWorkspace(data){
 const clean=validateOriginalWorkspace(data),idMap=new Map(clean.vessels.map((v,i)=>[v.id,'v'+(vesselCounter+i+1)]));
 clean.burettes.forEach(b=>{b.attachedVesselId=idMap.get(b.attachedVesselId)||null;});
 clean.vessels.forEach(v=>{v.contents=v.contents.filter(c=>chemObj(c.id));});
 clean.decor=clean.decor.map(d=>{const def=APPARATUS_DEFS.find(a=>a.type==='decor'&&a.kind===d.kind);return {...d,icon:def.icon,label:def.label};});
 return clean;
}
function labPanelToggle(id,className,storageKey,label){
 const button=document.createElement('button');button.id=id;button.className='iconbtn lab-panel-toggle';button.type='button';button.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M9 4v16"/></svg>';
 button.setAttribute('aria-controls',className==='lab-shelf-hidden'?'shelf':'infoPanel');
 const saved=labRead(storageKey),media=window.matchMedia?.('(max-width: 1050px)'),small=media?.matches;
 document.body.classList.toggle(className,saved===null?Boolean(small):saved==='1');
 const sync=()=>{const hidden=document.body.classList.contains(className);button.setAttribute('aria-expanded',String(!hidden));button.setAttribute('aria-label',(hidden?'Show ':'Hide ')+label);button.title=(hidden?'Show ':'Hide ')+label;};
 button.addEventListener('click',()=>{document.body.classList.toggle(className);labWrite(storageKey,document.body.classList.contains(className)?'1':'0');if(media?.matches&&!document.body.classList.contains(className)){const other=className==='lab-shelf-hidden'?'lab-info-hidden':'lab-shelf-hidden';document.body.classList.add(other);document.dispatchEvent(new Event('lab-panels-changed'));}sync();});
 document.addEventListener('lab-panels-changed',sync);
 media?.addEventListener('change',()=>{if(labRead(storageKey)===null){document.body.classList.toggle(className,media.matches);sync();}});
 if(className==='lab-info-hidden')button.querySelector('path').setAttribute('d','M15 4v16');
 sync();document.querySelector('header').prepend(button);
}
function labInstallLayout(){
 const header=document.querySelector('header'),shelf=document.getElementById('shelf'),controls=document.createElement('div');controls.className='lab-library-controls';
 const search=document.querySelector('.searchbox');search.querySelector('input').placeholder='Search chemicals';search.querySelector('input').setAttribute('aria-label','Search chemicals');
 controls.append(search,document.getElementById('catChipRow'));shelf.querySelector('.shelf-tabs').after(controls);
 shelf.addEventListener('pointerdown',event=>{if(window.matchMedia('(max-width: 1050px)').matches&&event.target.closest('.chem-card,.app-card'))requestAnimationFrame(()=>{document.body.classList.add('lab-shelf-hidden');document.dispatchEvent(new Event('lab-panels-changed'));});});
 document.querySelector('.brand').innerHTML='<span class="lab-status-dot"></span>Laboratory';
 const icons={toggleIslandBtn:'M9 4a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0V4m3 4v9',periodicBtn:'M3 3h5v5H3zM16 3h5v5h-5zM3 11h5v5H3zM10 11h5v5h-5zM17 11h5v5h-5zM3 21h19',historyBtn:'M4 8a9 9 0 1 1-1 8M4 3v5h5m3-2v6l4 2',saveWorkspaceBtn:'M5 3h12l4 4v14H3V3h2m3 0v6h8V3M7 21v-8h10v8',openWorkspaceBtn:'M3 7V4h6l3 3h9v13H3V7zm0 3h18',clearBenchBtn:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',darkBtn:'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10'};
 const iconHTML=path=>'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';
 const toolbar=document.createElement('div');toolbar.className='lab-command-group';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Laboratory tools');
 for(const [id,path]of Object.entries(icons)){const button=document.getElementById(id);button.innerHTML=iconHTML(path);button.setAttribute('aria-label',button.title);button.type='button';toolbar.append(button);}
 const originalDark=window.applyDark;window.applyDark=value=>{originalDark(value);document.getElementById('darkBtn').innerHTML=iconHTML(icons.darkBtn);};
 const home=document.createElement('button');home.className='iconbtn';home.type='button';home.title='Return to the start of the bench';home.setAttribute('aria-label',home.title);home.innerHTML=iconHTML('M4 9V4h5m6 0h5v5m0 6v5h-5M9 20H4v-5M9 12h6m-3-3v6');home.addEventListener('click',()=>document.getElementById('benchScroll').scrollTo({left:0,top:0,behavior:originalBridgeMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));toolbar.prepend(home);header.append(toolbar);
 document.getElementById('partnerBar').setAttribute('role','status');
 const hint=document.getElementById('benchHint');hint.innerHTML='<span class="empty-bench-symbol" aria-hidden="true">+</span><strong>A little room to experiment.</strong><span>Open Apparatus and drag your first piece onto the bench.</span>';
 // Use the visible area as the canvas. Absolute apparatus still extend its scrollable area.
 // Correct the original client's extra scroll offset without altering its source or chemistry.
 const scroll=document.getElementById('benchScroll'),canvas=document.getElementById('bench'),nativeRect=canvas.getBoundingClientRect.bind(canvas);
 canvas.getBoundingClientRect=()=>{const r=nativeRect(),left=r.left+scroll.scrollLeft,top=r.top+scroll.scrollTop;return {x:left,y:top,left,top,width:r.width,height:r.height,right:left+r.width,bottom:top+r.height,toJSON(){return {left,top,width:r.width,height:r.height};}};};
 // Recover an item dragged beyond the top or left edge, preserving the original snap callbacks.
 document.addEventListener('pointerup',()=>{requestAnimationFrame(()=>{for(const group of [vessels,burners,burettes,decorItems])for(const obj of Object.values(group)){if(obj.x<8){obj.x=8;obj.el.style.left='8px';}if(obj.y<20){obj.y=20;obj.el.style.top='20px';}}});});
}
function labStart(message){
 if(originalBridgeStarted){labAppearance(message.theme,message.motion);return;}
 originalBridgeStarted=true;originalBridgeProfile=originalLabProfile(message.profile);labAppearance(message.theme,message.motion);
 // Scope the original script's notes key without changing that script.
 Storage.prototype.getItem=function(key){try{return originalBridgeStorage.get.call(this,key==='chemlab_notes'?'chemlab.original.notes:'+originalBridgeProfile:key);}catch{return null;}};
 Storage.prototype.setItem=function(key,value){try{originalBridgeStorage.set.call(this,key==='chemlab_notes'?'chemlab.original.notes:'+originalBridgeProfile:key,value);}catch{}};
 const script=document.createElement('script');script.src='app.js';
 script.onerror=()=>{document.getElementById('partnerText').textContent='The original laboratory could not load. Refresh to try again.';};
 script.onload=async()=>{
  const originalLoad=window.loadWorkspace;window.loadWorkspace=data=>originalLoad(labPrepareWorkspace(data));
  // The original script fetches its catalogue before workspace restoration.
  for(let attempt=0;attempt<100&&(!Array.isArray(CHEMICALS)||!CHEMICALS.length);attempt++)await new Promise(resolve=>setTimeout(resolve,50));
  if(!CHEMICALS.length){document.getElementById('partnerText').textContent='The chemical catalogue could not load. Refresh to try again.';return;}
  let restored=message.workspace;
  try{const local=JSON.parse(labRead('chemlab.original.workspace:'+originalBridgeProfile)||'null');if(local&&(!restored||Date.parse(local.savedAt)>Date.parse(restored.savedAt)))restored=local;}catch{}
  if(restored)try{window.loadWorkspace(restored);}catch{labPost('error',{message:'The original lab save could not be restored. Open a workspace backup if needed.'});}
  labAppearance(originalBridgeTheme,originalBridgeMotion);
  labInstallLayout();
  labPanelToggle('toggleLabInfo','lab-info-hidden','chemlab.original.info.hidden','reaction information');labPanelToggle('toggleLabShelf','lab-shelf-hidden','chemlab.original.shelf.hidden','chemical cupboard');
  if(window.matchMedia('(max-width: 1050px)').matches&&!document.body.classList.contains('lab-shelf-hidden')&&!document.body.classList.contains('lab-info-hidden')){document.body.classList.add('lab-info-hidden');document.dispatchEvent(new Event('lab-panels-changed'));}
  document.getElementById('darkBtn').addEventListener('click',()=>labPost('theme',{theme:document.documentElement.classList.contains('dark')?'dark':'light'}));
  const send=document.createElement('button');send.type='button';send.className='btn';send.textContent='Send to notebook';send.addEventListener('click',()=>labPost('note',{text:document.getElementById('notesArea').value}));document.querySelector('.notes-actions').append(send);
  const header=document.querySelector('header'),resize=()=>document.documentElement.style.setProperty('--lab-header-height',header.getBoundingClientRect().height+'px');resize();if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(header);
  setInterval(labSave,1000);labSave();labPost('loaded');
 };
 document.body.append(script);
}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.source!=='chemlab-studio')return;const data=event.data;if(data.type==='init')labStart(data);if(data.type==='appearance')labAppearance(data.theme,data.motion);if(data.type==='save')labSave();});
window.addEventListener('pagehide',labSave);
if(parent===window)labStart({profile:'guest',theme:window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'});else labPost('ready');
