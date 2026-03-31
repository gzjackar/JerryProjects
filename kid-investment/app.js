// ===== STATE =====
var state = { account: null, transactions: [], positions: {}, currentPrices: {} };
var USD_TO_CNY = 7.2;  // 固定汇率：1美元=7.2人民币
var _positionsComputed = false;  // 全局标志：computePositions 是否已执行过（只在首次打开页面时执行一次）

// ===== 汇率换算 =====
function toCNY(amount, currency) {
  if (!amount) return 0;
  // 所有价格统一以 CNY 存储，USD 价格买入时换算入 CNY
  if ((currency || 'CNY') === 'USD') return amount * USD_TO_CNY;
  return amount;
}

// 买入时把 USD 换算成 CNY 再存储（避免显示时二次换算）
function convertToCNY(price, currency) {
  if (!price) return 0;
  if ((currency || 'CNY') === 'USD') return price * USD_TO_CNY;
  return price;
}
var tradeType = 'buy';
var historyFilter = 'all';
var SK = 'kid_invest_v1';
var API_URL = 'http://192.168.10.54:8888/api';

// ===== HELPERS =====
function $(id) { return document.getElementById(id); }
function $all(sel) { return document.querySelectorAll(sel); }
function fmt(n) { return (n || 0).toFixed(2); }
function fmtPct(n) { return (n >= 0 ? '+' : '') + (n || 0).toFixed(2) + '%'; }
function esc(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2200);
}

function openModal(title, body) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = body;
  $('modal').classList.add('show');
}

function closeModal() { $('modal').classList.remove('show'); }

// ===== SAVE TO SERVER =====
function save() {
  // 转换前端格式到API格式再保存
  var apiData = {
    account: {
      name: state.account ? state.account.name : null,
      balance: state.account ? (state.account.currentCash || state.account.initialAmount || 0) : 0,
      initialAmount: state.account ? state.account.initialAmount : 0,
      currentCash: state.account ? state.account.currentCash : 0,
      createdAt: state.account ? state.account.createdAt : null
    },
    transactions: state.transactions,
    positions: {},
    currentPrices: state.currentPrices,
    lastUpdated: new Date().toISOString()
  };
  Object.keys(state.positions).forEach(function(a) {
    var p = state.positions[a];
    // 前端格式: totalShares, totalCost -> API格式: shares(=totalShares), costPrice(=avgCost), costBasis(=totalCost)
    var avgCost = p.totalShares > 0 ? p.totalCost / p.totalShares : 0;
    apiData.positions[a] = {
      symbol: p.symbol || a,
      name: p.name || a,
      shares: p.totalShares || 0,
      costPrice: avgCost,           // ← 每份成本（正确）
      costBasis: p.totalCost || 0, // ← 总成本（正确）
      currentPrice: p.currentPrice || 0,
      currency: p.currency || 'USD'
    };
  });
  // 保存到服务器
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiData)
  }).then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.success) {
        // 服务器返回的数据格式转换回前端格式
        if (res.data && res.data.positions) {
          Object.keys(res.data.positions).forEach(function(a) {
            var p = res.data.positions[a];
            if (!state.positions[a]) state.positions[a] = {};
            state.positions[a].totalShares = p.shares || 0;
            state.positions[a].totalCost = p.costBasis || 0;
            state.positions[a].currentPrice = p.currentPrice || 0;
            state.positions[a].symbol = p.symbol || a;
            state.positions[a].name = p.name || a;
            state.positions[a].currency = p.currency || 'USD';
          });
        }
        if (res.data && res.data.account) state.account = res.data.account;
        if (res.data && res.data.transactions) state.transactions = res.data.transactions;
      }
    }).catch(function(err) {
      console.log('Save error:', err);
    });
  // 同时保存到 localStorage 作为备份
  localStorage.setItem(SK, JSON.stringify(state));
}

