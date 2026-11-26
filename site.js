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
  const stage=intro.querySelector('.intro-stage'), skip=intro.querySelector('button');
  document.documentElement.classList.remove('intro-pending');
  if(document.hidden)return;
  const still=new Image();
  still.className='intro-lockup';
  still.alt='智启新程实践队';
  still.src='assets/web/team-lockup.webp';
  stage.prepend(film);
  intro.showModal();
  try { sessionStorage.setItem('zq-team-film-v3','1'); } catch {}
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let timer, exiting=false, showingStill=false, lastTime=-1;
  const finish=()=>{if(intro.open)intro.close()};
  function leave(){
    if(exiting || !intro.open)return;
    exiting=true;
    clearTimeout(timer);
    intro.classList.add('leaving');
    timer=setTimeout(finish,165);
  }
  function showLockup(){
    if(exiting || showingStill || !intro.open)return;
    showingStill=true;
    clearTimeout(timer);
    film.pause();
    if(still.complete && still.naturalWidth){
      film.replaceWith(still);
    }else{
      const name=document.createElement('strong');
      name.className='intro-team-name';
      name.textContent='智启新程实践队';
      film.replaceWith(name);
    }
    timer=setTimeout(leave,1000);
  }
  function watchProgress(){
    if(exiting || showingStill || !intro.open || lastTime===film.currentTime)return;
    lastTime=film.currentTime;
    clearTimeout(timer);
    timer=setTimeout(showLockup,2500);
  }
  // The media timeline includes the final logo hold. Loading time is separate.
  film.addEventListener('timeupdate',watchProgress);
  film.addEventListener('ended',leave,{once:true});
  film.addEventListener('error',showLockup,{once:true});
  skip.addEventListener('click',leave,{once:true});
  intro.addEventListener('cancel',e=>{e.preventDefault();leave()});
  window.addEventListener('pagehide',finish,{once:true});
  motion.addEventListener('change',leave);
  intro.addEventListener('close',()=>{
    clearTimeout(timer);
    film.pause();
    window.removeEventListener('pagehide',finish);motion.removeEventListener('change',leave);
  },{once:true});
  watchProgress();
  film.play().catch(showLockup);
})();

if(location.hash==='#about')document.querySelector('#main').scrollIntoView();
