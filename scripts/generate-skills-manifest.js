const fs = require("fs");
const path = require("path");

const root = process.cwd();
const sourceDir = path.join(root, "eCommerce-Skills-main");
const readmePath = path.join(sourceDir, "README.md");
const outPath = path.join(root, "skills.manifest.js");

const GROUP_LABELS = [
  ["Competitor Analysis", "竞品分析"],
  ["Pricing & Profitability", "定价与利润"],
  ["Growth & Expansion", "增长与扩张"],
  ["E-Commerce Marketing", "电商营销"],
  ["Listing Optimization", "Listing 优化"],
  ["Advertising", "广告投放"],
  ["Monitoring & Alerts", "监控与预警"],
  ["Supply Chain & Logistics", "供应链物流"],
  ["Operations & Analytics", "运营分析"],
  ["Product Research", "产品调研"],
  ["Platform Guides & Tools", "平台指南工具"]
];

const GROUP_TO_CATEGORY = [
  ["Competitor Analysis", "research"],
  ["Pricing & Profitability", "finance"],
  ["Growth & Expansion", "strategy"],
  ["E-Commerce Marketing", "marketing"],
  ["Listing Optimization", "content"],
  ["Advertising", "marketing"],
  ["Monitoring & Alerts", "operations"],
  ["Supply Chain & Logistics", "operations"],
  ["Operations & Analytics", "operations"],
  ["Product Research", "research"],
  ["Platform Guides & Tools", "operations"]
];

const CATEGORY_FALLBACKS = [
  ["finance", ["profit", "margin", "pricing", "price", "fee", "cost", "利润", "毛利", "定价"]],
  ["marketing", ["ad", "ads", "ppc", "campaign", "affiliate", "influencer", "marketing", "广告", "投放", "营销"]],
  ["content", ["listing", "seo", "copy", "title", "description", "content", "keyword", "文案", "标题"]],
  ["research", ["competitor", "market", "research", "review", "gap", "trend", "竞品", "市场", "调研"]],
  ["operations", ["inventory", "stock", "fulfillment", "shipping", "returns", "monitoring", "analytics", "库存", "履约", "物流"]],
  ["strategy", ["growth", "strategy", "business", "brand", "expansion", "cross-border", "增长", "策略", "扩张"]]
];

const PLATFORM_ALIASES = [
  ["TikTok Shop", ["tiktok shop", "tiktok-shop", "tiktok"]],
  ["Amazon Ads", ["amazon ads"]],
  ["Amazon", ["amazon", "fba"]],
  ["Walmart", ["walmart", "wfs"]],
  ["Shopify", ["shopify", "dtc"]],
  ["Etsy", ["etsy"]],
  ["eBay", ["ebay"]],
  ["WooCommerce", ["woocommerce"]],
  ["Google", ["google", "merchant center", "shopping"]],
  ["Meta", ["meta"]],
  ["DTC", ["dtc", "direct-to-consumer"]],
  ["多渠道", ["multichannel", "omnichannel", "cross-platform", "multi-channel"]]
];

const PLATFORM_FIELD_KEYS = [
  "platform",
  "platforms",
  "marketplace",
  "marketplaces",
  "supported_platform",
  "supported_platforms",
  "sales_channel",
  "sales_channels"
];

const TOOL_ADAPTERS = [
  ["profit-margin-calculator", "profit-margin"],
  ["review-checker", "review-checker"],
  ["product-review-analysis", "review-analysis"],
  ["restock-alert", "restock"],
  ["supply-chain-optimization", "restock"],
  ["competitor-price-analysis", "competitor-price"],
  ["competitor-price-tracker", "competitor-price"]
];