// ===== INIT =====
function load() {
  // 重置全局标志
  _positionsComputed = false;
  try { window._positionsComputed = false; } catch(e) {}
  
  // 设置日期输入框默认值
  $('sDate').value = new Date().toISOString().slice(0, 10);
  $('tDate').value = new Date().toISOString().slice(0, 10);
  
  var data = null;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL + '?t=' + Date.now(), false); // 同步请求
    xhr.send(null);
    if (xhr.status === 200) {
      data = JSON.parse(xhr.responseText);
    }
  } catch(e) {
    console.log('Server load error:', e);
  }
  
  // 如果服务器无数据，尝试本地缓存
  if (!data || !data.positions || Object.keys(data.positions).length === 0) {
    try {
      var cached = JSON.parse(localStorage.getItem('kid_invest_v1') || 'null');
      if (cached && cached.positions && Object.keys(cached.positions).length > 0) {
        data = cached;
      }
    } catch(e) {}
  }
  
  // 如果都没有数据，显示开户页面
  if (!data || !data.account) {
    showSetup();
    return;
  }
  
  // 应用数据到 state
  state.account = {
    name: data.account.name || '我的投资账户',
    initialAmount: data.account.initialAmount || data.account.balance || 0,
    currentCash: data.account.currentCash !== undefined ? data.account.currentCash : (data.account.balance || 0),
    createdAt: data.account.createdAt || new Date().toISOString().slice(0, 10)
  };
  state.transactions = data.transactions || [];
  state.currentPrices = data.currentPrices || {};
  state.positions = {};
  
  // 转换API数据格式到前端格式
  if (data.positions) {
    Object.keys(data.positions).forEach(function(a) {
      var p = data.positions[a];
      if (p.shares !== undefined) {
        state.positions[a] = {
          totalShares: p.shares,
          totalCost: p.costBasis !== undefined ? p.costBasis : (p.shares * (p.costPrice || p.currentPrice || 0)),
          currentPrice: p.currentPrice || p.costPrice || 0,
          symbol: p.symbol || a,
          name: p.name || a,
          currency: p.currency || 'USD'
        };
      }
    });
  }
  
  // 容错：如果 currentPrices 缺失，从 positions 读取
  if (!data.currentPrices && data.positions) {
    Object.keys(data.positions).forEach(function(a) {
      state.currentPrices[a] = data.positions[a].currentPrice || data.positions[a].costPrice || 0;
    });
  }
  
  // 容错：如果 positions 缺失，从 transactions 重建（仅首次）
  if ((!data.positions || Object.keys(data.positions).length === 0) && state.transactions.length > 0) {
    computePositions();
  }
  
  // 同步到本地备份
  localStorage.setItem('kid_invest_v1', JSON.stringify(state));
  
  // 数据加载完成，显示主界面
  showMain();
}
function showSetup() {
  $('mainNav').style.display = 'none';
  $('tabBar').style.display = 'none';
  $all('.panel').forEach(function(p) { p.classList.remove('active'); });
  $('panel-setup').classList.add('active');
}

function initAccount() {
  var name = $('sName').value.trim() || '我的投资账户';
  var amount = parseFloat($('sAmount').value);
  var date = $('sDate').value;
  if (!amount || amount <= 0) { toast('请输入有效的初始资金'); return; }
  if (!date) { toast('请选择初始化日期'); return; }
  state.account = { name: name, initialAmount: amount, currentCash: amount, createdAt: date };
  state.transactions = [];
  state.positions = {};
  state.currentPrices = {};
  save();
  showMain();
  toast('账户开通成功！');
}

// ===== MAIN =====
function showMain() {
  $('panel-setup').classList.remove('active');
  $('mainNav').style.display = 'flex';
  $('tabBar').style.display = 'flex';
  $('accName').textContent = state.account.name;
  renderAll();
}

function confirmReset() {
  if (confirm('确定要重置所有数据吗？此操作不可撤销！')) {
    // 清空服务器数据
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: null,
        transactions: [],
        positions: {},
        currentPrices: {},
        lastUpdated: new Date().toISOString()
      })
    }).then(function() {
      localStorage.removeItem(SK);
      location.reload();
    }).catch(function() {
      localStorage.removeItem(SK);
      location.reload();
    });
  }
}

// ===== NAV =====
$all('.nb, .tab-item').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var panel = btn.dataset.panel;
    $all('.nb').forEach(function(b) { b.classList.remove('active'); });
    $all('.tab-item').forEach(function(b) { b.classList.remove('active'); });
    $all('.panel').forEach(function(p) { p.classList.remove('active'); });
    $('panel-' + panel).classList.add('active');
    btn.classList.add('active');
    if (panel === 'positions') renderPositions();
    if (panel === 'history') renderHistory();
    if (panel === 'chart') renderCharts();
    if (panel === 'rebalance') renderRebalance();
  });
});

$('modal').addEventListener('click', function(e) { if (e.target.id === 'modal') closeModal(); });

// ===== COMPUTE =====
function computePositions() {
  // 全局标志防止重复调用——每次 load 时重置为 false，之后只执行一次
  if (_positionsComputed) return;
  _positionsComputed = true;
  
  // 直接从交易记录计算持仓，不继承 state.positions（避免翻倍）
  // 因为页面加载时 state.positions 已经是服务器返回的正确数据
  var pos = {};
  state.transactions.forEach(function(tx) {
    if (!pos[tx.asset]) {
      pos[tx.asset] = { totalShares: 0, totalCost: 0, currentPrice: state.currentPrices[tx.asset] || tx.price || 0 };
    }
    if (tx.type === 'buy') {
      pos[tx.asset].totalShares += tx.shares;
      pos[tx.asset].totalCost += tx.amount;
    } else {
      var avg = pos[tx.asset].totalShares > 0 ? pos[tx.asset].totalCost / pos[tx.asset].totalShares : 0;
      pos[tx.asset].totalShares -= tx.shares;
      pos[tx.asset].totalCost -= avg * tx.shares;
      if (pos[tx.asset].totalShares <= 0.0001) { delete pos[tx.asset]; }
    }
  });
  // 如果没有交易记录，保留服务器返回的 positions
  if (Object.keys(pos).length === 0 && Object.keys(state.positions).length > 0) {
    // 不做操作，直接用 state.positions
  } else if (Object.keys(pos).length > 0) {
    state.positions = pos;
  }
  return pos;
}

