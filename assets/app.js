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

function inferCategory(c){
  const text = [c.chain, c.type, ...(c.sectors || []), ...(c.tags || [])].join(" ");
  if(text.includes("光模块") || text.includes("光通信")) return "ai-optical";
  if(text.includes("PCB")) return "pcb";
  if(text.includes("semiconductor") || text.includes("半导体") || text.includes("晶圆") || text.includes("刻蚀")) return "semiconductor";
  if(text.includes("robotics") || text.includes("机器人") || text.includes("汽车零部件")) return "robotics";
  if(text.includes("power-grid") || text.includes("电网") || text.includes("电力")) return "power-grid";
  if(text.includes("new-energy") || text.includes("电池") || text.includes("储能")) return "battery";
  if(text.includes("resources") || text.includes("铜") || text.includes("黄金")) return "metals";
  if(text.includes("consumer") || text.includes("银行") || text.includes("水电") || text.includes("high-dividend")) return "high-dividend";
  return "high-dividend";
}

const CATEGORY_PLAYBOOKS = {
  "ai-optical": {
    position: "先确认公司到底在光模块整机、光器件、光芯片、光缆还是通信设备。越靠近高速率产品和海外云客户，越容易被AI资本开支直接定价；越偏传统通信建设，弹性通常更依赖运营商投资和行业周期。",
    moat: ["高速率产品认证周期长，客户切换成本较高。", "良率、交付稳定性和散热/功耗控制决定是否能进入大客户供应链。", "海外客户和汇率会放大收入弹性，也会放大波动。"],
    financialMap: [
      {item:"收入结构",read:"看高速产品、海外客户、数据中心相关收入占比是否提升。",warning:"只说AI需求但收入结构没有变化。"},
      {item:"毛利率",read:"毛利率稳定或上行说明高端产品占比和议价权较好。",warning:"收入增长但毛利率下滑，可能是低端订单或价格竞争。"},
      {item:"存货",read:"合理备货可以支持订单交付。",warning:"存货大幅增长但收入和订单没有同步兑现。"},
      {item:"经营现金流",read:"现金流跟上利润说明回款质量较好。",warning:"利润增长但现金流持续弱，可能有回款或确认风险。"}
    ],
    peer: ["产品速率代际","海外客户占比","毛利率稳定性","存货周转","研发投入"],
    valuation: "高景气阶段可以看PE/PEG和订单弹性，但不能只看市盈率。若利润高速增长来自一次性景气，估值要用保守增速折现；若客户和产品代际能持续扩展，估值容忍度会更高。",
    diligence: ["核对年报分产品收入和海外收入。","跟踪业绩预告与毛利率。","观察海外云厂商资本开支。","警惕减持、库存和应收异常。"]
  },
  "pcb": {
    position: "PCB和元件公司要先分清下游：AI服务器、交换机、汽车电子、消费电子、通信基站对应的价值量和周期完全不同。AI服务器板和高速通信板的壁垒通常高于普通消费电子板。",
    moat: ["高频高速材料、层数、良率和客户认证形成壁垒。", "扩产不是利好本身，只有被高质量订单消化才是利好。", "材料和客户结构决定毛利率。"],
    financialMap: [
      {item:"毛利率",read:"高端板占比提升通常先反映在毛利率。",warning:"收入增长但毛利率下行，说明产品结构可能没变好。"},
      {item:"在建工程",read:"扩产能否匹配AI服务器/汽车电子订单。",warning:"扩产过快但产能利用率不足。"},
      {item:"客户结构",read:"是否进入服务器、交换机、汽车电子核心客户。",warning:"过度依赖单一消费电子客户。"},
      {item:"存货跌价",read:"库存周期健康说明需求判断准确。",warning:"库存大增且出现跌价准备。"}
    ],
    peer: ["高端板收入占比","AI服务器客户","产能利用率","材料能力","毛利率"],
    valuation: "PCB公司既有周期属性也有成长属性。普通PCB更适合按周期和PB/PE中枢看，高端服务器板和封装基板可以给成长估值，但前提是毛利率和客户结构持续改善。",
    diligence: ["看AI服务器板收入是否真实增长。","比较毛利率与同业。","看扩产项目投产节奏。","跟踪大客户和终端需求。"]
  },
  "semiconductor": {
    position: "半导体不能笼统看。设备看订单和验收，材料看客户认证和耗材放量，制造看产能利用率和折旧，设计看产品周期，封测看利用率和先进封装，存储看价格和库存。",
    moat: ["技术验证和客户认证周期长，进入产线后粘性较强。", "国产替代空间大，但兑现通常慢于市场想象。", "研发投入、专利、工艺经验和客户结构决定长期壁垒。"],
    financialMap: [
      {item:"合同负债",read:"设备公司订单前置线索。",warning:"合同负债增长但迟迟不能验收转收入。"},
      {item:"研发费用",read:"持续研发说明技术迭代能力。",warning:"研发资本化过高，美化短期利润。"},
      {item:"毛利率",read:"技术壁垒和产品结构的直接反映。",warning:"国产替代故事强但毛利率持续下滑。"},
      {item:"库存",read:"设计和存储公司要看价格周期。",warning:"库存高企叠加价格下行。"}
    ],
    peer: ["订单/合同负债","客户验证阶段","研发强度","国产替代率","毛利率"],
    valuation: "设备材料可按订单和利润增长给成长估值，晶圆制造要考虑资本开支、折旧和周期位置，设计和存储要看产品周期。半导体高估值必须用客户验证和收入兑现来消化。",
    diligence: ["拆分公司所在环节。","核对公告和年报里的客户验证。","观察合同负债、存货和研发费用。","对比全球半导体周期和存储价格。"]
  },
  "ai-server": {
    position: "AI服务器和计算机设备公司要区分整机、部件、存储、安全、政企项目和国产算力生态。整机收入大但毛利率可能低，真正要看订单质量和回款。",
    moat: ["客户资源、供应链组织和交付能力决定份额。", "国产算力适配能力是本土需求的关键。", "政企项目需要重视回款和现金流。"],
    financialMap: [
      {item:"订单/合同",read:"AI服务器或政企项目订单是收入前置指标。",warning:"订单口径模糊，无法确认毛利率和交付。"},
      {item:"毛利率",read:"硬件集成毛利率低，改善才说明产品结构变好。",warning:"收入高增但利润不增。"},
      {item:"应收账款",read:"政企业务回款周期是风险重点。",warning:"应收增长远快于收入。"},
      {item:"现金流",read:"项目质量和回款能力的最终验证。",warning:"净利润增长但经营现金流恶化。"}
    ],
    peer: ["AI服务器订单","国产算力适配","毛利率","政企客户","现金流"],
    valuation: "服务器整机不能简单按AI芯片估值，要看毛利率和回款。若公司只是低毛利集成商，估值要保守；若掌握关键部件、软件生态或稳定客户，估值可上调。",
    diligence: ["核实AI订单规模和交付周期。","看毛利率是否被低毛利硬件拖累。","查应收和存货。","跟踪国产算力政策和客户预算。"]
  },
  "ai-software": {
    position: "AI软件公司要从发布会回到商业模式。办公、金融IT、安全、工业软件、医疗IT、教育应用的付费路径不同，不能只看有没有大模型。",
    moat: ["客户数据、工作流嵌入和续费习惯比模型本身更重要。", "渠道和实施能力决定政企软件能否规模化。", "算力成本会影响毛利率。"],
    financialMap: [
      {item:"合同负债/ARR",read:"订阅和续费是软件商业化核心。",warning:"产品发布多但合同负债不增长。"},
      {item:"毛利率",read:"AI调用成本下降或付费提升会改善毛利。",warning:"算力成本吞噬新增收入。"},
      {item:"销售费用率",read:"获客效率决定利润弹性。",warning:"收入靠高销售费用堆出来。"},
      {item:"经营现金流",read:"软件收入质量最终要看回款。",warning:"政企项目确认收入但回款慢。"}
    ],
    peer: ["付费率","续费率","合同负债","毛利率","销售费用率"],
    valuation: "成熟订阅软件可以看PS、ARR和利润率趋势；项目制软件要看订单、回款和费用率；亏损AI软件必须用商业化路径解释估值。",
    diligence: ["看AI产品是否单独收费。","跟踪续费率和客单价。","核对算力成本和毛利率。","比较合同负债和现金流。"]
  },
  "robotics": {
    position: "机器人公司要分为整机、执行器、减速器、丝杠、电机、传感器、控制器、机器视觉和系统集成。短期最值得核验的是零部件定点和小批量收入。",
    moat: ["精密制造、良率、寿命和一致性决定能否量产。", "客户定点比概念回复更重要。", "汽车零部件能力可迁移，但需要真实订单证明。"],
    financialMap: [
      {item:"客户定点",read:"从样机走向供应链的关键节点。",warning:"只有互动平台回复，没有公告或收入。"},
      {item:"收入占比",read:"机器人相关收入是否达到能影响利润的规模。",warning:"收入占比极低但估值大幅重估。"},
      {item:"毛利率",read:"核心零部件壁垒会反映在毛利率。",warning:"低毛利代工而非核心环节。"},
      {item:"资本开支",read:"扩产要有客户和订单支撑。",warning:"提前扩产但量产推迟。"}
    ],
    peer: ["客户定点","小批量收入","执行器/丝杠能力","单机价值量","毛利率"],
    valuation: "机器人处于主题到产业化过渡期，估值更多来自期权。要降低犯错率，就用客户定点和收入占比把纯概念公司排除。",
    diligence: ["查是否有客户定点或供货公告。","看机器人业务收入占比。","比较核心零部件壁垒。","警惕短期涨幅远超订单兑现。"]
  },
  "auto-parts": {
    position: "汽车零部件公司要看主机厂客户、单车价值量、价格年降、热管理/智能驾驶/机器人延伸。主业稳不稳决定安全边际，新业务决定估值弹性。",
    moat: ["大客户认证和稳定交付是重要门槛。", "平台化供货能摊薄研发和制造成本。", "机器人或智能驾驶延伸要看真实收入。"],
    financialMap: [
      {item:"客户结构",read:"优质新能源客户放量会带来收入弹性。",warning:"过度依赖单一客户。"},
      {item:"毛利率",read:"抵抗价格年降的能力。",warning:"收入增长但被年降吞噬利润。"},
      {item:"资本开支",read:"扩产是否匹配客户订单。",warning:"产能利用率不足。"},
      {item:"新业务收入",read:"机器人/智能驾驶是否从故事变成收入。",warning:"概念很多但收入占比低。"}
    ],
    peer: ["核心客户","单车价值量","毛利率","新业务占比","现金流"],
    valuation: "传统零部件按稳健制造估值，新业务进入机器人或智能驾驶后可能重估。但重估要靠订单和收入占比支撑。",
    diligence: ["看客户销量和配套车型。","核对毛利率和价格年降。","追踪新业务订单。","比较自由现金流和负债。"]
  },
  "power-grid": {
    position: "电网设备公司要看特高压、主网、配网、继电保护、电力自动化、变压器、线缆和元器件。AI数据中心和新能源消纳提升的是电网复杂度，不是所有电力设备都同等受益。",
    moat: ["资质、项目经验和电网客户关系构成壁垒。", "电力系统安全性要求高，龙头稳定性更强。", "招标节奏决定收入确认。"],
    financialMap: [
      {item:"中标/订单",read:"电网设备收入的前置指标。",warning:"没有新增订单却提前拔估值。"},
      {item:"应收账款",read:"工程项目回款周期需要关注。",warning:"应收大幅增加且现金流变差。"},
      {item:"毛利率",read:"产品结构和招标价格影响利润。",warning:"中标增长但毛利率下降。"},
      {item:"经营现金流",read:"稳健设备公司的核心质量指标。",warning:"利润稳定但现金流长期弱。"}
    ],
    peer: ["电网招标","特高压/配网占比","应收账款","毛利率","分红"],
    valuation: "电网方向弹性不一定最大，但确定性较强。龙头可按稳健成长和现金流估值，小票要谨慎区分订单兑现和主题炒作。",
    diligence: ["跟踪国家电网和南网招标。","看订单和应收账款。","比较毛利率和现金流。","核对数据中心用电是否能传导到公司产品。"]
  },
  "battery": {
    position: "电池和储能公司要分清电芯、材料、设备、结构件、隔膜、电解液、铜箔。当前核心不是只看需求，而是看价格战和供给出清。",
    moat: ["成本曲线和规模决定出清期生存能力。", "海外客户和储能订单提供第二增长曲线。", "技术迭代会改变材料和设备价值量。"],
    financialMap: [
      {item:"毛利率",read:"价格战是否缓和的直接证据。",warning:"出货增长但毛利率继续下滑。"},
      {item:"库存/减值",read:"周期底部要看库存风险。",warning:"库存高企叠加价格下行。"},
      {item:"海外收入",read:"储能和海外客户可能改善增长质量。",warning:"海外政策或贸易壁垒。"},
      {item:"现金流",read:"出清期企业安全边际。",warning:"扩产和价格战同时消耗现金。"}
    ],
    peer: ["成本曲线","储能订单","海外客户","库存","现金流"],
    valuation: "电池链要按周期位置看估值。出清前低PE可能是假便宜，出清后毛利率企稳才是修复证据。",
    diligence: ["跟踪材料价格。","看毛利率和库存减值。","比较龙头和二线现金流。","观察储能和海外订单。"]
  },
  "pv": {
    position: "光伏公司要分清硅料、硅片、电池、组件、逆变器、设备和材料。当前研究重点是供给出清，而不是装机长期空间。",
    moat: ["低成本产能和海外渠道决定低谷期生存。", "逆变器和设备可能先于组件修复。", "技术路线变化会重新分配利润。"],
    financialMap: [
      {item:"价格",read:"组件、硅片、硅料价格企稳是反转信号。",warning:"价格继续下跌。"},
      {item:"库存减值",read:"低谷期利润质量关键。",warning:"账面盈利但减值压力大。"},
      {item:"毛利率",read:"供需改善会先反映在毛利率。",warning:"低价抢量。"},
      {item:"海外收入",read:"逆变器和部分设备的重要变量。",warning:"渠道库存和贸易限制。"}
    ],
    peer: ["成本优势","海外渠道","技术路线","库存减值","现金流"],
    valuation: "光伏反转不能只看跌幅。价格企稳、库存下降和亏损面收窄同时出现，估值修复才更可靠。",
    diligence: ["跟踪产业链价格。","看库存和减值。","比较现金流和负债。","确认技术路线是否匹配公司产品。"]
  },
  "defense": {
    position: "军工和低空经济要区分主机厂、军工电子、连接器、红外、无人装备、卫星和材料。订单透明度低，所以财报科目和政策节点更重要。",
    moat: ["资质、型号配套和客户认证壁垒高。", "军工电子等配套环节可能比整机更容易看到利润。", "低空经济要等政策和场景落地。"],
    financialMap: [
      {item:"合同负债",read:"订单和预收线索。",warning:"主题热但合同负债没有变化。"},
      {item:"存货",read:"备产可能意味着订单。",warning:"存货高但交付慢。"},
      {item:"应收账款",read:"军工回款周期常较长。",warning:"应收持续扩大。"},
      {item:"毛利率",read:"产品结构和型号放量。",warning:"低毛利项目拖累。"}
    ],
    peer: ["型号配套","订单线索","军工电子占比","应收账款","政策催化"],
    valuation: "军工估值常提前反映订单预期。要避免只看政策主题，最好用合同负债、存货、应收和交付节奏验证。",
    diligence: ["看合同负债和存货。","关注低空/卫星政策落地。","查应收账款和现金流。","比较军工电子与整机弹性。"]
  },
  "metals": {
    position: "资源股的核心不是讲故事，而是商品价格、资源储量、成本曲线和资本开支。黄金、铜、铝、锂、稀土分别受不同宏观变量驱动。",
    moat: ["低成本资源是周期下行时的安全边际。", "储量和产量增长决定长期价值。", "海外矿山带来成长，也带来地缘和运营风险。"],
    financialMap: [
      {item:"商品价格",read:"利润最核心变量。",warning:"买在商品价格高点。"},
      {item:"单位成本",read:"判断抗周期能力。",warning:"价格上涨但成本同步上升。"},
      {item:"资本开支",read:"未来产量释放来源。",warning:"项目回报不及预期。"},
      {item:"负债率",read:"周期股安全边际。",warning:"高杠杆遇到价格下行。"}
    ],
    peer: ["资源储量","单位成本","产量增长","商品价格敏感度","分红"],
    valuation: "资源股要看盈利中枢而非单年PE。商品价格高位时PE可能很低，但风险反而更高；低成本龙头和高分红更有安全边际。",
    diligence: ["跟踪金价、铜价、锂价、稀土价格。","看单位成本和产量。","核对资本开支计划。","评估海外项目风险。"]
  },
  "medicine": {
    position: "医药要区分创新药、CXO、疫苗、器械、医疗服务和品牌中药。每类商业模式不同，不能只用PE高低判断。",
    moat: ["管线质量、临床进度和商业化能力决定创新药价值。", "CXO受投融资周期影响明显。", "品牌中药和OTC更看渠道、价格和现金流。"],
    financialMap: [
      {item:"研发管线",read:"临床节点和适应症空间决定估值。",warning:"管线失败或进度推迟。"},
      {item:"现金储备",read:"研发周期长，现金很重要。",warning:"持续亏损且融资困难。"},
      {item:"销售费用率",read:"商业化效率。",warning:"收入增长靠高销售费用堆出。"},
      {item:"政策影响",read:"集采和医保谈判影响价格。",warning:"核心品种降价超预期。"}
    ],
    peer: ["管线阶段","商业化能力","现金储备","政策风险","海外授权"],
    valuation: "创新药可用管线和里程碑估值，CXO看订单和产能利用率，品牌中药看现金流和分红。医药低估值必须结合政策和产品周期。",
    diligence: ["查临床节点和公告。","看现金储备和研发费用。","关注集采和医保。","核验授权交易和商业化收入。"]
  },
  "consumer-electronics": {
    position: "消费电子和AI终端要区分整机、代工、结构件、光学、连接器、散热和功能件。AI手机、AI PC、智能眼镜能否带来换机，是核心假设。",
    moat: ["大客户认证、良率和快速交付是制造壁垒。", "单机价值量提升比单纯出货更重要。", "客户集中既是优势也是风险。"],
    financialMap: [
      {item:"大客户订单",read:"终端需求和份额的直接体现。",warning:"客户砍单或产品周期错判。"},
      {item:"毛利率",read:"产品升级能否提升利润。",warning:"低毛利代工导致增收不增利。"},
      {item:"库存",read:"换机周期验证。",warning:"备货过多但需求不及预期。"},
      {item:"资本开支",read:"新产品和新客户扩产。",warning:"扩产后利用率不足。"}
    ],
    peer: ["大客户地位","AI终端暴露度","单机价值量","毛利率","库存"],
    valuation: "消费电子是强周期行业，AI终端带来的是估值重估机会，但必须用出货、单机价值量和毛利率验证。",
    diligence: ["跟踪终端销量。","核对大客户收入占比。","看库存和毛利率。","确认AI终端是否增加零部件价值。"]
  },
  "home-appliance": {
    position: "家电和机器人交叉要区分传统白电、小家电、零部件、热管理和机器人/工业技术。成熟主业提供现金流，新业务提供弹性。",
    moat: ["品牌、渠道和规模是家电龙头壁垒。", "海外渠道和成本控制决定利润稳定性。", "机器人/热管理延伸要看订单而非概念。"],
    financialMap: [
      {item:"经营现金流",read:"成熟家电公司的核心质量。",warning:"利润稳定但现金流恶化。"},
      {item:"分红率",read:"成熟龙头估值支撑。",warning:"分红下降或资本开支过大。"},
      {item:"毛利率",read:"原材料、渠道和产品结构影响。",warning:"价格竞争压缩利润。"},
      {item:"新业务收入",read:"机器人、热管理或智能硬件是否兑现。",warning:"新业务只在叙事里。"}
    ],
    peer: ["品牌力","渠道效率","出口占比","现金流","新业务订单"],
    valuation: "成熟家电看现金流、分红和ROE；有机器人或热管理新业务的公司可给一定期权估值，但要用收入占比约束。",
    diligence: ["看内销和出口。","比较现金流和分红。","跟踪原材料成本。","核实新业务订单。"]
  },
  "high-dividend": {
    position: "高股息不是成长故事，而是现金流、分红和低波动。银行、电力、运营商、煤炭、公用事业、品牌消费的风险完全不同，要分别看。",
    moat: ["稳定现金流是核心。", "分红可持续性比单年股息率更重要。", "利率环境会影响估值。"],
    financialMap: [
      {item:"自由现金流",read:"分红能否持续的基础。",warning:"靠举债或一次性收益分红。"},
      {item:"分红率",read:"股东回报稳定性。",warning:"盈利下滑导致分红下降。"},
      {item:"资产质量/负债率",read:"银行看资产质量，公用事业看杠杆。",warning:"风险暴露导致估值下修。"},
      {item:"利率",read:"红利资产和债券收益率比较。",warning:"利率上行压制估值。"}
    ],
    peer: ["股息率","自由现金流","分红率","资产质量","利率敏感度"],
    valuation: "高股息资产重点看股息率、PB、ROE和自由现金流。股息率高不等于便宜，必须确认盈利和现金流可持续。",
    diligence: ["看分红历史。","核对自由现金流。","评估资产质量。","与无风险利率比较。"]
  }
};