const PHRASE_LABELS = [
  ["ecommerce-marketing-strategy-builder", "电商营销策略生成器"],
  ["ecommerce-email-marketing-builder", "邮件营销方案生成器"],
  ["ecommerce-ppc-strategy-planner", "PPC 策略规划"],
  ["ecommerce-growth-strategy", "电商增长策略"],
  ["cross-border-ecommerce", "跨境电商扩张"],
  ["profit-margin-calculator", "利润率计算器"],
  ["brand-protection", "品牌保护"],
  ["product-differentiation", "产品差异化"],
  ["review-checker", "评论真实性检查"],
  ["supply-chain-optimization", "供应链优化"],
  ["competitor-price-analysis", "竞品价格分析"],
  ["competitor-price-tracker", "竞品价格追踪"],
  ["competitive-pricing-strategy", "竞争定价策略"],
  ["dynamic-pricing-ecommerce", "动态定价策略"],
  ["price-optimization-tool", "价格优化工具"],
  ["ecommerce-competitor-analysis", "电商竞品分析"],
  ["product-review-analysis", "产品评论分析"],
  ["product-description-generator", "产品描述生成"],
  ["product-title-optimization", "产品标题优化"],
  ["product-page-seo", "产品页 SEO"],
  ["ecommerce-keyword-research", "电商关键词调研"],
  ["dropshipping-product-research", "Dropshipping 产品调研"],
  ["market-gap-analysis", "市场空白分析"],
  ["conversion-rate-optimization", "转化率优化"],
  ["ecommerce-ab-testing", "电商 A/B 测试"],
  ["ecommerce-customer-retention", "客户留存策略"],
  ["ecommerce-subscription-model", "订阅模式设计"],
  ["ecommerce-landing-page", "落地页优化"],
  ["ecommerce-checkout-optimization", "结账流程优化"],
  ["ecommerce-returns-management", "退货管理"],
  ["ecommerce-shipping-rates", "运费测算"],
  ["ecommerce-social-media-marketing", "社媒营销策略"],
  ["ecommerce-content-marketing", "内容营销策略"],
  ["ecommerce-video-marketing", "视频营销策略"],
  ["ecommerce-branding", "电商品牌建设"],
  ["ecommerce-business-plan", "电商商业计划"],
  ["ecommerce-personalization", "个性化推荐策略"],
  ["omnichannel-ecommerce", "全渠道电商"],
  ["multichannel-ecommerce", "多渠道电商"],
  ["affiliate-marketing-strategy", "联盟营销策略"],
  ["influencer-outreach", "达人外联"],
  ["google-shopping-optimization", "Google Shopping 优化"],
  ["minimum-advertised-price", "MAP 最低广告价"],
  ["share-of-shelf", "货架份额分析"],
  ["warehouse-optimization", "仓储优化"],
  ["inventory-tracking-software", "库存追踪工具"],
  ["restock-alert", "补货预警"],
  ["sales-tracking-tool", "销售追踪"],
  ["brand-monitoring", "品牌监控"],
  ["review-monitoring", "评论监控"],
  ["social-media-monitor", "社媒监控"],
  ["online-reputation-management", "线上声誉管理"],
  ["api-monitoring", "API 监控"],
  ["domain-monitoring", "域名监控"],
  ["file-integrity-monitoring", "文件完整性监控"],
  ["public-status-page", "公开状态页"],
  ["synthetic-monitoring", "合成监控"],
  ["visual-regression-testing", "视觉回归测试"],
  ["localization-testing", "本地化测试"],
  ["shoppable-video", "可购物视频"]
];

