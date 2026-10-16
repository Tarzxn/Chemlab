// Shared integration validation. The original lab's reaction rules stay in Python.
export function validateOriginalWorkspace(data){
 if(!data||data.version!==1)throw Error('Not an original ChemLab workspace.');
 const number=(v,min,max,fallback)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:fallback;
 const text=(v,max,fallback='')=>typeof v==='string'?v.slice(0,max):fallback;
 const label=(v,max,fallback='')=>text(v,max,fallback).replace(/[<>&]/g,'');
 const list=(value,max)=>Array.isArray(value)?value.slice(0,max):[];
 const chemical=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(id)?id:null;
 const position=o=>({x:number(o.x,-500,100000,100),y:number(o.y,-500,100000,100)});
 const clean={version:1,savedAt:text(data.savedAt,80),notes:text(data.notes,100000),vessels:[],burners:[],burettes:[],decor:[],counters:{}};
 clean.vessels=list(data.vessels,100).filter(v=>v&&['beaker','flask','testtube','evapdish'].includes(v.shape)).map((v,i)=>({id:/^v\d+$/.test(v.id)?v.id:'v'+(i+1),shape:v.shape,...position(v),temp:number(v.temp,0,1000,20),label:label(v.label,100,'Vessel'),contents:list(v.contents,150).filter(c=>c&&chemical(c.id)&&number(c.ml,0,1e8,null)!==null).map(c=>({id:c.id,ml:c.ml})),dryResidue:v.dryResidue&&/^#[0-9a-f]{6}$/i.test(v.dryResidue.color)?{color:v.dryResidue.color,name:label(v.dryResidue.name,200)}:null}));
 clean.burners=list(data.burners,50).filter(Boolean).map((b,i)=>({id:'b'+(i+1),...position(b),lit:Boolean(b.lit)}));
 clean.burettes=list(data.burettes,50).filter(Boolean).map((b,i)=>({id:'br'+(i+1),...position(b),loadedId:chemical(b.loadedId),remainingMl:number(b.remainingMl,0,50,0),attachedVesselId:clean.vessels.some(v=>v.id===b.attachedVesselId)?b.attachedVesselId:null}));
 clean.decor=list(data.decor,100).filter(d=>d&&['tripod','stand','rack','funnel'].includes(d.kind)).map((d,i)=>({id:'d'+(i+1),kind:d.kind,...position(d)}));
 for(const key of ['vesselCounter','burnerCounter','buretteCounter','decorCounter'])clean.counters[key]=number(data.counters?.[key],0,100000,0);
 return clean;
}
export function originalLabProfile(value){return typeof value==='string'&&/^[A-Za-z0-9_.-]{3,32}$/.test(value)?value.toLowerCase():'guest';}
export function sidebarIsHidden(storage){try{return storage.getItem('chemlab.sidebar.hidden')==='1';}catch{return false;}}
