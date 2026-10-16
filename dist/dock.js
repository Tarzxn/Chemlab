// A movable navigation dock. Only its handle captures dragging; links remain ordinary buttons.
export function dockBounds(x,y,width,height,viewportWidth,viewportHeight){
 const gap=8;
 return {x:Math.max(gap,Math.min(Number.isFinite(x)?x:gap,Math.max(gap,viewportWidth-width-gap))),y:Math.max(gap,Math.min(Number.isFinite(y)?y:gap,Math.max(gap,viewportHeight-height-gap)))};
}
export function mountDock(){
 const dock=document.getElementById('main-sidebar'),handle=document.getElementById('dock-handle'),nav=document.getElementById('nav');
 if(!dock||!handle||!nav)return ()=>{};
 const key='chemlab.dock.position.v1';let saved=null,drag=null,frame=0;
 try{const value=JSON.parse(localStorage.getItem(key));if(value&&Number.isFinite(value.x)&&Number.isFinite(value.y)&&value.x>=0&&value.x<=1&&value.y>=0&&value.y<=1)saved=value;}catch{}
 const viewport=()=>({width:document.documentElement.clientWidth,height:window.innerHeight});
 function place(x,y){const v=viewport(),r=dock.getBoundingClientRect(),p=dockBounds(x,y,r.width,r.height,v.width,v.height);dock.style.left=p.x+'px';dock.style.top=p.y+'px';dock.style.bottom='auto';dock.style.setProperty('--dock-offset','0px');return p;}
 function layout(){const v=viewport(),r=dock.getBoundingClientRect();place(saved?saved.x*Math.max(1,v.width-r.width):(v.width-r.width)/2,saved?saved.y*Math.max(1,v.height-r.height):v.height-r.height-14);const active=nav.querySelector('[aria-current="page"]');if(active){nav.style.setProperty('--active-left',active.offsetLeft+'px');nav.style.setProperty('--active-width',active.offsetWidth+'px');}}
 function persist(){const v=viewport(),r=dock.getBoundingClientRect();saved={x:r.left/Math.max(1,v.width-r.width),y:r.top/Math.max(1,v.height-r.height)};try{localStorage.setItem(key,JSON.stringify(saved));}catch{}}
 function reset(){saved=null;try{localStorage.removeItem(key);}catch{}layout();}
 handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;const r=dock.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top};handle.setPointerCapture(event.pointerId);dock.classList.add('dock-dragging');event.preventDefault();});
 handle.addEventListener('pointermove',event=>{if(drag?.id===event.pointerId)place(drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);});
 function release(event){if(drag?.id!==event.pointerId)return;drag=null;dock.classList.remove('dock-dragging');if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);persist();}
 handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);handle.addEventListener('lostpointercapture',release);
 handle.addEventListener('dblclick',reset);
 handle.addEventListener('keydown',event=>{const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(event.key==='Home'||event.key==='Escape'){event.preventDefault();reset();}else if(steps[event.key]){event.preventDefault();const r=dock.getBoundingClientRect(),step=event.shiftKey?40:12;place(r.left+steps[event.key][0]*step,r.top+steps[event.key][1]*step);persist();}});
 function refresh(){cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);}
 window.addEventListener('resize',refresh);window.visualViewport?.addEventListener('resize',refresh);
 if(typeof ResizeObserver==='function')new ResizeObserver(refresh).observe(dock);
 refresh();return refresh;
}
