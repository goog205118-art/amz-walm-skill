# 电商 Skill 工作台

面向内部少数成员使用的电商 AI Skill 工作台。项目把 `eCommerce-Skills` 这类 Markdown skill 仓库封装成可检索、可路由、可对话、可保存的纯前端应用。

## 功能

- 技能目录、搜索、分类和平台筛选
- 会话创建、切换和本地保存
- 轻量关键词路由和路由原因展示
- 兼容 OpenAI Chat Completions 的前端 API 接入
- 无 API 密钥时提供演示回退
- `SKILL.md` 技能文件导入
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

- 构建命令：`npm run build`
- 输出目录：`dist`

把仓库连接到 Vercel 后即可部署。

## 文档

- [项目策划文档](docs/project-plan.md)
- [执行文档](docs/execution-guide.md)
- [使用逻辑文档](docs/usage-guide.md)

## 安全边界

当前版本为前端直连 API，API 密钥会保存在使用者自己的浏览器缓存中。它适合内部小范围使用，不建议作为公开 SaaS 直接开放。
