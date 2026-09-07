/* ======================= GLOBAL STATE ======================= */
let CHEMICALS = [];
let vessels = {};      // id -> {id,type,x,y,contents:[{id,ml}],temp,dryResidue,lastResult,el,label,heatingBurnerId}
let burners = {};       // id -> {id,x,y,lit,el}
let burettes = {};      // id -> {id,x,y,loadedId,remainingMl,el}
let decorItems = {};    // id -> {id,x,y,kind,el}
let vesselCounter=0, burnerCounter=0, buretteCounter=0, decorCounter=0;
let selectedVesselId = null;
let history = [];
let darkMode = false;
let draggingChemId = null;
let draggingAppType = null;
let ghost = null;
const MAX_VISUAL_ML = 250;
const CAT_LABEL = {acid:'Acid',base:'Base',salt:'Salt',metal:'Metal',indicator:'Indicator',halogen:'Halogen',oxidizer:'Oxidizer',catalyst:'Catalyst',organic:'Organic',other:'Other',gas:'Gas'};

/* Compact monoline SVG icons — no emoji anywhere in the UI */
const ICONS = {
  beaker: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M11 4h10v6l7 15c1 2-.5 4-3 4H7c-2.5 0-4-2-3-4l7-15V4Z"/><path d="M9 20h14"/><line x1="10" y1="4" x2="22" y2="4" stroke-width="2.2"/></svg>`,
  flask: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13 4h6v7l8 13c1.3 2.2-.3 5-3 5H8c-2.7 0-4.3-2.8-3-5l8-13V4Z"/><path d="M10 21h12"/><line x1="12" y1="4" x2="20" y2="4" stroke-width="2.2"/></svg>`,
  testtube: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3h8v20a4 4 0 0 1-8 0V3Z"/><path d="M12 16h8"/><line x1="11" y1="3" x2="21" y2="3" stroke-width="2.2"/></svg>`,
  evapdish: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 13h24c0 7-5 12-12 12S4 20 4 13Z"/><ellipse cx="16" cy="13" rx="12" ry="3"/></svg>`,
  burner: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="13" y="2" width="6" height="9" rx="1"/><path d="M7 11h18l3 14c.4 2.5-1.6 5-4.4 5H8.4C5.6 30 3.6 27.5 4 25L7 11Z"/><line x1="4.5" y1="25" x2="27.5" y2="25" stroke-width="2.2"/></svg>`,
  burette: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="13" y="2" width="6" height="22" rx="1.5"/><path d="M14 24h4l1.5 3h-7L14 24Z"/><line x1="10" y1="8" x2="13" y2="8"/><line x1="10" y1="13" x2="13" y2="13"/><line x1="10" y1="18" x2="13" y2="18"/></svg>`,
  tripod: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M16 4 6 27M16 4l10 23M9 20h14"/><path d="M4 27h6M22 27h6" stroke-width="2.2"/></svg>`,
  stand: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><line x1="8" y1="2" x2="8" y2="30" stroke-width="2.4"/><rect x="4" y="28" width="14" height="3" rx="1"/><path d="M8 12h12" stroke-width="2.4"/><rect x="18" y="10" width="6" height="4" rx="1"/></svg>`,
  rack: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="20" width="26" height="8" rx="1.5"/><circle cx="9" cy="24" r="2.4"/><circle cx="16" cy="24" r="2.4"/><circle cx="23" cy="24" r="2.4"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="16" y1="4" x2="16" y2="20"/><line x1="23" y1="4" x2="23" y2="20"/></svg>`,
  funnel: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h24l-9 12v9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-9L4 5Z"/><line x1="4" y1="5" x2="28" y2="5" stroke-width="2.2"/></svg>`,
};

const bench = document.getElementById('bench');
const benchScroll = document.getElementById('benchScroll');
const benchHint = document.getElementById('benchHint');
const partnerText = document.getElementById('partnerText');

/* ======================= PARTNER MESSAGES ======================= */
const IDLE_TIPS = [
  "Drag a Bunsen burner onto the bench, then drag a beaker on top of it and light it.",
  "Heat an aqueous salt past 100°C and watch it evaporate down to dry crystals.",
  "Try a Burette above a flask for dropwise titration.",
  "Tap any vessel to select it and see its reaction info on the right.",
  "Use the Lab Notes tab to jot down observations as you go.",
  "Evaporating dishes have a wide surface area — they dry out fastest."
];
let idleTimer=null;
function say(msg){
  partnerText.innerHTML = msg;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(()=>{ say(IDLE_TIPS[Math.floor(Math.random()*IDLE_TIPS.length)]); }, 16000);
}

/* ======================= LOAD CHEMICALS ======================= */
fetch('/api/chemicals').then(r=>r.json()).then(data=>{
  CHEMICALS = data;
  document.getElementById('countBadge').textContent = CHEMICALS.length + ' items';
  renderCategoryChips();
  renderShelf();
  say("Hi, I'm your lab partner. Drag apparatus onto the bench from the Apparatus tab, then pour chemicals in.");
});
function chemObj(id){ return CHEMICALS.find(c=>c.id===id); }
function chemName(id){ return chemObj(id)?.name || id; }

/* ======================= SHELF TABS ======================= */
document.querySelectorAll('.shelf-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.shelf-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const isApp = tab.dataset.shelf==='app';
    document.getElementById('chemShelfBody').style.display = isApp ? 'none':'block';
    document.getElementById('appShelfBody').style.display = isApp ? 'block':'none';
  });
});

/* ======================= CHEMICAL SHELF ======================= */
let activeCatFilter = null;
function renderCategoryChips(){
  const cats = [...new Set(CHEMICALS.map(c=>c.category))];
  const row = document.getElementById('catChipRow');
  row.innerHTML = cats.map(c=>`<button class="iconbtn" style="width:auto;padding:0 10px;font-size:10px;${activeCatFilter===c?'background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;':''}" data-cat="${c}">${CAT_LABEL[c]||c}</button>`).join('');
  row.querySelectorAll('[data-cat]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeCatFilter = activeCatFilter === btn.dataset.cat ? null : btn.dataset.cat;
      renderCategoryChips();
      renderShelf(document.getElementById('searchInput').value);
    });
  });
}
function bottleHTML(c){
  return `<div class="bottle"><div class="cap"></div><div class="body"><div class="fill" style="background:${c.color}; height:${c.state==='solid'?'40%':'65%'};"></div><div class="shine"></div></div></div>`;
}
const chemGrid = document.getElementById('chemGrid');
const STATE_GROUPS = [
  {key:'solid', label:'Solids'},
  {key:'liquid_aq', label:'Liquids & Aqueous Solutions'},
  {key:'gas', label:'Gases'},
];
function stateGroupFor(c){
  if(c.state==='solid') return 'solid';
  if(c.state==='gas') return 'gas';
  return 'liquid_aq';
}
function renderShelf(filter=''){
  chemGrid.innerHTML='';
  const f = (filter||'').trim().toLowerCase();
  const matches = CHEMICALS.filter(c=>{
    if(activeCatFilter && c.category!==activeCatFilter) return false;
    if(!f) return true;
    return c.name.toLowerCase().includes(f) || c.formula.toLowerCase().includes(f) || c.category.includes(f);
  });
  STATE_GROUPS.forEach(grp=>{
    const items = matches.filter(c=>stateGroupFor(c)===grp.key);
    if(items.length===0) return;
    const header = document.createElement('div');
    header.className='state-group-header';
    header.textContent = `${grp.label} (${items.length})`;
    chemGrid.appendChild(header);
    const row = document.createElement('div');
    row.className='chem-grid-inner';
    items.forEach(c=>{
      const el = document.createElement('div');
      el.className='chem-card';
      el.dataset.id = c.id;
      el.innerHTML = `<div class="tag">${CAT_LABEL[c.category]||c.category}</div>${bottleHTML(c)}<div class="name">${c.name}</div><div class="formula">${c.formula}</div>`;
      row.appendChild(el);
    });
    chemGrid.appendChild(row);
  });
  attachChemDragHandlers();
}
document.getElementById('searchInput').addEventListener('input', e=> renderShelf(e.target.value));

/* ======================= APPARATUS SHELF ======================= */
const APPARATUS_DEFS = [
  {type:'vessel', shape:'beaker', icon:ICONS.beaker, label:'Beaker'},
  {type:'vessel', shape:'flask', icon:ICONS.flask, label:'Conical Flask'},
  {type:'vessel', shape:'testtube', icon:ICONS.testtube, label:'Test Tube'},
  {type:'vessel', shape:'evapdish', icon:ICONS.evapdish, label:'Evaporating Dish'},
  {type:'burner', icon:ICONS.burner, label:'Bunsen Burner'},
  {type:'burette', icon:ICONS.burette, label:'Burette (Titration)'},
  {type:'decor', kind:'tripod', icon:ICONS.tripod, label:'Tripod & Gauze'},
  {type:'decor', kind:'stand', icon:ICONS.stand, label:'Retort Stand'},
  {type:'decor', kind:'rack', icon:ICONS.rack, label:'Test Tube Rack'},
  {type:'decor', kind:'funnel', icon:ICONS.funnel, label:'Funnel & Filter'},
];
const appGrid = document.getElementById('appGrid');
APPARATUS_DEFS.forEach((def,i)=>{
  const el = document.createElement('div');
  el.className='app-card';
  el.dataset.idx = i;
  el.innerHTML = `<div class="icon">${def.icon}</div><div class="lbl">${def.label}</div>`;
  appGrid.appendChild(el);
});