const TOKEN_LABELS = new Map([
  ["amazon", "Amazon"],
  ["walmart", "Walmart"],
  ["shopify", "Shopify"],
  ["etsy", "Etsy"],
  ["ebay", "eBay"],
  ["tiktok", "TikTok"],
  ["woocommerce", "WooCommerce"],
  ["google", "Google"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["seo", "SEO"],
  ["ppc", "PPC"],
  ["dtc", "DTC"],
  ["ecommerce", "电商"],
  ["shop", "店铺"],
  ["seller", "卖家"],
  ["guide", "指南"],
  ["tools", "工具"],
  ["tool", "工具"],
  ["strategy", "策略"],
  ["builder", "生成器"],
  ["optimization", "优化"],
  ["optimize", "优化"],
  ["analysis", "分析"],
  ["analytics", "数据分析"],
  ["research", "调研"],
  ["product", "产品"],
  ["products", "产品"],
  ["listing", "Listing"],
  ["description", "描述"],
  ["title", "标题"],
  ["keyword", "关键词"],
  ["keywords", "关键词"],
  ["advertising", "广告"],
  ["ads", "广告"],
  ["ad", "广告"],
  ["marketing", "营销"],
  ["content", "内容"],
  ["email", "邮件"],
  ["social", "社媒"],
  ["media", "媒体"],
  ["influencer", "达人"],
  ["creator", "达人"],
  ["marketplace", "市场"],
  ["affiliate", "联盟"],
  ["live", "直播"],
  ["pricing", "定价"],
  ["price", "价格"],
  ["profit", "利润"],
  ["margin", "利润率"],
  ["calculator", "计算器"],
  ["competitive", "竞争"],
  ["competitor", "竞品"],
  ["tracker", "追踪"],
  ["tracking", "追踪"],
  ["monitor", "监控"],
  ["monitoring", "监控"],
  ["alerts", "预警"],
  ["alert", "预警"],
  ["review", "评论"],
  ["reviews", "评论"],
  ["checker", "检查"],
  ["branding", "品牌"],
  ["brand", "品牌"],
  ["protection", "保护"],
  ["differentiation", "差异化"],
  ["growth", "增长"],
  ["expansion", "扩张"],
  ["cross", "跨境"],
  ["border", "跨境"],
  ["international", "国际化"],
  ["omnichannel", "全渠道"],
  ["multichannel", "多渠道"],
  ["conversion", "转化"],
  ["rate", "率"],
  ["checkout", "结账"],
  ["landing", "落地页"],
  ["page", "页面"],
  ["pages", "页面"],
  ["ab", "A/B"],
  ["testing", "测试"],
  ["retention", "留存"],
  ["subscription", "订阅"],
  ["inventory", "库存"],
  ["supply", "供应"],
  ["chain", "链"],
  ["fulfillment", "履约"],
  ["shipping", "物流"],
  ["returns", "退货"],
  ["return", "退货"],
  ["warehouse", "仓储"],
  ["restock", "补货"],
  ["speed", "速度"],
  ["theme", "主题"],
  ["app", "应用"],
  ["recommendations", "推荐"],
  ["setup", "设置"],
  ["dropshipping", "Dropshipping"],
  ["cart", "购物车"],
  ["abandonment", "弃购"],
  ["upsell", "加购"],
  ["wholesale", "批发"],
  ["migration", "迁移"],
  ["blog", "博客"],
  ["loyalty", "会员忠诚"],
  ["photography", "摄影"],
  ["tax", "税务"],
  ["compliance", "合规"],
  ["promotions", "促销"],
  ["promotion", "促销"],
  ["trending", "趋势"],
  ["customer", "客户"],
  ["service", "客服"],
  ["feed", "Feed"],
  ["management", "管理"],
  ["business", "商业"],
  ["plan", "计划"],
  ["personalization", "个性化"],
  ["seasonal", "季节性"],
  ["digital", "数字"],
  ["custom", "定制"],
  ["orders", "订单"],
  ["multi", "多"],
  ["star", "星级"],
  ["offsite", "站外"]
]);

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Skill source directory not found: ${sourceDir}`);
}

const readmeIndex = fs.existsSync(readmePath) ? parseReadme(fs.readFileSync(readmePath, "utf8")) : new Map();
const files = walk(sourceDir).filter((file) => path.basename(file).toLowerCase() === "skill.md");
const skills = files.map((file) => buildSkill(file, readmeIndex)).sort(sortSkills);
const defaultSkillId = skills.find((skill) => skill.id === "ecommerce-growth-strategy")?.id || skills[0]?.id || "";

const manifest = `window.SKILL_LIBRARY = ${JSON.stringify(skills, null, 2)};\n\n` +
`window.DEFAULT_SETTINGS = ${JSON.stringify({
  protocol: "openai",
  model: "gpt-5.5",
  models: ["gpt-5.5", "gpt-5.5-mini", "gpt-5.5-vision", "gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"],
  endpoint: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  streamOutput: false,
  capabilities: {
    vision: true,
    fileText: true,
    preserveAttachments: true,
    longContext: true,
    reasoning: true,
    autoContext: true
  },
  protocols: {
    openai: {
      endpoint: "https://api.openai.com/v1/chat/completions"
    },
    gemini: {
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}"
    },
    anthropic: {
      endpoint: "https://api.anthropic.com/v1/messages"
    }
  }
}, null, 2)};\n\n` +
`window.DEFAULT_WORKSPACE = {
  activeSkillId: ${JSON.stringify(defaultSkillId)},
  activeSessionId: "session-1",
  searchText: "",
  categoryFilter: "all",
  platformFilter: "all",
  openGroups: {},
  ui: {
    leftCollapsed: false,
    rightCollapsed: false
  },
  lastRouteReason: "全量 eCommerce Skills 工作区已就绪。",
  settings: window.DEFAULT_SETTINGS,
  customSkills: [],
  sessions: [
    {
      id: "session-1",
      title: "增长路线图",
      skillId: ${JSON.stringify(defaultSkillId)},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          role: "assistant",
          content: "欢迎来到电商 Skill 工作台。左侧已载入全量技能，可按分组展开、搜索并切换；输入业务背景后我会自动路由到合适的技能。"
        }
      ]
    }
  ]
};\n`;

fs.writeFileSync(outPath, manifest, "utf8");
console.log(`Generated ${skills.length} skills into ${path.relative(root, outPath)}`);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function parseReadme(readme) {
  const index = new Map();
  let currentGroup = null;
  let groupOrder = 0;

  for (const line of readme.split(/\r?\n/)) {
    const heading = line.match(/^###\s+(.+?)\s+\((\d+)\s+skills?\)/i);
    if (heading) {
      const raw = heading[1].trim();
      const english = raw.replace(/^[^\w]+/u, "").trim();
      currentGroup = {
        key: slugify(english),
        raw,
        emoji: raw.match(/^[^\w\s]+/u)?.[0] || "",
        label: mapGroupLabel(english),
        english,
        order: groupOrder
      };
      groupOrder += 1;
      continue;
    }

    const row = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!row || !currentGroup || row[1] === "Skill") continue;
    index.set(row[1].trim(), {
      ...currentGroup,
      readmePath: row[2].trim(),
      readmeDescription: row[3].trim(),
      status: row[4].replace(/\s+/g, " ").trim()
    });
  }

  return index;
}

function buildSkill(file, readmeIndex) {
  const markdown = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const relativePath = path.relative(root, file).replaceAll("\\", "/");
  const dirSlug = path.basename(path.dirname(file));
  const frontmatter = parseFrontmatter(markdown);
  const id = slugify(frontmatter.name || dirSlug);
  const readmeMeta = readmeIndex.get(id) || readmeIndex.get(dirSlug);
  const title = extractTitle(markdown) || titleFromSlug(id);
  const description = readmeMeta?.readmeDescription || frontmatter.description || extractSummary(markdown, title);
  const detectedGroupEnglish = readmeMeta?.english || guessGroup(id, markdown);
  const groupEnglish = resolveKnownGroup(id, detectedGroupEnglish);
  const groupOverridden = groupEnglish !== detectedGroupEnglish;
  const groupLabel = groupOverridden ? mapGroupLabel(groupEnglish) : (readmeMeta?.label || mapGroupLabel(groupEnglish));
  const category = resolveKnownCategory(id, mapGroupCategory(groupEnglish) || detectCategory(`${id} ${description} ${markdown}`));
  const platform = detectPlatformsSafe({ id, title, description, frontmatter });
  const capabilities = extractListAfterHeading(markdown, ["capabilities", "what it does", "core capabilities", "能力", "核心能力"]);
  const workflow = extractListAfterHeading(markdown, ["how this skill works", "workflow", "process", "steps", "method", "流程", "方法"]);
  const outputs = extractListAfterHeading(markdown, ["output format", "outputs", "deliverables", "output", "输出"]);
  const starterPrompt = extractUsagePrompt(markdown) || `请使用「${makeChineseName(id, title)}」技能处理我的电商任务。`;
  const sourcePrompt = markdown.length > 9000 ? `${markdown.slice(0, 9000)}\n\n[技能文档已截断用于前端轻量加载]` : markdown;
  const name = makeChineseName(id, title);

  return {
    id,
    name,
    sourceName: title,
    emoji: frontmatter.emoji || readmeMeta?.emoji || "",
    category,
    groupKey: groupOverridden ? slugify(groupEnglish) : (readmeMeta?.key || slugify(groupEnglish)),
    groupName: groupEnglish,
    groupLabel,
    groupEmoji: groupOverridden ? "" : (readmeMeta?.emoji || ""),
    groupOrder: groupOverridden ? getGroupOrder(groupEnglish) : (readmeMeta?.order ?? getGroupOrder(groupEnglish)),
    platform,
    status: normalizeStatus(readmeMeta?.status),
    summary: buildChineseSummary(name, groupLabel, platform),
    sourceSummary: trimText(description, 360),
    triggers: buildTriggers(id, title, description, platform, category, groupLabel),
    routing: buildRoutingMetadata(id, title, description, platform, category, groupLabel, capabilities),
    toolAdapter: detectToolAdapter(id, relativePath),
    capabilities: capabilities.length ? capabilities : fallbackCapabilities(category),
    workflow: workflow.length ? workflow : ["读取业务背景与约束", "套用技能方法做诊断", "输出可执行建议与下一步动作"],
    outputs: outputs.length ? outputs : ["结构化分析", "行动清单", "关键假设"],
    starterPrompt,
    systemPrompt: [
      `你正在使用 Skill：${title}。`,
      `中文名称：${name}。`,
      `分组：${groupLabel}。平台：${platform.join(" / ")}。`,
      "请以中文回答，优先给出可执行结论、步骤、风险和需要补充的信息。",
      "以下是原始 Skill 文档：",
      sourcePrompt
    ].join("\n\n"),
    sourcePath: relativePath
  };
}

function buildChineseSummary(name, groupLabel, platform) {
  const platformText = platform.length ? platform.join(" / ") : "电商";
  return `用于 ${platformText} 场景的「${name}」技能，聚焦${groupLabel}任务，帮助把业务背景转成诊断、建议和可执行动作。`;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const block = match[1];
  const parsed = parseSimpleYaml(block);
  const nexscope = parsed.nexscope && typeof parsed.nexscope === "object" ? parsed.nexscope : {};
  return {
    ...parsed,
    name: parsed.name || nexscope.name || "",
    description: parsed.description || nexscope.description || "",
    emoji: parsed.emoji || nexscope.emoji || ""
  };
}

function parseSimpleYaml(block) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  let activeList = null;
  const lines = block.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^\s*/)[0].length;
    const content = line.trim();
    const listMatch = content.match(/^-\s*(.*)$/);
    if (listMatch && activeList && indent > activeList.indent) {
      activeList.value.push(parseYamlValue(listMatch[1]));
      continue;
    }

    const pair = content.match(/^([^:#][^:]*):(?:\s*(.*))?$/);
    if (!pair) continue;
    const key = pair[1].trim();
    const rawValue = pair[2] || "";

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].value;
    if (!rawValue) {
      const next = lines
        .slice(index + 1)
        .find((candidate) => candidate.trim() && !candidate.trim().startsWith("#"));
      const nextIndent = next ? next.match(/^\s*/)[0].length : -1;
      const value = next && nextIndent > indent && next.trim().startsWith("- ") ? [] : {};
      parent[key] = value;
      stack.push({ indent, value });
      activeList = Array.isArray(value) ? { indent, value } : null;
      continue;
    }

    const value = parseYamlValue(rawValue);
    parent[key] = value;
    activeList = Array.isArray(value) ? { indent, value } : null;
  }

  return root;
}

function parseYamlValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
    try {
      return JSON.parse(text.replaceAll("'", '"'));
    } catch {
      return text
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
  }
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === "true";
  return text.replace(/^["']|["']$/g, "").trim();
}

function extractTitle(markdown) {
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  const heading = markdown.match(/^#{2,6}\s+(.+)$/m);
  return heading ? heading[1].trim() : "";
}

function extractSummary(markdown, title) {
  const body = markdown.replace(/^---\n[\s\S]*?\n---/, "");
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("*") && !line.startsWith("```"));
  return lines.find((line) => line.length > 50) || `来自 eCommerce-Skills 的 ${title} 技能。`;
}

