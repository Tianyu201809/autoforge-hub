# ZIP 根目录 README 自动导入说明书设计

## 目标

当用户上传的脚本 ZIP 根目录包含大小写精确匹配的 `README.md` 时，将其内容带入脚本的“说明书”字段。说明书已有内容时，前端必须弹框询问是否覆盖；用户取消则保留原内容。

## 范围与约束

- 仅识别 ZIP 根路径下的 `README.md`，不识别 `readme.md`、子目录 README 或其他路径。
- README 解析失败、ZIP 损坏或 README 不存在时，不阻塞原有上传流程。
- 继续遵守服务端现有 50000 字符限制。
- 工作区上传弹窗与集市上传流程都通过同一服务端接口落库。

## 方案

采用“前端交互 + 服务端兜底”：

1. 增加轻量 ZIP 解压依赖和共享的 README 提取工具，输入 `Uint8Array`，输出根目录 README 文本或空值。
2. 工作区上传弹窗选中文件后异步解析 README：说明书为空时直接填入；非空时使用浏览器确认弹框询问覆盖，确认覆盖，取消保留原内容。
3. 服务端 `POST /api/scripts` 在表单 `readme` 为空时解析上传字节并补齐 README；表单已有内容时完全尊重客户端选择，不覆盖。
4. 解析异常只记录调试信息并继续保存 ZIP，避免新增解析逻辑改变既有上传可用性。

## 数据流

```text
选择 ZIP
  └─ 前端提取根 README
       ├─ readme 为空 → 自动填充表单
       └─ readme 非空 → 询问是否覆盖 → 按选择更新表单
提交表单
  └─ POST /api/scripts
       ├─ readme 非空 → 直接保存
       └─ readme 为空 → 服务端提取并保存（兜底）
```

## 组件与文件

- `shared/utils/zip-readme.ts`：统一 ZIP README 提取函数。
- `app/components/workspace/WsUploadModal.vue`：选 ZIP 后触发异步提取与覆盖确认。
- `server/api/scripts/index.post.ts`：在空 `readme` 时执行服务端兜底提取。
- `package.json` / `package-lock.json`：加入 ZIP 解压依赖。

## 错误处理

- 只捕获并忽略 ZIP 读取/解压异常，保留现有文件校验和上传错误。
- 用户拒绝覆盖时不清空、不修改当前说明书。
- 重新选择 ZIP 时按当前说明书内容重新判断是否需要询问。

## 验证

- 静态检查共享工具能识别根 `README.md`，并拒绝子目录/错误大小写路径。
- 运行项目 lint 和生产构建，确认客户端与 Nitro 服务端均可打包。
- 手工验证：空说明书自动填充、非空说明书确认覆盖/取消、无 README、损坏 ZIP，以及集市上传的服务端兜底。
