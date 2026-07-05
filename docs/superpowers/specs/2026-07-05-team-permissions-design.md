# 团队权限管理系统设计

## 概述

为 Autoforge Hub 的团队空间补充权限管理体系，支持创建者、管理员、普通成员三层角色，以及细粒度的操作权限控制。

## 角色定义

| 角色 | 标识条件 | 说明 |
|------|----------|------|
| **owner** (创建者) | `userId === team.ownerId` | 团队创建者，拥有全部权限 |
| **admin** (管理员) | `userId ∈ settings.adminIds` | 拥有管理权限，可管理成员和脚本 |
| **member** (普通成员) | `userId ∈ team.member_ids` | 按统一配置拥有部分操作权限 |

## 数据模型

### teams 表扩展

在现有 `teams` 表上新增 `settings` 字段：

```sql
ALTER TABLE teams ADD COLUMN settings TEXT NOT NULL DEFAULT '{}';
```

`settings` JSON 结构：

```typescript
interface TeamSettings {
  adminIds: string[]
  memberPermissions: {
    upload: boolean     // 上传脚本
    edit: boolean       // 编辑脚本
    delete: boolean     // 删除脚本
    download: boolean   // 下载脚本
  }
}
```

### 前端类型扩展

```typescript
// Team 接口新增
interface Team {
  // ...existing fields
  settings: TeamSettings
  members?: MemberInfo[]        // 仅详情接口返回
}

interface MemberInfo {
  id: string
  email: string
  displayName: string
  role: 'owner' | 'admin' | 'member'
}

interface TeamSettings {
  adminIds: string[]
  memberPermissions: {
    upload: boolean
    edit: boolean
    delete: boolean
    download: boolean
  }
}
```

### 默认设置

创建团队时 `settings` 默认值：

```json
{
  "adminIds": [],
  "memberPermissions": {
    "upload": true,
    "edit": true,
    "delete": false,
    "download": true
  }
}
```

## 权限矩阵

| 操作 | owner | admin | member |
|------|-------|-------|--------|
| 上传脚本到团队 | ✅ | ✅ | 按 `perms.upload` |
| 编辑自己的脚本 | ✅ | ✅ | 按 `perms.edit` |
| 编辑他人的脚本 | ✅ | ✅ | ❌ |
| 删除自己的脚本 | ✅ | ✅ | 按 `perms.delete` |
| 删除他人的脚本 | ✅ | ✅ | ❌ |
| 下载脚本 | ✅ | ✅ | 按 `perms.download` |
| 踢出成员 | ✅ | ✅ | ❌ |
| 修改成员权限 | ✅ | ❌(仅owner) | ❌ |
| 提升/撤销管理员 | ✅ | ❌ | ❌ |
| 删除团队 | ✅ | ❌ | ❌ |

## API 设计

### 新增接口

#### `PUT /api/teams/:id/settings`
更新团队设置（成员默认权限）。

- **权限**: owner only
- **请求体**:
  ```json
  {
    "memberPermissions": {
      "upload": true,
      "edit": true,
      "delete": false,
      "download": true
    }
  }
  ```
- **响应**: `{ ok: true, settings: TeamSettings }`

#### `PUT /api/teams/:id/members`
成员管理操作。

- **权限**: owner/admin
- **请求体**:
  ```json
  {
    "action": "kick" | "setRole",
    "userId": "uuid",
    "role": "admin" | "member"
  }
  ```
- **操作说明**:
  - `kick`: 踢出成员（admin 不能踢 owner 和其他 admin）
  - `setRole`: 提升/撤销管理员（仅 owner 可操作）
- **响应**: `{ ok: true }`

### 修改的接口

#### `GET /api/teams/:id`
- 返回新增 `settings: TeamSettings`
- 返回 `members` 数组，每项包含 `role` 字段

#### `POST /api/scripts` (上传脚本到团队)
- 若 `teamId` 存在，检查当前用户在该团队的权限：
  - owner/admin → 允许
  - member → 检查 `memberPermissions.upload`

#### `PUT /api/scripts/:id` (编辑脚本)
- 若脚本属于团队：
  - owner/admin → 允许编辑任意脚本
  - member → 只允许编辑自己的脚本 + 检查 `memberPermissions.edit`

#### `DELETE /api/scripts/:id` (删除脚本)
- 若脚本属于团队：
  - owner/admin → 允许删除任意脚本
  - member → 只允许删除自己的脚本 + 检查 `memberPermissions.delete`

#### `GET /api/scripts/:id/download` (下载脚本)
- 若脚本属于团队：
  - owner/admin → 允许下载
  - member → 检查 `memberPermissions.download`

### 工具函数

新增 `server/utils/team-permissions.ts`：

```typescript
function getTeamRole(team: TeamRecord, userId: string): 'owner' | 'admin' | 'member'
function checkMemberPermission(team: TeamRecord, userId: string, permission: keyof MemberPermissions): boolean
```

## UI 设计

### 团队详情页新增区域

#### ① 成员管理面板（owner/admin 可见）
显示团队成员列表，每项包含：头像、名称、角色标签
- owner 看到「提升为管理员」「撤销管理员」「踢出」操作
- admin 看到「踢出成员」操作（不可踢 owner 和 admin）
- 鼠标悬停显示操作按钮

#### ② 权限设置面板（owner 可见）
四个开关分别控制：上传、编辑、删除、下载
- 开关实时生效（调 API 保存）
- 对所有普通成员统一生效

#### ③ 权限感知的 UI 控制
- 无 `upload` 权限 → 隐藏「上传脚本」按钮
- 无 `delete` 权限 → 隐藏脚本卡片的删除按钮
- 无 `download` 权限 → 隐藏下载按钮
- admin 的脚本卡片始终显示编辑和删除按钮

## 现有 Bug 修复（一并处理）

1. **`isTeamMember` 函数错误** — 当前只检查了 owner，需要同时检查 `member_ids`
2. **`getTeamsForUser` 无效过滤** — 当前未使用 `userId` 参数过滤
3. **组件前缀问题** — `teams.vue` 中 `WsCreateTeamModal` 和 `WsJoinTeamModal` 缺少 `Workspace` 前缀

## 实现顺序

1. 数据库迁移（新增 `settings` 字段）
2. 后端工具函数 `team-permissions.ts`
3. 修改 `GET /api/teams/:id` 返回 settings + 角色
4. 新增 `PUT /api/teams/:id/settings`
5. 新增 `PUT /api/teams/:id/members`
6. 修改脚本相关 API 加入权限校验
7. 修复 `isTeamMember`、`getTeamsForUser` 等现有 Bug
8. 前端成员管理面板
9. 前端权限设置面板
10. 前端权限感知的 UI 控制
