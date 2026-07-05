const DATA_PATHS = {
  sectors: "data/sectors.json",
  companies: "data/companies.json",
  sources: "data/sources.json",
  lessons: "data/lessons.json"
};

const q = (s, root=document) => root.querySelector(s);
const params = new URLSearchParams(location.search);

async function loadData(){
  const entries = await Promise.all(Object.entries(DATA_PATHS).map(async ([key,path]) => [key, await fetch(path).then(r => r.json())]));
  return Object.fromEntries(entries);
}

function esc(text){ return String(text ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function tags(items, cls=""){ return (items||[]).map(x => `<span class="tag ${cls}">${esc(x)}</span>`).join(""); }
function linkCompany(code, companies){
  const c = companies.find(x => x.code === code);
  return c ? `<a class="button" href="company.html?code=${c.code}">${c.name} ${c.code}</a>` : `<span class="tag muted-tag">待建档 ${code}</span>`;
}
function sourceLinks(ids, sources){ return (ids||[]).map(id => sources.find(s => s.id===id)).filter(Boolean).map(s => `<div class="source"><a href="${s.url}" target="_blank" rel="noreferrer">${s.name}</a><p class="small">${s.type}｜${s.note}</p></div>`).join(""); }

function statusClass(status){
  if(status.includes("高景气")) return "status-high";
  if(status.includes("风险") || status.includes("出清")) return "status-risk";
  if(status.includes("主题")) return "status-theme";
  return "status-watch";
}

function renderHome(data){
  const {sectors, companies, sources, lessons} = data;
  q("#dashboard").innerHTML = `
    <h2>本期市场研究终端</h2>
    <div class="grid">
      <div class="card metric"><div class="label">当前核心主线</div><div class="value">AI硬件 / 国产替代</div><div class="note">订单兑现较应用层更清晰</div></div>
      <div class="card metric"><div class="label">主要风险</div><div class="value">估值拥挤</div><div class="note">高景气方向也需要业绩继续超预期</div></div>
      <div class="card metric"><div class="label">防守方向</div><div class="value">红利资产</div><div class="note">银行、电力、煤炭、运营商</div></div>
      <div class="card metric"><div class="label">观察方向</div><div class="value">困境反转</div><div class="note">光伏、医药、部分消费</div></div>
    </div>
    <div class="quote"><strong>覆盖进度：</strong>本版已搭建 ${sectors.length} 个行业框架、${companies.length} 个公司深度卡片。行业页中显示“待建档”的代码代表已列入观察池，但还没有完成单公司研究页。</div>
    <h3>研究流程</h3>
    <div class="flow">
      <div class="node"><strong>行业常识</strong><span>谁赚谁的钱</span></div>
      <div class="node"><strong>景气判断</strong><span>需求/供给/价格</span></div>
      <div class="node"><strong>财报验证</strong><span>收入/毛利/现金流</span></div>
      <div class="node"><strong>市场定价</strong><span>估值/资金/预期</span></div>
      <div class="node"><strong>反证跟踪</strong><span>什么说明错了</span></div>
    </div>`;

  q("#sector-map").innerHTML = `
    <h2>行业地图与研究状态</h2>
    <p class="muted">研究状态不是投资建议，而是说明这个方向当前最适合用什么视角研究。</p>
    <table>
      <thead><tr><th>行业</th><th>研究状态</th><th>景气度</th><th>估值压力</th><th>盈利兑现</th><th>一句话判断</th></tr></thead>
      <tbody>${sectors.map(s => `<tr>
        <td><a href="sector.html?id=${s.id}"><strong>${s.name}</strong></a></td>
        <td class="${statusClass(s.status)}">${s.status}</td>
        <td>${s.heat}</td><td>${s.valuationPressure}</td><td>${s.profitDelivery}</td>
        <td>${s.oneLine}</td>
      </tr>`).join("")}</tbody>
    </table>`;

  q("#company-lab").innerHTML = `
    <h2>公司研究库</h2>
    <p>先覆盖代表公司和观察池，后续逐步扩展。公司页统一回答：主营、赚钱方式、论点、依据、反证、情景推演。</p>
    <input class="search" id="companySearch" placeholder="搜索公司、代码、行业、标签，如 中芯国际 / AI硬件 / 银行">
    <div id="companyList" class="grid-3">${renderCompanyCards(companies)}</div>`;

  q("#method").innerHTML = `
    <h2>研究学院入口</h2>
    <div class="grid-3">${lessons.slice(0,6).map(l => `<a class="card" href="learn.html#${l.id}"><strong>${l.title}</strong><p>${l.summary}</p></a>`).join("")}</div>
    <div class="section-actions"><a class="button" href="learn.html">进入研究学院</a></div>`;

  q("#sources").innerHTML = `
    <h2>来源体系</h2>
    <p>来源按可信度分层：A类为公告和财报，B类为官方/协会，C类为数据平台，D类为研究和媒体观点。</p>
    <div class="grid-2">${sources.map(s => `<div class="source"><a href="${s.url}" target="_blank" rel="noreferrer">${s.name}</a><p class="small">${s.grade}｜${s.type}｜${s.note}</p></div>`).join("")}</div>`;

  q("#companySearch").addEventListener("input", e => {
    const text = e.target.value.trim().toLowerCase();
    const filtered = companies.filter(c => [c.name,c.code,c.type,c.chain,...(c.sectors||[]),...(c.tags||[])].join(" ").toLowerCase().includes(text));
    q("#companyList").innerHTML = renderCompanyCards(filtered);
  });
}

function renderCompanyCards(companies){
  return companies.map(c => `<a class="card" href="company.html?code=${c.code}">
    <strong>${c.name} ${c.code}</strong>
    <p>${c.chain}｜${c.type}</p>
    <div class="pill-row">${tags(c.tags?.slice(0,3)||[])}</div>
    <p class="small">${c.thesis}</p>
  </a>`).join("");
}

function renderSector(data){
  const id = params.get("id") || "ai-hardware";
  const s = data.sectors.find(x => x.id === id);
  if(!s){ q("#sector-title").textContent = "未找到行业"; q("#sector-page").innerHTML = "<p>这个行业暂未收录。</p>"; return; }
  document.title = `${s.name} 行业研究`;
  q("#sector-title").textContent = s.name;
  q("#sector-subtitle").textContent = `${s.status}｜${s.oneLine}`;
  q("#sector-page").innerHTML = `
    <h2 id="industry-common">行业教材：先理解它如何运转</h2>
    <div class="quote"><strong>一句话解释：</strong>${s.explain}</div>
    <div class="flow">${s.valueChain.map(n => `<div class="node"><strong>${n.name}</strong><span>${n.note}</span></div>`).join("")}</div>
    <div class="grid-2">
      <div class="card"><strong>靠什么赚钱</strong><p>${s.profitModel}</p></div>
      <div class="card"><strong>成本和毛利率由什么决定</strong><p>${s.marginDrivers}</p></div>
      <div class="card"><strong>需求来自哪里</strong><p>${s.demand}</p></div>
      <div class="card"><strong>供给约束在哪里</strong><p>${s.supply}</p></div>
    </div>
    <h2 id="pricing">投资框架：市场如何给它定价</h2>
    <table><thead><tr><th>为什么涨</th><th>为什么跌</th><th>领先指标</th><th>容易骗人的指标</th></tr></thead>
    <tbody><tr><td>${s.whyRise}</td><td>${s.whyFall}</td><td>${tags(s.leadingIndicators)}</td><td>${tags(s.traps,"risk")}</td></tr></tbody></table>
    <h2>行业指标字典</h2>
    <table><thead><tr><th>指标</th><th>为什么重要</th></tr></thead><tbody>${s.indicatorDictionary.map(i=>`<tr><td>${i.name}</td><td>${i.meaning}</td></tr>`).join("")}</tbody></table>
    <h2 id="companies">代表公司与观察池</h2>
    <div class="section-actions">${s.companies.map(code => linkCompany(code, data.companies)).join("")}</div>
    <h2 id="scenario">未来情景推演</h2>
    <table><thead><tr><th>乐观</th><th>中性</th><th>悲观</th></tr></thead><tbody><tr><td>${s.scenarios.bull}</td><td>${s.scenarios.base}</td><td>${s.scenarios.bear}</td></tr></tbody></table>
    <h2>信息来源</h2>${sourceLinks(s.sources, data.sources)}
  `;
}

function renderCompany(data){
  const code = params.get("code") || "688981";
  const c = data.companies.find(x => x.code === code);
  if(!c){ q("#company-title").textContent = "未找到公司"; q("#company-page").innerHTML = "<p>这个公司暂未收录。</p>"; return; }
  document.title = `${c.name} 公司研究`;
  q("#company-title").textContent = `${c.name}（${c.code}）`;
  q("#company-subtitle").textContent = `${c.chain}｜${c.type}｜${c.researchStatus}`;
  q("#company-page").innerHTML = `
    <h2>公司快速卡片</h2>
    <div class="grid">
      <div class="card"><strong>股票代码</strong>${c.code}</div><div class="card"><strong>股票类型</strong>${c.type}</div>
      <div class="card"><strong>产业位置</strong>${c.chain}</div><div class="card"><strong>研究状态</strong>${c.researchStatus}</div>
    </div>
    <h2 id="business">业务与赚钱方式</h2>
    <p>${c.business}</p><p>${c.profitLogic}</p>
    <h2 id="financial">财务质量应该怎么看</h2>
    <table><thead><tr><th>关键指标</th><th>原因</th></tr></thead><tbody>${c.financialChecks.map(i=>`<tr><td>${i.name}</td><td>${i.reason}</td></tr>`).join("")}</tbody></table>
    <h2 id="thesis">核心论点、依据与反证</h2>
    <div class="quote"><strong>核心论点：</strong>${c.thesis}</div>
    <table><thead><tr><th>支持依据</th><th>反证条件</th><th>跟踪动作</th></tr></thead><tbody><tr>
      <td>${c.evidence.map(x=>`<p>${x}</p>`).join("")}</td>
      <td>${c.counter.map(x=>`<p>${x}</p>`).join("")}</td>
      <td>${c.track.map(x=>`<span class="tag">${x}</span>`).join("")}</td>
    </tr></tbody></table>
    <h2 id="scenario">未来情景推演</h2>
    <table><thead><tr><th>乐观</th><th>中性</th><th>悲观</th></tr></thead><tbody><tr><td>${c.scenarios.bull}</td><td>${c.scenarios.base}</td><td>${c.scenarios.bear}</td></tr></tbody></table>
    <h2>同业和行业入口</h2>
    <div class="section-actions">${(c.sectors||[]).map(id => {const s=data.sectors.find(x=>x.id===id); return s ? `<a class="button" href="sector.html?id=${s.id}">${s.name}</a>` : "";}).join("")}</div>
    <h2 id="sources">信息来源与核验路径</h2>${sourceLinks(c.sources, data.sources)}
  `;
}

function renderLearn(data){
  q("#learn-page").innerHTML = `
    <h2 id="lessons">研究课程</h2>
    ${data.lessons.map(l => `<section id="${l.id}" class="card"><h3>${l.title}</h3><p>${l.summary}</p><table><thead><tr><th>核心要点</th><th>实战问题</th></tr></thead><tbody><tr><td>${l.points.map(x=>`<p>${x}</p>`).join("")}</td><td>${l.questions.map(x=>`<p>${x}</p>`).join("")}</td></tr></tbody></table></section>`).join("")}
    <h2 id="dictionary">行业指标字典</h2>
    <p>指标字典放在各行业页内，后续会抽取成可搜索数据库。</p>`;
}

loadData().then(data => {
  const page = document.body.dataset.page;
  if(page === "home") renderHome(data);
  if(page === "sector") renderSector(data);
  if(page === "company") renderCompany(data);
  if(page === "learn") renderLearn(data);
}).catch(err => {
  document.body.insertAdjacentHTML("beforeend", `<main class="wrap"><section class="panel"><h2>数据加载失败</h2><p>${esc(err.message)}</p></section></main>`);
});
