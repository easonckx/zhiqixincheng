const menuToggle=document.querySelector('#menu-toggle'),menu=document.querySelector('#site-menu');
function menuState(open){
  menu.classList.toggle('open',open);menuToggle.setAttribute('aria-expanded',String(open));
}
menuToggle.addEventListener('click',()=>menuState(!menu.classList.contains('open')));
menu.addEventListener('click',()=>menuState(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open')){menuState(false);menuToggle.focus()}});
document.addEventListener('click',e=>{if(!e.target.closest('.mast'))menuState(false)});
const filmTitles={product:'产品宣传片',theme:'实践主题篇',field:'实践纪实片'};
const player=document.querySelector('#player'),video=player.querySelector('video'),playError=document.querySelector('#play-error');
document.querySelectorAll('[data-film]').forEach(link=>link.addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!player.showModal)return;
  event.preventDefault();
  const id=link.dataset.film;
  document.querySelector('#player-title').textContent=filmTitles[id];
  video.setAttribute('aria-label',filmTitles[id]);video.poster='assets/web/'+id+'-film.webp';video.src=link.href;
  playError.hidden=true;playError.querySelector('a').href=link.href;player.showModal();video.play().catch(()=>{});
}));
video.addEventListener('error',()=>{if(player.open)playError.hidden=false});
player.querySelector('button').addEventListener('click',()=>player.close());
player.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load()});
const viewer=document.querySelector('#viewer');
if(viewer){
  const image=viewer.querySelector('img'),caption=viewer.querySelector('h2'),zoom=viewer.querySelector('[data-zoom]'),surface=viewer.querySelector('.viewer-surface');
  const setZoom=on=>{surface.classList.toggle('natural',on);zoom.setAttribute('aria-pressed',String(on));zoom.textContent=on?'适应屏幕':'原始尺寸';};
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[data-enlarge]');
    if(!link||!viewer.showModal||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
    e.preventDefault();image.src=link.href;image.alt=link.dataset.enlarge;caption.textContent=link.dataset.enlarge;
    setZoom(false);viewer.showModal();surface.scrollTo(0,0);
  });
  viewer.querySelector('[data-close]').onclick=()=>viewer.close();
  zoom.onclick=()=>setZoom(!surface.classList.contains('natural'));
}
for(const dialog of [player,viewer].filter(Boolean))dialog.addEventListener('click',e=>{
  if(e.target!==dialog)return;
  const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
});
