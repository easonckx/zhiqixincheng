import { THREE as T, GLTFLoader, OrbitControls } from './vendor/three-view.js';

const sites = {
  supplier: [-10, -4.9, 4.1],
  manufacturer: [0, -4.7, 3.65],
  customer: [10, -5, 2.9],
  logistics: [0, 4.6, 2.8],
  bank: [-10.3, 4.8, 3.9],
  regulator: [10.3, 4.8, 3.1],
};
const names = {
  supplier: '钢材供方',
  manufacturer: '零部件工厂',
  customer: '整机客户',
  logistics: '区域物流',
  bank: '合作银行',
  regulator: '行业监管',
};

export async function createWorld(onPick, root = document) {
  const stage = root.querySelector('#stage');
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xffffff, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  // The model and lamps are static. Moving shipment markers do not require shadow-map updates.
  renderer.shadowMap.autoUpdate = false;
  stage.prepend(renderer.domElement);
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xfff8e9, 0xb3c6bf, 2.15));
  const sun = new T.DirectionalLight(0xfff3d7, 2.4);
  sun.position.set(-12, 30, 13);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {
    left: -44,
    right: 44,
    top: 44,
    bottom: -44,
    near: 0.1,
    far: 76,
  });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.045;
  scene.add(sun);
  const camera = new T.OrthographicCamera(-22, 22, 12, -12, 0.1, 180);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enablePan = true;
  orbit.minPolarAngle = 0.3;
  orbit.maxPolarAngle = Math.PI * 0.44;
  orbit.minZoom = 0.7;
  orbit.maxZoom = 5;
  let dirty=true;orbit.addEventListener("change",()=>{dirty=true});
  function reset() {
    orbit.target.set(0, 0.75, centerZ);
    camera.position.set(11, 31, centerZ+43);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    orbit.update();
  }
  let model;
  try {
    ({scene:model}=await new GLTFLoader().loadAsync(new URL('./market.glb',import.meta.url).href));
  } catch(error){
    orbit.dispose();renderer.dispose();renderer.domElement.remove();throw error;
  }
  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  scene.add(model);
  renderer.shadowMap.needsUpdate = true;
  let pins = [], rosterKey = '', centerZ = 0, spanZ = 27;
  const buildings = new Map();
  const wings = new T.Group();
  scene.add(wings);
  const annexPad = new T.BoxGeometry(9.9,.32,9.9);
  const annexGround = new T.MeshStandardMaterial({color:0xa4b6a7});
  const roadBox=new T.BoxGeometry(1,1,1);
  const roadSurface=new T.MeshStandardMaterial({color:0x667778});
  const stripePaint=new T.MeshStandardMaterial({color:0xe6d8ab});
  function street(x,z,width,length){
    const road=new T.Mesh(roadBox,roadSurface);
    road.position.set(x,.032,z);road.scale.set(width,.06,length);wings.add(road);
    const alongX=width>length,axis=alongX?width:length;
    for(let step=1;step<axis-1;step+=2){
      const line=new T.Mesh(roadBox,stripePaint);
      line.position.set(x+(alongX?step-axis/2:0),.068,z+(alongX?0:step-axis/2));
      line.scale.set(alongX?.68:.06,.009,alongX?.06:.68);wings.add(line);
    }
  }
  function configure(actors) {
    const key = JSON.stringify(actors.map(a=>[a.id,a.kind,a.name]));
    if(key===rosterKey)return;
    rosterKey=key;
    pins.forEach(p=>p.button.remove());pins=[];buildings.clear();wings.clear();
    for(const kind of Object.keys(sites))model.getObjectByName(kind).visible=false;
    const used=new Set();let extras=0;
    for (const actor of actors) {
      const site=sites[actor.kind];if(!site)continue;
      const original=model.getObjectByName(actor.kind);
      let [x,z,y]=site, mesh=original;
      if(used.has(actor.kind)){
        const nx=-15+(extras%4)*10,nz=-18-Math.floor(extras/4)*10;extras++;
        mesh=original.clone(true);mesh.position.x+=nx-x;mesh.position.z+=nz-z;
        wings.add(mesh);x=nx;z=nz;
        const pad=new T.Mesh(annexPad,annexGround);pad.position.set(x,-.16,z);pad.receiveShadow=true;wings.add(pad);
      }
      used.add(actor.kind);mesh.visible=true;mesh.userData.actorId=actor.id;
      buildings.set(actor.id,{mesh,x,z,y,actor,annex:mesh!==original});
      const button=document.createElement('button');button.type='button';button.className='pin';button.dataset.kind=actor.kind;button.dataset.actorId=actor.id;
      button.textContent=actor.name;button.title=actor.name;button.onclick=()=>onPick(actor.kind,actor.id);
      root.querySelector('#pins').append(button);
      pins.push({button,point:new T.Vector3(x,y+.34,z),actor});
    }
    const farZ=extras?-23-Math.floor((extras-1)/4)*10:-13.5;
    if(extras){
      const rows=Math.ceil(extras/4),trunkEnd=-13.55-(rows-1)*10;
      street(-20.8,trunkEnd/2,1.45,-trunkEnd+1.4);
      for(let row=0;row<rows;row++){
        const count=Math.min(4,extras-row*4),end=-15+(count-1)*10+4.65;
        street((end-20.8)/2,-13.55-row*10,end+20.8,1.28);
      }
    }
    centerZ=(farZ+13.5)/2;spanZ=13.5-farZ;
    reset();resize();renderer.shadowMap.needsUpdate=true;
  }
  const ray = new T.Raycaster();
  let down;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    down = [e.clientX, e.clientY];
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5)
      return;
    if(e.button!==0)return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        1 - ((e.clientY - r.top) / r.height) * 2,
      ),
      camera,
    );
    let obj = ray.intersectObjects([...buildings.values()].map(b=>b.mesh), true)[0]?.object;
    while (obj) {
      if (obj.userData.actorId) {
        const actor=buildings.get(obj.userData.actorId).actor;onPick(actor.kind,actor.id);
        break;
      }
      obj = obj.parent;
    }
  });
  let width = 1,
    height = 1;
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    if(!width||!height)return;
    dirty=true;
    const ratio = width / height,
      half = Math.max(1.8+spanZ*.34, (22.3+spanZ*.11)/ratio);
    camera.left = -half * ratio;
    camera.right = half * ratio;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  const cargoMat = new T.MeshStandardMaterial({ color: 0xe58d2f });
  const cabMat = new T.MeshStandardMaterial({ color: 0xffe1a0 });
  const tireMat = new T.MeshStandardMaterial({ color: 0x29484b });
  const cargo = new T.BoxGeometry(1.0, 0.44, 0.48),
    cab = new T.BoxGeometry(0.34, 0.42, 0.46),
    chassis = new T.BoxGeometry(1.48, 0.14, 0.5);
  const wheel=new T.CylinderGeometry(.15,.15,.085,12);
  function truck() {
    const vehicle = new T.Group();
    for (const [geom, mat, x, y] of [
      [chassis, tireMat, 0, 0.13],
      [cargo, cargoMat, -0.2, 0.4],
      [cab, cabMat, 0.52, 0.35],
    ]) {
      const m = new T.Mesh(geom, mat);
      m.position.set(x, y, 0);
      vehicle.add(m);
    }
    for(const x of [-.47,.48])for(const z of [-.25,.25]){
      const tire=new T.Mesh(wheel,tireMat);tire.rotation.x=Math.PI/2;tire.position.set(x,.14,z);vehicle.add(tire);
    }
    scene.add(vehicle);
    return vehicle;
  }
  let routes = [];
  const selection=new T.Mesh(new T.RingGeometry(3.5,3.64,72),new T.MeshBasicMaterial({color:0x20847a,side:T.DoubleSide,depthWrite:false}));
  selection.rotation.x=-Math.PI/2;selection.visible=false;scene.add(selection);
  const signalMaterial=new T.MeshBasicMaterial({color:0xdf813e});
  const pulse=new T.Mesh(new T.SphereGeometry(.19,12,10),signalMaterial);pulse.visible=false;scene.add(pulse);
  let signal=null;
  function update({actors,logistics=[],selectedId,cash={},baselineCash={},message,activeId}){
    configure(actors);
    const selected=buildings.get(selectedId);
    selection.visible=!!selected;
    if(selected)selection.position.set(selected.x,.16,selected.z);
    if(signal){scene.remove(signal.line);signal.line.geometry.dispose();signal=null}
    pulse.visible=false;
    const from=buildings.get(message?.from_actor),to=buildings.get(message?.to_actor);
    if(from&&to&&from!==to){
      const a=new T.Vector3(from.x,from.y,from.z),b=new T.Vector3(to.x,to.y,to.z);
      const mid=a.clone().lerp(b,.5);mid.y+=Math.min(5,a.distanceTo(b)*.24);
      const curve=new T.QuadraticBezierCurve3(a,mid,b);
      const line=new T.Mesh(new T.TubeGeometry(curve,36,.042,6,false),signalMaterial);
      scene.add(line);signal={line,curve};pulse.visible=true;
    }
    for(const r of routes)scene.remove(r.mesh);routes=[];
    for(const event of logistics.filter(e=>e.type==='shipment')){
      const start=buildings.get(event.seller),end=buildings.get(event.buyer);if(!start||!end)continue;
      const lane=start.x<end.x?.44:-.44;
      const approach=(site)=>site.annex
        ? [[site.x,site.z+3.92],[site.x,site.z+4.45],[-20.8,site.z+4.45]]
        : [[site.x,Math.sign(site.z)*1.7],[site.x,lane]];
      const via=start.annex!==end.annex?[[-20.8,lane]]:[];
      const pts=[...approach(start),...via,...approach(end).reverse()].map(([x,z])=>new T.Vector3(x,.075,z));
      const path=new T.CurvePath();for(let i=1;i<pts.length;i++)if(!pts[i].equals(pts[i-1]))path.add(new T.LineCurve3(pts[i-1],pts[i]));
      if(path.curves.length)routes.push({path,mesh:truck()});
    }
    for(const {button,actor} of pins){
      const id=actor.id,difference=cash[id]-baselineCash[id];
      button.dataset.active=String(id===selectedId);button.dataset.working=String(id===activeId);
      button.setAttribute('aria-pressed',String(id===selectedId));button.textContent=actor.name;
      if(Number.isFinite(difference)&&difference){
        const change=document.createElement('span');change.className=difference<0?'outflow':'inflow';
        change.textContent=(difference<0?'−':'+')+'¥'+(Math.abs(difference)/100).toLocaleString('zh-CN');button.append(change);
      }
    }
    dirty=true;
  }
  function show(logistics,actors,kind,cash,baselineCash){update({logistics,actors,selectedId:actors.find(a=>a.kind===kind)?.id,cash,baselineCash})}
  const v = new T.Vector3(),
    pos = new T.Vector3(),
    angle = new T.Vector3();
  function animate(ms) {
    if(!dirty&&!routes.length&&!signal)return;dirty=false;
    if(signal)pulse.position.copy(signal.curve.getPointAt((ms%2600)/2600));
    for (const [i, r] of routes.entries()) {
      const t = (ms / 7400 + i * 0.37) % 1;
      r.mesh.position.copy(r.path.getPoint(t, pos));
      r.path.getTangent(t, angle);
      r.mesh.rotation.y = -Math.atan2(angle.z, angle.x);
    }
    camera.updateMatrixWorld();
    for (const { point, button } of pins) {
      v.copy(point).project(camera);
      button.hidden=v.x < -1 || v.x > 1 || v.y < -1 || v.y > 1;
      button.style.left = ((v.x + 1) * width) / 2 + 'px';
      button.style.top = ((1 - v.y) * height) / 2 + 'px';
    }
    renderer.render(scene, camera);
  }
  configure(Object.keys(sites).map(kind=>({kind,id:kind,name:names[kind]})));
  renderer.setAnimationLoop(animate);
  root.querySelector('#world-status').hidden = true;
  root.querySelector('#resetview').onclick = reset;
  function dispose() {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    orbit.dispose();
    const geometries = new Set([cargo,cab,chassis,wheel,annexPad,roadBox,selection.geometry,pulse.geometry]);
    signal?.line.geometry.dispose();
    const materials = new Set([cargoMat,cabMat,tireMat,annexGround,roadSurface,stripePaint,selection.material,signalMaterial]);
    model.traverse(obj => {
      if (!obj.isMesh) return;
      geometries.add(obj.geometry);
      for (const mat of [].concat(obj.material)) materials.add(mat);
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    sun.shadow.dispose();
    renderer.dispose();renderer.forceContextLoss();
    renderer.domElement.remove();
    pins.forEach(({button}) => button.remove());
  }
  return {show,update,dispose,zoom(factor){camera.zoom=T.MathUtils.clamp(camera.zoom*factor,orbit.minZoom,orbit.maxZoom);camera.updateProjectionMatrix();dirty=true}};
}