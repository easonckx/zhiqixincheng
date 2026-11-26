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


(() => {
  const intro=document.querySelector('#intro'), film=window.teamIntroVideo;
  if(!film)return;
  const root=document.documentElement, skip=intro.querySelector('button');
  const remaining=window.teamIntroDeadline-performance.now();
  root.classList.remove('intro-pending');
  if(remaining<550 || document.hidden)return;
  intro.querySelector('.intro-stage').prepend(film);
  intro.showModal();
  try { sessionStorage.setItem('zq-team-film-v2','1'); } catch {}
  let exiting=false;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const finish=()=>{if(intro.open)intro.close()};
  function leave(){
    if(exiting || !intro.open)return;
    exiting=true;
    intro.classList.add('leaving');
    setTimeout(finish,165);
  }
  const startup=setTimeout(leave,700);
  const limit=setTimeout(leave,Math.max(0,remaining-165));
  function checkFrame(){
    if(exiting || !intro.open)return;
    if(film.duration-film.currentTime<=.16){leave();return;}
    if(film.requestVideoFrameCallback)film.requestVideoFrameCallback(checkFrame);
  }
  film.addEventListener('playing',()=>{clearTimeout(startup);checkFrame()},{once:true});
  film.addEventListener('timeupdate',()=>{if(film.duration-film.currentTime<=.16)leave()});
  film.addEventListener('error',leave,{once:true});
  film.addEventListener('ended',leave,{once:true});
  skip.addEventListener('click',leave,{once:true});
  intro.addEventListener('cancel',e=>{e.preventDefault();leave()});
  window.addEventListener('pagehide',finish,{once:true});
  motion.addEventListener('change',leave);
  intro.addEventListener('close',()=>{
    clearTimeout(startup);clearTimeout(limit);film.pause();
    window.removeEventListener('pagehide',finish);motion.removeEventListener('change',leave);
  },{once:true});
  film.play().catch(leave);
})();

if(location.hash==='#about')document.querySelector('#main').scrollIntoView();
