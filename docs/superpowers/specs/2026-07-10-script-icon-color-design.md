# Script Icon Color Design

> 在脚本上传/编辑时，为图标设置自定义颜色

## 背景

当前脚本只有图标选择（`WsIconPicker` 从预定义列表中选 Lucide 图标），图标颜色固定为 CSS 变量 `var(--accent)`。Hub 页面（`HubItemCard`）已支持 `iconColor`，但脚本模块尚未接入。

## 目标

- 上传/编辑脚本时，用户可为图标选择一个颜色
- 脚本卡片（`WsScriptCard`）展示所选颜色
- 图标颜色随脚本数据存储、查询、分享、复制

## 数据结构

### Script 类型扩展

```ts
// app/types/workspace.ts
export interface Script {
  // ... 现有字段
  icon: string
  iconColor?: string  // 新增，hex 颜色值，如 "#3b82f6"，未设置时使用主题色
}
```

### 数据库扩展

`scripts` 表新增列：

- `icon_color` — TEXT, nullable, 默认 NULL

```sql
ALTER TABLE scripts ADD COLUMN icon_color TEXT DEFAULT NULL;
```

### Server API 返回

所有返回 Script 对象的端点均增加 `iconColor` 字段：

- `GET /api/scripts` — ✅ 从 `row.icon_color` 读取
- `POST /api/scripts` — 上传时从 form data 接收 `iconColor`
- `PUT /api/scripts/[id]` — 编辑时从 body 接收 `iconColor`
- `POST /api/scripts/[id]/share` — 分享时透传 `icon_color`
- `POST /api/scripts/[id]/copy` — 复制时透传 `icon_color`

## 组件设计

### WsIconPicker 扩展

**Props / v-model：**

- `modelValue: string`（图标 ID，现有）
- `color: string | undefined`（新增 v-model，`undefined` = 未选色，使用主题色）

**调色板（20 色）：**

```ts
const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#64748b', '#71717a',
]
```

**UI 变化：**

- 图标网格下方增加色块行
- 色块圆形，点击选中；再次点击已选中的色块取消选择（回退到无颜色）
- 选中态显示白色勾或醒目边框
- 无颜色态显示一个"透明/主题色"示意块，表示使用默认主题色

### WsScriptCard 适配

- 卡片图标 `<Icon>` 增加内联 `color` 样式：
  - 如果 `script.iconColor` 存在 → `color: script.iconColor`
  - 否则 → 使用当前 CSS `var(--accent)`
- 预览区背景淡色 tint 可考虑跟随 `iconColor`（类似 HubItemCard 的 `--card-preview-tint`）

### WsEditModal / WsUploadModal

- `WsIconPicker` 调用处增加 `v-model:color` 绑定
- 编辑时从 `script.iconColor` 初始化
- 上传时初始化为 `undefined`
- 表单提交 payload 中包含 `iconColor`

## 数据流

```
上传表单 → WsIconPicker(icon, color)
  → WsUploadModal emit(uploaded.payload.iconColor)
  → fetch POST /api/scripts (FormData 含 iconColor)
  → DB INSERT scripts.icon_color
  → GET /api/scripts 返回 iconColor
  → WsScriptCard 渲染图标颜色

编辑表单 → WsIconPicker(icon, color)
  → WsEditModal emit(saved.payload.iconColor)
  → fetch PUT /api/scripts/[id] (JSON 含 iconColor)
  → DB UPDATE scripts.icon_color
  → 同上渲染
```

## 向后兼容

- 已有脚本的 `icon_color` 为 NULL，卡片回退到 `var(--accent)`，行为不变
- 未使用 color 功能的 WsIconPicker 保持纯图标模式
- 分享/复制脚本时，如果源脚本没有 iconColor，目标脚本也保持 NULL

## 未涉及

- Hub 页面的 `HubItemCard` 颜色系统已存在（`iconColor?`），本设计仅对齐脚本模块
- 不修改团队卡片（`WsTeamCard`）的图标颜色
- 不引入渐变/多色图标支持

## 实现要点

1. **数据库迁移**：因为使用 SQLite + drizzle，手动执行 ALTER TABLE 或直接修改 schema.ts 并重建
2. **Server 端透传**：upload 和 edit 端点需显式处理 `icon_color` 字段
3. **组件 v-model**：`WsIconPicker` 使用双 v-model（`modelValue` + `color`）确保解耦
4. **颜色选择器的 UI**：支持选中/取消选中，选中态需清晰可见