/* ======================= VESSEL SHAPES ======================= */
const VESSEL_SHAPES = {
  beaker:   {outline:"M68 16 H128 V64 L178 208 Q184 224 168 224 H28 Q12 224 18 208 L68 64 Z", top:20, bottom:224, evapRate:1, viewBox:"0 0 196 238"},
  flask:    {outline:"M78 14 H118 V58 L172 200 Q182 224 158 224 H38 Q14 224 24 200 L78 58 Z", top:18, bottom:224, evapRate:0.9, viewBox:"0 0 196 238"},
  testtube: {outline:"M78 10 H118 V190 Q118 224 98 224 Q78 224 78 190 Z", top:14, bottom:224, evapRate:0.7, viewBox:"0 0 196 238"},
  evapdish: {outline:"M20 150 Q20 210 98 210 Q176 210 176 150 L164 130 H32 Z", top:130, bottom:210, evapRate:2.2, viewBox:"0 0 196 238"},
};
const VESSEL_LABELS = {beaker:'Beaker', flask:'Conical Flask', testtube:'Test Tube', evapdish:'Evaporating Dish'};

function svgForVessel(shape){
  const s = VESSEL_SHAPES[shape];
  return `<svg viewBox="${s.viewBox}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <clipPath id="clip-CLIPID"><path d="${s.outline}"/></clipPath>
      <linearGradient id="grad-CLIPID" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,0.35)"/><stop offset="0.5" stop-color="rgba(255,255,255,0.05)"/><stop offset="1" stop-color="rgba(255,255,255,0.18)"/>
      </linearGradient>
    </defs>
    <path d="${s.outline}" fill="url(#grad-CLIPID)" stroke="rgba(150,160,180,0.85)" stroke-width="3" stroke-linejoin="round"/>
    <g clip-path="url(#clip-CLIPID)">
      <rect class="precip-rect" x="0" y="${s.bottom}" width="196" height="0" fill="#e4e4de"/>
      <rect class="liquid-rect" x="0" y="${s.bottom}" width="196" height="0" fill="#cfe8f3" fill-opacity="0.92"/>
      <g class="bubble-group"></g>
      <g class="chip-group"></g>
    </g>
  </svg>`;
}

/* ======================= CREATE VESSEL / APPARATUS ======================= */
function createVessel(shape, x, y){
  vesselCounter++;
  const id = 'v'+vesselCounter;
  const label = VESSEL_LABELS[shape] + ' ' + vesselCounter;
  const el = document.createElement('div');
  el.className = 'bench-item vessel';
  el.dataset.id = id;
  el.style.left = x+'px'; el.style.top = y+'px';
  const clipId = id;
  el.innerHTML = `
    <button class="del-btn" title="Remove">✕</button>
    <div class="vessel-card">
      <div class="vessel-svg-wrap">${svgForVessel(shape).replaceAll('CLIPID', clipId)}</div>
      <div class="vessel-island">
        <span class="temp-badge">20°C</span>
        <span class="vol-badge">0 mL</span>
      </div>
      <div class="vessel-hidden-data">
        <div class="vessel-name">${label}</div>
        <div class="vessel-sub">Empty — drag a chemical in</div>
        <div class="vessel-pills"></div>
      </div>
    </div>`;
  bench.appendChild(el);
  vessels[id] = {id, shape, x, y, contents:[], temp:20, dryResidue:null, lastResult:null, el, label, heating:false};
  attachVesselHandlers(el, id);
  benchHint.style.display = 'none';
  selectVessel(id);
  return id;
}
function createBurner(x,y){
  burnerCounter++;
  const id = 'b'+burnerCounter;
  const el = document.createElement('div');
  el.className = 'bench-item burner';
  el.dataset.id = id;
  el.style.left = x+'px'; el.style.top = y+'px';
  el.innerHTML = `
    <button class="del-btn" title="Remove">✕</button>
    <div class="burner-flame-wrap">
      <svg class="burner-flame" viewBox="0 0 32 56">
        <path d="M16 54C6 47 4 36 9 26c1 6 4 7 4 2 0-6 3-11 1-17 8 7 12 17 8 27 4-3 4-9 4-9 5 11-2 21-10 25Z" fill="#ff9f0a"/>
        <path d="M16 46c-6-4-7-11-4-17 1 4 3 4 3 1 0-4 2-7 1-11 5 5 7 11 5 17 2-2 2-5 2-5 3 7-1 13-7 15Z" fill="#4aa8ff"/>
      </svg>
    </div>
    <svg class="burner-body" viewBox="0 0 70 64">
      <rect x="29" y="0" width="12" height="20" rx="1.5" fill="#9a9aa0" stroke="#6a6a70" stroke-width="1"/>
      <circle cx="35" cy="8" r="1.6" fill="#5a5a60"/><circle cx="35" cy="14" r="1.6" fill="#5a5a60"/>
      <path d="M13 20 H57 L62 52 Q62 58 55 58 H15 Q8 58 8 52 Z" fill="#3b3b3d" stroke="#1c1c1e" stroke-width="1"/>
      <rect x="6" y="52" width="58" height="9" rx="2" fill="#1c1c1e"/>
      <rect x="0" y="59" width="70" height="5" rx="2" fill="#0a0a0a"/>
    </svg>
    <div class="burner-label">Bunsen ${burnerCounter}</div>
    <div class="burner-hint">Tap to light</div>`;
  bench.appendChild(el);
  burners[id] = {id, x, y, lit:false, el};
  attachBurnerHandlers(el, id);
  benchHint.style.display = 'none';
  return id;
}
function createBurette(x,y){
  buretteCounter++;
  const id = 'br'+buretteCounter;
  const clipId = 'buretteClip'+buretteCounter;
  const el = document.createElement('div');
  el.className = 'bench-item burette-app';
  el.dataset.id = id;
  el.style.left = x+'px'; el.style.top = y+'px';
  el.innerHTML = `
    <button class="del-btn" title="Remove">✕</button>
    <div class="burette-rig-wrap">
    <svg class="burette-rig-svg" viewBox="0 0 90 175" preserveAspectRatio="xMidYMid meet">
      <rect x="6" y="8" width="5" height="152" fill="#9a9aa0"/>
      <rect x="0" y="158" width="32" height="8" rx="2" fill="#6a6a70"/>
      <rect x="6" y="16" width="36" height="5" fill="#9a9aa0"/>
      <rect x="36" y="12" width="6" height="13" fill="#7a7a80"/>
      <defs><clipPath id="${clipId}"><rect x="42" y="10" width="14" height="110" rx="3"/></clipPath></defs>
      <rect x="42" y="10" width="14" height="110" rx="3" fill="rgba(255,255,255,0.3)" stroke="#8a8f9a" stroke-width="1.4"/>
      <g clip-path="url(#${clipId})"><rect class="burette-fill-rect" x="42" y="120" width="14" height="0" fill="#cfe8f3"/></g>
      <g stroke="#8a8f9a" stroke-width="1">
        <line x1="42" y1="25" x2="47" y2="25"/><line x1="42" y1="45" x2="47" y2="45"/>
        <line x1="42" y1="65" x2="47" y2="65"/><line x1="42" y1="85" x2="47" y2="85"/><line x1="42" y1="105" x2="47" y2="105"/>
      </g>
      <rect x="40" y="120" width="18" height="6" rx="1.5" fill="#5a5a60"/>
      <rect x="46" y="126" width="6" height="10" fill="#5a5a60"/>
      <path d="M47 136 L52 136 L49.5 146 Z" fill="#8a8f9a"/>
    </svg>
    </div>
    <div class="burette-info-col">
      <div class="burette-label">Empty — drag a chemical on</div>
      <div class="burette-attach">Not attached — drag onto a vessel</div>
      <button class="btn small">+0.1 mL drop</button>
    </div>`;
  bench.appendChild(el);
  burettes[id] = {id, x, y, loadedId:null, remainingMl:0, attachedVesselId:null, el};
  attachBuretteHandlers(el, id);
  benchHint.style.display = 'none';
  return id;
}
function createDecor(kind, icon, label, x, y){
  decorCounter++;
  const id = 'd'+decorCounter;
  const el = document.createElement('div');
  el.className = 'bench-item decor-item';
  el.dataset.id = id;
  el.style.left = x+'px'; el.style.top = y+'px';
  el.innerHTML = `<button class="del-btn" title="Remove">✕</button>${icon}<div class="decor-label">${label}</div>`;
  bench.appendChild(el);
  decorItems[id] = {id, x, y, el, kind, icon, label};
  attachGenericDragHandlers(el, ()=>decorItems[id]);
  el.querySelector('.del-btn').addEventListener('click', (e)=>{ e.stopPropagation(); el.remove(); delete decorItems[id]; });
  benchHint.style.display = 'none';
  return id;
}

