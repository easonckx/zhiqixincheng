const photos = {
  assembly: ['汽车总装生产线','车身沿汽车总装线排列，蓝色工装车停放在生产线一侧'],
  robot: ['机器人灵巧手','展区中展示的机械手指与关节'],
  conversation: ['与企业围桌交谈','团队成员在会议室围桌访谈']
};
const photo = document.querySelector('#hero-photo');
const shots = [...document.querySelectorAll('[data-image]')];
shots.forEach((button,index) => button.addEventListener('click', () => {
  if (button.getAttribute('aria-pressed') === 'true') return;
  const key = button.dataset.image;
  shots.forEach(item => item.setAttribute('aria-pressed',String(item === button)));
  photo.src = 'assets/web/'+key+'.webp';
  photo.alt = photos[key][1];
  photo.classList.remove('swap'); void photo.offsetWidth; photo.classList.add('swap');
  document.querySelector('#hero-count').textContent = String(index+1).padStart(2,'0')+' / 03';
  document.querySelector('#hero-caption').textContent = photos[key][0];
}));


const intro = document.querySelector('#intro');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
if (intro && intro.showModal && !location.hash && !motion.matches && !navigator.connection?.saveData) {
  let first = false;
  try {
    first = !sessionStorage.getItem('zq-team-film-v1');
    if (first) sessionStorage.setItem('zq-team-film-v1','1');
  } catch {}
  if (first) {
    const video = intro.querySelector('video');
    const close = () => { if (intro.open) intro.close(); };
    intro.showModal();
    const deadline = setTimeout(close, 3000);
    intro.querySelector('button').addEventListener('click',close,{once:true});
    video.addEventListener('ended',close,{once:true});
    video.addEventListener('error',close,{once:true});
    window.addEventListener('pagehide',close,{once:true});
    motion.addEventListener?.('change',close);
    intro.addEventListener('close',()=>{
      clearTimeout(deadline);
      video.pause();
      window.removeEventListener('pagehide',close);
      motion.removeEventListener?.('change',close);
    },{once:true});
    video.muted = true;
    video.src = 'assets/web/team-intro.mp4';
    video.play().catch(close);
  }
}
if(location.hash==='#about')document.querySelector('#main').scrollIntoView();