function normalizeCompany(raw){
  const c = {...raw};
  c.category = c.category || inferCategory(c);
  const model = modelFor(c);
  const playbook = CATEGORY_PLAYBOOKS[c.category] || CATEGORY_PLAYBOOKS["high-dividend"];
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
  c.playbook = c.playbook || playbook;
  c.openQuestions = c.openQuestions || [
    "热门业务收入占比到底有多高？",
    "利润增长是否伴随经营现金流改善？",
    "当前估值已经提前反映了几年增长？",
    "什么数据会推翻原来的看多逻辑？"
  ];
  return c;
}

function evidenceLayers(c){
  return [
    {
      layer:"事实层",
      content:`${c.name}被归入${c.chain}方向，当前研究页列出的业务、产业位置和指标只是研究入口，正式事实需要继续用公司年报、半年报、公告和交易所披露核验。`,
      use:"事实层只回答“公司做什么、收入来自哪里、有哪些公开披露”。"
    },
    {
      layer:"推论层",
      content:`市场关注它，主要因为${c.whyWatch || c.thesis} 这一推论需要被订单、毛利率、现金流、客户结构等数据继续验证。`,
      use:"推论层回答“行业变化如何传导到公司利润”。"
    },
    {
      layer:"观点层",
      content:c.thesis,
      use:"观点层可以错，必须提前写出反证条件和跟踪指标。"
    },
    {
      layer:"未知层",
      content:(c.openQuestions || []).slice(0,2).join("；"),
      use:"未知层决定下一次研究应该查什么，而不是被短线涨跌带着走。"
    }
  ];
}