/* ======================= GENERIC BENCH-ITEM DRAG (reposition) ======================= */
function attachGenericDragHandlers(el, getObj, onDragEnd){
  let startX, startY, origX, origY, moved=false;
  el.addEventListener('pointerdown', (e)=>{
    if(e.target.closest('.del-btn')||e.target.closest('.btn')) return;
    e.preventDefault();
    const obj = getObj();
    startX=e.clientX; startY=e.clientY; origX=obj.x; origY=obj.y; moved=false;
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
    function onMove(ev){
      const dx=ev.clientX-startX, dy=ev.clientY-startY;
      if(Math.abs(dx)>4||Math.abs(dy)>4) moved=true;
      obj.x = origX+dx; obj.y = origY+dy;
      el.style.left = obj.x+'px'; el.style.top = obj.y+'px';
    }
    function onUp(ev){
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if(moved && onDragEnd) onDragEnd(obj);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

function attachVesselHandlers(el, id){
  attachGenericDragHandlers(el, ()=>vessels[id], ()=>checkVesselSnapAndPour(id));
  let downX,downY,moved=false;
  el.addEventListener('pointerdown', (e)=>{ downX=e.clientX; downY=e.clientY; moved=false;
    const mv=(ev)=>{ if(Math.abs(ev.clientX-downX)>5||Math.abs(ev.clientY-downY)>5) moved=true; };
    const up=(ev)=>{
      document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
      if(!moved && !e.target.closest('.del-btn')) selectVessel(id);
    };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  });
  el.querySelector('.del-btn').addEventListener('click', (e)=>{
    e.stopPropagation(); el.remove(); delete vessels[id];
    if(selectedVesselId===id){ selectedVesselId=null; clearInfo(); clearSelectedVesselPanel(); }
  });
}

function checkVesselSnapAndPour(id){
  const v = vessels[id];
  if(!v) return;
  const totalMl = v.contents.reduce((s,c)=>s+c.ml,0);
  if(totalMl<=0) return; // nothing to pour, don't bother snapping
  const vRect = v.el.getBoundingClientRect();
  const vcx = vRect.left+vRect.width/2, vcy = vRect.top+vRect.height/2;
  let best=null, bestDist=Infinity, bestRect=null;
  for(const otherId in vessels){
    if(otherId===id) continue;
    const r = vessels[otherId].el.getBoundingClientRect();
    const ocx = r.left+r.width/2, ocy = r.top+r.height/2;
    const dist = Math.hypot(vcx-ocx, vcy-ocy);
    if(dist < bestDist){ bestDist = dist; best = otherId; bestRect = r; }
  }
  if(best && bestDist < 240){
    const benchRect = bench.getBoundingClientRect();
    const targetLeftViewport = bestRect.right + 14;
    const targetTopViewport = bestRect.top;
    v.x = targetLeftViewport - benchRect.left + benchScroll.scrollLeft;
    v.y = targetTopViewport - benchRect.top + benchScroll.scrollTop;
    v.el.style.left = v.x+'px'; v.el.style.top = v.y+'px';
    openPourBetweenPanel(id, best);
  }
}

/* ======================= POUR BETWEEN VESSELS ======================= */
function openPourBetweenPanel(sourceId, targetId){
  closePourBetweenPanel();
  const src = vessels[sourceId], tgt = vessels[targetId];
  if(!src || !tgt) return;
  const totalMl = src.contents.reduce((s,c)=>s+c.ml,0);
  if(totalMl<=0) return;
  const srcRect = src.el.getBoundingClientRect();
  let mode = 'pct';
  const panel = document.createElement('div');
  panel.className='pour-panel glass';
  panel.id='pourBetweenPanel';
  let px = srcRect.right + 12, py = srcRect.top;
  px = Math.max(10, Math.min(window.innerWidth-280, px));
  py = Math.max(10, py);
  panel.style.left=px+'px'; panel.style.top=py+'px';
  panel.innerHTML = `
    <div class="pour-head"><div class="nm">${src.label} → ${tgt.label}</div></div>
    <div class="pour-mode-toggle">
      <button class="pour-mode-btn active" data-mode="pct">Percentage</button>
      <button class="pour-mode-btn" data-mode="vol">Exact Volume</button>
    </div>
    <div class="pour-amt"><span class="num" id="pourBetweenNum">50</span><span class="unit" id="pourBetweenUnit">%</span></div>
    <input type="range" min="1" max="100" value="50" step="1" id="pourBetweenSlider">
    <div class="pour-actions">
      <button class="btn" id="pourBetweenCancel">Cancel</button>
      <button class="btn primary" id="pourBetweenConfirm">Pour</button>
    </div>`;
  document.body.appendChild(panel);
  const slider = document.getElementById('pourBetweenSlider');
  const num = document.getElementById('pourBetweenNum');
  const unit = document.getElementById('pourBetweenUnit');
  function updateSliderRange(){
    if(mode==='pct'){
      slider.min=1; slider.max=100; slider.step=1; slider.value=50;
      num.textContent='50'; unit.textContent='%';
    } else {
      slider.min=0.1; slider.max=totalMl.toFixed(1); slider.step=0.1; slider.value=(totalMl/2).toFixed(1);
      num.textContent=(totalMl/2).toFixed(1); unit.textContent='mL';
    }
  }
  updateSliderRange();
  slider.addEventListener('input', ()=> num.textContent = slider.value);
  panel.querySelectorAll('.pour-mode-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      panel.querySelectorAll('.pour-mode-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.mode;
      updateSliderRange();
    });
  });
  document.getElementById('pourBetweenCancel').addEventListener('click', closePourBetweenPanel);
  document.getElementById('pourBetweenConfirm').addEventListener('click', ()=>{
    const val = parseFloat(slider.value);
    const amountMl = mode==='pct' ? (totalMl * val/100) : val;
    closePourBetweenPanel();
    transferBetweenVessels(sourceId, targetId, amountMl);
  });
}
function closePourBetweenPanel(){ const p=document.getElementById('pourBetweenPanel'); if(p) p.remove(); }

function transferBetweenVessels(sourceId, targetId, amountMl){
  const src = vessels[sourceId], tgt = vessels[targetId];
  if(!src || !tgt) return;
  const totalMl = src.contents.reduce((s,c)=>s+c.ml,0);
  if(totalMl<=0) return;
  const amount = Math.min(amountMl, totalMl);
  const fraction = amount/totalMl;
  if(tgt.dryResidue){ tgt.dryResidue=null; tgt.contents=[]; }
  const transferred = [];
  src.contents.forEach(c=>{
    const t = Math.round(c.ml*fraction*100)/100;
    transferred.push({id:c.id, ml:t});
    c.ml = Math.round((c.ml - t)*100)/100;
  });
  src.contents = src.contents.filter(c=>c.ml>0.05);
  transferred.forEach(t=>{
    if(t.ml<=0) return;
    const existing = tgt.contents.find(c=>c.id===t.id);
    if(existing) existing.ml = Math.round((existing.ml+t.ml)*100)/100;
    else tgt.contents.push({id:t.id, ml:t.ml});
  });
  src.el.classList.remove('shake'); void src.el.offsetWidth; src.el.classList.add('shake');
  tgt.el.classList.remove('shake'); void tgt.el.offsetWidth; tgt.el.classList.add('shake');
  recomputeVessel(sourceId, false);
  recomputeVessel(targetId, true);
  logHistory(`Poured ${fmtMl(amount)} mL from ${src.label} into ${tgt.label}`);
  say(`Poured ${fmtMl(amount)} mL from ${src.label} into ${tgt.label}.`);
}
function attachBurnerHandlers(el, id){
  attachGenericDragHandlers(el, ()=>burners[id]);
  let downX,downY,moved=false;
  el.addEventListener('pointerdown', (e)=>{ downX=e.clientX; downY=e.clientY; moved=false;
    const mv=(ev)=>{ if(Math.abs(ev.clientX-downX)>5||Math.abs(ev.clientY-downY)>5) moved=true; };
    const up=(ev)=>{
      document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
      if(!moved && !e.target.closest('.del-btn')){
        const b = burners[id];
        b.lit = !b.lit;
        el.querySelector('.burner-flame').classList.toggle('on', b.lit);
        el.querySelector('.burner-hint').textContent = b.lit ? 'Lit — heating nearby vessels' : 'Tap to light';
        say(b.lit ? "Burner lit! Slide a vessel over it to heat it up." : "Burner's off — vessels nearby will start cooling.");
      }
    };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  });
  el.querySelector('.del-btn').addEventListener('click', (e)=>{ e.stopPropagation(); el.remove(); delete burners[id]; });
}
function attachBuretteHandlers(el, id){
  attachGenericDragHandlers(el, ()=>burettes[id], (obj)=>snapBuretteToNearestVessel(id));
  el.querySelector('.del-btn').addEventListener('click', (e)=>{ e.stopPropagation(); el.remove(); delete burettes[id]; });
  el.querySelector('.btn.small').addEventListener('click', (e)=>{
    e.stopPropagation();
    const br = burettes[id];
    if(!br.loadedId || br.remainingMl<=0){ say("This burette is empty — drag a chemical onto it first."); return; }
    let targetVesselId = br.attachedVesselId;
    if(!targetVesselId || !vessels[targetVesselId]){ snapBuretteToNearestVessel(id); targetVesselId = br.attachedVesselId; }
    if(!targetVesselId){ say("Drag the burette onto a vessel first so it can snap into place."); return; }
    br.remainingMl = Math.round((br.remainingMl - 0.1) * 100) / 100;
    updateBuretteVisual(id);
    addChemicalToVessel(targetVesselId, br.loadedId, 0.1);
  });
}
function snapBuretteToNearestVessel(id){
  const br = burettes[id];
  const benchRect = bench.getBoundingClientRect();
  const brRect = br.el.getBoundingClientRect();
  const rigRect = br.el.querySelector('.burette-rig-wrap').getBoundingClientRect();
  const tipX = rigRect.left + rigRect.width*0.62;
  const tipY = rigRect.bottom - 14;
  let best=null, bestDist=Infinity, bestVr=null;
  for(const vid in vessels){
    const vEl = vessels[vid].el.querySelector('.vessel-svg-wrap');
    const vr = vEl.getBoundingClientRect();
    const vcx = vr.left + vr.width/2;
    const vTopY = vr.top + vr.height*0.14;
    const dist = Math.hypot(tipX-vcx, tipY-vTopY);
    if(dist < bestDist){ bestDist = dist; best = vid; bestVr = vr; }
  }
  const label = br.el.querySelector('.burette-attach');
  if(best && bestDist < 260){
    br.attachedVesselId = best;
    const targetTipX = bestVr.left + bestVr.width/2;
    const targetTipY = bestVr.top - 4;
    const dxTip = tipX - brRect.left;
    const dyTip = tipY - brRect.top;
    const newLeftViewport = targetTipX - dxTip;
    const newTopViewport = targetTipY - dyTip;
    br.x = newLeftViewport - benchRect.left + benchScroll.scrollLeft;
    br.y = newTopViewport - benchRect.top + benchScroll.scrollTop;
    br.el.style.left = br.x+'px';
    br.el.style.top = br.y+'px';
    br.el.classList.add('snapped');
    label.textContent = `Snapped to ${vessels[best].label}`;
    label.classList.add('on');
    say(`Burette snapped onto ${vessels[best].label} — tap "+0.1 mL drop" to titrate.`);
  } else {
    br.attachedVesselId = null;
    br.el.classList.remove('snapped');
    label.textContent = 'Not attached — drag onto a vessel';
    label.classList.remove('on');
  }
}
function updateBuretteVisual(id){
  const br = burettes[id];
  const pct = Math.max(0, Math.min(1, br.remainingMl/50));
  const tubeH = 110;
  const h = pct * tubeH;
  const rect = br.el.querySelector('.burette-fill-rect');
  rect.setAttribute('height', h);
  rect.setAttribute('y', 120 - h);
}

/* ======================= DRAG FROM SHELVES ======================= */
function attachChemDragHandlers(){
  document.querySelectorAll('#chemGrid .chem-card').forEach(card=>{
    card.addEventListener('pointerdown', onChemPointerDown);
  });
}
document.querySelectorAll('#appGrid .app-card').forEach(card=>{
  card.addEventListener('pointerdown', onAppPointerDown);
});

function onChemPointerDown(e){
  e.preventDefault();
  draggingChemId = e.currentTarget.dataset.id;
  const chem = chemObj(draggingChemId);
  ghost = document.createElement('div');
  ghost.className='drag-ghost';
  ghost.innerHTML = bottleHTML(chem);
  document.body.appendChild(ghost);
  moveGhost(e.clientX, e.clientY);
  document.addEventListener('pointermove', onChemPointerMove);
  document.addEventListener('pointerup', onChemPointerUp);
}
function onChemPointerMove(e){
  moveGhost(e.clientX, e.clientY);
  highlightVesselOrBuretteUnder(e.clientX, e.clientY);
}
function onChemPointerUp(e){
  document.removeEventListener('pointermove', onChemPointerMove);
  document.removeEventListener('pointerup', onChemPointerUp);
  clearHighlights();
  if(ghost){ ghost.remove(); ghost=null; }
  const hit = elementAtForDrop(e.clientX, e.clientY);
  if(hit && draggingChemId){
    if(hit.kind==='vessel') openPourPanel(draggingChemId, hit.id, e.clientX, e.clientY);
    else if(hit.kind==='burette') loadBurette(hit.id, draggingChemId);
  }
  draggingChemId = null;
}
function onAppPointerDown(e){
  e.preventDefault();
  draggingAppType = parseInt(e.currentTarget.dataset.idx,10);
  const def = APPARATUS_DEFS[draggingAppType];
  ghost = document.createElement('div');
  ghost.className='drag-ghost';
  ghost.style.width='50px'; ghost.style.height='50px'; ghost.style.color='var(--text)';
  ghost.style.display='flex'; ghost.style.alignItems='center'; ghost.style.justifyContent='center';
  ghost.innerHTML = def.icon;
  document.body.appendChild(ghost);
  moveGhost(e.clientX, e.clientY);
  document.addEventListener('pointermove', onAppPointerMove);
  document.addEventListener('pointerup', onAppPointerUp);
}
function onAppPointerMove(e){ moveGhost(e.clientX, e.clientY); }
function onAppPointerUp(e){
  document.removeEventListener('pointermove', onAppPointerMove);
  document.removeEventListener('pointerup', onAppPointerUp);
  if(ghost){ ghost.remove(); ghost=null; }
  const benchRect = bench.getBoundingClientRect();
  const inBench = e.clientX>=benchRect.left && e.clientX<=benchRect.right && e.clientY>=benchRect.top && e.clientY<=benchRect.bottom;
  if(inBench && draggingAppType!=null){
    const def = APPARATUS_DEFS[draggingAppType];
    const x = e.clientX - benchRect.left - 40 + benchScroll.scrollLeft;
    const y = e.clientY - benchRect.top - 40 + benchScroll.scrollTop;
    if(def.type==='vessel') createVessel(def.shape, x, y);
    else if(def.type==='burner') createBurner(x, y);
    else if(def.type==='burette') createBurette(x, y);
    else if(def.type==='decor') createDecor(def.kind, def.icon, def.label, x, y);
  }
  draggingAppType = null;
}
function moveGhost(x,y){ if(ghost){ ghost.style.left=x+'px'; ghost.style.top=y+'px'; } }

function elementAtForDrop(clientX, clientY){
  for(const vid in vessels){
    const wrap = vessels[vid].el.querySelector('.vessel-svg-wrap');
    const r = wrap.getBoundingClientRect();
    if(clientX>=r.left-20 && clientX<=r.right+20 && clientY>=r.top-20 && clientY<=r.bottom+20) return {kind:'vessel', id:vid};
  }
  for(const bid in burettes){
    const r = burettes[bid].el.getBoundingClientRect();
    if(clientX>=r.left-20 && clientX<=r.right+20 && clientY>=r.top-20 && clientY<=r.bottom+20) return {kind:'burette', id:bid};
  }
  return null;
}
function highlightVesselOrBuretteUnder(x,y){
  clearHighlights();
  const hit = elementAtForDrop(x,y);
  if(!hit) return;
  if(hit.kind==='vessel') vessels[hit.id].el.querySelector('.vessel-svg-wrap').classList.add('dragover');
  if(hit.kind==='burette') burettes[hit.id].el.classList.add('dragover');
}
function clearHighlights(){
  document.querySelectorAll('.dragover').forEach(e=>e.classList.remove('dragover'));
}
document.addEventListener('touchmove', function(e){ if(draggingChemId||draggingAppType!=null) e.preventDefault(); }, {passive:false});

/* ======================= POUR PANEL ======================= */
let pendingChemId=null, pendingVesselId=null;
function openPourPanel(chemId, vesselId, x, y){
  closePourPanel();
  const chem = chemObj(chemId);
  pendingChemId = chemId; pendingVesselId = vesselId;
  const panel = document.createElement('div');
  panel.className='pour-panel glass';
  panel.id='pourPanel';
  let px = x - 130, py = y - 220;
  px = Math.max(10, Math.min(window.innerWidth-270, px));
  py = Math.max(10, py);
  panel.style.left = px+'px'; panel.style.top = py+'px';
  panel.innerHTML = `
    <div class="pour-head">${bottleHTML(chem)}<div class="nm">${chem.name} → ${vessels[vesselId].label}</div></div>
    <div class="pour-amt"><span class="num" id="pourAmtNum">50</span><span class="unit">mL</span></div>
    <input type="range" min="5" max="100" value="50" step="5" id="pourSlider">
    <div class="pour-actions">
      <button class="btn" id="pourCancel">Cancel</button>
      <button class="btn primary" id="pourConfirm">Pour In</button>
    </div>`;
  document.body.appendChild(panel);
  const slider = document.getElementById('pourSlider');
  const num = document.getElementById('pourAmtNum');
  slider.addEventListener('input', ()=> num.textContent = slider.value);
  document.getElementById('pourCancel').addEventListener('click', closePourPanel);
  document.getElementById('pourConfirm').addEventListener('click', ()=>{
    const amt = parseInt(slider.value,10);
    const cId = pendingChemId, vId = pendingVesselId;
    closePourPanel();
    addChemicalToVessel(vId, cId, amt);
  });
}
function closePourPanel(){ const p=document.getElementById('pourPanel'); if(p) p.remove(); pendingChemId=null; pendingVesselId=null; }
function loadBurette(buretteId, chemId){
  const br = burettes[buretteId];
  const chem = chemObj(chemId);
  br.loadedId = chemId;
  br.remainingMl = 50;
  br.el.querySelector('.burette-label').textContent = chem.name;
  br.el.querySelector('.burette-fill-rect').setAttribute('fill', chem.color);
  updateBuretteVisual(buretteId);
  say(`Burette loaded with ${chem.name}. Position it over a vessel and tap "+0.1 mL drop" to titrate.`);
}

/* ======================= VESSEL SELECTION / INFO ======================= */
function selectVessel(id){
  if(selectedVesselId && vessels[selectedVesselId]) vessels[selectedVesselId].el.classList.remove('selected');
  selectedVesselId = id;
  vessels[id].el.classList.add('selected');
  syncSelectedVesselPanel(vessels[id]);
  if(vessels[id].lastResult) renderInfo(vessels[id].lastResult);
  else clearInfo();
}

function syncSelectedVesselPanel(v){
  if(!v || v.id !== selectedVesselId) return;
  document.getElementById('vesselSummaryEmpty').style.display = 'none';
  document.getElementById('vesselSummaryContent').style.display = 'block';
  document.getElementById('vsLabel').textContent = v.el.querySelector('.vessel-name').textContent;
  document.getElementById('vsStatus').textContent = v.el.querySelector('.vessel-sub').textContent;
  document.getElementById('vsTemp').textContent = v.el.querySelector('.temp-badge').textContent;
  document.getElementById('vsTemp').classList.toggle('hot', v.el.querySelector('.temp-badge').classList.contains('hot'));
  document.getElementById('vsVol').textContent = v.el.querySelector('.vol-badge').textContent;
  document.getElementById('vsPills').innerHTML = v.el.querySelector('.vessel-pills').innerHTML;
}
function clearSelectedVesselPanel(){
  document.getElementById('vesselSummaryEmpty').style.display = 'block';
  document.getElementById('vesselSummaryContent').style.display = 'none';
}

/* ======================= REACTION LOGIC ======================= */
async function callReactAPI(mixture, heated){
  const res = await fetch('/api/react', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({mixture, heated})
  });
  return res.json();
}

