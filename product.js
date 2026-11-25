const panels=[...document.querySelectorAll('.feature-panel')];
const featureLinks=[...document.querySelectorAll('[data-feature]')];
function showFeature(scroll){
  const panel=panels.find(p=>p.id===location.hash.slice(1))||panels[0];
  panels.forEach(p=>p.hidden=p!==panel);
  featureLinks.forEach(link=>{if(link.dataset.feature===panel.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
  if(scroll){panel.querySelector('h2').focus({preventScroll:true});document.querySelector('#features').scrollIntoView({behavior:'instant',block:'start'})}
}
window.addEventListener('hashchange',()=>{if(panels.some(panel=>location.hash==="#"+panel.id))showFeature(true);else if(!location.hash)showFeature(false)});
showFeature(panels.some(p=>location.hash==='#'+p.id));
for(const panel of panels){
  const buttons=[...panel.querySelectorAll('[data-screen]')],figure=panel.querySelector('figure'),link=figure.querySelector('a'),img=figure.querySelector('img');
  buttons.forEach(b=>b.onclick=()=>{
    buttons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const src='assets/product/'+b.dataset.screen+'.webp';
    img.src=src;img.alt=b.textContent;link.href=src;link.dataset.enlarge=b.textContent;figure.querySelector('figcaption').textContent=b.textContent;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)img.animate([{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:250,easing:'ease-out'});
  });
}
