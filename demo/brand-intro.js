const key = 'zhuheng-product-intro-v1';
function enter() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || navigator.connection?.saveData) return;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch { return; }

  const root = document.querySelector('#root');
  if (!root) return;
  const cover = document.createElement('section');
  cover.id = 'product-intro';
  cover.setAttribute('aria-label', '铸衡智策开屏动画');
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  video.setAttribute('aria-hidden','true');
  video.disablePictureInPicture = true;
  video.src = new URL('./brand-intro.mp4', import.meta.url).href;
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = '跳过';
  cover.append(video, skip);
  document.body.append(cover);
  const wasInert = root.inert;
  root.inert = true;
  let closed = false;
  function onKey(e) { if (e.key === 'Escape') finish(); }
  function finish() {
    if (closed) return;
    closed = true;
    clearTimeout(deadline);
    video.pause();
    root.inert = wasInert;
    if (document.activeElement === skip) {
      const target=root.querySelector('textarea,button:not([disabled]),a[href]');
      target?.focus({preventScroll:true});
    }
    cover.inert = true;
    cover.classList.add('leaving');
    setTimeout(() => cover.remove(),170);
    document.removeEventListener('keydown',onKey);
    window.removeEventListener('pagehide',finish);
    reduced.removeEventListener?.('change',finish);
  }
  const deadline = setTimeout(finish,4200);
  video.addEventListener('ended',finish,{once:true});
  video.addEventListener('error',finish,{once:true});
  skip.addEventListener('click',finish,{once:true});
  document.addEventListener('keydown',onKey);
  window.addEventListener('pagehide',finish,{once:true});
  reduced.addEventListener?.('change',finish);
  video.play().catch(finish);
}
enter();