function addChemicalToVessel(vesselId, chemId, ml){
  const v = vessels[vesselId];
  if(!v) return;
  if(v.dryResidue){ v.dryResidue=null; v.contents=[]; }
  const existing = v.contents.find(c=>c.id===chemId);
  if(existing) existing.ml = Math.round((existing.ml + ml) * 100) / 100;
  else v.contents.push({id:chemId, ml: Math.round(ml*100)/100});
  v.el.classList.remove('shake'); void v.el.offsetWidth; v.el.classList.add('shake');
  recomputeVessel(vesselId, true, chemObj(chemId));
}

function resetVesselDisplay(v){
  setVesselColor(v, 'transparent');
  setVesselPrecip(v, false);
  clearChips(v);
  v.el.querySelector('.bubble-group').innerHTML='';
  v.el.querySelector('.vessel-name').textContent = v.label;
  v.el.querySelector('.vessel-sub').textContent = 'Empty — drag a chemical in';
  v.lastResult = null;
  renderVesselMeta(v);
}
async function recomputeVessel(vesselId, isNewAdd, newChem){
  const v = vessels[vesselId];
  if(!v) return;
  setVesselLiquidHeight(v);
  if(v.contents.length===0){ resetVesselDisplay(v); return; }
  if(v.contents.length===1){
    const only = v.contents[0];
    const chem = chemObj(only.id);
    setVesselPrecip(v, false);
    v.el.querySelector('.bubble-group').innerHTML='';
    if(chem.state==='solid'){
      setVesselColor(v, 'transparent');
      liquidHeightZero(v);
      renderChips(v, chem.color, only.ml);
      v.el.querySelector('.vessel-sub').textContent = chem.name + ' (solid chips) — add a liquid to dissolve or react';
    } else {
      clearChips(v);
      setVesselColor(v, chem.color);
      v.el.querySelector('.vessel-sub').textContent = chem.name + ' only — add more to react';
    }
    v.el.querySelector('.vessel-name').textContent = v.label;
    v.lastResult = null;
    if(selectedVesselId===vesselId) clearInfo();
    renderVesselMeta(v);
    if(isNewAdd) say(`Added ${only.ml} mL of ${chem.name} to ${v.label}.`);
    return;
  }
  clearChips(v);
  const r = await callReactAPI(v.contents, v.temp>=60);
  if(r.empty) return;
  v.lastResult = r;
  setVesselColor(v, r.resultColor);
  v.el.querySelector('.vessel-name').textContent = r.products;
  v.el.querySelector('.vessel-sub').textContent = r.type;
  setVesselPrecip(v, !!r.precipitate, r.precipitate_color);
  if(r.gas){ spawnBubbles(v); } else { v.el.querySelector('.bubble-group').innerHTML=''; }
  if(r.temp==='exo'){ spawnSteam(v); }
  renderVesselMeta(v);
  if(selectedVesselId===vesselId) renderInfo(r);
  if(isNewAdd){
    logHistory(`${v.label}: ${newChem?newChem.name+' added → ':''}${r.products}`);
    const safetyBit = /toxic|flammable|corrosive|caustic|irritat/i.test(r.safety||'') ? ` Heads up: ${r.safety}` : '';
    say(`${v.label} now has <b>${r.products}</b> — a ${(r.type||'').toLowerCase()}.${safetyBit}`);
  }
}

