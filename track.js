/* AXIS — medição própria (sem cookies de terceiros). Envia para /api/t, guardado no Cloudflare D1. */
(()=>{
  if(navigator.webdriver||/bot|crawl|spider|preview|lighthouse/i.test(navigator.userAgent))return;
  const S=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch{}};
  const SS=(k,v)=>{try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v)}catch{}};
  const rid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
  let vid=S('axv');if(!vid){vid=rid();S('axv',vid)}
  let sid=SS('axs');const newSession=!sid;if(!sid){sid=rid();SS('axs',sid)}
  const q=new URLSearchParams(location.search);
  const utm={};['utm_source','utm_medium','utm_campaign','utm_content','source'].forEach(k=>{const v=q.get(k);if(v)utm[k]=v.slice(0,80)});
  if(Object.keys(utm).length)SS('axutm',JSON.stringify(utm));
  const first=(()=>{try{return JSON.parse(SS('axutm')||'{}')}catch{return{}}})();
  const ref=newSession&&document.referrer&&!document.referrer.startsWith(location.origin)?document.referrer.slice(0,200):'';
  if(ref)SS('axref',ref);
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const app=location.pathname.startsWith('/app');
  let Q=[],timer=null;
  function flush(beacon){
    if(!Q.length)return;
    const body=JSON.stringify({vid,sid,ref:SS('axref')||'',utm:Object.keys(utm).length?utm:first,pwa:standalone,w:innerWidth,ev:Q});Q=[];
    if(beacon&&navigator.sendBeacon){navigator.sendBeacon('/api/t',new Blob([body],{type:'application/json'}));return}
    fetch('/api/t',{method:'POST',headers:{'content-type':'application/json'},body,keepalive:true,credentials:'same-origin'}).catch(()=>{});
  }
  function t(e,p){Q.push({e:String(e).slice(0,40),path:location.pathname+(app?location.hash.split('?')[0]:''),p:p||{},ts:Date.now()});clearTimeout(timer);timer=setTimeout(flush,1200)}
  window.axt=t;

  // página vista
  let t0=Date.now(),maxScroll=0,marks={};
  const view=()=>{t0=Date.now();maxScroll=0;marks={};t('view',{title:document.title.slice(0,80)})};
  view();
  if(app)addEventListener('hashchange',()=>{const [tool,mod]=location.hash.replace(/^#\/?/,'').split('/');if(tool)t('tool',{tool,mod:mod||''});else t('view',{title:'Início do app'})});

  // rolagem (25/50/75/100%) nas páginas do site
  if(!app)addEventListener('scroll',()=>{const h=document.documentElement;const pct=Math.round((scrollY+innerHeight)/h.scrollHeight*100);maxScroll=Math.max(maxScroll,pct);
    [25,50,75,100].forEach(m=>{if(pct>=m-2&&!marks[m]){marks[m]=1;t('scroll',{pct:m})}})},{passive:true});

  // seções vistas no site
  if(!app&&'IntersectionObserver' in window)addEventListener('DOMContentLoaded',()=>{const seen={};const io=new IntersectionObserver(es=>es.forEach(x=>{const id=x.target.id;if(x.isIntersecting&&id&&!seen[id]){seen[id]=1;t('section',{id})}}),{threshold:.4});document.querySelectorAll('section[id]').forEach(s=>io.observe(s))});

  // cliques: botões e links marcados, links externos, instalar
  document.addEventListener('click',ev=>{
    const a=ev.target.closest('a,button');if(!a)return;
    const label=(a.dataset.t||a.getAttribute('aria-label')||a.textContent||'').replace(/\s+/g,' ').trim().slice(0,60);
    if(a.hasAttribute('data-install'))return t('install_click',{label});
    const href=a.getAttribute('href')||'';
    if(/instagram\.com/.test(href))return t('click',{label,to:'instagram'});
    if(/wa\.me|whatsapp/.test(href))return t('click',{label,to:'whatsapp'});
    if(/^https?:/.test(href)&&!href.startsWith(location.origin))return t('click',{label,to:new URL(href).hostname});
    if(a.classList.contains('btn')||a.dataset.t||a.closest('nav'))t('click',{label,to:href.slice(0,80)});
  },true);

  addEventListener('appinstalled',()=>t('app_installed'));
  if(standalone&&newSession)t('app_open');

  // saída: tempo na página
  addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){t('leave',{sec:Math.round((Date.now()-t0)/1000),scroll:maxScroll});flush(true)}});
  addEventListener('pagehide',()=>flush(true));
})();
