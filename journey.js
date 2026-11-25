const entries=[...document.querySelectorAll('.stop-story')],links=[...document.querySelectorAll('[data-stop]')],toggle=document.querySelector('#toc-toggle'),toc=document.querySelector('#stops');
function closeIndex(){toc.classList.remove('expanded');toggle.setAttribute('aria-expanded','false')}
toggle.onclick=()=>{const open=toc.classList.toggle('expanded');toggle.setAttribute('aria-expanded',String(open))};
function selectStop(scroll){
  const selected=entries.find(a=>a.id===location.hash.slice(1))||entries[0];
  entries.forEach(a=>a.hidden=a!==selected);
  const group=links.find(link=>link.dataset.stop===selected.id).closest('details');
  toc.querySelectorAll('details').forEach(item=>item.open=item===group);
  for(const link of links){
    if(link.dataset.stop===selected.id){link.setAttribute('aria-current','location');link.closest('details').open=true}
    else link.removeAttribute('aria-current');
  }
  closeIndex();
  if(scroll){selected.querySelector('h2').focus({preventScroll:true});selected.scrollIntoView({behavior:'instant',block:'start'})}
}
window.addEventListener('hashchange',()=>{if(entries.some(entry=>location.hash==="#"+entry.id))selectStop(true);else if(!location.hash)selectStop(false)});
toc.addEventListener('click',e=>{if(e.target.closest('[aria-current="location"]'))selectStop(true)});
selectStop(/^#stop-\d\d$/.test(location.hash));
