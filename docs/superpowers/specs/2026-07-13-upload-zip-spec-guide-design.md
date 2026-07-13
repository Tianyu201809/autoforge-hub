# 上传脚本 · zip 规格说明引导设计

> 日期：2026-07-13  
> 状态：已评审待实现  
> 依据规范：[script-spec.md](../../autoforge-spec-doc/script-spec.md)（zip 分发 / 最小示例 / 清单必填）

## 背景与目标

用户在 Hub「上传脚本」弹窗（`WsUploadModal`）中导入 `.zip` 时，缺少对脚本包规格的即时说明，容易上传不符合规范的包。

**目标：** 在上传弹窗右侧提供「规格说明」Tab，用 GSAP 高级入场动画展示 **zip 分发核心要求**，内容严格对齐 `script-spec.md`，帮助用户在上传前自检。

**非目标：** 不在此面板展开 env/params、`run(ctx)`、Python 运行时等完整规范；不改变实际上传校验逻辑（仍仅校验 `.zip` 与 20MB）。

## 决策摘要

| 项 | 结论 |
|----|------|
| 位置 | 上传弹窗右侧面板 |
| 与说明书共存 | Tab 切换：`规格说明` \| `说明书` |
| 默认 Tab | `规格说明` |
| 内容深度 | 仅 zip 分发核心 |
| 实现路径 | 新建 `WsZipSpecGuide.vue` + 改造 `WsUploadModal`；依赖 `gsap` |
| 动效 | 切换到规格 Tab 时播放 GSAP timeline；再次切回可短时重播 |

## 架构

```
WsUploadModal.vue
├── 左侧：现有表单 + zip 上传区（不变）
└── 右侧：pane tabs
    ├── Tab「规格说明」→ WsZipSpecGuide.vue（ClientOnly + GSAP）
    └── Tab「说明书」→ 现有 Markdown 编辑 / 预览
```

### 组件职责

**`WsZipSpecGuide.vue`**

- 展示 zip 规格引导文案与结构示意
- 在 `onMounted` / Tab 变为可见时启动 GSAP timeline
- Tab 隐藏时 `kill` timeline，避免后台动画与内存泄漏
- 内容为规范静态文案；仅接收 `active: boolean`（Tab 是否可见）以控制 timeline 播放 / kill

**`WsUploadModal.vue`**

- 右侧头改为 Tab 控件（规格说明 | 说明书）
- `paneTab: 'spec' | 'docs'`，默认 `'spec'`
- `spec` 时渲染 `WsZipSpecGuide`；`docs` 时渲染现有说明书 UI
- 说明书侧「编辑 / 预览」子 Tab 保留在 docs 面板内部

## UI 内容（必须对齐规范）

文案与示意须来自 `script-spec.md`，不得编造字段或布局规则。

### 1. 总述

- 导入的 zip 须**严格按脚本包规范**生成
- Autoforge 脚本是目录包，须含 `autoforge.json` 与入口文件；入口须导出 `run`
- Hub 以 zip 传递；解压后须能定位到含 `autoforge.json` 的包根

### 2. 布局支持表

| 布局 | 是否支持 |
|------|----------|
| zip 根目录直接含 `autoforge.json` + 入口文件 | ✅ |
| zip 内仅一层目录，该目录含 `autoforge.json` | ✅ |
| 多顶层目录、或缺少 `autoforge.json` | ❌ |

### 3. 最小包结构

```
my-script/
├── autoforge.json
├── README.md          ← 可选
└── index.mjs
```

说明：若有 README，须与 `autoforge.json` 位于同一包根一并打入 zip；`readme.md` / 子目录 README / 清单声明路径 — 不支持。

### 4. 清单最低示意

展示最小 `autoforge.json` 要点（与规范最小示例一致）：

- 必填语义：`autoforge`（`"1.0"`）、`name`
- 常用：`entry`（默认 `index.mjs`）、`description`、`version`

不在本面板展开完整字段表。

### 5. 禁止项与平台限制

- 不要把 `node_modules/`、`.venv/` 打进分发 zip（依赖由本机按清单安装）
- Hub 上传：仅 `.zip`，最大 20MB（与现有 `WsUploadModal` 校验一致）

## GSAP 动效规格

**触发：** `paneTab === 'spec'` 且面板已挂载（含首次打开弹窗）。

**Timeline（建议时长合计 ~0.9–1.2s）：**

1. 面板背景 / 网格氛围：`opacity 0→1`，轻微 `scale 0.98→1`
2. 总述标题与副文案：stagger 上浮（`y: 12→0`）
3. 支持 / 不支持双卡：从左右滑入并对齐
4. 目录树各行：依次点亮（或逐行 fade-in）
5. 底部 chips（禁止项 / 限制）：依次 `scale` 弹出

**约束：**

- 尊重 `prefers-reduced-motion`：降级为瞬时显示或极短 fade
- 切到「说明书」时 kill timeline；再切回规格时重播（可跳过背景段，仅内容 stagger，避免过长）
- 动画仅视觉，不阻塞表单填写与上传

## 依赖与工程

- `npm install gsap`
- 在客户端组件中使用（Nuxt：`WsZipSpecGuide` 建议包在 `ClientOnly` 内，或组件内 `import.meta.client` 守卫）
- 样式：沿用现有 CSS 变量（`--accent`、`--bg-*`、`--border` 等），与上传弹窗视觉语言一致；避免引入无关新主题

## 错误处理与边界

- GSAP 加载失败：规格内容仍静态可见，无动画
- 弹窗关闭：组件卸载时清理 timeline / 监听
- 不新增上传失败文案（规范不符仍由后续安装/校验链路处理）；本功能仅为引导

## 测试要点

- [ ] 打开上传弹窗默认落在「规格说明」，可见 zip 核心说明与动画
- [ ] 切换「说明书」可编辑/预览 Markdown；再切回规格动画可重播
- [ ] 内容与 `script-spec.md` zip 分发 / 最小示例一致（无多余字段叙事）
- [ ] `prefers-reduced-motion` 下无大幅位移动画
- [ ] 上传校验行为不变（`.zip`、20MB）
- [ ] 关闭弹窗无控制台报错 / 无残留 timer

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `package.json` / lock | 新增 `gsap` |
| `app/components/workspace/WsZipSpecGuide.vue` | 新建 |
| `app/components/workspace/WsUploadModal.vue` | 右侧 Tab + 接入 Guide |

## 明确不做

- 不把完整 script-spec 搬进面板
- 不实现 zip 内容解析 / 前端结构校验
- 不改动说明书 Markdown 能力本身
