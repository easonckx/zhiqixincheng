(() => {
  const layout = document.querySelector('.media-layout');
  if (!layout) return;
  const nodes = [...layout.querySelectorAll('.orbit-node')];
  const panels = [...layout.querySelectorAll('.media-copy article')];
  const overview = layout.querySelector('.media-overview');
  const reset = layout.querySelector('.orbit-reset');
  const edges = [...layout.querySelectorAll('line')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  // Coordinates use the centre of the drawing as the pivot. Each selection
  // brings the chosen corner to the left while preserving the circular order.
  const rest = [[50,20,1],[78,72,1],[22,72,1]];
  const focused = [[32,52,1.43],[79,25,.71],[79,75,.71]];
  let positions = rest, selected = -1, frame = 0, dwell = 0;
  function paint(points) {
    positions = points;
    nodes.forEach((node,i) => {
      const [x,y,scale] = points[i];
      node.style.left = x+'%';
      node.style.top = y+'%';
      node.style.setProperty('--scale',scale);
      node.style.zIndex = String(Math.round(scale*10));
      const next = points[(i+1)%3], line = edges[i];
      for (const [attr,v] of [['x1',x],['y1',y],['x2',next[0]],['y2',next[1]]]) line.setAttribute(attr,v);
    });
  }
  function select(index) {
    clearTimeout(dwell);
    if(index === selected) return;
    selected = index;
    cancelAnimationFrame(frame);
    overview.hidden = index >= 0;
    panels.forEach((panel,i) => panel.hidden = i !== index);
    reset.hidden = index < 0;
    nodes.forEach((node,i) => node.setAttribute('aria-pressed',String(i === index)));
    const start = positions, end = index < 0 ? rest : nodes.map((_,i) => focused[(i-index+3)%3]);
    if(motion.matches){paint(end);return;}
    const now = performance.now();
    // Move all three corners around the same pivot and in the same direction.
    const angle = p => Math.atan2(p[1]-52,p[0]-52);
    const radius = p => Math.hypot(p[1]-52,p[0]-52);
    const turn = Math.atan2(Math.sin(angle(end[0])-angle(start[0])),Math.cos(angle(end[0])-angle(start[0])));
    const arcs = start.map((p,i) => {
      let a = angle(end[i])-angle(p);
      return a + 2*Math.PI*Math.round((turn-a)/(2*Math.PI));
    });
    function draw(time) {
      const t = Math.min(1,(time-now)/480), k = 1-(1-t)**3;
      const points = start.map((p,i) => {
        const a = angle(p)+arcs[i]*k, r = radius(p)+(radius(end[i])-radius(p))*k;
        return [52+Math.cos(a)*r,52+Math.sin(a)*r,p[2]+(end[i][2]-p[2])*k];
      });
      paint(t===1 ? end : points);
      if(t<1) frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
  }
  let hoveredNode = null, returnTimer = 0, mouseSelection = false;
  function cancelReturn(){
    clearTimeout(returnTimer);
    returnTimer = 0;
  }
  function scheduleReturn(){
    if(selected < 0 || !mouseSelection || returnTimer)return;
    returnTimer = setTimeout(() => {
      returnTimer = 0;
      select(-1);
    },350);
  }
  // Track pointer movement so that rotating a node away from a stationary
  // cursor never dismisses the description the visitor has just opened.
  layout.addEventListener('pointermove',event => {
    if(event.pointerType !== 'mouse')return;
    const node = event.target.closest('.orbit-node');
    if(node !== hoveredNode){
      clearTimeout(dwell);
      hoveredNode = node;
      if(node) dwell = setTimeout(() => {
        mouseSelection = true;
        select(nodes.indexOf(node));
      },130);
    }
    if(node || event.target.closest('.media-copy'))cancelReturn();
    else scheduleReturn();
  });
  layout.addEventListener('pointerleave',event => {
    if(event.pointerType !== 'mouse')return;
    clearTimeout(dwell);
    hoveredNode = null;
    scheduleReturn();
  });
  layout.addEventListener('keydown',() => {
    clearTimeout(dwell);
    cancelReturn();
    mouseSelection = false;
  },true);
  layout.addEventListener('focusout',event => {
    if(!mouseSelection && !layout.contains(event.relatedTarget))select(-1);
  });
  nodes.forEach((node,i) => {
    node.addEventListener('click',event => {
      cancelReturn();
      mouseSelection = event.pointerType === 'mouse';
      select(i);
    });
    node.addEventListener('keydown',event => {
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();
      const next=(i+(event.key==='ArrowLeft'?2:1))%3;
      nodes[next].focus();select(next);
    });
  });
  function resetMap(){
    const previous=selected;
    select(-1);
    if(previous>=0)nodes[previous].focus({preventScroll:true});
  }
  reset.addEventListener('click',resetMap);
  layout.addEventListener('keydown',event=>{if(event.key==='Escape' && selected>=0)resetMap()});
  panels.forEach(p=>p.hidden=true);
  paint(rest);
  layout.classList.add('enhanced');
})();
