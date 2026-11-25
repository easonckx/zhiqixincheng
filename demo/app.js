const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let result,
  world,
  day = 4,
  branch = 'trial',
  tab = 'orders',
  timer,
  busy = false;
const yuan = (cents) =>
  (cents / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + yuan(Math.abs(n));
const short = (id) => id?.slice(-6).toUpperCase() || '—';
const name = (id) => result.actors.find((a) => a.id === id)?.name || '—';
const material = (o) => (o.unit === 'kg' ? '钢材' : '零部件');
const status = {
  accepted: '已接单',
  shipped: '已发运',
  delivered: '已交付',
  partial: '部分交付',
};
const reason = {
  shipment: '发运预付',
  collection: '货款结清',
  loan: '借款到账 / 支出',
  repayment: '偿还借款',
};
function el(tag, value, cls) {
  const e = document.createElement(tag);
  if (value !== undefined) e.textContent = value;
  if (cls) e.className = cls;
  return e;
}
function matchesActor(...ids) {
  return !$('#actor').value || ids.includes($('#actor').value);
}
function orderLink(id) {
  if (!id) return '—';
  const button = el('button', short(id), 'orderlink');
  button.title = '查看这笔订单的物流与现金流水';
  button.onclick = () => openOrder(id);
  return button;
}
function openOrder(id) {
  const history = result[branch].slice(0, day + 1);
  const order = history.at(-1).orders.find((o) => o.id === id);
  if (!order) return;
  $('#order-title').textContent = material(order) + '订单 · ' + short(id);
  const body = $('#order-body');
  const heading = name(order.seller_id) + ' → ' + name(order.buyer_id);
  const amount =
    order.quantity +
    ' ' +
    order.unit +
    ' × ¥' +
    yuan(order.price_cents_per_unit) +
    ' = ¥' +
    yuan(order.quantity * order.price_cents_per_unit);
  body.replaceChildren(
    el('p', heading),
    el('b', amount, 'contract-value'),
    el(
      'p',
      '截至第 ' +
        day +
        ' 天 · ' +
        (status[order.status] || order.status) +
        ' · 累计交付 ' +
        order.delivered_quantity +
        ' ' +
        order.unit,
      'notice',
    ),
  );
  const rows = [];
  for (const s of history) {
    for (const event of s.logistics.filter((e) => e.order_id === id)) {
      rows.push([
        'D' + s.day,
        event.type === 'shipment' ? '发运' : '到货',
        event.quantity + ' ' + event.unit,
      ]);
    }
    for (const line of s.ledger.filter((l) => l.order === id)) {
      rows.push([
        'D' + s.day,
        name(line.actor_id) + ' · 现金',
        signed(line.delta_cents) + ' 元',
      ]);
    }
  }
  body.append(
    table(
      ['日期', '订单事件', '数量 / 金额'],
      rows,
      '截至当日尚无发运或现金事件。',
    ),
  );
  $('#order-detail').showModal();
}
function table(headers, rows, empty) {
  if (!rows.length) return el('p', empty, 'empty');
  const wrapper = el('div', undefined, 'tablewrap'),
    t = el('table'),
    head = t.createTHead().insertRow();
  headers.forEach((h) => head.append(el('th', h)));
  const body = t.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    for (const cell of row) {
      const td = tr.insertCell();
      if (cell instanceof Node) td.append(cell);
      else td.textContent = cell;
    }
  }
  wrapper.append(t);
  return wrapper;
}
function paintEvidence(s) {
  const out = $('#evidence');
  out.replaceChildren();
  $$('.tabs button').forEach((b) =>
    b.setAttribute('aria-pressed', b.dataset.tab === tab),
  );
  if (tab === 'orders') {
    const created = new Map();
    for (const point of result[branch].slice(0, day + 1))
      for (const order of point.orders)
        if (!created.has(order.id)) created.set(order.id, point.day);
    const rows = s.orders
      .filter((o) => matchesActor(o.seller_id, o.buyer_id))
      .slice()
      .reverse()
      .map((o) => [
        orderLink(o.id),
        'D' + created.get(o.id),
        material(o),
        name(o.seller_id) + ' → ' + name(o.buyer_id),
        o.quantity + ' ' + o.unit,
        '¥' + yuan(o.price_cents_per_unit),
        '¥' + yuan(o.price_cents_per_unit * o.quantity),
        status[o.status] || o.status,
      ]);
    out.append(
      table(
        [
          '订单号',
          '签单日',
          '货品',
          '供方 → 买方',
          '订购量',
          '单价',
          '订单金额',
          '日终状态',
        ],
        rows,
        '截至当日，所选主体没有已签订单。',
      ),
    );
    const rejected = s.rejections.filter((r) => matchesActor(r.actor));
    if (rejected.length)
      out.append(
        el(
          'p',
          '当日未执行动作 · ' +
            rejected.map((r) => name(r.actor) + '：' + r.message).join(' / '),
          'notice',
        ),
      );
  } else if (tab === 'logistics') {
    // The basic scenario supplies one transport relation serving the factory on both routes.
    const carrier = result.actors.find((a) => a.kind === 'logistics');
    const rows = s.logistics
      .filter((e) => matchesActor(e.seller, e.buyer, carrier.id))
      .map((e) => [
        e.type === 'shipment' ? '发运' : '到货',
        orderLink(e.order_id),
        name(e.seller) + ' → ' + name(e.buyer),
        e.quantity + ' ' + e.unit,
        '¥' + yuan(e.amount),
      ]);
    out.append(
      table(
        ['当日事件', '关联订单', '货物流向', '实物数量', '对应货值'],
        rows,
        '当日所选主体没有发运或到货事件。',
      ),
    );
  } else {
    const rows = s.ledger
      .filter((l) => matchesActor(l.actor_id))
      .map((l) => [
        name(l.actor_id),
        reason[l.reason] || l.reason,
        orderLink(l.order),
        el(
          'span',
          (l.delta_cents > 0 ? '+' : '−') + '¥' + yuan(Math.abs(l.delta_cents)),
          l.delta_cents < 0 ? 'amt-neg' : 'amt-pos',
        ),
      ]);
    out.append(
      table(
        ['主体', '结算原因', '关联订单', '当日现金发生额'],
        rows,
        '当日所选主体没有现金收支。',
      ),
    );
    if ($('#actor').value)
      out.append(
        el(
          'p',
          name($('#actor').value) +
            ' · 日终现金 ¥' +
            yuan(s.cash[$('#actor').value]),
          'empty',
        ),
      );
  }
}
function mapUpdate() {
  if (!result) return;
  const s = result[branch][day];
  const kind = result.actors.find((a) => a.id === $('#actor').value)?.kind;
  world?.show(
    s.logistics,
    result.actors,
    kind,
    s.cash,
    result.baseline[day].cash,
  );
  const n = s.logistics.filter((e) => e.type === 'shipment').length;
  $('#legend').textContent = n
    ? '橙色货车 · 当日 ' + n + ' 笔发运的路线回放　｜　拖动旋转，点击建筑查账'
    : '当日无发运　｜　拖动旋转，点击建筑查账';
}
function paint() {
  if (!result) return;
  const s = result[branch][day],
    base = result.baseline[day],
    factory = result.actors.find((a) => a.kind === 'manufacturer').id;
  $('#asof').textContent = day ? '第 ' + day + ' 天 · 日终' : '期初';
  $$('[data-branch]').forEach((b) =>
    b.setAttribute('aria-pressed', b.dataset.branch === branch),
  );
  $('#days').replaceChildren();
  for (let i = 0; i < result.trial.length; i++) {
    const b = el('button', i ? 'D' + i : '期初');
    b.setAttribute('aria-label', i ? '第 ' + i + ' 天' : '期初');
    b.setAttribute('aria-pressed', i === day);
    b.onclick = () => {
      stop();
      day = i;
      paint();
    };
    $('#days').append(b);
  }
  const purchased = (state) =>
    state.orders
      .filter((o) => o.unit === 'kg')
      .reduce((sum, o) => sum + o.quantity, 0);
  const shipped = (state) =>
    state.logistics
      .filter((e) => e.unit === 'kg' && e.type === 'shipment')
      .reduce((sum, e) => sum + e.quantity, 0);
  const cards = [
    [
      '钢材累计订购量',
      purchased(s) + ' kg',
      purchased(s) - purchased(base),
      ' kg',
      '全市场已签 ' + s.orders.length + ' 笔',
    ],
    [
      '钢材当日发运量',
      shipped(s) + ' kg',
      shipped(s) - shipped(base),
      ' kg',
      '日终在途 ' + s.transit + ' 批',
    ],
    [
      '工厂日终现金',
      '¥' + yuan(s.cash[factory]),
      s.cash[factory] - base.cash[factory],
      '元',
      '东北零部件工厂',
    ],
  ];
  $('#metrics').replaceChildren();
  for (const [label, value, diff, unit, context] of cards) {
    const d = el('div', undefined, 'metric');
    const delta =
      unit === '元'
        ? signed(diff) + ' 元'
        : (diff > 0 ? '+' : '') + diff + unit;
    const comparison =
      branch === 'baseline'
        ? '原价对照组'
        : diff
          ? '较原价 ' + delta
          : '与原价相同';
    d.append(
      el('p', label),
      el('b', value),
      el('small', comparison, diff ? 'changed' : ''),
      el('small', ' · ' + context, 'context'),
    );
    $('#metrics').append(d);
  }
  paintEvidence(s);
  mapUpdate();
}
function stop() {
  clearInterval(timer);
  timer = null;
  $('#play').textContent = '▷ 播放';
}
$('#play').onclick = () => {
  if (timer) {
    stop();
    return;
  }
  if (day >= 4) day = 0;
  paint();
  $('#play').textContent = 'Ⅱ 暂停';
  timer = setInterval(() => {
    day++;
    paint();
    if (day >= 4) stop();
  }, 1800);
};
$$('[data-branch]').forEach(
  (b) =>
    (b.onclick = () => {
      branch = b.dataset.branch;
      paint();
    }),
);
$$('[data-tab]').forEach(
  (b) =>
    (b.onclick = () => {
      tab = b.dataset.tab;
      if (result) paintEvidence(result[branch][day]);
    }),
);
$('#actor').onchange = paint;
function edited() {
  if (!result || busy) return;
  $('#runstatus').textContent =
    Math.round(Number($('#price').value) * 100) === result.price
      ? '已结算 · 当前方案 ¥' + yuan(result.price) + '/kg'
      : '价格待运行 · 当前账本仍为 ¥' + yuan(result.price) + '/kg';
}
$('#price').addEventListener('input', edited);
$$('[data-price]').forEach(
  (b) =>
    (b.onclick = () => {
      $('#price').value = b.dataset.price;
      edited();
    }),
);
async function run() {
  if (busy || !$('#priceform').reportValidity()) return;
  const price = Math.round(Number($('#price').value) * 100);
  stop();
  busy = true;
  $('#run').disabled = true;
  $('#play').disabled = true;
  $('#runstatus').textContent = '正在读取四天推演账本…';
  try {
    const response = await fetch('scenarios/' + price + '.json');
    if (!response.ok) throw Error('HTTP ' + response.status);
    const payload = await response.json();
    result = payload;
    day = 4;
    branch = 'trial';
    const filter = $('#actor'),
      old = filter.value;
    filter.replaceChildren(
      new Option('全部主体', ''),
      ...result.actors.map((a) => new Option(a.name, a.id)),
    );
    filter.value = old;
    $('#base-note').textContent =
      '原价对照 ¥' + yuan(result.baseline_price) + '/kg';
    $('#connection').textContent = '四天推演回放';
    $('#connection').classList.add('on');
    try {
      localStorage.setItem('market3d.price', String(price));
    } catch {}
    paint();
  } catch (err) {
    $('#connection').textContent = '载入失败';
    $('#connection').classList.remove('on');
    $('#runstatus').textContent = '未能载入此方案，请重试。' + err.message;
    return;
  } finally {
    busy = false;
    $('#run').disabled = false;
    $('#play').disabled = !result;
  }
  edited();
}
$('#priceform').onsubmit = (e) => {
  e.preventDefault();
  run();
};
try {
  const p = Number(localStorage.getItem('market3d.price'));
  if ([...$('#price').options].some(option => Number(option.value) * 100 === p)) $('#price').value = p / 100;
} catch {}
run();
import('./world.js')
  .then((m) =>
    m.createWorld((kind) => {
      if (!result) return;
      $('#actor').value = result.actors.find((a) => a.kind === kind)?.id || '';
      tab = 'cash';
      paint();
    }),
  )
  .then((w) => {
    world = w;
    mapUpdate();
  })
  .catch((e) => {
    $('#world-status').textContent =
      '三维场景未加载，可继续在下方查看推演账本。';
    $('#resetview').disabled = true;
    console.error('Market 3D', e);
  });
