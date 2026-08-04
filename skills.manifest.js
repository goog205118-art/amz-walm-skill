window.SKILL_LIBRARY = [
  {
    id: "ecommerce-growth-strategy",
    name: "电商增长策略",
    category: "strategy",
    platform: ["Shopify", "Amazon", "Walmart", "TikTok Shop", "Etsy"],
    summary: "诊断店铺经营健康度，识别最高影响力增长杠杆，并生成 90 天增长路线图。",
    triggers: ["growth", "roadmap", "strategy", "增长", "策略", "扩张", "渠道", "收入", "转化", "AOV", "复购"],
    capabilities: [
      "单品经济模型诊断",
      "流量、转化率、客单价和复购分析",
      "90 天增长路线图生成",
      "市场渗透、渠道扩张和新品机会规划"
    ],
    workflow: [
      "收集销售、流量、毛利和转化基线",
      "定位当前增长瓶颈",
      "按影响力和执行难度排序机会",
      "输出 90 天行动计划和指标"
    ],
    outputs: [
      "增长优先级矩阵",
      "90 天路线图",
      "KPI 检查清单"
    ],
    starterPrompt: "我想分析当前店铺的增长瓶颈，并生成一个 90 天增长路线图。",
    systemPrompt: "你是电商增长策略顾问。请诊断当前业务状态，识别最高影响力增长杠杆，并输出包含指标、风险和下一步动作的 90 天优先级路线图。"
  },
  {
    id: "amazon-profit-margin-calculator",
    name: "Amazon 利润测算",
    category: "finance",
    platform: ["Amazon"],
    summary: "测算 Amazon 商品利润、毛利率和平台费用影响，帮助判断定价与盈亏平衡。",
    triggers: ["profit", "margin", "fee", "cost", "毛利", "利润", "佣金", "fba"],
    capabilities: [
      "考虑平台费用的单件利润测算",
      "售价、成本和费用敏感性分析",
      "盈亏平衡点检查"
    ],
    workflow: [
      "收集售价、采购成本、物流和广告成本",
      "估算佣金、FBA 和其他平台费用",
      "计算单件利润和毛利率",
      "给出盈亏平衡和优化建议"
    ],
    outputs: ["利润测算表", "毛利率结果", "盈亏平衡说明"],
    starterPrompt: "帮我算一下这个 Amazon 商品的利润和毛利率。",
    systemPrompt: "你负责测算 Amazon 单品经济模型。请清晰说明费用、利润、毛利率和盈亏平衡背景，并指出关键假设。"
  },
  {
    id: "walmart-price-tracker",
    name: "Walmart 价格追踪",
    category: "research",
    platform: ["Walmart"],
    summary: "追踪 Walmart 商品当前价格、库存状态和近期变化，形成可行动的监控摘要。",
    triggers: ["walmart", "price", "stock", "库存", "比价", "追踪", "竞品"],
    capabilities: [
      "价格快照整理",
      "库存状态检查",
      "变化对比和动作提醒"
    ],
    workflow: [
      "收集商品链接或竞品信息",
      "整理当前价格和库存快照",
      "对比历史或目标价格变化",
      "标记需要跟进的动作"
    ],
    outputs: ["价格库存摘要", "变化列表", "行动提醒"],
    starterPrompt: "帮我追踪这个 Walmart 商品的价格和库存状态。",
    systemPrompt: "你负责追踪 Walmart 商品价格和库存状态。请总结当前快照、变化原因和可执行动作。"
  },
  {
    id: "listing-optimization",
    name: "Listing 页面优化",
    category: "content",
    platform: ["Amazon", "Shopify", "Walmart", "Etsy"],
    summary: "优化商品标题、五点、描述和页面结构，提高搜索匹配度与转化表达。",
    triggers: ["listing", "title", "bullet", "描述", "文案", "优化", "转化", "页面"],
    capabilities: [
      "标题重写",
      "五点卖点优化",
      "面向转化的页面结构梳理"
    ],
    workflow: [
      "审阅现有标题、五点和描述",
      "找出缺失卖点和表达阻力",
      "按优先级重写页面文案",
      "交付可直接使用的 Listing 内容"
    ],
    outputs: ["优化后标题", "五点卖点", "描述模块"],
    starterPrompt: "帮我优化这条 listing 的标题、五点和描述。",
    systemPrompt: "你负责优化电商商品页面。请围绕清晰度、说服力、搜索匹配和转化效率输出可直接使用的文案。"
  },
  {
    id: "competitor-analysis",
    name: "竞品分析",
    category: "research",
    platform: ["Amazon", "Walmart", "Shopify", "DTC"],
    summary: "对比竞品价格、卖点、页面表达和定位差异，提炼可执行的机会点。",
    triggers: ["competitor", "竞品", "对手", "分析", "差异", "定位"],
    capabilities: [
      "定位对比",
      "差距分析",
      "机会点识别"
    ],
    workflow: [
      "收集竞品链接、价格和核心卖点",
      "对比定价、定位和页面结构",
      "识别差异、空白和风险",
      "输出可落地的调整建议"
    ],
    outputs: ["竞品对比矩阵", "差距摘要", "行动清单"],
    starterPrompt: "帮我做一个竞品分析，看看我们可以怎么差异化。",
    systemPrompt: "你负责电商竞品分析。请把竞品对比转化为明确的定位机会、页面调整和运营动作。"
  },
  {
    id: "ad-copy-generator",
    name: "广告文案生成",
    category: "marketing",
    platform: ["Meta", "Google", "TikTok", "Amazon Ads"],
    summary: "生成广告角度、开头钩子和投放文案模块，用于付费获客素材测试。",
    triggers: ["ad", "广告", "文案", "hook", "投放", "素材", "campaign"],
    capabilities: [
      "广告角度生成",
      "开头钩子撰写",
      "多版本文案变体"
    ],
    workflow: [
      "读取产品卖点、优惠和目标人群",
      "提炼可测试的广告角度",
      "生成多组文案和 CTA",
      "按投放场景打包输出"
    ],
    outputs: ["开头钩子", "广告正文", "CTA 变体"],
    starterPrompt: "帮我为这个产品生成几组广告文案和角度。",
    systemPrompt: "你负责生成电商广告文案。请围绕目标人群、核心卖点和投放平台输出高转化文案变体。"
  }
];

window.DEFAULT_SETTINGS = {
  model: "gpt-4.1-mini",
  endpoint: "https://api.openai.com/v1/chat/completions",
  apiKey: ""
};

window.DEFAULT_WORKSPACE = {
  activeSkillId: "ecommerce-growth-strategy",
  activeSessionId: "session-1",
  searchText: "",
  categoryFilter: "all",
  platformFilter: "all",
  lastRouteReason: "技能工作区已就绪。",
  settings: window.DEFAULT_SETTINGS,
  customSkills: [],
  sessions: [
    {
      id: "session-1",
      title: "增长路线图",
      skillId: "ecommerce-growth-strategy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          role: "assistant",
          content: "欢迎来到电商 Skill 工作台。输入业务背景，我会帮你自动路由到合适的技能，并生成可执行的回答。"
        }
      ]
    }
  ]
};
