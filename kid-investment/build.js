const fs = require('fs');
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>儿童投资小管家</title>
<style>
:root{--p:#4F46E5;--pl:#818CF8;--s:#10B981;--d:#EF4444;--bg:#F8FAFC;--c:#FFF;--t:#1E293B;--tl:#64748B;--b:#E2E8F0;--r:12px}
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
body{background:var(--bg);color:var(--t);min-height:100vh;padding-bottom:80px}
.hdr{background:linear-gradient(135deg,var(--p),var(--pl));color:#fff;padding:18px 16px 24px;border-radius:0 0 24px 24px}
.hdr-top{display:flex;justify-content:space-between;align-items:center}
h1{font-size:1.2rem;font-weight:700}
.hdr>p{font-size:.78rem;opacity:.85;margin-top:2px}
.rb2{font-size:.72rem;background:rgba(255,255,255,.2);border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer}
.hs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.hsItem{background:rgba(255,255,255,.15);border-radius:10px;padding:9px 6px;text-align:center}
.hsItem .lbl{font-size:.62rem;opacity:.85}
.hsItem .val{font-size:.95rem;font-weight:700;margin-top:2px}
.vpos{color:#6EE7B7}
.vneg{color:#FCA5A5}
.nav{display:flex;gap:6px;padding:10px 16px;overflow-x:auto;scrollbar-width:none}
.nav::-webkit-scrollbar{display:none}
.nb{flex-shrink:0;padding:5px 12px;border-radius:20px;border:1.5px solid var(--b);background:#fff;font-size:.78rem;font-weight:500;cursor:pointer;color:var(--tl);transition:all .2s;white-space:nowrap}
.nb.active{background:var(--p);color:#fff;border-color:var(--p)}
.ctn{padding:0 16px;max-width:480px;margin:0 auto}
.panel{display:none}
.panel.active{display:block}
.card{background:var(--c);border-radius:var(--r);padding:14px;margin-bottom:12px;border:1px solid var(--b)}
.ct{font-size:.7rem;color:var(--tl);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;font-weight:600}
.ss{text-align:center;padding-top:36px}
.ss .ico{font-size:3.2rem;margin-bottom:10px}
.ss h2{font-size:1.15rem;margin-bottom:5px}
.ss>p{color:var(--tl);font-size:.82rem;margin-bottom:18px}
.lbl2{display:block;font-size:.75rem;font-weight:600;color:var(--tl);margin-bottom:5px}
input,select{width:100%;padding:10px 12px;border:1.5px solid var(--b);border-radius:10px;font-size:.9rem;outline:none;transition:border-color .2s;background:#fff}
input:focus,select:focus{border-color:var(--p)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:10px 18px;border-radius:10px;border:none;font-size:.88rem;font-weight:600;cursor:pointer;transition:all .2s}
.btn-p{background:var(--p);color:#fff}
.btn-p:hover{background:#4338CA}
.btn-s{background:var(--s);color:#fff}
.btn-d{background:var(--d);color:#fff}
.btn-o{background:#fff;color:var(--p);border:1.5px solid var(--p)}
.btn-sm{padding:6px 12px;font-size:.78rem}
.w100{width:100%}
.mt8{margin-top:8px}
.fg{margin-bottom:11px}
.tt{display:flex;gap:8px;margin-bottom:13px}
.tt button{flex:1;padding:8px;border-radius:10px;border:1.5px solid var(--b);background:#fff;font-size:.85rem;font-weight:600;cursor:pointer;transition:all .2s}
.tt button.ab{background:#D1FAE5;border-color:var(--s);color:#065F46}
.tt button.as{background:#FEE2E2;border-color:var(--d);color:#991B1B}
.pc{background:#fff;border-radius:var(--r);padding:13px;margin-bottom:10px;border:1px solid var(--b)}
.pc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}
.pc-name{font-weight:700;font-size:.92rem}
.pb{font-size:.65rem;padding:2px 7px;border-radius:5px;font-weight:600}
.pb.pos{background:#D1FAE5;color:#065F46}
.pb.neg{background:#FEE2E2;color:#991B1B}
.pg{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.pi label{font-size:.65rem;color:var(--tl);display:block}
.pi span{font-size:.86rem;font-weight:600}
.pcActs{display:flex;gap:6px;margin-top:9px}
.pcActs button{flex:1;padding:5px;font-size:.75rem;border-radius:7px;border:1px solid var(--b);background:#fff;cursor:pointer;font-weight:500}
.hi{background:#fff;border-radius:var(--r);padding:11px;margin-bottom:8px;border:1px solid var(--b);display:flex;justify-content:space-between;align-items:center}
.hiL{display:flex;align-items:center;gap:10px}
.hiIco{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:.95rem}
.hiIco.buy{background:#D1FAE5}
.hiIco.sell{background:#FEE2E2}
.hiNm{font-weight:600;font-size:.86rem}
.hiMt{font-size:.7rem;color:var(--tl);margin-top:1px}
.hiR{text-align:right}
.hiAm{font-weight:700;font-size:.86rem}
.hiAm.pos{color:var(--s)}
.hiAm.neg{color:var(--d)}
.hiSh{font-size:.7rem;color:var(--tl)}
.rs{background:linear-gradient(135deg,#EEF2FF,#E0E7FF);border-radius:var(--r);padding:16px;margin-bottom:14px;text-align:center}
.rt{font-size:1.7rem;font-weight:800;color:var(--p)}
.rb{display:flex;justify-content:center;gap:18px;margin-top:8px}
.ri label{font-size:.65rem;color:var(--tl)}
.ri span{font-size:.9rem;font-weight:700;display:block}
.cw{background:#fff;border-radius:var(--r);padding:14px;border:1px solid var(--b);margin-bottom:12px}
canvas{width:100%!important}
.es{text-align:center;padding:32px 16px;color:var(--tl)}
.es .emoji{font-size:2.6rem;margin-bottom:9px}
.es p{font-size:.84rem}
.tab-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--b);display:flex;justify-content:space-around;padding:6px 0 14px;z-index:50}
.tab-item{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;padding:4px 10px;border-radius:10px;border:none;background:none;font-size:.62rem;color:var(--tl);transition:all .2s}
.tab-item.active{color:var(--p)}
.tab-item .icon{font-size:1.25rem}
.mo{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:flex-end;justify-content:center;z-index:100}
.mo.show{display:flex}
.modal{background:#fff;border-radius:18px 18px 0 0;padding:20px;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;animation:su .28s ease}
@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
.mh{width:36px;height:4px;background:var(--b);border-radius:2px;margin:0 auto 12px}
.modal h3{font-size:1rem;margin-bottom:12px}
.toast{position:fixed;bottom:76px;left:50%;transform:translateX(-50%);background:#1E293B;color:#fff;padding:9px 20px;border-radius:9px;font-size:.83rem;font-weight:500;z-index:200;opacity:0;transition:opacity .3s;pointer-events:none;white-space:nowrap}
.toast.show{opacity:1}
.pr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--b)}
.pr:last-child{border-bottom:none}
.pr label{font-size:.83rem;font-weight:600}
.pr input{width:85px;padding:5px 8px;border:1.5px solid var(--b);border-radius:8px;font-size:.83rem;text-align:right;outline:none}
.pr input:focus{border-color:var(--p)}
.ir{display:flex;justify-content:space-between;padding:7px 0;font-size:.85rem;border-bottom:1px solid var(--b)}
.ir:last-child{border-bottom:none}
.ir span:first-child{color:var(--tl)}
.ir span:last-child{font-weight:600}
.tag{display:inline-block;padding:2px 7px;border-radius:5px;font-size:.65rem;font-weight:600;margin-left:5px}
.tag.buy{background:#D1FAE5;color:#065F46}
.tag.sell{background:#FEE2E2;color:#991B1B}
.filter-bar{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.fbtn{padding:4px 10px;border-radius:16px;border:1.5px solid var(--b);background:#fff;font-size:.72rem;font-weight:500;cursor:pointer;color:var(--tl)}
.fbtn.active{background:var(--p);color:#fff;border-color:var(--p)}
</style>
</head>
<body>
<div class="hdr">
  <div class="hdr-top"><div><h1>📈 儿童投资小管家</h1><p id="accName">记录成长 · 培养财商</p></div><button class="rb2" onclick="confirmReset()">🔄 重置</button></div>
  <div class="hs"><div class="hsItem"><div class="lbl">总资产</div><div class="val" id="statTotal">—</div></div><div class="hsItem"><div class="lbl">总收益</div><div class="val" id="statGain">—</div></div><div class="hsItem"><div class="lbl">收益率</div><div class="val" id="statRate">—</div></div></div>
</div>
<div class="nav" id="mainNav" style="display:none">
  <button class="nb active" data-panel="positions">📊 持仓</button>
  <button class="nb" data-panel="trade">💰 交易</button>
  <button class="nb" data-panel="history">📋 记录</button>
  <button class="nb" data-panel="chart">📈 图表</button>
  <button class="nb" data-panel="rebalance">🔄 调仓</button>
</div>
<div class="ctn">
  <div class="panel active" id="panel-setup">
    <div class="ss"><div class="ico">🌱</div><h2>欢迎来到投资小管家</h2><p>设置投资账户，开启财商之旅！</p>
      <div style="text-align:left">
        <div class="fg"><label class="lbl2">账户名称</label><input type="text" id="sName" value="我的投资账户"></div>
        <div class="fg"><label class="lbl2">初始资金（元）</label><input type="number" id="sAmount" placeholder="例如：2000" min="1"></div>
        <div class="fg"><label class="lbl2">初始化日期</label><input type="date" id="sDate"></div>
        <button class="btn btn-p w100" onclick="initAccount()">🚀 开通账户</button>
      </div>
    </div>
  </div>
  <div class="panel" id="panel-positions">
    <div class="card"><div class="ct">💼 当前持仓</div><div id="positionsList"></div></div>
    <div class="card"><div class="ct">📌 批量更新价格</div><div id="priceUpdateList"></div><button class="btn btn-p w100 mt8" onclick="batchUpdatePrices()">💾 保存价格</button></div>
    <div class="card"><div class="ct">💡 账户概览</div><div id="accountOverview"></div></div>
  </div>
  <div class="panel" id="panel-trade">
    <div class="card">
      <div class="ct">📝 记录交易</div>
      <div class="tt"><button id="btnBuy" class="ab" onclick="setTradeType('buy')">📈 买入</button><button id="btnSell" onclick="setTradeType('sell')">📉 卖出</button></div>
      <div class="fg"><label class="lbl2">交易日期</label><input type="date" id="tDate"></div>
      <div class="fg"><label class="lbl2">投资标的</label><input type="text" id="tAsset" placeholder="例如：纳斯达克ETF"></div>
      <div class="fg"><label class="lbl2">交易价格（元）</label><input type="number" id="tPrice" placeholder="例如：1.25" step="0.001"></div>
      <div class="fg"><label class="lbl2">交易金额（元）</label><input type="number" id="tAmount" placeholder="例如：500"></div>
      <div class="fg"><label class="lbl2">备注（可选）</label><input type="text" id="tNote" placeholder=""></div>
      <button class="btn btn-p w100" onclick="submitTrade()">✅ 确认交易</button>
    </div>
    <div id="sellInfo" style="display:none" class="card"><div class="ct">📉 卖出信息</div><div id="sellPositionInfo"></div></div>
  </div>
  <div class="panel" id="panel-history"><div class="filter-bar" id="filterBar"></div><div id="historyList"></div></div>
  <div class="panel" id="panel-chart">
    <div class="cw"><div class="ct">📈 收益曲线</div><canvas id="chartCanvas" height="200"></canvas></div>
    <div class="cw"><div class="ct">🥧 持仓分布</div><canvas id="pieCanvas" height="220"></canvas></div>
  </div>
  <div class="panel" id="panel-rebalance">
    <div class="rs"><div class="rt" id="rbTotal">—</div><div class="rb"><div class="ri"><label>持仓市值</label><span id="rbPos">—</span></div><div class="ri"><label>现金余额</label><span id="rbCash">—</span></div></div></div>
    <div class="card"><div class="ct">🔄 执行调仓</div>
      <div class="fg"><label class="lbl2">卖出标的</label><select id="rbSellAsset" onchange="rbShowSell()"><option value="">— 选择标的 —</option></select></div>
      <div id="rbSellSection" style="display:none">
        <div class="fg"><label class="lbl2">卖出份额</label><input type="number" id="rbSellShares" placeholder="留空则全部卖出"> <span style="font-size:.78rem;color:var(--tl)">可用：<span id="rbAvailShares">0</span>份</span></div>
        <div class="fg"><label class="lbl2">卖出价格</label><input type="number" id="rbSellPrice" step="0.001"></div>
      </div>
      <div class="fg"><label class="lbl2">买入标的</label><input type="text" id="rbBuyAsset" placeholder="新标的名称"></div>
      <div class="fg"><label class="lbl2">买入价格</label><input type="number" id="rbBuyPrice" step="0.001"></div>
      <div class="fg"><label class="lbl2">买入金额</label><input type="number" id="rbBuyAmount" placeholder="例如：500"></div>
