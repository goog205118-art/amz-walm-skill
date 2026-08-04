# Nexscope Skill Console

面向内部少数成员使用的电商 AI Skill 工作台。项目把 `eCommerce-Skills` 这类 Markdown skill 仓库封装成可检索、可路由、可对话、可保存的纯前端应用。

## 功能

- Skill 目录、搜索、分类和平台筛选
- 会话创建、切换和本地保存
- 轻量关键词路由和路由原因展示
- OpenAI-compatible Chat Completions 前端接入
- 无 API Key 时提供 demo fallback
- `SKILL.md` 文件导入
- 工作区 JSON 导入导出
- Vercel 静态部署

## 本地使用

直接打开 `index.html` 即可。

也可以构建并预览：

```bash
npm run check
npm run build
```

## Vercel 部署

Vercel 配置已包含在 `vercel.json`：

- Build Command: `npm run build`
- Output Directory: `dist`

把仓库连接到 Vercel 后即可部署。

## 文档

- [项目策划文档](docs/project-plan.md)
- [执行文档](docs/execution-guide.md)

## 安全边界

当前版本为前端直连 API，API Key 会保存在使用者自己的浏览器缓存中。它适合内部小范围使用，不建议作为公开 SaaS 直接开放。

