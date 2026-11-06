/* Botão "Instalar app": Android/desktop usa o prompt nativo; iPhone mostra o passo a passo. */
(()=>{
  let deferred=null;
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;show()});
  addEventListener('appinstalled',()=>{deferred=null;document.querySelectorAll('[data-install]').forEach(b=>b.hidden=true)});
  function show(){document.querySelectorAll('[data-install]').forEach(b=>b.hidden=standalone)}
  function steps(){
    const box=document.getElementById('installSteps');if(!box)return;
    box.innerHTML=ios
      ?'<ol><li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima) na barra do Safari.</li><li>Role e toque em <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>. O ícone da AXIS Lab aparece junto dos seus apps.</li></ol>'
      :'<ol><li>Abra o menu do navegador (os três pontinhos).</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme. O ícone da AXIS Lab aparece junto dos seus apps.</li></ol>';
  }
  window.axisInstall=async()=>{
    if(standalone){location.href='/app/';return}
    if(deferred){deferred.prompt();await deferred.userChoice.catch(()=>{});deferred=null;return}
    steps();const d=document.getElementById('installDlg');if(d&&d.showModal)d.showModal();else location.href='/app/';
  };
  document.addEventListener('click',e=>{const b=e.target.closest('[data-install]');if(b){e.preventDefault();window.axisInstall()}});
  document.addEventListener('DOMContentLoaded',show);show();
})();