function extractListAfterHeading(markdown, headings) {
  const lines = markdown.split("\n");
  const results = [];
  let collecting = false;
  let sawContent = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const text = heading[1].toLowerCase();
      if (collecting && sawContent) break;
      collecting = headings.some((item) => text.includes(item.toLowerCase()));
      sawContent = false;
      continue;
    }
    if (!collecting) continue;
    if (/^[-*]\s+/.test(trimmed)) {
      results.push(trimText(trimmed.replace(/^[-*]\s+/, "").replace(/\*\*/g, "").trim(), 220));
      sawContent = true;
    } else if (/^\d+[.)]\s+/.test(trimmed)) {
      results.push(trimText(trimmed.replace(/^\d+[.)]\s+/, "").replace(/\*\*/g, "").trim(), 220));
      sawContent = true;
    } else if (trimmed && !trimmed.startsWith("```")) {
      sawContent = true;
    }
    if (results.length >= 8) break;
  }
  return [...new Set(results)].filter(Boolean);
}

function extractUsagePrompt(markdown) {
  const usage = markdown.match(/##\s+Usage([\s\S]*?)(?:\n##\s+|\n---|$)/i);
  if (!usage) return "";
  const fenced = usage[1].match(/```(?:[a-z]+)?\n([\s\S]*?)```/i);
  const text = (fenced ? fenced[1] : usage[1]).trim().replace(/\s+/g, " ");
  return text ? trimText(text, 180) : "";
}

function detectPlatforms(text) {
  const lower = text.toLowerCase();
  const matches = PLATFORM_ALIASES
    .filter(([, aliases]) => aliases.some((alias) => lower.includes(alias)))
    .map(([name]) => name);
  return matches.length ? [...new Set(matches)].slice(0, 6) : ["电商"];
}

function detectPlatformsSafe({ id, title, description, frontmatter }) {
  const explicit = collectPlatformFields(frontmatter);
  const explicitMatches = normalizePlatformValues(explicit);
  if (explicitMatches.length) return explicitMatches;

  const controlledText = `${id} ${title}`;
  const inferred = PLATFORM_ALIASES
    .filter(([, aliases]) => aliases.some((alias) => hasControlledToken(controlledText, alias)))
    .map(([name]) => name);
  return inferred.length ? [...new Set(inferred)].slice(0, 6) : ["\u7535\u5546"];
}

function collectPlatformFields(frontmatter) {
  const values = [];
  const nested = frontmatter?.nexscope && typeof frontmatter.nexscope === "object" ? frontmatter.nexscope : {};
  for (const key of PLATFORM_FIELD_KEYS) {
    if (frontmatter && frontmatter[key] !== undefined) values.push(frontmatter[key]);
    if (nested[key] !== undefined) values.push(nested[key]);
  }
  return values.flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean);
}