function getStats() {
  var pv = 0;
  Object.keys(state.positions).forEach(function(a) {
    var price = state.currentPrices[a];
    if (!price && state.positions[a]) price = state.positions[a].currentPrice;
    if (!price) price = 0;
    var currency = state.positions[a].currency || 'USD';
    pv += state.positions[a].totalShares * toCNY(price, currency);
  });
  var total = toCNY(state.account.currentCash, 'CNY') + pv;
  var gain = total - state.account.initialAmount;
  var rate = state.account.initialAmount > 0 ? (gain / state.account.initialAmount) * 100 : 0;
  return { total: total, posValue: pv, gain: gain, rate: rate };
}
function updateHeader() {
  var s = getStats();
  $('statTotal').textContent = '¥' + fmt(s.total);
  $('statGain').textContent = (s.gain >= 0 ? '+' : '') + '¥' + fmt(s.gain);
  $('statGain').className = 'val ' + (s.gain >= 0 ? 'vpos' : 'vneg');
  $('statRate').textContent = fmtPct(s.rate);
  $('statRate').className = 'val ' + (s.rate >= 0 ? 'vpos' : 'vneg');
}

function renderAll() { updateHeader(); renderPositions(); }

// ===== TRADE =====
function setTradeType(type) {
  tradeType = type;
  $('btnBuy').className = type === 'buy' ? 'ab' : '';
  $('btnSell').className = type === 'sell' ? 'as' : '';
  $('sellInfo').style.display = type === 'sell' ? 'block' : 'none';
  if (type === 'sell') renderSellInfo();
}

function renderSellInfo() {
  computePositions();
  var assets = Object.keys(state.positions);
  if (!assets.length) {
    $('sellPositionInfo').innerHTML = '<p style="color:var(--tl);font-size:.85rem">暂无持仓，请先买入</p>';
    return;
  }
  var html = '';
  assets.forEach(function(a) {
    var p = state.positions[a];
    html += '<div class="ir"><span>' + a + '</span><span>' + fmt(p.totalShares) + '份 @ ¥' + fmt(p.currentPrice) + '</span></div>';
  });
  $('sellPositionInfo').innerHTML = html;
}

function submitTrade() {
  var date = $('tDate').value;
  var asset = $('tAsset').value.trim();
  var price = parseFloat($('tPrice').value);
  var amount = parseFloat($('tAmount').value);
  var note = $('tNote').value.trim();
  if (!date) { toast('请选择日期'); return; }
  if (!asset) { toast('请输入标的名称'); return; }
  if (!price || price <= 0) { toast('请输入有效价格'); return; }
  if (!amount || amount <= 0) { toast('请输入有效金额'); return; }
  var shares = amount / price;
  var currency = 'CNY'; // 目前只支持人民币，后续可扩展
  var priceCNY = convertToCNY(price, currency);
  computePositions();
  if (tradeType === 'buy') {
    if (amount > state.account.currentCash + 0.01) { toast('现金不足！当前现金 ¥' + fmt(state.account.currentCash)); return; }
    state.account.currentCash -= amount;
    state.transactions.push({ date: date, asset: asset, type: 'buy', price: priceCNY, amount: amount, shares: shares, note: note });
    if (!state.positions[asset]) { state.positions[asset] = { totalShares: 0, totalCost: 0, currentPrice: priceCNY, currency: currency }; }
    state.positions[asset].totalShares += shares;
    state.positions[asset].totalCost += amount;
    state.positions[asset].currentPrice = priceCNY;
    state.positions[asset].currency = currency;
    toast('买入成功！');
  } else {
    if (!state.positions[asset]) { toast('没有该持仓'); return; }
    var pos = state.positions[asset];
    if (shares > pos.totalShares + 0.0001) { toast('份额不足！可用 ' + fmt(pos.totalShares) + ' 份'); return; }
    var proceeds = shares * price;
    var avgCost = pos.totalCost / pos.totalShares;
    state.account.currentCash += proceeds;
    state.transactions.push({ date: date, asset: asset, type: 'sell', price: price, amount: proceeds, shares: shares, note: note });
    if (Math.abs(shares - pos.totalShares) < 0.0001) {
      delete state.positions[asset];
    } else {
      pos.totalShares -= shares;
      pos.totalCost -= avgCost * shares;
    }
    toast('卖出成功！');
  }
  save();
  computePositions();
  updateHeader();
  renderPositions();
  $('tAsset').value = '';
  $('tPrice').value = '';
  $('tAmount').value = '';
  $('tNote').value = '';
  $('tDate').value = new Date().toISOString().slice(0, 10);
}

