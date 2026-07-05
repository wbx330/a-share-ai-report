const DATA_PATHS = {
  sectors: "data/sectors.json",
  companies: "data/companies.json",
  companyUniverse: "data/company_universe.json",
  sources: "data/sources.json",
  lessons: "data/lessons.json"
};

const q = (s, root=document) => root.querySelector(s);
const params = new URLSearchParams(location.search);

async function loadData(){
  const entries = await Promise.all(Object.entries(DATA_PATHS).map(async ([key,path]) => [key, await fetch(path).then(r => r.json())]));
  const data = Object.fromEntries(entries);
  const seen = new Set((data.companies || []).map(c => c.code || c.name));
  data.companies = [
    ...(data.companies || []),
    ...(data.companyUniverse || []).filter(c => !seen.has(c.code || c.name))
  ].map(normalizeCompany);
  return data;
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

const CATEGORY_MODELS = {
  "ai-optical": {
    type: "AI硬件成长",
    chain: "光模块/通信设备",
    researchStatus: "高景气但估值敏感",
    business: c => `${c.name}处在光通信和数据中心互联链条，研究重点不是“有没有AI概念”，而是产品是否进入高速率光模块、光器件或通信设备升级周期。`,
    profitLogic: "赚钱逻辑来自高速率产品升级、海外和国内云厂商需求、客户认证、良率提升和产能利用率。速率越高、可靠性要求越高，优质供应商越容易获得毛利率和订单弹性。",
    financialChecks: [
      {name:"高速产品占比", reason:"判断AI数据中心需求是否真正进入收入。"},
      {name:"毛利率", reason:"验证高端产品占比和价格竞争。"},
      {name:"库存和应收", reason:"防止订单预期过热但回款和出货质量不足。"},
      {name:"海外收入和汇率", reason:"光模块链条常受海外客户和汇率影响。"}
    ],
    evidence:["AI训练和推理需要服务器、交换机和GPU之间高速互联，光模块是数据中心网络扩容的关键环节。","A股光模块优质标的稀缺，资金容易集中定价。","产品代际升级会带来单价和盈利弹性。"],
    counter:["海外大客户削减资本开支或砍单。","价格竞争导致毛利率持续下滑。","存货和应收扩张快于收入，说明出货质量可能变差。"],
    track:["800G/1.6T订单","海外客户","毛利率","库存","经营现金流"],
    scenarios:{bull:"AI资本开支继续超预期，高速产品放量且毛利率稳定。",base:"订单增长但估值偏高，股价震荡消化。",bear:"客户砍单或降价，估值和利润同步承压。"}
  },
  "pcb": {
    type: "AI硬件制造",
    chain: "PCB/电子元件",
    researchStatus: "景气兑现与扩产验证",
    business: c => `${c.name}处在PCB、电子元件或材料链条，核心问题是有没有切入AI服务器、交换机、汽车电子或高端消费电子供应链。`,
    profitLogic: "利润来自高频高速材料、更多层数、更高良率要求和客户结构升级。普通PCB和AI服务器/交换机PCB价值量差异很大，产品结构决定毛利率。",
    financialChecks:[{name:"高端板收入占比",reason:"判断AI服务器链条贡献。"},{name:"毛利率",reason:"验证产品结构升级是否有效。"},{name:"在建工程/产能",reason:"观察扩产后能否消化。"},{name:"客户结构",reason:"判断是否进入核心供应链。"}],
    evidence:["AI服务器和高速交换机提升PCB层数、材料和良率要求。","客户认证和良率构成制造壁垒。","产品结构升级通常先体现在毛利率。"],
    counter:["扩产后利用率不足。","高端订单占比没有提升。","原材料或价格竞争压缩毛利率。"],
    track:["AI服务器板","HDI/高频高速材料","毛利率","产能利用率","客户结构"],
    scenarios:{bull:"AI服务器和汽车电子订单持续增长，毛利率稳定。",base:"订单增长但估值需要业绩消化。",bear:"需求回落或扩产过快，毛利率下行。"}
  },
  "semiconductor": {
    type: "国产替代/半导体",
    chain: "设备/制造/材料/设计/封测",
    researchStatus: "长期主线但周期波动",
    business: c => `${c.name}处在半导体链条，必须先分清它属于设备、材料、制造、设计、封测还是存储，不同环节的验证周期和估值方法完全不同。`,
    profitLogic: "设备靠订单、验收和复购；材料靠客户认证后的持续消耗；制造靠产能利用率和产品结构；设计和存储靠产品周期、价格和库存。",
    financialChecks:[{name:"合同负债/订单",reason:"设备和项目型公司前置指标。"},{name:"客户认证",reason:"材料和设备从样品走向量产的关键。"},{name:"毛利率",reason:"判断壁垒和竞争格局。"},{name:"研发费用",reason:"半导体长期竞争力核心。"},{name:"库存",reason:"存储和设计公司周期风险。"}],
    evidence:["国产替代和供应链安全提供长期需求。","半导体设备材料验证周期长，通过后粘性较强。","AI推动先进封装、存储和高端制造需求。"],
    counter:["下游资本开支放缓。","验证进度慢于预期。","收入增长但现金流和毛利率恶化。"],
    track:["订单","合同负债","客户验证","毛利率","库存/价格"],
    scenarios:{bull:"国产验证加速，AI和存储周期共振。",base:"长期逻辑成立但个股分化。",bear:"周期下行或验证不及预期，估值回落。"}
  },
  "ai-server": {
    type: "AI服务器/计算机设备",
    chain: "服务器/算力基础设施",
    researchStatus: "订单兑现和毛利率验证",
    business: c => `${c.name}处在服务器、算力设备、安防硬件或政企计算机设备链条，研究重点是AI订单能否带来真实收入和利润。`,
    profitLogic: "赚钱来自服务器整机、政企项目、国产算力适配、硬件交付和运维服务，但集成类业务毛利率可能低，需要看订单质量。",
    financialChecks:[{name:"服务器/算力订单",reason:"收入前置线索。"},{name:"毛利率",reason:"防止只增收不增利。"},{name:"应收账款",reason:"政企项目回款周期常较长。"},{name:"经营现金流",reason:"判断项目质量。"}],
    evidence:["AI训练和推理需要服务器、存储、网络和安全基础设施。","国产算力和政企数字化提供本土需求。","项目订单一旦落地会较快进入收入。"],
    counter:["订单毛利率低。","回款慢导致现金流差。","政企需求或预算放缓。"],
    track:["服务器订单","国产算力适配","毛利率","应收账款","现金流"],
    scenarios:{bull:"AI服务器订单超预期，毛利率改善。",base:"收入增长但盈利弹性有限。",bear:"订单低毛利或回款恶化。"}
  },
  "ai-software": {
    type: "AI应用/软件服务",
    chain: "软件/SaaS/行业应用",
    researchStatus: "长期空间大但盈利待验证",
    business: c => `${c.name}处在软件或AI应用链条，不能只看产品发布，要看客户是否愿意为AI功能持续付费。`,
    profitLogic: "利润来自订阅、项目交付、增值模块、行业数据和续费。AI应用能否赚钱，取决于付费率、续费率、客单价和算力成本。",
    financialChecks:[{name:"订阅/ARR/合同负债",reason:"验证客户付费和续费。"},{name:"毛利率",reason:"算力成本会侵蚀利润。"},{name:"销售费用率",reason:"防止获客成本过高。"},{name:"经营现金流",reason:"政企软件容易收入确认和回款错配。"}],
    evidence:["AI应用长期能提高办公、金融、工业和安全效率。","拥有行业数据、渠道和客户粘性的公司更容易商业化。","如果AI功能能提价或提升续费率，利润弹性会显现。"],
    counter:["发布会多但收入少。","AI功能免费送，不能形成付费。","算力成本上升导致毛利率下降。"],
    track:["付费率","续费率","ARR/合同负债","算力成本","净利润"],
    scenarios:{bull:"AI产品形成付费闭环，续费率和客单价提升。",base:"产品落地但利润兑现慢。",bear:"收入不增长、费用扩大，估值回落。"}
  },
  "robotics": {
    type: "机器人/通用设备",
    chain: "执行器/减速器/丝杠/自动化",
    researchStatus: "主题热但需量产验证",
    business: c => `${c.name}处在机器人、通用设备或精密制造链条，关键是能否从样机、送样走到客户定点和量产收入。`,
    profitLogic: "利润来自核心零部件价值量、精密制造能力、客户认证和量产规模。汽车零部件和工业自动化能力可能迁移到机器人场景。",
    financialChecks:[{name:"客户定点/小批量订单",reason:"从主题到收入的关键证据。"},{name:"机器人业务占比",reason:"避免主营和题材错配。"},{name:"毛利率",reason:"验证零部件壁垒。"},{name:"资本开支",reason:"量产前扩产要看订单支撑。"}],
    evidence:["AI让机器人具备更强感知和决策能力，执行器和精密零部件价值被重估。","量产需要稳定供应链和成本控制，制造能力重要。","汽车零部件供应链经验可迁移到机器人零部件。"],
    counter:["只有样机没有定点。","收入占比极低。","客户集中或量产时间推迟。"],
    track:["客户定点","小批量收入","执行器/丝杠/减速器","单机价值量","毛利率"],
    scenarios:{bull:"核心客户定点和量产超预期。",base:"主题活跃但财务兑现慢。",bear:"量产推迟或收入占比过低。"}
  },
  "auto-parts": {
    type: "汽车零部件/智能驾驶",
    chain: "汽车零部件/热管理/智能化",
    researchStatus: "主业稳健叠加新场景期权",
    business: c => `${c.name}处在汽车零部件或智能驾驶链条，研究重点是新能源客户、平台化供货和机器人/智能化延伸。`,
    profitLogic: "利润来自客户放量、单车价值量提升、成本控制和平台化供货。若切入机器人或智能驾驶，估值可能从传统零部件向成长制造重估。",
    financialChecks:[{name:"客户结构",reason:"新能源车和核心客户放量很重要。"},{name:"毛利率",reason:"价格年降会压缩利润。"},{name:"资本开支",reason:"扩产要匹配订单。"},{name:"机器人/智能化收入",reason:"判断新故事是否真实。"}],
    evidence:["新能源车和智能驾驶提升零部件价值量。","汽车供应链具备精密制造和大客户认证能力。","部分能力可迁移至机器人执行器和结构件。"],
    counter:["主机厂价格压力。","客户销量不及预期。","新业务停留在概念阶段。"],
    track:["客户销量","单车价值量","毛利率","新业务订单","现金流"],
    scenarios:{bull:"新能源客户放量并切入新场景。",base:"主业稳健增长，新业务逐步验证。",bear:"价格年降和客户波动压制利润。"}
  },
  "power-grid": {
    type: "电网/电力设备",
    chain: "电网设备/自动化/特高压",
    researchStatus: "稳健基础设施映射",
    business: c => `${c.name}处在电网设备、电力自动化或电力元器件链条，核心是电网投资、数据中心用电和新能源消纳带来的升级需求。`,
    profitLogic: "利润来自电网招标、特高压、配网自动化、继电保护、变压器、元器件和项目交付。该方向弹性可能不如AI硬件，但现金流和订单确定性更强。",
    financialChecks:[{name:"中标/订单",reason:"收入前置指标。"},{name:"应收账款",reason:"工程项目回款周期要关注。"},{name:"毛利率",reason:"招标价格和产品结构影响利润。"},{name:"经营现金流",reason:"判断项目质量。"}],
    evidence:["AI数据中心、新能源、储能和电动车提升电力系统复杂度。","电网自动化和保护设备是安全运行刚需。","龙头公司资质和客户壁垒较高。"],
    counter:["电网投资节奏放缓。","应收账款扩大。","招标价格下降压缩毛利率。"],
    track:["电网招标","特高压/配网","订单","应收账款","毛利率"],
    scenarios:{bull:"电网投资上行，订单和现金流改善。",base:"稳健增长，估值温和。",bear:"招标放缓或回款压力上升。"}
  },
  "battery": {
    type: "电池/储能",
    chain: "动力电池/储能/材料",
    researchStatus: "行业出清中的龙头和材料弹性",
    business: c => `${c.name}处在锂电、储能或材料设备链条，核心是价格战后谁能保住份额、毛利率和现金流。`,
    profitLogic: "利润来自规模优势、技术迭代、客户绑定、材料价格变化和储能需求。行业供给过剩时，要优先看成本曲线和现金流。",
    financialChecks:[{name:"毛利率",reason:"价格战最直接影响。"},{name:"库存/减值",reason:"材料和电池链条周期风险。"},{name:"海外/储能收入",reason:"新增增长来源。"},{name:"现金流",reason:"出清期生存能力。"}],
    evidence:["新能源车和储能长期需求仍在。","供给出清后龙头可能获得更高份额。","储能海外需求提供第二曲线。"],
    counter:["价格战持续。","库存减值。","海外政策和贸易摩擦。"],
    track:["毛利率","储能订单","海外收入","库存","现金流"],
    scenarios:{bull:"价格企稳，储能和海外超预期。",base:"行业出清，龙头份额稳定。",bear:"价格战加剧，盈利继续下行。"}
  },
  "pv": {
    type: "光伏反转",
    chain: "逆变器/组件/设备/材料",
    researchStatus: "低位反转需等待证据",
    business: c => `${c.name}处在光伏设备、逆变器、组件或材料链条，研究重点是产能出清和价格企稳，而不是单纯看估值低。`,
    profitLogic: "利润来自出货量、价格、成本优势、海外渠道和设备更新。供给过剩阶段，低成本和海外能力决定生存质量。",
    financialChecks:[{name:"价格和毛利率",reason:"判断出清是否开始。"},{name:"库存/减值",reason:"防止账面利润失真。"},{name:"海外收入",reason:"逆变器和部分设备的重要增长来源。"},{name:"现金流",reason:"低谷期抗风险能力。"}],
    evidence:["全球新能源装机仍有长期需求。","价格和库存若企稳，低估值公司可能修复。","设备和逆变器环节可能先于组件修复。"],
    counter:["产能继续过剩。","价格战加剧。","海外贸易壁垒和库存压力。"],
    track:["组件价格","库存","毛利率","海外订单","现金流"],
    scenarios:{bull:"价格企稳和供给出清共振。",base:"低位震荡等待数据改善。",bear:"供给过剩持续，利润下滑。"}
  },
  "defense": {
    type: "军工/低空/卫星",
    chain: "军工电子/航空航天/低空经济",
    researchStatus: "政策催化与订单验证并重",
    business: c => `${c.name}处在军工、低空经济、卫星或军工电子链条，研究重点是订单节奏、产品交付和政策落地。`,
    profitLogic: "利润来自型号放量、军品配套、电子元器件、无人装备、卫星和低空基础设施。订单不透明是这类公司的研究难点。",
    financialChecks:[{name:"合同负债/存货",reason:"订单和备货线索。"},{name:"应收账款",reason:"军工回款周期常较长。"},{name:"毛利率",reason:"型号和产品结构影响利润。"},{name:"研发投入",reason:"型号迭代和壁垒来源。"}],
    evidence:["低空经济、卫星互联网和无人装备具备政策催化。","军工电子和连接器等配套环节更容易出现订单兑现。","国防信息化长期需求明确。"],
    counter:["订单节奏低于预期。","应收和存货过快扩张。","政策落地慢或估值提前透支。"],
    track:["订单","合同负债","低空政策","卫星互联网","应收账款"],
    scenarios:{bull:"订单和政策落地共振。",base:"主题活跃，业绩逐步验证。",bear:"订单不及预期导致估值回落。"}
  },
  "metals": {
    type: "资源周期",
    chain: "黄金/铜/有色/稀土",
    researchStatus: "商品价格和成本曲线驱动",
    business: c => `${c.name}处在资源品链条，核心不是收入增速，而是商品价格、资源储量、成本曲线和资本开支回报。`,
    profitLogic: "利润来自商品价格上行、低成本产能、资源储量、产量释放和汇率。资源股要看盈利中枢，而不是单年高利润。",
    financialChecks:[{name:"商品价格",reason:"利润核心变量。"},{name:"单位成本",reason:"抗周期能力。"},{name:"产量/储量",reason:"长期价值基础。"},{name:"资本开支",reason:"未来产量和现金流。"}],
    evidence:["黄金受实际利率和避险需求影响。","铜受电网、AI数据中心和能源转型支撑。","稀土受新能源和高端制造影响。"],
    counter:["全球需求走弱。","商品价格回落。","海外项目和资本开支风险。"],
    track:["金价","铜价","稀土价格","单位成本","资源储量"],
    scenarios:{bull:"降息、供给约束和需求上行共振。",base:"商品高位震荡，龙头靠成本优势支撑。",bear:"需求走弱导致商品回落。"}
  },
  "medicine": {
    type: "医药创新/医疗服务",
    chain: "创新药/CXO/器械/医疗服务",
    researchStatus: "低位修复但需专业验证",
    business: c => `${c.name}处在医药创新、医疗服务或器械链条，研究重点是管线、临床节点、商业化能力和政策风险。`,
    profitLogic: "利润来自核心品种销售、创新药授权、CXO订单、器械放量和医疗服务恢复。医药不能只看估值低，要看现金储备和研发成功率。",
    financialChecks:[{name:"研发管线/临床节点",reason:"创新药估值核心。"},{name:"销售费用率",reason:"商业化效率。"},{name:"现金储备",reason:"研发周期长，需要资金支撑。"},{name:"政策影响",reason:"集采和医保谈判会影响价格。"}],
    evidence:["创新药出海和授权交易可能带来估值修复。","医疗器械国产替代仍有空间。","优质品牌中药和医疗服务有现金流基础。"],
    counter:["研发失败。","集采降价超预期。","海外审批或商业化不及预期。"],
    track:["临床节点","授权交易","销售增长","现金储备","政策变化"],
    scenarios:{bull:"创新药出海和政策边际改善。",base:"板块分化，优质管线和现金流胜出。",bear:"研发失败或政策压制继续。"}
  },
  "consumer-electronics": {
    type: "消费电子/AI终端",
    chain: "AI手机/PC/智能眼镜/零部件",
    researchStatus: "端侧AI换机周期观察",
    business: c => `${c.name}处在消费电子、光学、连接器、代工或数据设备链条，关键是AI终端能否带来真实换机和零部件价值提升。`,
    profitLogic: "利润来自大客户订单、单机价值量提升、产能利用率、良率和产品结构。消费电子公司常有客户集中和周期波动。",
    financialChecks:[{name:"大客户订单",reason:"消费电子收入弹性来源。"},{name:"毛利率",reason:"判断产品升级和价格压力。"},{name:"库存",reason:"换机周期误判会带来库存风险。"},{name:"资本开支",reason:"扩产要看客户需求。"}],
    evidence:["AI手机、AI PC、智能眼镜可能带来新换机周期。","光学、连接器、散热、结构件等零部件价值量可能提升。","全球大客户供应链具备规模壁垒。"],
    counter:["终端需求不及预期。","客户砍单。","价格竞争导致毛利率下滑。"],
    track:["AI终端销量","大客户订单","毛利率","库存","汇率"],
    scenarios:{bull:"AI终端拉动换机和价值量提升。",base:"需求温和修复，个股分化。",bear:"换机不及预期，库存压力上升。"}
  },
  "home-appliance": {
    type: "家电/机器人交叉",
    chain: "家电/热管理/机器人零部件",
    researchStatus: "现金流稳健叠加新业务",
    business: c => `${c.name}处在家电、热管理或消费硬件链条，研究重点是内需、出口、以旧换新和机器人/汽车零部件延伸。`,
    profitLogic: "利润来自品牌、规模、渠道效率、出口、成本控制和分红。部分公司还具备机器人、热管理或智能硬件延伸价值。",
    financialChecks:[{name:"收入和毛利率",reason:"判断内外需和成本变化。"},{name:"经营现金流",reason:"成熟龙头质量核心。"},{name:"分红率",reason:"成熟资产估值支撑。"},{name:"新业务收入",reason:"验证机器人/智能化延伸。"}],
    evidence:["家电龙头具备品牌、渠道和现金流。","以旧换新和出口可能支撑需求。","部分精密零部件能力可进入机器人和汽车热管理。"],
    counter:["内需疲弱。","出口关税和汇率风险。","新业务只停留在概念。"],
    track:["内销/出口","毛利率","现金流","分红","新业务订单"],
    scenarios:{bull:"需求修复叠加新业务放量。",base:"稳健现金流和分红支撑。",bear:"需求下行或原材料压力。"}
  },
  "high-dividend": {
    type: "高股息/稳健资产",
    chain: "银行/电力/公用事业/品牌消费",
    researchStatus: "防守现金流",
    business: c => `${c.name}更适合作为现金流和分红资产研究，核心不是短期爆发，而是利润稳定性、资产质量和股东回报。`,
    profitLogic: "利润来自稳定主业、低资本开支、资产质量、品牌定价或公用事业现金流。估值常与利率和股息率比较。",
    financialChecks:[{name:"自由现金流",reason:"分红可持续性的基础。"},{name:"分红率",reason:"股东回报核心。"},{name:"资产质量/负债率",reason:"稳健资产的风险底线。"},{name:"利率环境",reason:"影响红利估值。"}],
    evidence:["低利率环境下稳定股息有配置价值。","成熟行业龙头现金流更稳定。","市场波动期红利资产常作为防守锚。"],
    counter:["盈利下滑导致分红下降。","利率上行压制估值。","资产质量恶化。"],
    track:["股息率","自由现金流","分红率","利率","资产质量"],
    scenarios:{bull:"利率下行和分红稳定推动估值。",base:"作为组合稳定器。",bear:"盈利或分红下降。"}
  }
};

function modelFor(c){
  return CATEGORY_MODELS[c.category] || CATEGORY_MODELS["high-dividend"];
}

function normalizeCompany(raw){
  const c = {...raw};
  const model = modelFor(c);
  c.type = c.type || model.type;
  c.chain = c.chain || model.chain;
  c.researchStatus = c.researchStatus || model.researchStatus;
  c.tags = c.tags || [c.categoryName || model.chain, c.role || "观察池"];
  c.business = c.business || model.business(c);
  c.profitLogic = c.profitLogic || model.profitLogic;
  c.financialChecks = c.financialChecks || model.financialChecks;
  c.thesis = c.thesis || `${c.name}的研究重点是：${c.whyWatch || c.role || "所处环节能否把产业趋势转化为收入、利润和现金流"}。`;
  c.evidence = c.evidence || [
    c.whyWatch || model.evidence[0],
    ...(model.evidence || []).slice(0,2)
  ];
  c.counter = c.counter || [
    c.riskFocus || model.counter[0],
    ...(model.counter || []).slice(1,3)
  ];
  c.track = c.track || c.watch || model.track;
  c.scenarios = c.scenarios || model.scenarios;
  c.sources = c.sources || ["cninfo","eastmoney"];
  c.valuationFrame = c.valuationFrame || "先判断它属于成长、周期、红利还是困境反转，再选择PE、PS、PB、EV/EBITDA或股息率等指标。估值不是单独结论，必须和盈利增速、现金流质量、行业景气位置一起看。";
  c.openQuestions = c.openQuestions || [
    "热门业务收入占比到底有多高？",
    "利润增长是否伴随经营现金流改善？",
    "当前估值已经提前反映了几年增长？",
    "什么数据会推翻原来的看多逻辑？"
  ];
  return c;
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
  const key = params.get("code") || params.get("name") || params.get("id") || "688981";
  const c = data.companies.find(x => x.code === key || x.name === key || x.id === key);
  if(!c){ q("#company-title").textContent = "未找到公司"; q("#company-page").innerHTML = "<p>这个公司暂未收录。</p>"; return; }
  document.title = `${c.name} 公司研究`;
  q("#company-title").textContent = `${c.name}${c.code ? `（${c.code}）` : ""}`;
  q("#company-subtitle").textContent = `${c.chain}｜${c.type}｜${c.researchStatus}`;
  q("#company-page").innerHTML = `
    <h2>公司快速卡片</h2>
    <div class="grid">
      <div class="card"><strong>股票代码</strong>${c.code || "待核验"}</div><div class="card"><strong>股票类型</strong>${c.type}</div>
      <div class="card"><strong>产业位置</strong>${c.chain}</div><div class="card"><strong>研究状态</strong>${c.researchStatus}</div>
    </div>
    <h2>一句话研究结论</h2>
    <div class="quote"><strong>研究论点：</strong>${c.thesis}</div>
    <h2 id="business">业务与赚钱方式</h2>
    <p>${c.business}</p><p>${c.profitLogic}</p>
    <h2>为什么市场会买它</h2>
    <table><thead><tr><th>买入叙事</th><th>背后含义</th></tr></thead><tbody>
      ${c.evidence.map((x,i)=>`<tr><td>逻辑 ${i+1}</td><td>${x}</td></tr>`).join("")}
    </tbody></table>
    <h2 id="financial">财务质量应该怎么看</h2>
    <table><thead><tr><th>关键指标</th><th>原因</th></tr></thead><tbody>${c.financialChecks.map(i=>`<tr><td>${i.name}</td><td>${i.reason}</td></tr>`).join("")}</tbody></table>
    <h2>估值怎么想</h2>
    <p>${c.valuationFrame}</p>
    <h2 id="thesis">核心依据、反证条件与跟踪动作</h2>
    <table><thead><tr><th>支持依据</th><th>反证条件</th><th>跟踪动作</th></tr></thead><tbody><tr>
      <td>${c.evidence.map(x=>`<p>${x}</p>`).join("")}</td>
      <td>${c.counter.map(x=>`<p>${x}</p>`).join("")}</td>
      <td>${c.track.map(x=>`<span class="tag">${x}</span>`).join("")}</td>
    </tr></tbody></table>
    <h2>下一步核验问题</h2>
    <div class="grid-2">${c.openQuestions.map(x=>`<div class="card">${x}</div>`).join("")}</div>
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
