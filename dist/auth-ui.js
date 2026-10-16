import {esc} from './ui.js';

// Session tokens only ever live in the server-set HttpOnly cookie.
export function startAuth({onUser}){
 if(typeof fetch!=='function'||!document.querySelector('#auth-root'))return;
 const root=document.querySelector('#auth-root');
 let mode='login',busy=false,currentUser=null;
 function show(message=''){
  document.body.classList.add('auth-locked');root.hidden=false;
  const signup=mode==='signup',offline=location.protocol==='file:';
  root.innerHTML=`<div class="auth-layout"><div class="auth-story"><a class="brand" href="#bench"><span class="brand-icon">C<span>↗</span></span><span>chemlab<span class="brand-dot">.</span></span></a><div class="eyebrow">YOUR OWN LITTLE LABORATORY</div><h1>A little curiosity.<br>A world to discover.</h1><p>Set up your bench, follow a question, and see chemistry take shape. Your experiments and learning space, together.</p><div class="auth-points"><span>Personal workspace</span><span>Private account</span><span>Room to explore</span></div><div class="auth-molecule" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div><section class="auth-card glass" role="form" aria-label="${signup?'Create Chemlab account':'Sign in to Chemlab'}"><div class="auth-mark">C<span>↗</span></div><div class="eyebrow">${offline?'YOUR OFFLINE LAB':signup?'MAKE YOURSELF AT HOME':'WELCOME BACK'}</div><h2>${offline?'Explore offline.':signup?'Create your account.':'Sign in.'}</h2><p>${offline?'Use the study tools offline on this device. The original chemistry bench and accounts need the Python server.':'Use your Chemlab account. These accounts are separate from RevisionCore.'}</p>${offline?'':`<label class="field" for="auth-username">Username<input id="auth-username" autocomplete="username" minlength="3" maxlength="32" spellcheck="false" autocapitalize="none"></label><label class="field" for="auth-password">Password<span class="auth-password-row"><input id="auth-password" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="8" maxlength="256"><button id="auth-show-password" type="button" aria-label="Show password">Show</button></span></label>${signup?'<label class="field" for="auth-confirm">Confirm password<input id="auth-confirm" type="password" autocomplete="new-password" maxlength="256"></label>':''}`}<p class="auth-error" id="auth-error" role="alert">${esc(message)}</p><button class="btn primary" id="auth-submit" type="button">${offline?'Open offline lab':signup?'Create account':'Sign in'} <span>→</span></button>${offline?'':`<p class="auth-switch">${signup?'Already have an account?':'New to Chemlab?'} <button id="auth-toggle" type="button">${signup?'Sign in':'Create an account'}</button></p>`}<div class="auth-footer">${offline?'Work stays in this browser. Export a backup to keep a copy.':'Your workspace saves on this device. Export a backup to take it with you.'}</div></section></div>`;
  root.querySelector('#auth-submit').onclick=offline?()=>unlock(null,true):submit;
  if(!offline){root.querySelector('#auth-toggle').onclick=()=>{mode=signup?'login':'signup';show();};root.querySelector('#auth-show-password').onclick=()=>{const field=root.querySelector('#auth-password'),button=root.querySelector('#auth-show-password');field.type=field.type==='password'?'text':'password';button.textContent=field.type==='password'?'Show':'Hide';button.setAttribute('aria-label',field.type==='password'?'Show password':'Hide password');};root.querySelector('.auth-card').onkeydown=e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();submit();}};root.querySelector('#auth-username').focus();}
 }
 async function api(url,body){
  const response=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let data;try{data=await response.json();}catch{throw Error('The server did not return a valid response. Please try again.');}
  if(!response.ok)throw Error(data.error||'Please sign in again.');return data;
 }
 function unlock(user,offline=false){currentUser=user;root.hidden=true;document.body.classList.remove('auth-locked');onUser(user,{offline});}
 async function submit(){
  if(busy)return;
  const username=root.querySelector('#auth-username').value.trim(),password=root.querySelector('#auth-password').value,error=root.querySelector('#auth-error'),button=root.querySelector('#auth-submit');
  error.textContent='';if(!/^[A-Za-z0-9_.-]{3,32}$/.test(username)){error.textContent='Use a 3–32 character username with letters, numbers, dots, hyphens or underscores.';return;}
  if(!password||(mode==='signup'&&password.length<8)){error.textContent=mode==='signup'?'Choose a password with at least 8 characters.':'Enter your password.';return;}
  if(mode==='signup'&&password!==root.querySelector('#auth-confirm').value){error.textContent='Passwords do not match.';return;}
  busy=true;button.disabled=true;button.textContent=mode==='signup'?'Creating your account…':'Signing in…';
  try{const data=await api(mode==='signup'?'/api/signup':'/api/login',{username,password});root.querySelector('#auth-password').value='';if(root.querySelector('#auth-confirm'))root.querySelector('#auth-confirm').value='';unlock(data.user);}catch(e){error.textContent=e.message;}finally{busy=false;button.disabled=false;button.textContent=mode==='signup'?'Create account →':'Sign in →';}
 }
 async function logout(){
  if(location.protocol==='file:'){currentUser=null;onUser(null,{logout:true});show();return;}
  try{await api('/api/logout',{});currentUser=null;onUser(null,{logout:true});show();}catch(e){onUser(currentUser,{error:e.message});}
 }
 document.querySelector('#account-button').onclick=()=>{if(currentUser)logout();else show();};
 async function check(){
  if(location.protocol==='file:'){show();return;}
  try{const response=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});if(response.status===401){show();return;}const data=await response.json();if(!response.ok)throw Error(data.error||'Sign-in is temporarily unavailable.');unlock(data.user);}catch(e){show(e.message||'Could not reach the sign-in server.');}
 }
 check();
 return {logout,show,check};
}