// ===== POSITIONS =====
function renderPositions() {
  // 不要在这里调用 computePositions()，避免覆盖最新价格
  // computePositions 只在有新增交易时调用
  updateHeader();
  var assets = Object.keys(state.positions);
  var list = $('positionsList');
  var priceList = $('priceUpdateList');
  var overview = $('accountOverview');

  if (!assets.length) {
    var empty = '<div class="es"><div class="emoji">📭</div><p>暂无持仓，去交易页面买入吧！</p></div>';
    list.innerHTML = empty;
    priceList.innerHTML = empty;
  } else {
    var html = '';
    var pHtml = '';
    assets.forEach(function(a) {
      var p = state.positions[a];
      var currency = p.currency || 'USD';
      var val = p.totalShares * toCNY(p.currentPrice, currency);
      var gain = val - p.totalCost;
      var gp = p.totalCost > 0 ? (gain / p.totalCost) * 100 : 0;
      var isPos = gain >= 0;
      var safeName = a.replace(/\s/g, '_');
      html += '<div class="pc">' +
        '<div class="pc-top"><span class="pc-name">' + a + '</span><span class="pb ' + (isPos ? 'pos' : 'neg') + '">' + fmtPct(gp) + '</span></div>' +
        '<div class="pg">' +
        '<div class="pi"><label>持有份额</label><span>' + fmt(p.totalShares) + '</span></div>' +
        '<div class="pi"><label>当前价格</label><span>¥' + fmt(p.currentPrice) + '</span></div>' +
        '<div class="pi"><label>持仓成本</label><span>¥' + fmt(p.totalCost) + '</span></div>' +
        '<div class="pi"><label>当前市值</label><span>¥' + fmt(val) + '</span></div>' +
        '<div class="pi"><label>浮动收益</label><span style="color:' + (isPos ? 'var(--s)' : 'var(--d)') + '">' + (isPos ? '+' : '') + '¥' + fmt(gain) + '</span></div>' +
        '<div class="pi"><label>单位成本</label><span>¥' + fmt(p.totalShares > 0 ? p.totalCost / p.totalShares : 0) + '</span></div>' +
        '</div>' +
        '<div class="pcActs"><button onclick="openUpdatePriceModal(\'' + esc(a) + '\')">✏️ 更新价格</button></div>' +
        '</div>';
      pHtml += '<div class="pr"><label>' + a + '</label><input type="number" id="p_' + safeName + '" value="' + fmt(p.currentPrice) + '" step="0.001"></div>';
    });
    list.innerHTML = html;
    priceList.innerHTML = pHtml;
  }

  var s = getStats();
  overview.innerHTML =
    '<div class="ir"><span>初始资金</span><span>¥' + fmt(state.account.initialAmount) + '</span></div>' +
    '<div class="ir"><span>当前现金</span><span>¥' + fmt(state.account.currentCash) + '</span></div>' +
    '<div class="ir"><span>持仓市值</span><span>¥' + fmt(s.posValue) + '</span></div>' +
    '<div class="ir"><span>总资产</span><span>¥' + fmt(s.total) + '</span></div>' +
    '<div class="ir"><span>总收益</span><span style="color:' + (s.gain >= 0 ? 'var(--s)' : 'var(--d)') + '">' + (s.gain >= 0 ? '+' : '') + '¥' + fmt(s.gain) + '</span></div>' +
    '<div class="ir"><span>收益率</span><span style="color:' + (s.rate >= 0 ? 'var(--s)' : 'var(--d)') + '">' + fmtPct(s.rate) + '</span></div>';
}

function openUpdatePriceModal(asset) {
  var p = state.positions[asset];
  var body = '<div class="fg"><label class="lbl2">' + asset + ' 当前价格</label><input type="number" id="newPrice" value="' + fmt(p.currentPrice) + '" step="0.001"></div>' +
    '<button class="btn btn-p w100 mt8" onclick="updateSinglePrice(\'' + esc(asset) + '\')">保存</button>';
  openModal('✏️ 更新价格', body);
}

function updateSinglePrice(asset) {
  var v = parseFloat($('newPrice').value);
  if (!v || v <= 0) { toast('请输入有效价格'); return; }
  state.currentPrices[asset] = v;
  if (state.positions[asset]) state.positions[asset].currentPrice = v;
  save();
  var pv = 0;
  Object.keys(state.positions).forEach(function(a) {
    var price = state.currentPrices[a] || state.positions[a].currentPrice;
    var currency = state.positions[a].currency || 'USD';
    pv += state.positions[a].totalShares * toCNY(price, currency);
  });
  var total = pv + state.account.currentCash;
  var gain = total - state.account.initialAmount;
  var rate = state.account.initialAmount > 0 ? (gain / state.account.initialAmount) * 100 : 0;
  $('statTotal').textContent = '¥' + (total || 0).toFixed(2);
  $('statGain').textContent = ((gain >= 0 ? '+' : '') + '¥' + (gain || 0).toFixed(2));
  $('statGain').className = 'val ' + (gain >= 0 ? 'vpos' : 'vneg');
  $('statRate').textContent = ((rate >= 0 ? '+' : '') + (rate || 0).toFixed(2) + '%');
  $('statRate').className = 'val ' + (rate >= 0 ? 'vpos' : 'vneg');
  renderPositions();
  closeModal();
  toast('价格已更新');
}

