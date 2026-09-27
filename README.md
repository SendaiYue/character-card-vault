# 角色卡仓库 (Character Card Vault)

一个基于 Cloudflare Pages 的角色卡管理工具，支持角色卡导入、浏览、搜索、标签管理、批量操作与数据备份等功能。

## 功能特性

- **角色卡管理**：支持 PNG / JSON 格式角色卡导入，自动解析元数据；上传带实时进度条，失败自动重试，Telegram 限流（约 20 张/分钟）自动等待退避
- **更多资料**：顶部可切换世界书、预设、脚本三个独立分类；上传 JSON、TXT、JS、YAML/YML、ZIP 文件（单个最大 50 MB），按名称或简介搜索、按标签筛选、收藏、下载、删除和批量导出。文件原样保存在同一个 Telegram 频道。
- **关联角色卡**：资料详情页可关联多张角色卡；角色卡详情页也可选择关联资料。关联仅用于网站中的整理和跳转，不改写原文件。
- **搜索筛选**：按名称、作者、简介、文件名等多维度搜索（可选搜索范围），支持按上传时间或名称拼音排序，支持范围筛选（标签/收藏），筛选状态同步到 URL（刷新/分享可保留）
- **标签系统**：标签云筛选，支持标签的新建、重命名、删除（同步应用到所有角色卡）；详情页可为单张卡添加自定义标签，并合并进标签云
- **批量操作**：多选后批量收藏、批量取消收藏、批量删除、批量导出
- **数据备份**：全量备份导出（JSON 格式，含全部元数据与标签，**不含卡文件**，恢复需在同一 Telegram 存储下使用，不受卡量限制）；批量导出（**含卡文件**，单次最多 20 张，用于换号迁移到新 Telegram 存储）；两者均可从备份文件恢复（已存在的内容自动跳过）
- **⚠️ 误删须知**：删除卡片会同时删除 Telegram 频道里的消息，但文件的 `file_id` 在**同一 Bot** 下不随消息删除失效——因此全量备份可以把误删卡**连同文件引用**完整恢复（下载/缩略图正常）。全量备份无法找回"备份之前"就已删除的卡；跨账号（不同 Bot）迁移请用批量导出（含文件）
- **设置面板**：导航栏 ⚙ 打开，支持背景图开关、主题切换、网格每行数量（2~6）、每页数量、减弱动画、清空缩略图缓存、视图模式记忆，偏好本地保存
- **站点自定义**：通过 `wrangler.toml` 的 `[vars]` 配置 `SITE_NAME` / `SITE_TITLE` / `SITE_BACKGROUND` 更换站点名称、标签页标题和背景图，无需改代码
- **响应式设计**：适配桌面和移动端
- **暗色/亮色主题**：支持主题切换（导航栏快捷键 + 设置面板同步）

## 手动编辑角色卡信息

在角色卡详情页可以手动修改以下内容，保存后立即生效，**无需重新上传**：

| 内容 | 操作 |
|------|------|
| 作者 | 点击"作者"旁的 ✎ 手动输入；或点击预制按钮（默认 **西维纳尔**）一键设置 |
| 名称 | 点击角色卡详情页名称旁的 ✎ 修改展示名称；列表、搜索和下载文件名同步更新 |
| 简介 | 点击"简介"标题旁的 ✎，在弹窗中撰写/修改（支持多行，不截断） |
| 添加自定义标签 | 点击标签区的 **＋标签** 批量输入（中英文逗号分隔均可）；或点击预制按钮（默认 **已发布** / **NSFW** / **SFW**）一键添加 |
| 移除单个自定义标签 | 点击蓝色自定义标签右侧的 **×** |

说明：

- 自定义标签（蓝色）会同时显示在标签云和展柜卡片上，与卡自带的金色标签区分
- 标签云的"管理标签"支持全局新建/重命名/删除标签（影响所有卡片）
- 手动修改只更新仓库索引，不会改动 Telegram 中的原始文件内部内容。下载时文件名按网站中的角色卡名称生成。
- 世界书、预设、脚本的展示名称、简介和标签可在详情页编辑；这些修改同样不会改动文件内容。

## 资料分类与备份

- 资料文件按上传时选择的世界书、预设或脚本分类保存。相同文件可放入不同分类；同一分类中重复上传会跳过。
- 资料详情页的「＋关联」可选择多张角色卡；角色卡详情页的「＋关联」可从三个分类选择文件。再次打开选择框、取消勾选并保存即可解除关联。
- 「全量备份」包含角色卡和资料的索引、标签与关联，**不含任何原文件**，适用于同一 Telegram Bot 下恢复；「批量导出」包含所选分类的原文件，单次最多 20 项，适用于换 Bot 迁移。恢复入口兼容旧版只有角色卡的备份。

**修改预制选项**：预制作者和预制标签无需改代码，在 `wrangler.toml` 的 `[vars]` 中配置（文件内有注释示例）：

- `PRESET_CREATOR=你的名字` —— 替换一键作者按钮
- `PRESET_TAGS=标签A,标签B` —— 替换一键标签（逗号分隔可多个）
- 设为空值则隐藏对应按钮；提交后自动部署生效

## 技术栈

- **前端**：原生 HTML/CSS/JavaScript (SPA)
- **后端**：Cloudflare Pages Functions
- **存储**：Telegram Bot API (文件) + Cloudflare KV (元数据)
- **认证**：环境变量密码认证