function normalizePlatformValues(values) {
  const result = [];
  for (const value of values) {
    const text = String(value).trim().toLowerCase();
    const match = PLATFORM_ALIASES.find(([, aliases]) =>
      aliases.some((alias) => text === alias || text.includes(alias))
    );
    if (match) result.push(match[0]);
  }
  return [...new Set(result)].slice(0, 6);
}

function hasControlledToken(text, alias) {
  const lower = String(text || "").toLowerCase();
  if (/^[a-z0-9 -]+$/i.test(alias)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`, "i").test(lower);
  }
  return lower.includes(alias.toLowerCase());
}

function buildRoutingMetadata(id, title, description, platform, category, groupLabel, capabilities) {
  const source = `${id} ${title} ${description} ${groupLabel}`.toLowerCase();
  const phraseMap = [
    ["listing title keyword optimization", ["listing title", "title keyword", "标题关键词", "标题优化", "listing标题"]],
    ["influencer selling", ["tiktok influencer", "creator selling", "达人带货", "达人推广", "网红带货", "influencer marketing"]],
    ["restock planning", ["stockout", "restock", "reorder point", "快断货", "补货", "安全库存", "再订货点"]],
    ["profit calculation", ["profit margin", "profit calculator", "利润", "毛利", "净利", "利润率"]],
    ["review authenticity", ["review checker", "fake review", "评论检测", "评论真实性", "刷评"]],
    ["competitor pricing", ["competitor price", "price tracking", "竞品价格", "竞品售价", "价格追踪"]]
  ];
  const phrases = phraseMap
    .filter(([, variants]) => variants.some((variant) => source.includes(variant.toLowerCase())))
    .flatMap(([, variants]) => variants);
  if (/product-title-optimization/.test(id)) {
    phrases.push("listing title", "title keyword", "标题关键词", "标题优化", "listing标题");
  }
  if (/product-page-seo/.test(id)) {
    phrases.push("product page seo", "listing seo", "listing seo optimization");
  }
  if (/ecommerce-keyword-research/.test(id)) {
    phrases.push("keyword research", "search keywords", "keyword research optimization");
  }
  if (/influencer-outreach|influencer-marketing/.test(id)) {
    phrases.push("tiktok influencer", "creator selling", "达人带货", "达人推广", "网红带货", "influencer marketing");
  }
  if (/restock-alert|inventory-tracking|supply-chain-optimization/.test(id)) {
    phrases.push("stockout", "restock", "reorder point", "快断货", "补货", "安全库存", "再订货点");
  }
  const tokens = source
    .split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/)
    .filter((token) => token.length >= 2)
    .slice(0, 40);

  return {
    phrases: [...new Set(phrases)],
    tokens: [...new Set(tokens)],
    platformHints: platform,
    category,
    intent: inferIntent(id, source),
    capabilities: (capabilities || []).slice(0, 8)
  };
}

function inferIntent(id, source) {
  const normalizedId = String(id || "").toLowerCase();
  if (/restock|reorder|inventory-tracking|supply-chain/.test(normalizedId)) return "restock";
  if (/influencer|creator|affiliate/.test(normalizedId)) return "influencer";
  if (/competitor-price/.test(normalizedId) || /competitor price|price tracking|竞品价格|竞品售价|价格追踪/.test(source)) return "competitor-price";
  if (/profit|margin|pricing|price/.test(normalizedId)) return "profit";
  if (/review|feedback/.test(normalizedId)) return "review";
  if (/product-title|product-page-seo|keyword/.test(normalizedId)) return "listing-title";
  const known = [
    ["title", "listing-title"],
    ["keyword", "keyword-research"],
    ["influencer", "influencer"],
    ["affiliate", "affiliate"],
    ["restock", "restock"],
    ["inventory", "inventory"],
    ["profit", "profit"],
    ["margin", "profit"],
    ["review", "review"],
    ["competitor-price", "competitor-price"],
    ["price", "pricing"],
    ["supply-chain", "supply-chain"],
    ["shipping", "shipping"],
    ["ads", "advertising"],
    ["marketing", "marketing"]
  ];
  return known.find(([token]) => id.includes(token) || source.includes(token))?.[1] || "ecommerce";
}

function resolveKnownGroup(id, fallback) {
  const normalizedId = String(id || "").toLowerCase();
  if (/restock|reorder|inventory-tracking|supply-chain/.test(normalizedId)) return "Supply Chain & Logistics";
  if (/influencer|creator|affiliate/.test(normalizedId)) return "E-Commerce Marketing";
  if (/competitor-price/.test(normalizedId)) return "Competitor Analysis";
  if (/profit|margin|pricing|price/.test(normalizedId)) return "Pricing & Profitability";
  if (/review|feedback|competitor/.test(normalizedId)) return "Competitor Analysis";
  if (/product-title|product-page-seo|keyword/.test(normalizedId)) return "Listing Optimization";
  return fallback;
}

function resolveKnownCategory(id, fallback) {
  const normalizedId = String(id || "").toLowerCase();
  if (/restock|reorder|inventory-tracking|supply-chain/.test(normalizedId)) return "operations";
  if (/influencer|creator|affiliate/.test(normalizedId)) return "marketing";
  if (/competitor-price/.test(normalizedId)) return "research";
  if (/profit|margin|pricing|price/.test(normalizedId)) return "finance";
  if (/review|feedback|competitor/.test(normalizedId)) return "research";
  if (/product-title|product-page-seo|keyword/.test(normalizedId)) return "content";
  return fallback;
}

function detectToolAdapter(id, relativePath) {
  const match = TOOL_ADAPTERS.find(([prefix]) => id === prefix || id.startsWith(`${prefix}-`) || relativePath.includes(`/${prefix}/`));
  return match ? match[1] : "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  const hit = CATEGORY_FALLBACKS.find(([, tokens]) => tokens.some((token) => lower.includes(token.toLowerCase())));
  return hit ? hit[0] : "operations";
}

function mapGroupLabel(groupEnglish) {
  const hit = GROUP_LABELS.find(([english]) => groupEnglish.includes(english));
  return hit ? hit[1] : groupEnglish || "其他技能";
}

function getGroupOrder(groupEnglish) {
  const index = GROUP_LABELS.findIndex(([english]) => groupEnglish.includes(english));
  return index >= 0 ? index : 999;
}

function mapGroupCategory(groupEnglish) {
  const hit = GROUP_TO_CATEGORY.find(([english]) => groupEnglish.includes(english));
  return hit ? hit[1] : "";
}

function guessGroup(id, markdown) {
  const text = `${id} ${markdown.slice(0, 1200)}`.toLowerCase();
  if (/review|competitor/.test(text)) return "Competitor Analysis";
  if (/profit|margin|pricing|price/.test(text)) return "Pricing & Profitability";
  if (/growth|brand-protection|differentiation|cross-border|business-plan/.test(text)) return "Growth & Expansion";
  if (/marketing|email|content|influencer|affiliate|video|branding|social/.test(text)) return "E-Commerce Marketing";
  if (/listing|seo|description|title|keyword/.test(text)) return "Listing Optimization";
  if (/ads|advertising|ppc|shopping/.test(text)) return "Advertising";
  if (/monitor|alert|status|integrity|regression|testing/.test(text)) return "Monitoring & Alerts";
  if (/supply|shipping|warehouse|inventory|fulfillment|returns|restock/.test(text)) return "Supply Chain & Logistics";
  if (/research|trend|gap/.test(text)) return "Product Research";
  return "Operations & Analytics";
}

function normalizeStatus(status) {
  if (!status) return "可用";
  if (/beta/i.test(status)) return "Beta";
  if (/available/i.test(status)) return "可用";
  return status.replace(/✅|🔶/g, "").trim() || "可用";
}

function makeChineseName(id, sourceTitle) {
  const phrase = PHRASE_LABELS.find(([key]) => id === key || id.includes(key));
  if (phrase) {
    const suffix = id
      .replace(phrase[0], "")
      .split("-")
      .filter(Boolean)
      .map((token) => TOKEN_LABELS.get(token) || titleCase(token))
      .join(" ");
    return suffix ? `${suffix} ${phrase[1]}` : phrase[1];
  }

  const tokens = id.split("-").filter(Boolean);
  const translated = tokens.map((token) => TOKEN_LABELS.get(token) || titleCase(token));
  const name = translated.join(" ").replace(/\s+(店铺|策略|优化|分析|调研|管理|指南|工具|营销)/g, "$1");
  return name || sourceTitle || id;
}

function buildTriggers(id, title, description, platform, category, groupLabel) {
  const seed = [id, title, description, category, groupLabel, ...platform].join(" ").toLowerCase();
  const tokens = seed
    .split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/)
    .filter((token) => token.length > 2)
    .slice(0, 32);
  return [...new Set([...tokens, ...platform, groupLabel, category])];
}

function fallbackCapabilities(category) {
  const defaults = {
    finance: ["测算利润、费用和关键假设", "分析价格敏感性", "输出盈亏平衡建议"],
    marketing: ["梳理目标人群和投放目标", "生成营销动作与素材角度", "输出执行计划和指标"],
    content: ["优化商品页面表达", "提炼关键词和卖点", "输出可直接使用的内容"],
    research: ["收集并对比市场信息", "识别机会、风险和差异点", "输出调研结论"],
    strategy: ["诊断业务现状", "排序增长机会", "制定阶段性路线图"],
    operations: ["梳理运营数据与流程", "识别瓶颈和风险", "输出可执行动作"]
  };
  return defaults[category] || defaults.operations;
}

function sortSkills(a, b) {
  if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
  return a.name.localeCompare(b.name, "zh-CN");
}

function titleFromSlug(slug) {
  return slug.split("-").map(titleCase).join(" ");
}

function titleCase(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
}

function trimText(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