function batchUpdatePrices() {
  // 收集用户输入的新价格
  var newPrices = {};
  Object.keys(state.positions).forEach(function(a) {
    var inp = $('p_' + a.replace(/\s/g, '_'));
    if (inp) {
      var v = parseFloat(inp.value);
      if (v && v > 0) {
        newPrices[a] = v;
      }
    }
  });
  // 保存新价格
  Object.keys(newPrices).forEach(function(a) {
    state.currentPrices[a] = newPrices[a];
    if (state.positions[a]) {
      state.positions[a].currentPrice = newPrices[a];
    }
  });
  save(); // 先保存到服务器
  // 立即刷新显示（注意汇率换算）
  var pv = 0;
  Object.keys(state.positions).forEach(function(a) {
    var price = state.currentPrices[a] || state.positions[a].currentPrice;
    var currency = state.positions[a].currency || 'USD';
    pv += state.positions[a].totalShares * toCNY(price, currency);
  });
  var total = pv + state.account.currentCash;
  var gain = total - state.account.initialAmount;
  var rate = state.account.initialAmount > 0 ? (gain / state.account.initialAmount) * 100 : 0;
  $('statTotal').textContent = '¥' + (total || 0).toFixed(2);
  $('statGain').textContent = ((gain >= 0 ? '+' : '') + '¥' + (gain || 0).toFixed(2));
  $('statGain').className = 'val ' + (gain >= 0 ? 'vpos' : 'vneg');
  $('statRate').textContent = ((rate >= 0 ? '+' : '') + (rate || 0).toFixed(2) + '%');
  $('statRate').className = 'val ' + (rate >= 0 ? 'vpos' : 'vneg');
  renderPositions();
  toast('价格已保存');
}

function fetchPricesFromAPI() {
  var assets = Object.keys(state.positions);
  if (!assets.length) { toast('暂无持仓'); return; }
  toast('正在获取实时价格...');

  // 中文名称 -> Stooq symbol 映射（服务器和页面共用）
  var nameToSym = {
    'Nasdaq': 'QQQ.US', '纳斯达克': 'QQQ.US',
    '微软': 'MSFT.US', 'Microsoft': 'MSFT.US',
    '黄金': 'GOLD.US',
    '美国运通': 'AXP.US',
    '苹果': 'AAPL.US', 'Apple': 'AAPL.US',
    '谷歌': 'GOOGL.US', 'Google': 'GOOGL.US',
    '英伟达': 'NVDA.US', 'Nvidia': 'NVDA.US',
    '特斯拉': 'TSLA.US', 'Tesla': 'TSLA.US',
    '亚马逊': 'AMZN.US', 'Amazon': 'AMZN.US',
    'Meta': 'META.US', 'Facebook': 'META.US',
    'Netflix': 'NFLX.US',
    '台积电': 'TSM.US', 'TSMC': 'TSM.US',
    '腾讯': 'TCEHY.US',
    '阿里': 'BABA.US', '阿里巴巴': 'BABA.US',
    '京东': 'JD.US',
    '蔚来': 'NIO.US',
    '小鹏': 'XPEV.US',
    '理想': 'LI.US'
  };

  // 去重后生成 Stooq symbol 列表（用 + 连接）
  var seen = {};
  var symParts = [];
  assets.forEach(function(a) {
    var s = nameToSym[a] || a;
    if (!seen[s]) { seen[s] = true; symParts.push(s); }
  });

  // 通过 NAS 服务器 /price 接口代理获取（绕过 CORS 和防火墙）
  var symStr = symParts.join(',');
  fetch('/price?symbols=' + encodeURIComponent(symStr))
    .then(function(r) { if (!r.ok) throw 'bad response'; return r.json(); })
    .then(function(data) {
      var prices = data.prices || {};
      var filled = 0;
      assets.forEach(function(a) {
        var sym = nameToSym[a] || a;
        // 尝试多种 key 格式
        var price = prices[sym] || prices[sym.replace('.US','')] || prices[sym.toUpperCase()] || prices[a] || 0;
        var inp = $('p_' + a.replace(/\s/g, '_'));
        if (inp && price > 0) {
          inp.value = price.toFixed(2);
          filled++;
        }
      });
      if (filled > 0) toast('获取到 ' + filled + ' 个实时价格，已填入！');
      else toast('未能识别持仓标的，请手动填写');
    })
    .catch(function(err) {
      toast('获取失败，请手动填写价格');
    });
}

// ===== HISTORY =====
function setHistoryFilter(key) { historyFilter = key; renderHistory(); }

