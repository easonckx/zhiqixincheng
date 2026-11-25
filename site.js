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


const intro=document.querySelector('#intro');
let seen=false;
try {seen=sessionStorage.getItem('zq-intro')==='1'} catch {}
if (!seen && !location.hash && !matchMedia('(prefers-reduced-motion: reduce)').matches && intro.showModal) {
  try {sessionStorage.setItem('zq-intro','1')} catch {}
  intro.showModal();
  const endIntro=()=>{if(intro.open)intro.close()};
  const timer=setTimeout(endIntro,1500);
  intro.querySelector('button').onclick=endIntro;
  intro.addEventListener('close',()=>clearTimeout(timer),{once:true});
}
if(location.hash==='#about')document.querySelector('#main').scrollIntoView();
