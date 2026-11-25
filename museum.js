const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const rooms = {
  lobby: '现场选集', production: '工厂与产线', innovation: '园区与创新',
  heritage: '工业记忆', dialogue: '专家与产业对话', connection: '市场与价值'
};
const roomNotes = {
  lobby: '这次实践从北京的一场汽车市场分析会开始，最后走进哈尔滨的零部件车间。沿途的照片留下了同一个问题：一项技术，怎样成为人们用得上的产品？',
  production: '在北京看整车，在哈尔滨看零部件、手术机器人和饮料。把几处现场放在一起看，工厂各有各的工序，也都要回答怎样把产品做得稳定。',
  innovation: '从中关村的规划展览馆到软件园，再到工业智能体企业，我们顺着一条线索走访：科研机构、园区和企业怎样把技术带进车间？',
  heritage: '一座旧车站、一片钢铁厂区、一幢记录经开区历史的“小红楼”。这三处地方，留下了北京工业在不同时期的模样。',
  dialogue: '一项航空制造技术怎样通过验证？制造企业怎样进入海外市场？这一展区收录了研究者和企业经营者与实践队的当面交谈和线上访谈。',
  connection: '从汽车市场分析会到通州的汽车门店，再到施坦威之家的钢琴，我们换到使用者这一端，看需求、工艺和体验怎样联系起来。'
};
const exhibits = new Map(collection.map(item => [item.id, item]));
const highlights = ['production', 'stop-10', 'stop-07', 'stop-02', 'stop-06', 'line'];
function contents(key) {
  return key === 'lobby' ? highlights.map(id => exhibits.get(id)) : collection.filter(item => item.room === key);
}
const params = new URLSearchParams(location.search);
const requested = exhibits.get(params.get('art'));
const initialRoom = params.get('room') || location.hash.slice(1);
let room = Object.hasOwn(rooms, initialRoom) ? initialRoom : requested?.room || 'lobby';
let pieces = contents(room);
if (requested && !pieces.includes(requested)) {
  room = requested.room;
  pieces = contents(room);
}
let current = requested || pieces[0];
let view = requested && params.get('view') !== 'roam' ? 'front' : 'roam';
let wallCenter = current;
const visited = new Set();
let saved = [];
try {
  const ids = JSON.parse(localStorage.getItem('zq-exhibits') || '[]');
  if (Array.isArray(ids)) saved = [...new Set(ids.filter(id => exhibits.has(id)))];
} catch {}
const viewport = $('#room-viewport');
const dialog = $('#directory');
const strip = $('#strip');
const scene = $('#scene');
const frames = $$('.wall-art');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const HOME = {x:0, y:0, z:550, yaw:0};
let roamPose = {...HOME};
let pose = {...HOME};
let motion = 0;
let wallLayout = wallCenter;
let lens;
function measureLens() {
  lens = Math.max(viewport.clientWidth * .61, viewport.clientHeight * .72);
  viewport.style.setProperty('--lens', lens + 'px');
}
function paintCamera(next) {
  pose = next;
  scene.style.transform = `translate(-50%,-50%) translateZ(${lens}px) rotateY(${pose.yaw}deg) translate3d(${-pose.x}px,${-pose.y}px,${-pose.z}px)`;
}
function moveCamera(target, duration = 640) {
  cancelAnimationFrame(motion);
  if (!duration || reduceMotion.matches) { paintCamera(target); return; }
  const start = pose, time = performance.now();
  function frame(now) {
    const t = clamp((now - time) / duration, 0, 1);
    const ease = t * t * (3 - 2 * t);
    const next = {};
    for (const key of Object.keys(target)) next[key] = start[key] + (target[key] - start[key]) * ease;
    if (t < 1) { paintCamera(next); motion = requestAnimationFrame(frame); }
    else paintCamera(target);
  }
  motion = requestAnimationFrame(frame);
}
// The camera sits on the inward normal of the selected frame. Its distance
// follows the vertical and horizontal field of view, including after resizing.
function focusPose(frame) {
  const x = frame.offsetLeft + frame.offsetWidth / 2;
  const label = frame.querySelector('.art-plaque');
  const displayHeight = label.offsetTop + label.offsetHeight;
  const y = frame.offsetTop + displayHeight / 2 - scene.offsetHeight / 2;
  const distance = Math.max(lens * frame.offsetWidth / (viewport.clientWidth * .86),
                            lens * displayHeight / (viewport.clientHeight * .88));
  const half = scene.offsetWidth / 2;
  const wall = frame.parentElement;
  if (wall.classList.contains('left-wall')) return {x:-half + 3 + distance, y, z:950-x, yaw:-90};
  if (wall.classList.contains('right-wall')) return {x:half - 3 - distance, y, z:x-wall.offsetWidth+950, yaw:90};
  return {x:x-half, y, z:-650+3+distance, yaw:0};
}
function cameraTarget() {
  if (view === 'roam') return roamPose;
  return focusPose(frames.find(frame => frame.dataset.id === current.id));
}
function resetCamera() { roamPose = {...HOME}; moveCamera(roamPose, 260); }
window.addEventListener('resize', () => { measureLens(); moveCamera(cameraTarget(), 0); });
function button(label, action) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.onclick = action;
  return b;
}
function renderStrip() {
  strip.replaceChildren(...pieces.map(item => {
    const b = button('', () => {
      select(item, 'front');
      if (viewport.getBoundingClientRect().bottom < window.innerHeight / 2) viewport.scrollIntoView({block:'center'});
    });
    b.dataset.id = item.id;
    b.setAttribute('aria-label', '正面看图 · ' + item.caption);
    b.title = item.caption;
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = item.image;
    const label = document.createElement('span');
    label.textContent = item.id === item.stop || !item.stop || item.id === 'production' ? item.title : item.caption;
    b.append(img, label);
    return b;
  }));
}
function keepInStrip(b) {
  const delta = b.getBoundingClientRect().left - strip.getBoundingClientRect().left;
  if (delta < 0) strip.scrollLeft += delta - 3;
  else if (delta + b.offsetWidth > strip.clientWidth) strip.scrollLeft += delta + b.offsetWidth - strip.clientWidth + 3;
}
function syncSaved() {
  $('#saved-count').textContent = saved.length;
  const chosen = saved.includes(current.id);
  $('#save-art').textContent = chosen ? '已收藏 ★' : '收藏 ☆';
  $('#save-art').setAttribute('aria-pressed', chosen);
}
function render(duration = 640) {
  const index = pieces.indexOf(current);
  $('#room-heading').textContent = rooms[room];
  viewport.classList.toggle('is-focused', view === 'front');
  $('#roam-hint').hidden = view !== 'roam';
  $('.walk-controls').hidden = view !== 'roam';
  $('#piece-label').hidden = view !== 'front';
  $('#return-room').hidden = view === 'roam';
  strip.hidden = view === 'roam';
  $('#strip-heading').textContent = view === 'roam' ? '浏览展墙' : '本区展品';
  $$('[data-room]').forEach(b => {
    const active = b.dataset.room === room;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active);
  });
  $('#piece-meta').textContent = current.meta;
  $('#piece-title').textContent = current.title;
  $('#piece-caption').textContent = current.caption;
  $('#piece-body').textContent = current.wallNote;
  $('#diary').hidden = !current.stop;
  if (current.stop) $('#diary').href = 'journey.html#' + current.stop;
  $('#position').textContent = (index + 1) + ' / ' + pieces.length;
  $('#location-label').textContent = rooms[room];
  $('#wall-title').textContent = rooms[room];
  const neighbors = center => {
    const i = pieces.indexOf(center), n = pieces.length;
    return [center, pieces[(i+n-1)%n], pieces[(i+1)%n]];
  };
  if (view === 'roam') wallLayout = wallCenter;
  else if (!neighbors(wallLayout).includes(current)) wallLayout = current;
  $('#wall-subtitle').textContent = roomNotes[room];
  $('#room-note-mobile').textContent = roomNotes[room];
  neighbors(wallLayout).forEach((item, i) => {
    const b = frames[i];
    b.dataset.id = item.id;
    b.setAttribute('aria-label', '正面看图 · ' + item.caption);
    const img = b.querySelector('img');
    if (img.getAttribute('src') !== item.image) img.src = item.image;
    b.querySelector('.plaque-title').textContent = item.title;
    b.querySelector('.plaque-note').textContent = item.wallNote;
  });
  moveCamera(cameraTarget(), duration);
  for (const b of strip.children) {
    b.setAttribute('aria-pressed', b.dataset.id === current.id);
    if (!strip.hidden && b.dataset.id === current.id) keepInStrip(b);
  }
  if (room !== 'lobby') visited.add(room);
  $('#visit-progress').textContent = '已参观 ' + visited.size + ' / ' + (Object.keys(rooms).length - 1) + ' 个主题展区';
  syncSaved();
}
function syncURL() {
  const url = new URL(location.href);
  url.hash = '';
  url.searchParams.set('room', room);
  url.searchParams.set('art', current.id);
  url.searchParams.set('view', view);
  try { history.replaceState(null, '', url); } catch {}
}
function select(item, mode = view) {
  current = item;
  view = mode;
  if (mode === 'roam') wallCenter = item;
  render();
  syncURL();
}
function enterRoom(key, item, mode = 'roam') {
  room = key;
  pieces = contents(room);
  wallCenter = item || pieces[0];
  roamPose = {...HOME};
  wallLayout = wallCenter;
  renderStrip();
  select(wallCenter, mode);
}
for (const [key, name] of Object.entries(rooms)) {
  const b = button(name, () => enterRoom(key));
  b.dataset.room = key;
  $('#rooms').append(b);
}
function returnToRoom() {
  select(wallCenter, 'roam');
  viewport.focus({preventScroll:true});
}
$('#return-room').onclick = returnToRoom;
function step(n) { select(pieces[(pieces.indexOf(current) + n + pieces.length) % pieces.length]); }
$('#prev').onclick = () => step(-1);
$('#next').onclick = () => step(1);
document.addEventListener('keydown', e => {
  if (view !== 'front' || dialog.open || e.altKey || e.metaKey || e.ctrlKey) return;
  if (e.key === 'Escape') { returnToRoom(); return; }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    step(e.key === 'ArrowLeft' ? -1 : 1);
  }
});
$('#save-art').onclick = () => {
  saved = saved.includes(current.id) ? saved.filter(id => id !== current.id) : [...saved, current.id];
  try { localStorage.setItem('zq-exhibits', JSON.stringify(saved)); } catch {}
  syncSaved();
};
function openDirectory(title) {
  $('#dialog-title').textContent = title;
  const body = $('#dialog-content');
  body.replaceChildren();
  dialog.showModal();
  return body;
}
function destination(item, label, mode = 'roam') {
  return button(label, () => {
    dialog.close();
    enterRoom(item.room, item, mode);
    (mode === 'roam' ? viewport : $('#return-room')).focus({preventScroll:true});
  });
}
$('#map-toggle').onclick = () => {
  const body = openDirectory('展馆导览');
  for (const [key, name] of Object.entries(rooms).slice(1)) {
    const heading = document.createElement('h3');
    heading.textContent = name;
    const stops = document.createElement('div');
    stops.className = 'destinations';
    for (const item of contents(key).filter(a => a.id === a.stop)) stops.append(destination(item, item.title));
    body.append(heading, stops);
  }
};
$('#saved-toggle').onclick = () => {
  const body = openDirectory('我的收藏');
  if (!saved.length) { body.textContent = '看到喜欢的照片时，点「收藏」就能在这里找到。'; return; }
  const list = document.createElement('div');
  list.className = 'destinations';
  for (const id of saved) { const item = exhibits.get(id); list.append(destination(item, item.caption, 'front')); }
  body.append(list);
};
dialog.querySelector('.modal-close').onclick = () => dialog.close();
dialog.onclick = e => {
  if (e.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
};
// Even at the widest field of view, the outermost ray stays forward of
// the visitor. Travel stops inside the three exhibition walls.
function boundedRoam(next, duration) {
  const halfFov = Math.atan(viewport.clientWidth / (2 * lens)) * 180 / Math.PI;
  const turn = Math.min(54, 87 - halfFov);
  roamPose = {x:0, y:0, z:clamp(next.z, 160, 720), yaw:clamp(next.yaw, -turn, turn)};
  moveCamera(roamPose, duration);
}
function walk(direction) {
  if (view !== 'roam') return;
  const next = {...roamPose};
  if (direction === 'left') next.yaw -= 10;
  if (direction === 'right') next.yaw += 10;
  if (direction === 'forward') next.z -= 85;
  if (direction === 'back') next.z += 85;
  boundedRoam(next, 190);
}
$$('[data-walk]').forEach(b => b.onclick = () => walk(b.dataset.walk));
$('#reset-view').onclick = resetCamera;
viewport.addEventListener('keydown', e => {
  const action = {ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'left',ArrowRight:'right',w:'forward',s:'back',a:'left',d:'right'}[e.key];
  if (view === 'roam' && action) { e.preventDefault(); walk(action); }
});
let pointer = null, dragged = false;
viewport.addEventListener('pointerdown', e => {
  if (view !== 'roam' || !e.isPrimary || e.button !== 0) return;
  dragged = false;
  pointer = {id:e.pointerId, x:e.clientX, yaw:pose.yaw};
});
viewport.addEventListener('pointermove', e => {
  if (!pointer || e.pointerId !== pointer.id) return;
  const dx = e.clientX - pointer.x;
  if (Math.abs(dx) <= 6 && !dragged) return;
  dragged = true;
  viewport.setPointerCapture(e.pointerId);
  viewport.classList.add('dragging');
  boundedRoam({...roamPose, yaw:pointer.yaw + dx * .16}, 0);
});
function release(e) {
  if (pointer?.id !== e.pointerId) return;
  pointer = null;
  viewport.classList.remove('dragging');
}
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
$$('.wall-art').forEach(b => b.onclick = e => {
  if (view === 'front' || (e.detail && dragged)) return;
  select(exhibits.get(b.dataset.id), 'front');
  $('#return-room').focus({preventScroll:true});
});
$('#fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    const t = $('.toast');
    t.textContent = '当前浏览器无法进入全屏';
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2500);
  }
};
measureLens();
renderStrip();
render(0);
