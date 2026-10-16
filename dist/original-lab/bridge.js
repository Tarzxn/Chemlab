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
 const saved=labRead(storageKey),small=window.matchMedia?.('(max-width: 760px)').matches;
 document.body.classList.toggle(className,saved===null?Boolean(small):saved==='1');
 const sync=()=>{const hidden=document.body.classList.contains(className);button.setAttribute('aria-expanded',String(!hidden));button.setAttribute('aria-label',(hidden?'Show ':'Hide ')+label);button.title=(hidden?'Show ':'Hide ')+label;};
 button.addEventListener('click',()=>{document.body.classList.toggle(className);labWrite(storageKey,document.body.classList.contains(className)?'1':'0');sync();});sync();document.querySelector('header').prepend(button);
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
  labPanelToggle('toggleLabInfo','lab-info-hidden','chemlab.original.info.hidden','reaction information');labPanelToggle('toggleLabShelf','lab-shelf-hidden','chemlab.original.shelf.hidden','chemical cupboard');
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
