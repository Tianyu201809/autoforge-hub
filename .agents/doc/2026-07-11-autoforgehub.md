# Documentation Report: AutoforgeHub (default /doc)

**Date:** 2026-07-11  
**Project Type:** CODING (Nuxt 4 + Nitro API)

## Coverage

| 类别 | 可文档化项 | 已文档（API 目录） | 覆盖率（粗估） |
|------|------------|-------------------|---------------|
| Composables (`app/composables/*.ts`) | 9 | 4（HubFilters / Theme / AutoforgeBridge / Tip） | ~44% |
| Server API routes (`server/api/**`) | ~30 | 1 专题文档（hub-local-install）+ 设计规格若干 | ~3–10% 端点级 |
| Code map | 1 | 1（已补 Workspace & Local Install） | 结构过时但仍可用 |

**整体：** 门户期文档（Hub mock）较完整；后端工作区 / Auth / Teams 端点级 API 文档缺口大。本次优先补齐刚落地的 Local Install。

## Generated / Updated

- `docs/api/hub-local-install.md` — **新建** install-token、download 双路径、token util、桌面桥契约
- `docs/api/composables.md` — 展开 `useAutoforgeBridge`、新增 `useTip`
- `docs/README.md` — 索引增加 Local Install / Deploy / composables 列表
- `docs/code-map/overview.md` — 追加 Workspace & Local Install 路标

## Gaps Found

- `useAuth` / `useScripts` / `useTeams` / `useAuditLogs` / `useClipboard` 无 composable API 文档
- Auth（login / register / forgot-reset / change-password）、Teams、Scripts CRUD、quota/captcha 等缺少 `docs/api/*` 端点文档
- `docs/code-map/overview.md` 主体仍描述「纯前端 MVP + mock」，与现网后端不符（仅追加小节，未全量重写）
- `docs/architecture/components.md` 未覆盖 `WsScriptCard` / `AfGlobalTip`

## Validation Issues

- README「当前数据层」仍写仅 mock、未接后端 — **过时**（未在本次改正文，仅扩目录表）
- Code map Overview 首段「无服务端 API」— **过时**（已用补充节缓解）

## Next Steps

- [ ] 为 `useAuth` / `useScripts` / `useTeams` 写 composables 文档
- [ ] 新增 `docs/api/auth.md`、`docs/api/scripts.md`、`docs/api/teams.md`
- [ ] 重写 `docs/code-map/overview.md` 与 `docs/README.md` 数据层描述，对齐 Nitro + SQLite/OSS 现状
- [ ] 在 `architecture/components.md` 登记工作区卡片与全局 tip