function redFlagChecklist(c){
  const base = [
    {flag:"收入增长但经营现金流没有同步改善",why:"可能存在回款慢、项目确认提前或收入质量不足。"},
    {flag:"应收账款、合同资产或存货增长远快于收入",why:"可能意味着压货、验收慢、坏账或跌价风险。"},
    {flag:"毛利率连续下滑但估值仍按高成长定价",why:"说明竞争加剧或产品结构不及预期。"},
    {flag:"热门业务只在叙事里，收入占比披露不清",why:"容易从基本面研究滑向主题交易。"}
  ];
  const categoryFlags = {
    "ai-optical":[{flag:"海外单一大客户收入占比过高",why:"客户砍单会直接影响订单和估值。"}],
    "semiconductor":[{flag:"合同负债增长但验收转收入慢",why:"设备订单可能没有顺利兑现为利润。"}],
    "robotics":[{flag:"只有样机或送样，没有客户定点和量产收入",why:"说明仍处在主题阶段。"}],
    "ai-software":[{flag:"AI功能无法单独收费，算力成本却增加",why:"容易出现收入不增、成本先升。"}],
    "battery":[{flag:"价格战中库存和减值压力扩大",why:"低估值可能不是机会，而是盈利下修。"}],
    "pv":[{flag:"产业链价格继续下行且亏损面扩大",why:"反转尚未成立。"}],
    "metals":[{flag:"商品价格处在高位但资本开支激进",why:"周期反转时利润和估值可能双杀。"}],
    "medicine":[{flag:"研发费用高但核心管线进度不清",why:"估值依赖不确定的未来里程碑。"}],
    "high-dividend":[{flag:"股息率高但自由现金流下降",why:"高股息可能不可持续。"}]
  };
  return [...(categoryFlags[c.category] || []), ...base];
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
    <h2>行业研究路线图</h2>
    <table><thead><tr><th>步骤</th><th>要解决的问题</th><th>对应证据</th></tr></thead><tbody>
      <tr><td>1. 拆价值链</td><td>钱到底在哪一环赚？谁有议价权？</td><td>收入结构、毛利率、客户认证、行业价格。</td></tr>
      <tr><td>2. 看景气</td><td>需求是新增的、周期修复的，还是纯主题想象？</td><td>订单、价格、库存、产能利用率、政策和海外需求。</td></tr>
      <tr><td>3. 找上市公司映射</td><td>A股公司是否真正处在受益环节？</td><td>年报主营、公告、客户结构、产品收入占比。</td></tr>
      <tr><td>4. 做财报验证</td><td>行业逻辑是否进入收入、利润和现金流？</td><td>营收、毛利率、经营现金流、应收、存货、合同负债。</td></tr>
      <tr><td>5. 写反证条件</td><td>什么情况说明判断错了？</td><td>业绩低于预期、毛利率下滑、订单推迟、价格反转。</td></tr>
    </tbody></table>
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
    <h2>常见误判</h2>
    <table><thead><tr><th>误判</th><th>为什么会错</th><th>怎么修正</th></tr></thead><tbody>
      <tr><td>只看板块热度</td><td>热度可能来自资金拥挤，而不是利润改善。</td><td>回到订单、毛利率和现金流验证。</td></tr>
      <tr><td>把行业空间等同于公司利润</td><td>好行业里也有低议价权公司。</td><td>拆公司在价值链的位置和收入占比。</td></tr>
      <tr><td>把短期涨幅当长期确定性</td><td>涨幅可能来自估值抬升，而不是盈利上修。</td><td>比较估值分位和盈利预测变化。</td></tr>
      <tr><td>只找支持材料</td><td>容易忽视反证信号。</td><td>提前写清楚会推翻逻辑的指标。</td></tr>
    </tbody></table>
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
    <h2>证据分层：事实、推论、观点、未知</h2>
    <table><thead><tr><th>层级</th><th>当前内容</th><th>怎么使用</th></tr></thead><tbody>
      ${evidenceLayers(c).map(x=>`<tr><td>${x.layer}</td><td>${x.content}</td><td>${x.use}</td></tr>`).join("")}
    </tbody></table>
    <h2 id="business">业务与赚钱方式</h2>
    <p>${c.business}</p><p>${c.profitLogic}</p>
    <h2>产业链位置怎么判断</h2>
    <p>${c.playbook.position}</p>
    <div class="grid-3">${c.playbook.moat.map(x=>`<div class="card"><strong>护城河线索</strong><p>${x}</p></div>`).join("")}</div>
    <h2>为什么市场会买它</h2>
    <table><thead><tr><th>买入叙事</th><th>背后含义</th></tr></thead><tbody>
      ${c.evidence.map((x,i)=>`<tr><td>逻辑 ${i+1}</td><td>${x}</td></tr>`).join("")}
    </tbody></table>
    <h2 id="financial">财务质量应该怎么看</h2>
    <table><thead><tr><th>关键指标</th><th>原因</th></tr></thead><tbody>${c.financialChecks.map(i=>`<tr><td>${i.name}</td><td>${i.reason}</td></tr>`).join("")}</tbody></table>
    <h2>财报科目逐项拆解</h2>
    <table><thead><tr><th>科目/指标</th><th>应该怎么读</th><th>危险信号</th></tr></thead><tbody>
      ${c.playbook.financialMap.map(i=>`<tr><td>${i.item}</td><td>${i.read}</td><td>${i.warning}</td></tr>`).join("")}
    </tbody></table>
    <h2>估值怎么想</h2>
    <p>${c.valuationFrame}</p>
    <p>${c.playbook.valuation}</p>
    <h2>同业比较应该比什么</h2>
    <div class="pill-row">${c.playbook.peer.map(x=>`<span class="tag">${x}</span>`).join("")}</div>
    <h2 id="thesis">核心依据、反证条件与跟踪动作</h2>
    <table><thead><tr><th>支持依据</th><th>反证条件</th><th>跟踪动作</th></tr></thead><tbody><tr>
      <td>${c.evidence.map(x=>`<p>${x}</p>`).join("")}</td>
      <td>${c.counter.map(x=>`<p>${x}</p>`).join("")}</td>
      <td>${c.track.map(x=>`<span class="tag">${x}</span>`).join("")}</td>
    </tr></tbody></table>
    <h2>实操核验路径</h2>
    <ol class="steps">${c.playbook.diligence.map(x=>`<li>${x}</li>`).join("")}</ol>
    <h2>红旗清单：出现这些情况要重新评估</h2>
    <table><thead><tr><th>红旗信号</th><th>为什么危险</th></tr></thead><tbody>
      ${redFlagChecklist(c).map(x=>`<tr><td>${x.flag}</td><td>${x.why}</td></tr>`).join("")}
    </tbody></table>
    <h2>下一步核验问题</h2>
    <div class="grid-2">${c.openQuestions.map(x=>`<div class="card">${x}</div>`).join("")}</div>
    <h2>更新节奏</h2>
    <table><thead><tr><th>频率</th><th>更新什么</th><th>目的</th></tr></thead><tbody>
      <tr><td>每周</td><td>股价强弱、成交额、板块轮动、公司公告。</td><td>判断市场是否仍在给同一逻辑定价。</td></tr>
      <tr><td>每月</td><td>产业新闻、订单传闻的公告核验、产品发布、价格变化。</td><td>把新闻流转成可验证变量。</td></tr>
      <tr><td>每季</td><td>收入、毛利率、费用率、经营现金流、应收、存货、合同负债。</td><td>确认故事是否真正进入财报。</td></tr>
      <tr><td>大涨后</td><td>估值、减持、业绩预告、机构持仓、龙虎榜和风险提示。</td><td>区分基本面上修和情绪拥挤。</td></tr>
    </tbody></table>
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
    <p>指标字典放在各行业页内，后续会抽取成可搜索数据库。</p>
    <h2>一份个股研究笔记应该怎么写</h2>
    <table><thead><tr><th>模块</th><th>写什么</th><th>写到什么程度才算合格</th></tr></thead><tbody>
      <tr><td>一句话结论</td><td>公司为什么值得研究，不是为什么一定会涨。</td><td>能说清楚行业、公司位置、核心变量和主要风险。</td></tr>
      <tr><td>商业模式</td><td>收入从哪里来，客户是谁，成本是什么，利润池在哪。</td><td>能画出从客户需求到公司收入的传导链。</td></tr>
      <tr><td>财务质量</td><td>收入、毛利率、费用率、现金流、应收、存货、负债。</td><td>能解释利润是真改善还是会计/周期/一次性因素。</td></tr>
      <tr><td>估值框架</td><td>用PE、PB、PS、股息率还是周期中枢。</td><td>估值方法和公司类型匹配，不拿高点利润做永久利润。</td></tr>
      <tr><td>反证条件</td><td>什么数据出来说明判断错了。</td><td>至少写出三条可观察、可更新的反证指标。</td></tr>
    </tbody></table>
    <h2>研究复盘模板</h2>
    <ol class="steps">
      <li>先写原始判断：当时为什么关注它。</li>
      <li>再写新增事实：新财报、新公告、新订单、新价格。</li>
      <li>比较事实和原判断：是加强、削弱，还是无关。</li>
      <li>更新结论：继续跟踪、降级观察、移出观察池。</li>
      <li>记录错误：是行业判断错、公司选择错、估值太贵，还是被情绪带偏。</li>
    </ol>`;
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