function renderHistory() {
  var list = $('historyList');
  var fb = $('filterBar');
  var assets = ['全部'].concat(Object.keys(state.transactions.reduce(function(m, t) { m[t.asset] = true; return m; }, {})));
  fb.innerHTML = assets.map(function(a) {
    var key = a === '全部' ? 'all' : a;
    return '<button class="fbtn' + (historyFilter === key ? ' active' : '') + '" onclick="setHistoryFilter(\'' + esc(key) + '\')">' + a + '</button>';
  }).join('');

  var txs = historyFilter === 'all' ? state.transactions : state.transactions.filter(function(t) { return t.asset === historyFilter; });
  if (!txs.length) {
    list.innerHTML = '<div class="es"><div class="emoji">📋</div><p>暂无交易记录</p></div>';
    return;
  }
  list.innerHTML = txs.slice().reverse().map(function(tx) {
    var isBuy = tx.type === 'buy';
    return '<div class="hi">' +
      '<div class="hiL"><div class="hiIco ' + tx.type + '">' + (isBuy ? '📈' : '📉') + '</div>' +
      '<div><div class="hiNm">' + tx.asset + ' <span class="tag ' + tx.type + '">' + (isBuy ? '买入' : '卖出') + '</span></div>' +
      '<div class="hiMt">' + tx.date + (tx.note ? ' · ' + tx.note : '') + '</div></div></div>' +
      '<div class="hiR"><div class="hiAm">¥' + fmt(tx.amount) + '</div>' +
      '<div class="hiSh">' + fmt(tx.shares) + '份 @ ¥' + fmt(tx.price) + '</div></div></div>';
  }).join('');
}

// ===== CHART =====
function renderCharts() { renderLineChart(); renderPieChart(); }

function renderLineChart() {
  var canvas = $('chartCanvas');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var W = canvas.offsetWidth;
  canvas.width = W * dpr;
  canvas.height = 200 * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, 200);

  if (!state.transactions.length) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据，请先记录交易', W / 2, 100);
    return;
  }

  // Build data points from creation date to today
  var txs = state.transactions.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
  var startDate = state.account.createdAt;
  var endDate = new Date().toISOString().slice(0, 10);
  var points = [];
  var runningCash = state.account.initialAmount;
  var runningPos = {};
  var costBasis = {}; // asset -> total cost for gain calc

  txs.forEach(function(tx) {
    if (tx.type === 'buy') {
      runningCash -= tx.amount;
      if (!runningPos[tx.asset]) { runningPos[tx.asset] = { shares: 0, price: tx.price }; costBasis[tx.asset] = 0; }
      runningPos[tx.asset].shares += tx.shares;
      runningPos[tx.asset].price = tx.price;
      costBasis[tx.asset] = (costBasis[tx.asset] || 0) + tx.amount;
    } else {
      if (runningPos[tx.asset]) {
        var avgCost = runningPos[tx.asset].shares > 0 ? costBasis[tx.asset] / runningPos[tx.asset].shares : 0;
        runningPos[tx.asset].shares -= tx.shares;
        costBasis[tx.asset] -= avgCost * tx.shares;
        runningCash += tx.shares * tx.price;
        if (runningPos[tx.asset].shares <= 0.0001) { delete runningPos[tx.asset]; delete costBasis[tx.asset]; }
      }
    }
    var totalVal = runningCash;
    Object.keys(runningPos).forEach(function(a) { totalVal += runningPos[a].shares * runningPos[a].price; });
    points.push({ date: tx.date, value: totalVal });
  });

  // Add current point if no recent transaction
  var lastDate = txs.length ? txs[txs.length - 1].date : startDate;
  if (lastDate !== endDate) {
    // 直接用当前 state.positions 计算市值
    var curCash = state.account.currentCash;
    var curPosVal = 0;
    Object.keys(state.positions).forEach(function(a) {
      var price = state.currentPrices[a] || state.positions[a].currentPrice;
      var currency = state.positions[a].currency || 'USD';
      curPosVal += state.positions[a].totalShares * toCNY(price, currency);
    });
    points.push({ date: endDate, value: curCash + curPosVal });
  }

  if (points.length < 2) {
    ctx.fillStyle = '#94A3B8'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('至少需要2笔交易才能生成图表', W / 2, 100); return;
  }

  var minV = Math.min.apply(null, points.map(function(p) { return p.value; }));
  var maxV = Math.max.apply(null, points.map(function(p) { return p.value; }));
  var pad = { top: 15, right: 10, bottom: 30, left: 10 };
  var chartW = W - pad.left - pad.right;
  var chartH = 200 - pad.top - pad.bottom;

  // Grid lines
  ctx.strokeStyle = '#F1F5F9'; ctx.lineWidth = 1;
  for (var i = 0; i <= 3; i++) {
    var y = pad.top + (chartH / 3) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  // Line
  ctx.beginPath();
  points.forEach(function(p, i) {
    var x = pad.left + (i / (points.length - 1)) * chartW;
    var y = pad.top + chartH - ((p.value - minV) / (maxV === minV ? 1 : maxV - minV)) * chartH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  var grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0, 'rgba(79,70,229,0.3)');
  grad.addColorStop(1, 'rgba(79,70,229,0)');
  ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 2; ctx.stroke();

  // Fill
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.fillStyle = grad; ctx.fill();

  // Points
  points.forEach(function(p, i) {
    var x = pad.left + (i / (points.length - 1)) * chartW;
    var y = pad.top + chartH - ((p.value - minV) / (maxV === minV ? 1 : maxV - minV)) * chartH;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4F46E5'; ctx.fill();
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.date.slice(5), x, pad.top + chartH + 14);
  });

  // Labels
  ctx.fillStyle = '#94A3B8'; ctx.font = '10px sans-serif';
  ctx.fillText('¥' + fmt(minV), pad.left, pad.top + chartH + 6);
  ctx.textAlign = 'right';
  ctx.fillText('¥' + fmt(maxV), W - pad.right, pad.top + 12);
}