function setVesselColor(v, color){ v.el.querySelector('.liquid-rect').setAttribute('fill', color); }
function setVesselLiquidHeight(v){
  const s = VESSEL_SHAPES[v.shape];
  const total = v.contents.reduce((sum,c)=>sum+c.ml,0);
  const pct = Math.max(0, Math.min(1, total/MAX_VISUAL_ML));
  const h = pct * (s.bottom - s.top);
  const rect = v.el.querySelector('.liquid-rect');
  rect.setAttribute('height', h);
  rect.setAttribute('y', s.bottom - h);
}
function setVesselPrecip(v, show, color){
  const s = VESSEL_SHAPES[v.shape];
  const rect = v.el.querySelector('.precip-rect');
  if(!show){ rect.setAttribute('height',0); rect.setAttribute('y', s.bottom); return; }
  const total = v.contents.reduce((sum,c)=>sum+c.ml,0);
  const totalH = Math.max(10, Math.min(1,total/MAX_VISUAL_ML)*(s.bottom-s.top)*0.3);
  rect.setAttribute('height', totalH);
  rect.setAttribute('y', s.bottom - totalH);
  if(color) rect.setAttribute('fill', color);
}
function renderVesselMeta(v){
  const total = v.contents.reduce((sum,c)=>sum+c.ml,0);
  const tempBadge = v.el.querySelector('.temp-badge');
  tempBadge.textContent = Math.round(v.temp)+'°C';
  tempBadge.classList.toggle('hot', v.temp>=60);
  v.el.querySelector('.vol-badge').textContent = fmtMl(total)+' mL';
  v.el.querySelector('.vessel-pills').innerHTML = v.contents.map(c=>`<span class="pill">${chemName(c.id)} ${fmtMl(c.ml)}mL</span>`).join('');
  syncSelectedVesselPanel(v);
}
function fmtMl(n){
  const r = Math.round(n*10)/10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
function liquidHeightZero(v){
  const s = VESSEL_SHAPES[v.shape];
  const rect = v.el.querySelector('.liquid-rect');
  rect.setAttribute('height', 0);
  rect.setAttribute('y', s.bottom);
}
function clearChips(v){ v.el.querySelector('.chip-group').innerHTML=''; }
function renderChips(v, color, amountMl){
  const s = VESSEL_SHAPES[v.shape];
  const g = v.el.querySelector('.chip-group');
  g.innerHTML='';
  const count = Math.max(4, Math.min(22, Math.round(amountMl/6)));
  const baseY = s.bottom - 6;
  const spanW = 130;
  const startX = 33;
  for(let i=0;i<count;i++){
    const cx = startX + Math.random()*spanW;
    const cy = baseY - Math.random()*Math.min(30, 6+count*1.1);
    const w = 7 + Math.random()*8;
    const h = 5 + Math.random()*6;
    const rot = Math.round(Math.random()*70-35);
    const poly = document.createElementNS('http://www.w3.org/2000/svg','rect');
    poly.setAttribute('x', -w/2); poly.setAttribute('y', -h/2);
    poly.setAttribute('width', w); poly.setAttribute('height', h);
    poly.setAttribute('rx', 1.6);
    poly.setAttribute('fill', color);
    poly.setAttribute('stroke', 'rgba(0,0,0,0.18)');
    poly.setAttribute('stroke-width', '0.6');
    poly.setAttribute('class', 'chip-piece');
    poly.setAttribute('transform', `translate(${cx},${cy}) rotate(${rot})`);
    g.appendChild(poly);
  }
}
function spawnBubbles(v){
  const g = v.el.querySelector('.bubble-group');
  g.innerHTML='';
  for(let i=0;i<7;i++){
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    const cx = 40+Math.random()*116, r = 3+Math.random()*3;
    c.setAttribute('cx', cx); c.setAttribute('cy', 220); c.setAttribute('r', r);
    c.setAttribute('fill','rgba(255,255,255,0.85)');
    const dur = (1.1+Math.random()*1.1).toFixed(2);
    const delay = (Math.random()*1.2).toFixed(2);
    const anim = document.createElementNS('http://www.w3.org/2000/svg','animate');
    anim.setAttribute('attributeName','cy'); anim.setAttribute('from','220'); anim.setAttribute('to','24');
    anim.setAttribute('dur',dur+'s'); anim.setAttribute('begin',delay+'s'); anim.setAttribute('repeatCount','indefinite');
    const animOp = document.createElementNS('http://www.w3.org/2000/svg','animate');
    animOp.setAttribute('attributeName','opacity'); animOp.setAttribute('values','0;0.9;0.9;0'); animOp.setAttribute('keyTimes','0;0.1;0.8;1');
    animOp.setAttribute('dur',dur+'s'); animOp.setAttribute('begin',delay+'s'); animOp.setAttribute('repeatCount','indefinite');
    c.appendChild(anim); c.appendChild(animOp);
    g.appendChild(c);
  }
  setTimeout(()=>{ if(g) g.innerHTML=''; }, 6500);
}
function spawnSteam(v){
  for(let i=0;i<3;i++){
    const s = document.createElement('div');
    s.className='steam';
    s.style.left = (35+Math.random()*30)+'%';
    s.style.animationDelay = (Math.random()*0.8)+'s';
    v.el.querySelector('.vessel-svg-wrap').appendChild(s);
    setTimeout(()=>s.remove(), 2200);
  }
}

function renderInfo(r){
  const gasBadge = r.gas ? '<span class="badge gas">Gas evolved</span>':'';
  const precipBadge = r.precipitate ? '<span class="badge precip">Precipitate</span>':'';
  const tempBadge = r.temp==='exo' ? '<span class="badge exo">Exothermic</span>' : (r.temp==='endo' ? '<span class="badge endo">Endothermic</span>' : '');
  const typeBadge = `<span class="badge type">${r.type||''}</span>`;
  const phLine = r.ph!=null ? `<div class="info-card"><div class="lbl">Estimated pH</div><div class="val">${r.ph.toFixed(1)}</div></div>` : '';
  document.getElementById('infoBody').innerHTML = `
    <div class="partner-note"><div class="av"></div><div class="msg">${r.explanation||''}</div></div>
    <div class="info-card"><div class="lbl">Products</div><div class="val">${r.products||''}</div><div class="badge-row">${typeBadge}${gasBadge}${precipBadge}${tempBadge}</div></div>
    <div class="info-card"><div class="lbl">Equation</div><div class="eq">${r.equation||'—'}</div></div>
    <div class="info-card"><div class="lbl">Ionic Equation</div><div class="eq">${r.ionic||'—'}</div></div>
    ${phLine}
    <div class="info-card"><div class="lbl">Observations</div><div class="val">${r.observations||''}</div></div>
    <div class="info-card"><div class="lbl">Safety Information</div><div class="val safety">${r.safety||''}</div></div>
  `;
}
function clearInfo(){ document.getElementById('infoBody').innerHTML = `<div class="info-empty">Tap a vessel on the bench, then mix chemicals into it to see products, equations, and observations here.</div>`; }
function logHistory(text){
  const t = new Date();
  history.unshift({time:t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), text});
  if(history.length>80) history.pop();
}

