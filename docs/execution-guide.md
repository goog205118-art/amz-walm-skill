# Nexscope Skill Console 执行文档

## 1. 执行目标

按照项目策划文档完成一个可部署到 Vercel 的静态前端应用。应用需要支持 skill 目录、对话、路由、本地缓存、API 前端接入、Markdown skill 导入和工作区备份。

## 2. 技术路线

当前阶段选择原生前端：
- `index.html`：页面结构
- `styles.css`：布局和视觉
- `skills.manifest.js`：内置 skill 数据
- `app.js`：状态、渲染、路由、模型调用
- `scripts/build.js`：Vercel 构建复制脚本
- `vercel.json`：部署配置

不引入框架的原因：
- 部署轻
- 迁移方便
- 内部成员可直接打开 HTML 试用
- 后续要迁移 Vue/React 也不难

## 3. 阶段拆解

### Step 1. 文档与目录

交付：
- `docs/project-plan.md`
- `docs/execution-guide.md`
- `README.md`

验收：
- 文档能说明项目定位、功能边界、部署方式
- 新成员能根据文档理解下一步开发路径

### Step 2. 静态页面骨架

交付：
- 顶部设置区
- 左侧 skill 目录
- 中间对话区
- 右侧 skill 详情区

验收：
- 页面直接打开不报错
- 宽屏和窄屏均可使用
- UI 不依赖后端

### Step 3. Skill 数据层

交付：
- 内置 manifest
- 搜索
- 分类筛选
- skill 详情渲染
- 自定义 skill 存储

验收：
- 能检索到指定 skill
- 能从 `SKILL.md` 导入新 skill
- 刷新后自定义 skill 不丢失

### Step 4. 会话与缓存

交付：
- 新建会话
- 切换会话
- 消息保存
- 设置保存
- 工作区导入导出

验收：
- 刷新后会话仍存在
- 导出的 JSON 可重新导入
- API Key 和 endpoint 能保存

### Step 5. 路由器

交付：
- 本地关键词路由
- 路由原因展示
- 无匹配时回退当前 skill

验收：
- 输入“增长/AOV/转化”路由到增长策略
- 输入“利润/成本/毛利”路由到利润计算
- 输入“Walmart 价格/库存”路由到价格追踪

### Step 6. 模型接入

交付：
- OpenAI-compatible Chat Completions API
- 可配置 model
- 可配置 endpoint
- API 失败 fallback

验收：
- 有 API Key 时可以调用模型
- 无 API Key 时 demo fallback 仍返回结构化结果
- API 错误不会破坏会话

### Step 7. Vercel 部署准备

交付：
- `package.json`
- `scripts/build.js`
- `vercel.json`
- `.gitignore`

验收：
- `npm run build` 成功
- `dist` 目录包含静态产物
- Vercel 可识别输出目录

### Step 8. GitHub 推送

交付：
- 初始化 git
- 添加 remote `https://github.com/goog205118-art/amz-walm-skill.git`
- commit
- push 到 `main`

验收：
- GitHub 仓库可看到最新代码
- Vercel 可从仓库部署

## 4. 文件职责

| 文件 | 职责 |
| --- | --- |
| `index.html` | 页面骨架和控件 |
| `styles.css` | 响应式布局和视觉风格 |
| `app.js` | 应用状态、渲染、路由、API 调用 |
| `skills.manifest.js` | 内置 skill 库和默认工作区 |
| `scripts/build.js` | 构建复制静态文件 |
| `vercel.json` | Vercel 配置 |
| `docs/project-plan.md` | 产品策划 |
| `docs/execution-guide.md` | 执行步骤 |

## 5. 测试清单

本地测试：
- `node --check app.js`
- `node --check skills.manifest.js`
- `npm run build`

人工测试：
- 打开页面
- 搜索 skill
- 新建会话
- 发送消息
- 导入 workspace
- 导出 workspace
- 导入 `SKILL.md`
- 刷新页面确认数据存在

## 6. 后续迭代

第二阶段建议：
- IndexedDB 替换 localStorage
- Skill 编辑器
- 多 skill workflow 编排
- 批量任务执行
- 后端 API proxy
- 团队共享空间