function renderPieChart() {
  var canvas = $('pieCanvas');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var W = canvas.offsetWidth;
  canvas.width = W * dpr;
  canvas.height = 220 * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, 220);

  // 直接用当前 state.positions 计算市值，不再调用 computePositions()
  Object.keys(state.positions).forEach(function(a) {
    var price = state.currentPrices[a] || state.positions[a].currentPrice;
    var currency = state.positions[a].currency || 'USD';
    pv += state.positions[a].totalShares * toCNY(price, currency);
  });
  var cash = state.account ? state.account.currentCash : 0;
  var total = pv + cash;

  if (total <= 0) {
    ctx.fillStyle = '#94A3B8'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('暂无数据', W / 2, 110); return;
  }

  var COLORS = ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
  var cx = W / 2, cy = 90, r = 70;
  var items = Object.keys(state.positions).map(function(a, i) {
    var price = state.positions[a].currentPrice;
    var currency = state.positions[a].currency || 'USD';
    var valCny = state.positions[a].totalShares * toCNY(price, currency);
    return { name: a, value: valCny, color: COLORS[i % COLORS.length] };
  });
  if (cash > 0) items.push({ name: '现金', value: cash, color: '#E2E8F0' });

  var startAngle = -Math.PI / 2;
  items.forEach(function(item) {
    var angle = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = item.color; ctx.fill();
    startAngle += angle;
  });

  // Legend
  var legendY = 175;
  var cols = 2;
  var itemW = W / cols;
  items.forEach(function(item, i) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var lx = col * itemW + 16;
    var ly = legendY + row * 18;
    ctx.fillStyle = item.color;
    ctx.fillRect(lx, ly - 7, 10, 10);
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.name + ' ' + fmtPct((item.value / total) * 100), lx + 14, ly + 2);
  });
}

// ===== REBALANCE =====
function renderRebalance() {
  // 直接用当前 state，不调用 computePositions（避免任何可能的污染）
  var s = getStats();
  $('rbTotal').textContent = '¥' + fmt(s.total);
  $('rbPos').textContent = '¥' + fmt(s.posValue);
  $('rbCash').textContent = '¥' + fmt(state.account.currentCash);

  var sel = $('rbSellAsset');
  var assets = Object.keys(state.positions);
  sel.innerHTML = '<option value="">— 选择标的 —</option>' + assets.map(function(a) { return '<option value="' + esc(a) + '">' + a + '</option>'; }).join('');
  $('rbSellSection').style.display = 'none';
  $('rbBuyAsset').value = '';
  $('rbBuyPrice').value = '';
  $('rbBuyAmount').value = '';
  $('rbSellShares').value = '';
  $('rbSellPrice').value = '';
}

function rbShowSell() {
  var asset = $('rbSellAsset').value;
  if (!asset) { $('rbSellSection').style.display = 'none'; return; }
  // 不再调用 computePositions()，直接用当前 state（避免覆盖用户输入）
  var pos = state.positions[asset];
  $('rbAvailShares').textContent = fmt(pos.totalShares);
  $('rbSellPrice').value = fmt(pos.currentPrice);
  $('rbSellSection').style.display = 'block';
}