/* ======================= HEAT / EVAPORATION TICK LOOP ======================= */
function burnerNear(vesselEl){
  const wrap = vesselEl.querySelector('.vessel-svg-wrap');
  const vr = wrap.getBoundingClientRect();
  const vcx = vr.left + vr.width/2, vcy = vr.bottom;
  for(const bid in burners){
    const b = burners[bid];
    if(!b.lit) continue;
    const br = b.el.getBoundingClientRect();
    const bcx = br.left + br.width/2, bcy = br.top + 12;
    const dist = Math.hypot(vcx-bcx, vcy-bcy);
    if(dist < 85) return true;
  }
  return false;
}

setInterval(()=>{
  for(const id in vessels){
    const v = vessels[id];
    if(v.dryResidue){ renderVesselMeta(v); continue; }
    const heating = burnerNear(v.el);
    v.heating = heating;
    if(heating) v.temp = Math.min(120, v.temp + 8);
    else v.temp = Math.max(20, v.temp - 4);
    renderVesselMeta(v);

    const total = v.contents.reduce((s,c)=>s+c.ml,0);
    if(v.temp>=100 && total>0){
      const evapRate = VESSEL_SHAPES[v.shape].evapRate;
      const removePerComponent = evapRate * 3;
      v.contents.forEach(c=>{
        const chem = chemObj(c.id);
        if(chem && chem.state!=='solid'){
          c.ml = Math.max(0, c.ml - removePerComponent);
        }
      });
      spawnSteam(v);
      setVesselLiquidHeight(v);
      const newTotal = v.contents.reduce((s,c)=>s+c.ml,0);
      if(newTotal<=0.5){
        // evaporated to dryness — figure out what solid (if anything) is actually
        // left behind. Prefer the real reaction product (e.g. titrating HCl+NaOH
        // forms NaCl even though neither ingredient itself is a "salt" chemical),
        // falling back to a raw salt ingredient if nothing reacted.
        let soluteChem = null;
        if(v.lastResult && v.lastResult.formed_salt){
          soluteChem = {name: v.lastResult.formed_salt.name, color: v.lastResult.formed_salt.color};
        } else if(v.lastResult && v.lastResult.precipitate){
          soluteChem = {name: v.lastResult.products, color: v.lastResult.precipitate_color || v.lastResult.resultColor};
        } else {
          const rawSalt = v.contents.map(c=>chemObj(c.id)).find(c=>c && c.category==='salt');
          if(rawSalt) soluteChem = {name: rawSalt.name, color: rawSalt.color};
        }
        if(soluteChem){
          v.dryResidue = soluteChem;
          v.contents = [];
          setVesselColor(v, 'transparent');
          setVesselLiquidHeight(v);
          setVesselPrecip(v, false);
          renderChips(v, soluteChem.color, 60);
          v.el.querySelector('.vessel-name').textContent = 'Dry residue: ' + soluteChem.name;
          v.el.querySelector('.vessel-sub').textContent = 'Evaporated to dryness on the burner — solid crystals remain.';
          v.el.querySelector('.bubble-group').innerHTML='';
          v.lastResult = null;
          if(selectedVesselId===v.id){
            document.getElementById('infoBody').innerHTML = `<div class="info-empty">All the water has boiled off, leaving solid ${soluteChem.name} crystals behind. Add more liquid to dissolve them again.</div>`;
          }
          logHistory(`${v.label}: evaporated to dryness — solid ${soluteChem.name} left behind`);
          say(`${v.label} has boiled dry — solid ${soluteChem.name} crystals are left in the bottom.`);
        } else {
          v.contents = [];
          setVesselColor(v, 'transparent');
          setVesselLiquidHeight(v);
          v.el.querySelector('.vessel-name').textContent = v.label;
          v.el.querySelector('.vessel-sub').textContent = 'Empty (fully evaporated).';
        }
        renderVesselMeta(v);
      }
    }
  }
}, 1000);

/* ======================= CLEAR BENCH / HISTORY ======================= */
document.getElementById('clearBenchBtn').addEventListener('click', ()=>{
  bench.innerHTML='';
  vessels={}; burners={}; burettes={}; decorItems={};
  selectedVesselId=null;
  clearInfo();
  clearSelectedVesselPanel();
  benchHint.style.display='block';
  logHistory('Bench cleared');
  say("Bench is clear — drag some apparatus in to start a new setup.");
});
document.getElementById('historyBtn').addEventListener('click', ()=>{
  openModal(`
    <div class="modal-head"><h2>Experiment History</h2><button class="iconbtn" onclick="closeModal()">✕</button></div>
    <div id="historyList">${history.length? history.map(h=>`<div class="history-item"><span>${h.text}</span><span class="t">${h.time}</span></div>`).join('') : '<div class="info-empty">No experiments yet.</div>'}</div>
  `);
});

/* ======================= NOTES TABS ======================= */
document.querySelectorAll('.info-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.info-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const isNotes = tab.dataset.tab==='notes';
    document.getElementById('reactionTabBody').style.display = isNotes ? 'none':'block';
    document.getElementById('notesTabBody').style.display = isNotes ? 'flex':'none';
  });
});
const notesArea = document.getElementById('notesArea');
notesArea.value = localStorage.getItem('chemlab_notes') || '';
notesArea.addEventListener('input', ()=>{ localStorage.setItem('chemlab_notes', notesArea.value); });