## 快速部署

1. 创建 Telegram Bot（通过 @BotFather）
2. 创建 Telegram 频道并将 Bot 设为管理员
3. 创建 KV 命名空间并复制其 ID
4. Fork 本仓库到 GitHub，**将 `wrangler.toml` 中的 KV 命名空间 ID 替换为你自己的**（顺手可改 `[vars]` 里的站名）
5. 在 Cloudflare Pages 连接仓库并部署
6. 以"机密"类型设置环境变量：`ACCESS_PASSWORD`、`TG_BOT_TOKEN`、`TG_CHAT_ID`

> KV ID 属于你的 Cloudflare 账号，不改的话部署会报 `Invalid KV namespace ID`。详见 [DEPLOY.md](DEPLOY.md)。

详细步骤请查看 [DEPLOY.md](DEPLOY.md)

## 环境变量

| 变量名 | 说明 | 必填 | 配置位置 |
|--------|------|------|----------|
| `ACCESS_PASSWORD` | 访问密码 | 是 | 仪表板"机密"类型 |
| `TG_BOT_TOKEN` | Telegram Bot Token | 是 | 仪表板"机密"类型 |
| `TG_CHAT_ID` | Telegram 频道 Chat ID | 是 | 仪表板"机密"类型 |
| `SITE_NAME` | 站点名称（导航栏和登录页显示），默认"角色卡仓库" | 否 | `wrangler.toml` `[vars]` |
| `SITE_TITLE` | 浏览器标签页标题，默认不变 | 否 | `wrangler.toml` `[vars]` |
| `SITE_BACKGROUND` | 登录页/主页面背景图 URL | 否 | `wrangler.toml` `[vars]` |
| `PRESET_CREATOR` | 详情页一键作者按钮文字，默认"西维纳尔"，设为空则隐藏按钮 | 否 | `wrangler.toml` `[vars]` |
| `PRESET_TAGS` | 详情页一键标签（逗号分隔可多个），默认"已发布,NSFW,SFW"，设为空则隐藏按钮 | 否 | `wrangler.toml` `[vars]` |

说明：

- 仓库带 `wrangler.toml` 后，Cloudflare 把普通变量锁定为 wrangler.toml 管理，仪表板只能添加"机密"（加密）变量
- `wrangler.toml` 的 `[vars]` 里已内置站名等示例值，**Fork 后请改成你自己的**，或删除对应行恢复默认值
- 机密变量（密码、Token）切勿写入 `wrangler.toml`——文件会提交到仓库，明文等于泄漏
- 修改环境变量后需重新部署才会生效

## 本地开发

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 本地开发
wrangler pages dev public

# 部署
wrangler pages deploy public
```

## API 接口

### 认证

```
POST /api/auth/login
```

### 角色卡

```
GET    /api/cards          # 列表
POST   /api/cards          # 上传
GET    /api/cards/:id      # 详情
PUT    /api/cards/:id      # 更新
DELETE /api/cards/:id      # 删除
GET    /api/cards/:id/download  # 下载原始文件
GET    /api/cards/:id/thumb     # 缩略图
```

### 世界书、预设、脚本

```
GET    /api/assets?type=worldbook|preset|script  # 分类列表、搜索和分页
POST   /api/assets                              # 上传（multipart: type, file）
GET    /api/assets/tags?type=...                # 当前分类的标签
GET    /api/assets/:type/:id                    # 详情
PUT    /api/assets/:type/:id                    # 编辑展示信息、收藏、关联 cardIds
DELETE /api/assets/:type/:id                    # 删除
GET    /api/assets/:type/:id/download           # 下载原文件
```

### 标签

```
GET    /api/tags           # 列表
PUT    /api/tags           # 标签管理（body: { action: "add" | "rename" | "delete", tag, newTag? }）
```

### 导出 / 导入

```
POST   /api/export/batch   # 批量导出（body: { cardIds?: [...], assetRefs?: [{type,id}] }，合计 ≤20）
POST   /api/export/all     # 全量备份（cards、assets、tags）
POST   /api/import         # 从备份恢复（接受全量备份 / 批量导出格式）
```

## 项目结构

```
character-card-vault/
├── wrangler.toml                      # Cloudflare 配置
├── functions/
│   ├── utils/
│   │   ├── telegram.js                # Telegram Bot API 工具
│   │   └── storage.js                 # KV 分页与资料分类工具
│   └── api/
│       ├── _middleware.js             # CORS + 认证中间件
│       ├── auth/
│       │   └── login.js               # 登录
│       ├── cards/
│       │   ├── index.js               # 列表/上传
│       │   ├── [id].js                # 详情/更新/删除
│       │   └── [id]/
│       │       ├── download.js        # 下载
│       │       └── thumb.js           # 缩略图
│       ├── assets/                    # 世界书、预设、脚本的列表/上传/详情/下载/标签
│       ├── tags/
│       │   └── index.js               # 标签列表 / 新建 / 重命名 / 删除
│       ├── export/
│       │   ├── batch.js               # 批量导出
│       │   └── all.js                 # 全量备份
│       └── import/
│           └── index.js               # 备份恢复
├── public/
│   └── index.html                     # 前端单页应用
├── tests/                             # 接口测试与本地页面预览
├── DEPLOY.md                          # 部署指南
├── .gitignore
├── README.md
└── LICENSE                            # CC BY-NC-SA 4.0
```

## 许可证

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