function executeRebalance() {
  var sellAsset = $('rbSellAsset').value;
  var sellSharesRaw = $('rbSellShares').value;
  var sellPrice = parseFloat($('rbSellPrice').value);
  var buyAsset = $('rbBuyAsset').value.trim();
  var buyPrice = parseFloat($('rbBuyPrice').value);
  var buyAmount = parseFloat($('rbBuyAmount').value);
  var date = new Date().toISOString().slice(0, 10);

  // 不再调用 computePositions()，直接用当前 state（避免把旧数据覆盖掉新输入）
  // Sell
  if (sellAsset) {
    if (!sellPrice || sellPrice <= 0) { toast('请输入有效卖出价格'); return; }
    var pos = state.positions[sellAsset];
    var sellShares = sellSharesRaw ? parseFloat(sellSharesRaw) : pos.totalShares;
    if (sellShares > pos.totalShares + 0.0001) { toast('卖出份额不能超过持有份额'); return; }
    var proceeds = sellShares * sellPrice;
    var avgCost = pos.totalCost / pos.totalShares;
    var txCost = avgCost * sellShares;
    state.account.currentCash += proceeds;
    if (Math.abs(sellShares - pos.totalShares) < 0.0001) {
      delete state.positions[sellAsset];
    } else {
      pos.totalShares -= sellShares;
      pos.totalCost -= txCost;
    }
    state.transactions.push({ date: date, asset: sellAsset, type: 'sell', price: sellPrice, amount: proceeds, shares: sellShares, note: '调仓卖出' });
  }

  // Buy
  if (buyAsset) {
    if (!buyPrice || buyPrice <= 0) { toast('请输入有效买入价格'); return; }
    if (!buyAmount || buyAmount <= 0) { toast('请输入有效买入金额'); return; }
    if (buyAmount > state.account.currentCash + 0.01) { toast('现金不足！可用 ¥' + fmt(state.account.currentCash)); return; }
    var buyShares = buyAmount / buyPrice;
    state.account.currentCash -= buyAmount;
    if (!state.positions[buyAsset]) { state.positions[buyAsset] = { totalShares: 0, totalCost: 0, currentPrice: buyPrice }; }
    state.positions[buyAsset].totalShares += buyShares;
    state.positions[buyAsset].totalCost += buyAmount;
    state.positions[buyAsset].currentPrice = buyPrice;
    state.transactions.push({ date: date, asset: buyAsset, type: 'buy', price: buyPrice, amount: buyAmount, shares: buyShares, note: '调仓买入' });
  }

  if (!sellAsset && !buyAsset) { toast('请填写卖出或买入信息'); return; }

  save();
  updateHeader();
  renderRebalance();
  toast('调仓完成！');
}

// ===== EXPORT / IMPORT =====
function exportData() {
  var dataStr = JSON.stringify(state, null, 2);
  var blob = new Blob([dataStr], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '儿童投资备份_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('备份已下载！');
}

function importData(fileInput) {
  var file = fileInput.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.account || !Array.isArray(data.transactions)) {
        toast('文件格式错误！');
        return;
      }
      if (!confirm('导入将覆盖服务器上所有数据，确定继续？')) return;
      state.account = data.account;
      state.transactions = data.transactions || [];
      state.positions = data.positions || {};
      state.currentPrices = data.currentPrices || {};
      // 容错：如果 currentPrices 缺失，从 positions 读取当前价格
      if (!data.currentPrices && data.positions) {
        Object.keys(data.positions).forEach(function(a) {
          state.currentPrices[a] = data.positions[a].currentPrice || 0;
        });
      }
      save();
      location.reload();
    } catch (err) {
      toast('文件解析失败！');
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
}

// ===== ADD FUNDS =====
function openAddFundsModal() {
  openModal('💰 追加资金', '<div class="ir"><span>当前现金</span><span>¥' + fmt(state.account.currentCash) + '</span></div><div class="ir"><span>初始资金</span><span>¥' + fmt(state.account.initialAmount) + '</span></div><div class="fg mt8"><label class="lbl2">追加金额（元）</label><input type="number" id="addFundsAmount" placeholder="例如：500" min="1"></div><button class="btn btn-p w100 mt8" onclick="addFunds()">确认追加</button>');
}

function addFunds() {
  var amt = parseFloat($('addFundsAmount').value);
  if (!amt || amt <= 0) { toast('请输入有效的追加金额'); return; }
  state.account.currentCash += amt;
  state.account.initialAmount += amt;
  save();
  updateHeader();
  renderPositions();
  closeModal();
  toast('已追加 ¥' + fmt(amt) + '！');
}

// ===== WITHDRAW FUNDS =====
function openWithdrawModal() {
  openModal('🏧 提取资金', '<div class="ir"><span>当前现金</span><span>¥' + fmt(state.account.currentCash) + '</span></div><div class="ir"><span>初始资金</span><span>¥' + fmt(state.account.initialAmount) + '</span></div><div class="fg mt8"><label class="lbl2">提取金额（元）</label><input type="number" id="withdrawAmount" placeholder="例如：500" min="1"></div><div class="fg"><label class="lbl2">备注（可选）</label><input type="text" id="withdrawNote" placeholder="例如：取出零花钱"></div><button class="btn btn-d w100 mt8" onclick="withdrawFunds()">确认提取</button>');
}

function withdrawFunds() {
  var amt = parseFloat(document.getElementById('withdrawAmount').value);
  if (!amt || amt <= 0) { toast('请输入有效的提取金额'); return; }
  if (amt > state.account.currentCash + 0.01) { toast('现金不足！当前现金 ¥' + fmt(state.account.currentCash)); return; }
  state.account.currentCash -= amt;
  // 初始资金也减少（收益率基准下调）
  state.account.initialAmount = Math.max(0, state.account.initialAmount - amt);
  save();
  updateHeader();
  renderPositions();
  closeModal();
  toast('已提取 ¥' + fmt(amt));
}

// ===== WINDOW LOAD =====
window.addEventListener('DOMContentLoaded', load);