function downloadTextFile(filename, text, mime){
  const blob = new Blob([text], {type: mime || 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

document.getElementById('saveNotesBtn').addEventListener('click', ()=>{
  const stamp = new Date().toLocaleString();
  const content = `ChemLab Lab Notes — saved ${stamp}\n${'='.repeat(40)}\n\n${notesArea.value}`;
  downloadTextFile('chemlab-notes.txt', content, 'text/plain');
  document.getElementById('notesMeta').textContent = 'Saved ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  setTimeout(()=>{ document.getElementById('notesMeta').textContent=''; }, 4000);
  say("Notes saved as a .txt file.");
});

/* ======================= WORKSPACE SAVE / OPEN ======================= */
/* Captures every vessel (shape, position, exact chemical volumes, temperature,
   dry-residue state), every burner (position, lit state), every burette
   (position, loaded chemical, remaining volume, attached vessel), decorative
   apparatus, and the lab notes — so a whole session can be reopened later. */
function serializeWorkspace(){
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    notes: notesArea.value,
    vessels: Object.values(vessels).map(v=>({
      id:v.id, shape:v.shape, x:v.x, y:v.y, temp:v.temp, label:v.label,
      contents: v.contents.map(c=>({id:c.id, ml:c.ml})),
      dryResidue: v.dryResidue
    })),
    burners: Object.values(burners).map(b=>({id:b.id, x:b.x, y:b.y, lit:b.lit})),
    burettes: Object.values(burettes).map(br=>({
      id:br.id, x:br.x, y:br.y, loadedId:br.loadedId, remainingMl:br.remainingMl, attachedVesselId:br.attachedVesselId
    })),
    decor: Object.values(decorItems).map(d=>({id:d.id, x:d.x, y:d.y, kind:d.kind, icon:d.icon, label:d.label})),
    counters: {vesselCounter, burnerCounter, buretteCounter, decorCounter}
  };
}

document.getElementById('saveWorkspaceBtn').addEventListener('click', ()=>{
  const data = serializeWorkspace();
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  downloadTextFile(`chemlab-workspace-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json');
  say("Workspace saved — apparatus, exact volumes, temperatures, and your notes are all in that file. Use the folder icon to reopen it later.");
});

document.getElementById('openWorkspaceBtn').addEventListener('click', ()=>{
  document.getElementById('workspaceFileInput').click();
});
document.getElementById('workspaceFileInput').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      loadWorkspace(data);
    }catch(err){
      say("That file doesn't look like a valid ChemLab workspace save.");
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

function loadWorkspace(data){
  bench.innerHTML='';
  vessels={}; burners={}; burettes={}; decorItems={};
  selectedVesselId=null;

  (data.vessels||[]).forEach(vs=>{
    const id = createVessel(vs.shape, vs.x, vs.y);
    const v = vessels[id];
    v.label = vs.label || v.label;
    v.el.querySelector('.vessel-name').textContent = v.label;
    v.contents = (vs.contents||[]).map(c=>({id:c.id, ml:c.ml}));
    v.temp = vs.temp!=null ? vs.temp : 20;
    v.dryResidue = vs.dryResidue || null;
    if(v.dryResidue){
      setVesselColor(v, 'transparent'); liquidHeightZero(v);
      renderChips(v, v.dryResidue.color, 60);
      v.el.querySelector('.vessel-name').textContent = 'Dry residue: ' + v.dryResidue.name;
      v.el.querySelector('.vessel-sub').textContent = 'Evaporated to dryness on the burner — solid crystals remain.';
      renderVesselMeta(v);
    } else if(v.contents.length>0){
      recomputeVessel(id, false);
    } else {
      renderVesselMeta(v);
    }
  });
  (data.burners||[]).forEach(bs=>{
    const id = createBurner(bs.x, bs.y);
    const b = burners[id];
    b.lit = !!bs.lit;
    b.el.querySelector('.burner-flame').classList.toggle('on', b.lit);
    b.el.querySelector('.burner-hint').textContent = b.lit ? 'Lit — heating nearby vessels' : 'Tap to light';
  });
  (data.burettes||[]).forEach(brs=>{
    const id = createBurette(brs.x, brs.y);
    const br = burettes[id];
    if(brs.loadedId){
      br.loadedId = brs.loadedId;
      br.remainingMl = brs.remainingMl||0;
      const chem = chemObj(brs.loadedId);
      if(chem){
        br.el.querySelector('.burette-label').textContent = chem.name;
        br.el.querySelector('.burette-fill-rect').setAttribute('fill', chem.color);
      }
      updateBuretteVisual(id);
    }
    if(brs.attachedVesselId && vessels[brs.attachedVesselId]){
      br.attachedVesselId = brs.attachedVesselId;
      br.el.classList.add('snapped');
      const label = br.el.querySelector('.burette-attach');
      label.textContent = `Snapped to ${vessels[brs.attachedVesselId].label}`;
      label.classList.add('on');
    }
  });
  (data.decor||[]).forEach(ds=>{
    createDecor(ds.kind, ds.icon, ds.label, ds.x, ds.y);
  });

  if(data.counters){
    vesselCounter = Math.max(vesselCounter, data.counters.vesselCounter||0);
    burnerCounter = Math.max(burnerCounter, data.counters.burnerCounter||0);
    buretteCounter = Math.max(buretteCounter, data.counters.buretteCounter||0);
    decorCounter = Math.max(decorCounter, data.counters.decorCounter||0);
  }
  notesArea.value = data.notes || '';
  localStorage.setItem('chemlab_notes', notesArea.value);
  benchHint.style.display = Object.keys(vessels).length===0 && Object.keys(burners).length===0 ? 'block' : 'none';
  say(`Workspace restored from ${data.savedAt ? new Date(data.savedAt).toLocaleString() : 'a previous save'}.`);
}

/* ======================= PERIODIC TABLE ======================= */
const CAT_COLORS = { 'alkali metal':'#ff9f0a', 'alkaline earth metal':'#ffcc66', 'transition metal':'#5e5ce6',
  'post-transition metal':'#7b8ca6', 'metalloid':'#30d158', 'nonmetal':'#0a84ff', 'halogen':'#ff453a', 'noble gas':'#af52de' };
function cat(g){
  if(g===1) return 'alkali metal'; if(g===2) return 'alkaline earth metal';
  if(g>=3 && g<=12) return 'transition metal'; if(g===17) return 'halogen'; if(g===18) return 'noble gas';
  if([13,14,15,16].includes(g)) return 'post-transition metal'; return 'nonmetal';
}
const ELEMENTS = [
{n:1,s:'H',nm:'Hydrogen',g:1,p:1,m:'1.008'},{n:2,s:'He',nm:'Helium',g:18,p:1,m:'4.003'},
{n:3,s:'Li',nm:'Lithium',g:1,p:2,m:'6.94'},{n:4,s:'Be',nm:'Beryllium',g:2,p:2,m:'9.012'},{n:5,s:'B',nm:'Boron',g:13,p:2,m:'10.81'},{n:6,s:'C',nm:'Carbon',g:14,p:2,m:'12.011'},{n:7,s:'N',nm:'Nitrogen',g:15,p:2,m:'14.007'},{n:8,s:'O',nm:'Oxygen',g:16,p:2,m:'15.999'},{n:9,s:'F',nm:'Fluorine',g:17,p:2,m:'18.998'},{n:10,s:'Ne',nm:'Neon',g:18,p:2,m:'20.180'},
{n:11,s:'Na',nm:'Sodium',g:1,p:3,m:'22.990'},{n:12,s:'Mg',nm:'Magnesium',g:2,p:3,m:'24.305'},{n:13,s:'Al',nm:'Aluminium',g:13,p:3,m:'26.982'},{n:14,s:'Si',nm:'Silicon',g:14,p:3,m:'28.085'},{n:15,s:'P',nm:'Phosphorus',g:15,p:3,m:'30.974'},{n:16,s:'S',nm:'Sulfur',g:16,p:3,m:'32.06'},{n:17,s:'Cl',nm:'Chlorine',g:17,p:3,m:'35.45'},{n:18,s:'Ar',nm:'Argon',g:18,p:3,m:'39.948'},
{n:19,s:'K',nm:'Potassium',g:1,p:4,m:'39.098'},{n:20,s:'Ca',nm:'Calcium',g:2,p:4,m:'40.078'},{n:21,s:'Sc',nm:'Scandium',g:3,p:4,m:'44.956'},{n:22,s:'Ti',nm:'Titanium',g:4,p:4,m:'47.867'},{n:23,s:'V',nm:'Vanadium',g:5,p:4,m:'50.942'},{n:24,s:'Cr',nm:'Chromium',g:6,p:4,m:'51.996'},{n:25,s:'Mn',nm:'Manganese',g:7,p:4,m:'54.938'},{n:26,s:'Fe',nm:'Iron',g:8,p:4,m:'55.845'},{n:27,s:'Co',nm:'Cobalt',g:9,p:4,m:'58.933'},{n:28,s:'Ni',nm:'Nickel',g:10,p:4,m:'58.693'},{n:29,s:'Cu',nm:'Copper',g:11,p:4,m:'63.546'},{n:30,s:'Zn',nm:'Zinc',g:12,p:4,m:'65.38'},{n:31,s:'Ga',nm:'Gallium',g:13,p:4,m:'69.723'},{n:32,s:'Ge',nm:'Germanium',g:14,p:4,m:'72.630'},{n:33,s:'As',nm:'Arsenic',g:15,p:4,m:'74.922'},{n:34,s:'Se',nm:'Selenium',g:16,p:4,m:'78.971'},{n:35,s:'Br',nm:'Bromine',g:17,p:4,m:'79.904'},{n:36,s:'Kr',nm:'Krypton',g:18,p:4,m:'83.798'},
{n:37,s:'Rb',nm:'Rubidium',g:1,p:5,m:'85.468'},{n:38,s:'Sr',nm:'Strontium',g:2,p:5,m:'87.62'},{n:39,s:'Y',nm:'Yttrium',g:3,p:5,m:'88.906'},{n:40,s:'Zr',nm:'Zirconium',g:4,p:5,m:'91.224'},{n:41,s:'Nb',nm:'Niobium',g:5,p:5,m:'92.906'},{n:42,s:'Mo',nm:'Molybdenum',g:6,p:5,m:'95.95'},{n:43,s:'Tc',nm:'Technetium',g:7,p:5,m:'(98)'},{n:44,s:'Ru',nm:'Ruthenium',g:8,p:5,m:'101.07'},{n:45,s:'Rh',nm:'Rhodium',g:9,p:5,m:'102.91'},{n:46,s:'Pd',nm:'Palladium',g:10,p:5,m:'106.42'},{n:47,s:'Ag',nm:'Silver',g:11,p:5,m:'107.87'},{n:48,s:'Cd',nm:'Cadmium',g:12,p:5,m:'112.41'},{n:49,s:'In',nm:'Indium',g:13,p:5,m:'114.82'},{n:50,s:'Sn',nm:'Tin',g:14,p:5,m:'118.71'},{n:51,s:'Sb',nm:'Antimony',g:15,p:5,m:'121.76'},{n:52,s:'Te',nm:'Tellurium',g:16,p:5,m:'127.60'},{n:53,s:'I',nm:'Iodine',g:17,p:5,m:'126.90'},{n:54,s:'Xe',nm:'Xenon',g:18,p:5,m:'131.29'},
{n:55,s:'Cs',nm:'Caesium',g:1,p:6,m:'132.91'},{n:56,s:'Ba',nm:'Barium',g:2,p:6,m:'137.33'},{n:72,s:'Hf',nm:'Hafnium',g:4,p:6,m:'178.49'},{n:73,s:'Ta',nm:'Tantalum',g:5,p:6,m:'180.95'},{n:74,s:'W',nm:'Tungsten',g:6,p:6,m:'183.84'},{n:75,s:'Re',nm:'Rhenium',g:7,p:6,m:'186.21'},{n:76,s:'Os',nm:'Osmium',g:8,p:6,m:'190.23'},{n:77,s:'Ir',nm:'Iridium',g:9,p:6,m:'192.22'},{n:78,s:'Pt',nm:'Platinum',g:10,p:6,m:'195.08'},{n:79,s:'Au',nm:'Gold',g:11,p:6,m:'196.97'},{n:80,s:'Hg',nm:'Mercury',g:12,p:6,m:'200.59'},{n:81,s:'Tl',nm:'Thallium',g:13,p:6,m:'204.38'},{n:82,s:'Pb',nm:'Lead',g:14,p:6,m:'207.2'},{n:83,s:'Bi',nm:'Bismuth',g:15,p:6,m:'208.98'},{n:84,s:'Po',nm:'Polonium',g:16,p:6,m:'(209)'},{n:85,s:'At',nm:'Astatine',g:17,p:6,m:'(210)'},{n:86,s:'Rn',nm:'Radon',g:18,p:6,m:'(222)'},
];
let ptActiveFilter = null;
function elementFunFact(el){
  const facts = {
    H:'The most abundant element in the universe.', He:'Used to fill balloons and cool MRI magnets.',
    Na:'Reacts explosively with water — found in table salt as Na+.', Cl:'A toxic gas that forms harmless table salt with sodium.',
    Fe:'The most common element by mass in the Earth as a whole.', Cu:'One of the few metals with a natural reddish color.',
    Zn:'Essential trace element and used to galvanize steel.', Mg:'Burns with a brilliant white light — used in fireworks.',
    Al:"The most abundant metal in Earth's crust.", Ag:'The best electrical conductor of any element.',
    Au:"So unreactive it's found in nature as pure metal.", O:"Makes up about 21% of Earth's atmosphere.",
    C:'The basis of all known organic life.', N:"Makes up about 78% of Earth's atmosphere.",
    I:'Essential for thyroid hormone production in humans.', Pb:'Once common in paint and pipes, now known to be toxic.'
  };
  return facts[el.s] || `Atomic number ${el.n}, part of period ${el.p}.`;
}
function shelfElementSymbols(){
  return CHEMICALS.filter(c=>c.category==='metal'||c.category==='halogen').map(c=>{
    const map = {k:'K',na:'Na',ca:'Ca',mg:'Mg',al:'Al',zn:'Zn',fe:'Fe',pb:'Pb',cu:'Cu',ag:'Ag',au:'Au',cl2:'Cl',bromine:'Br',iodine:'I'};
    return map[c.id];
  }).filter(Boolean);
}
document.getElementById('periodicBtn').addEventListener('click', ()=>{
  ptActiveFilter=null;
  openModal(`
    <div class="modal-head"><h2>Periodic Table</h2><button class="iconbtn" onclick="closeModal()">✕</button></div>
    <div class="pt-filters" id="ptFilters"></div>
    <div style="overflow-x:auto;"><div class="ptable" id="ptGrid"></div></div>
    <div id="ptDetailWrap"></div>
  `);
  renderPTFilters(); renderPTGrid();
});
function renderPTFilters(){
  const cats = ['alkali metal','alkaline earth metal','transition metal','post-transition metal','metalloid','nonmetal','halogen','noble gas'];
  const wrap = document.getElementById('ptFilters');
  wrap.innerHTML = `<div class="pt-chip ${ptActiveFilter===null?'on':''}" data-c="__all">All Elements</div>` +
    cats.map(c=>`<div class="pt-chip ${ptActiveFilter===c?'on':''}" style="${ptActiveFilter===c?`background:${CAT_COLORS[c]};color:#fff;`:''}" data-c="${c}">${c}</div>`).join('') +
    `<div class="pt-chip ${ptActiveFilter==='shelf'?'on':''}" data-c="shelf">On My Shelf</div>`;
  wrap.querySelectorAll('.pt-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const c = chip.dataset.c;
      ptActiveFilter = c==='__all' ? null : c;
      renderPTFilters(); renderPTGrid();
    });
  });
}
function renderPTGrid(){
  const shelfSyms = shelfElementSymbols();
  let cells='';
  for(let p=1;p<=6;p++){
    for(let g=1;g<=18;g++){
      const el = ELEMENTS.find(e=>e.p===p && e.g===g);
      if(el){
        const c = cat(el.g);
        const isShelf = shelfSyms.includes(el.s);
        let dim=false;
        if(ptActiveFilter==='shelf') dim = !isShelf;
        else if(ptActiveFilter) dim = (c!==ptActiveFilter);
        cells += `<div class="pcell ${dim?'dim':''} ${isShelf?'shelf-item':''}" data-sym="${el.s}" style="background:${CAT_COLORS[c]}22; color:${CAT_COLORS[c]};" title="${el.nm}">
          <span class="num">${el.n}</span><span class="sym">${el.s}</span><span class="nm">${el.nm}</span></div>`;
      } else { cells += `<div class="pcell" style="background:transparent;border:none;cursor:default;"></div>`; }
    }
  }
  const grid = document.getElementById('ptGrid');
  grid.innerHTML = cells;
  grid.querySelectorAll('.pcell[data-sym]').forEach(cell=>{
    cell.addEventListener('click', ()=>{
      grid.querySelectorAll('.pcell').forEach(c=>c.classList.remove('selected'));
      cell.classList.add('selected');
      showElementDetail(cell.dataset.sym);
    });
  });
}
function showElementDetail(sym){
  const el = ELEMENTS.find(e=>e.s===sym);
  const c = cat(el.g);
  const isShelf = shelfElementSymbols().includes(el.s);
  document.getElementById('ptDetailWrap').innerHTML = `
    <div class="pt-detail">
      <div class="big-sym" style="background:${CAT_COLORS[c]};">${el.s}</div>
      <div class="meta">
        <div class="row"><span class="k">Name</span><span>${el.nm}</span></div>
        <div class="row"><span class="k">Atomic Number</span><span>${el.n}</span></div>
        <div class="row"><span class="k">Atomic Mass</span><span>${el.m}</span></div>
        <div class="row"><span class="k">Category</span><span style="color:${CAT_COLORS[c]};font-weight:700;">${c}</span></div>
        <div class="row"><span class="k">In store cupboard?</span><span>${isShelf?'Yes — try it in an experiment!':'Not currently stocked'}</span></div>
        <div class="row"><span class="k">Fun fact</span><span>${elementFunFact(el)}</span></div>
      </div>
    </div>`;
}

/* ======================= MODAL HELPERS ======================= */
function openModal(html){
  closeModal();
  const bg = document.createElement('div');
  bg.className='modal-bg'; bg.id='modalBg';
  bg.addEventListener('click', (e)=>{ if(e.target===bg) closeModal(); });
  bg.innerHTML = `<div class="modal scroll-thin">${html}</div>`;
  document.body.appendChild(bg);
}
function closeModal(){ const bg = document.getElementById('modalBg'); if(bg) bg.remove(); }
window.closeModal = closeModal;

/* ======================= DARK MODE ======================= */
const darkBtn = document.getElementById('darkBtn');
function applyDark(v){
  darkMode=v;
  document.documentElement.classList.toggle('dark', v);
  darkBtn.classList.toggle('active', v);
  darkBtn.textContent = v ? '☀️' : '🌙';
}
darkBtn.addEventListener('click', ()=> applyDark(!darkMode));

/* ======================= FLOATING ISLAND TOGGLE ======================= */
const toggleIslandBtn = document.getElementById('toggleIslandBtn');
let showIslands = false;
toggleIslandBtn.addEventListener('click', ()=>{
  showIslands = !showIslands;
  bench.classList.toggle('show-islands', showIslands);
  toggleIslandBtn.classList.toggle('active', showIslands);
  say(showIslands ? "Now showing temperature and volume right on each vessel." : "Hid the on-vessel temperature/volume badges — check the Reaction Info panel instead.");
});
applyDark(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
