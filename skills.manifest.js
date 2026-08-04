window.SKILL_LIBRARY = [
  {
    id: "ecommerce-growth-strategy",
    name: "E-Commerce Growth Strategy",
    category: "strategy",
    platform: ["Shopify", "Amazon", "Walmart", "TikTok Shop", "Etsy"],
    summary: "Diagnose business health, find the highest-impact growth lever, and build a 90-day growth roadmap.",
    triggers: ["growth", "roadmap", "strategy", "增长", "策略", "扩张", "渠道", "收入"],
    capabilities: [
      "Unit economics diagnosis",
      "Traffic, conversion, AOV and retention analysis",
      "90-day roadmap generation",
      "Ansoff-style expansion planning"
    ],
    workflow: [
      "Collect baseline numbers",
      "Identify bottleneck",
      "Rank growth opportunities",
      "Build 90-day plan"
    ],
    outputs: [
      "Priority matrix",
      "Growth roadmap",
      "KPI checklist"
    ],
    starterPrompt: "我想分析当前店铺的增长瓶颈，并生成一个 90 天增长路线图。",
    systemPrompt: "You are an e-commerce growth strategist. Diagnose the current business, identify the highest-impact growth levers, and return a prioritized 90-day roadmap with metrics, risks, and next actions."
  },
  {
    id: "amazon-profit-margin-calculator",
    name: "Amazon Profit Margin Calculator",
    category: "finance",
    platform: ["Amazon"],
    summary: "Estimate profit, margin, and fee impact for Amazon listings.",
    triggers: ["profit", "margin", "fee", "cost", "毛利", "利润", "佣金", "fba"],
    capabilities: [
      "Fee-aware profit estimation",
      "Margin sensitivity analysis",
      "Break-even checks"
    ],
    workflow: [
      "Collect cost and price",
      "Estimate fees",
      "Calculate profit",
      "Show margin"
    ],
    outputs: ["Profit table", "Margin ratio", "Break-even note"],
    starterPrompt: "帮我算一下这个 Amazon 商品的利润和毛利率。",
    systemPrompt: "You calculate Amazon unit economics and explain the result clearly, including fees, margin, and break-even context."
  },
  {
    id: "walmart-price-tracker",
    name: "Walmart Price Tracker",
    category: "research",
    platform: ["Walmart"],
    summary: "Track current price, stock status, and recent changes for Walmart listings.",
    triggers: ["walmart", "price", "stock", "库存", "比价", "追踪", "竞品"],
    capabilities: [
      "Price snapshot",
      "Stock status check",
      "Change comparison"
    ],
    workflow: [
      "Collect product link",
      "Fetch current snapshot",
      "Summarize changes",
      "Highlight actions"
    ],
    outputs: ["Snapshot summary", "Change list", "Action note"],
    starterPrompt: "帮我追踪这个 Walmart 商品的价格和库存状态。",
    systemPrompt: "You track Walmart product pricing snapshots and summarize the current state, changes, and actionable notes."
  },
  {
    id: "listing-optimization",
    name: "Listing Optimization",
    category: "content",
    platform: ["Amazon", "Shopify", "Walmart", "Etsy"],
    summary: "Improve title, bullets, description, and conversion-oriented listing structure.",
    triggers: ["listing", "title", "bullet", "描述", "文案", "优化", "转化", "页面"],
    capabilities: [
      "Title rewrite",
      "Bullet refinement",
      "Conversion-oriented structure"
    ],
    workflow: [
      "Review current copy",
      "Find missing persuasion points",
      "Rewrite by priority",
      "Deliver final listing copy"
    ],
    outputs: ["Optimized title", "Bullets", "Description blocks"],
    starterPrompt: "帮我优化这条 listing 的标题、五点和描述。",
    systemPrompt: "You optimize product listings for clarity, persuasion, and conversion."
  },
  {
    id: "competitor-analysis",
    name: "Competitor Analysis",
    category: "research",
    platform: ["Amazon", "Walmart", "Shopify", "DTC"],
    summary: "Compare competitors, identify gaps, and summarize positioning opportunities.",
    triggers: ["competitor", "竞品", "对手", "分析", "差异", "定位"],
    capabilities: [
      "Position comparison",
      "Gap analysis",
      "Opportunity detection"
    ],
    workflow: [
      "Capture competitor context",
      "Compare pricing and positioning",
      "Identify gaps",
      "Recommend moves"
    ],
    outputs: ["Comparison matrix", "Gap summary", "Action list"],
    starterPrompt: "帮我做一个竞品分析，看看我们可以怎么差异化。",
    systemPrompt: "You compare e-commerce competitors and turn the comparison into concrete positioning opportunities."
  },
  {
    id: "ad-copy-generator",
    name: "Ad Copy Generator",
    category: "marketing",
    platform: ["Meta", "Google", "TikTok", "Amazon Ads"],
    summary: "Generate ad angles, hooks, and copy blocks for paid acquisition.",
    triggers: ["ad", "广告", "文案", "hook", "投放", "素材", "campaign"],
    capabilities: [
      "Angle generation",
      "Hook writing",
      "Copy variation"
    ],
    workflow: [
      "Read offer and audience",
      "Extract angles",
      "Generate copy",
      "Package variants"
    ],
    outputs: ["Hooks", "Primary text", "CTA variants"],
    starterPrompt: "帮我为这个产品生成几组广告文案和角度。",
    systemPrompt: "You generate high-converting ad copy variants for e-commerce paid media."
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
  lastRouteReason: "Initial skill workspace ready.",
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
          content: "欢迎来到 Skill Console。输入业务背景，我会帮你自动路由到合适的 skill，并生成可执行的回答。"
        }
      ]
    }
  ]
};
