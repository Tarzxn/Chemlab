// Geometric ports and durable apparatus assemblies. No DOM or chemistry mutations.
export const labKey=(type,id)=>(type==='vessel'?'v:':'a:')+id;
export function labObject(state,key){const [type,id]=String(key).split(':');return (type==='v'?state.vessels:state.sandbox.items).find(o=>o.id===Number(id));}
const labRoles=new Set(['heat','clamp','receiver','probe','gas','weigh','funnel']);
function assemblyCycle(links,child,parent){let key=parent;const seen=new Set([child]);while(key){if(seen.has(key))return true;seen.add(key);key=links.find(l=>l.child===key)?.parent;}return false;}
export function normaliseAssembly(state){
 const links=[];
 for(const link of Array.isArray(state.sandbox.attachments)?state.sandbox.attachments.slice(0,60):[]){
  if(!link||!labRoles.has(link.role)||!/^([av]):[1-9]\d*$/.test(link.child)||!/^([av]):[1-9]\d*$/.test(link.parent)||!labObject(state,link.child)||!labObject(state,link.parent)||links.some(l=>l.child===link.child||l.parent===link.parent&&l.role===link.role)||assemblyCycle(links,link.child,link.parent))continue;
  const child=labObject(state,link.child),parent=labObject(state,link.parent);
  if(!validAssemblyRole(link.role,link.child,link.parent,child,parent))continue;
  links.push({child:link.child,parent:link.parent,role:link.role,dx:child.x-parent.x,dy:child.y-parent.y});
 }
 state.sandbox.attachments=links;return links;
}
function validAssemblyRole(role,ck,pk,child,parent){
 return role==='clamp'?ck.startsWith('a:')&&pk.startsWith('a:')&&child.kind==='burette'&&parent.kind==='stand':
  ['heat','weigh','receiver'].includes(role)?ck.startsWith('v:')&&pk.startsWith('a:')&&parent.kind===({heat:'burner',weigh:'balance',receiver:'burette'}[role]):
  ck.startsWith('a:')&&pk.startsWith('v:')&&child.kind===({probe:'thermometer',gas:'syringe',funnel:'funnel'}[role]);
}
function clearAssemblyLink(state,link){
 const child=labObject(state,link.child),parent=labObject(state,link.parent);
 if(link.role==='clamp'&&parent)parent.mountedId=null;
 else if(['heat','weigh','receiver'].includes(link.role)&&parent)parent.targetId=null;
 else if(child)child.targetId=null;
}
export function detachLabObject(state,type,id,all=false){
 const key=labKey(type,id),links=state.sandbox.attachments||[];
 state.sandbox.attachments=links.filter(link=>{const remove=link.child===key||(all&&link.parent===key);if(remove)clearAssemblyLink(state,link);return !remove;});
 // Older saves used a stand's mountedId without an attachment record.
 for(const stand of state.sandbox.items.filter(i=>i.kind==='stand'))if((type==='apparatus'&&stand.mountedId===id)||(all&&type==='apparatus'&&stand.id===id))stand.mountedId=null;
 if(all&&type==='apparatus'){const item=labObject(state,key);if(item){item.targetId=null;item.sourceId=null;}}
}
export function assemblyMembers(state,key){
 const seen=new Set([key]),queue=[key];
 while(queue.length){const parent=queue.shift();for(const link of state.sandbox.attachments||[])if(link.parent===parent&&!seen.has(link.child)){seen.add(link.child);queue.push(link.child);}
  const item=labObject(state,parent);if(parent.startsWith('a:')&&item?.kind==='stand'&&item.mountedId){const held='a:'+item.mountedId;if(!seen.has(held)){seen.add(held);queue.push(held);}}
 }return [...seen];
}
export function moveAssembly(state,type,id,x,y){
 const key=labKey(type,id),root=labObject(state,key);if(!root)return;
 const objects=assemblyMembers(state,key).map(k=>labObject(state,k)).filter(Boolean);
 const dx=Math.max(-Math.min(...objects.map(o=>o.x)),Math.min(1440-Math.max(...objects.map(o=>o.x)),x-root.x));
 const dy=Math.max(-Math.min(...objects.map(o=>o.y)),Math.min(760-Math.max(...objects.map(o=>o.y)),y-root.y));
 for(const object of objects){object.x+=dx;object.y+=dy;}
}
export function findLabSnap(state,type,id,radius=65){
 const key=labKey(type,id),moving=labObject(state,key);if(!moving)return null;
 const excluded=new Set(assemblyMembers(state,key)),candidates=[];
 const add=(targetType,target,kind,x,y,role,label,parent,child,extra={})=>{
  if(excluded.has(labKey(targetType,target.id)))return;
  const distance=Math.hypot(moving.x-x,moving.y-y);
  if(distance>radius||x<0||x>1440||y<0||y>760)return;
  if(assemblyMembers(state,key).map(k=>labObject(state,k)).filter(Boolean).some(o=>o.x+x-moving.x<0||o.x+x-moving.x>1440||o.y+y-moving.y<0||o.y+y-moving.y>760))return;
  if(kind==='attach'&&(assemblyCycle(state.sandbox.attachments||[],child,parent)||(state.sandbox.attachments||[]).some(l=>l.parent===parent&&l.role===role&&l.child!==child)))return;
  candidates.push({kind,x,y,role,label,parent,child,targetKey:labKey(targetType,target.id),distance,...extra});
 };
 if(type==='apparatus'){
  for(const v of state.vessels){
   if(moving.kind==='burner')add('vessel',v,'attach',v.x+30,v.y+178,'heat','Place vessel over flame',key,'v:'+v.id);
   if(moving.kind==='balance')add('vessel',v,'attach',v.x,v.y+150,'weigh','Place sample on balance',key,'v:'+v.id);
   if(moving.kind==='burette')add('vessel',v,'attach',v.x+37,v.y-245,'receiver','Place receiver below tap',key,'v:'+v.id);
   if(moving.kind==='thermometer')add('vessel',v,'attach',v.x+45,v.y+10,'probe','Insert thermometer','v:'+v.id,key);
   if(moving.kind==='funnel')add('vessel',v,'attach',v.x+28,v.y-118,'funnel','Fit funnel into vessel','v:'+v.id,key);
   if(moving.kind==='syringe')add('vessel',v,'attach',v.x+160,v.y-50,'gas','Connect gas tubing','v:'+v.id,key);
   if(moving.kind==='bottle')add('vessel',v,'dose',v.x+30,v.y-95,null,'Add measured reagent',null,null,{vesselId:v.id,itemId:id});
  }
  for(const other of state.sandbox.items){
   if(moving.kind==='bottle'&&other.kind==='burette')add('apparatus',other,'fill',other.x-8,other.y-105,null,'Fill burette from bottle',null,null,{bottleId:id,itemId:other.id});
   if(moving.kind==='burette'&&other.kind==='stand'&&(!other.mountedId||other.mountedId===id))add('apparatus',other,'attach',other.x+80,other.y+10,'clamp','Snap burette into clamp','a:'+other.id,key);
   if(moving.kind==='stand'&&other.kind==='burette'&&!moving.mountedId)add('apparatus',other,'attach',other.x-80,other.y-10,'clamp','Clamp the burette',key,'a:'+other.id);
  }
 }else{
  for(const item of state.sandbox.items){
   if(item.kind==='burner')add('apparatus',item,'attach',item.x-30,item.y-178,'heat','Place vessel over flame','a:'+item.id,key);
   if(item.kind==='balance')add('apparatus',item,'attach',item.x,item.y-150,'weigh','Place sample on balance','a:'+item.id,key);
   if(item.kind==='burette')add('apparatus',item,'attach',item.x-37,item.y+245,'receiver','Place receiver below tap','a:'+item.id,key);
   if(item.kind==='funnel'&&item.targetId&&item.targetId!==id)add('apparatus',item,'filter',item.x-50,item.y-65,null,'Pour mixture through filter',null,null,{sourceId:id,vesselId:item.targetId,itemId:item.id});
  }
  for(const v of state.vessels)if(v.id!==id&&moving.volume>0)add('vessel',v,'pour',v.x-70,v.y-65,null,'Pour measured mixture',null,null,{sourceId:id,vesselId:v.id});
 }
 return candidates.sort((a,b)=>a.distance-b.distance)[0]||null;
}
export function commitLabSnap(state,type,id,snap){
 if(!snap||snap.kind!=='attach')return false;
 const child=labObject(state,snap.child),parent=labObject(state,snap.parent);if(!child||!parent||!validAssemblyRole(snap.role,snap.child,snap.parent,child,parent))return false;
 if(assemblyCycle(state.sandbox.attachments||[],snap.child,snap.parent))return false;
 const moving=labObject(state,labKey(type,id));if(!moving||![snap.x,snap.y].every(Number.isFinite))return false;
 if(assemblyMembers(state,labKey(type,id)).map(k=>labObject(state,k)).filter(Boolean).some(o=>o.x+snap.x-moving.x<0||o.x+snap.x-moving.x>1440||o.y+snap.y-moving.y<0||o.y+snap.y-moving.y>760))return false;
 // Move the object being dragged; clamp dependent parts before recording offsets.
 moveAssembly(state,type,id,snap.x,snap.y);
 const [childType,childId]=snap.child.split(':');detachLabObject(state,childType==='v'?'vessel':'apparatus',Number(childId));
 state.sandbox.attachments=(state.sandbox.attachments||[]).filter(l=>{if(l.parent===snap.parent&&l.role===snap.role){clearAssemblyLink(state,l);return false;}return true;});
 state.sandbox.attachments.push({child:snap.child,parent:snap.parent,role:snap.role,dx:child.x-parent.x,dy:child.y-parent.y});
 if(snap.role==='clamp')parent.mountedId=child.id;
 else if(['heat','weigh','receiver'].includes(snap.role))parent.targetId=child.id;
 else child.targetId=parent.id;
 return true;
}
