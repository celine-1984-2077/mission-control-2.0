# Mission Control 2.0 / 任务控制中心 2.0

[English](#english) | [中文](#chinese)

---

<a name="english"></a>

## English

### Overview

**Mission Control 2.0** is a local-first intelligent task board with automated OpenClaw integration. It combines a beautiful Kanban UI with an automation bridge that automatically dispatches tasks to OpenClaw coder and QA sessions, creating a self-sustaining development workflow.

### ✨ Key Features

- 🎯 **Visual Kanban Board** - Beautiful, responsive task management UI
- 🤖 **Automated Task Execution** - Auto-dispatch tasks from board to OpenClaw agent sessions
- 🧪 **Intelligent QA Testing** - Automated QA verification with browser automation for frontend tasks
- 🔄 **Self-Healing Workflow** - Failed QA creates follow-up fix tasks automatically
- 💬 **Discord Integration** - Real-time notifications for all task state changes
- 🎨 **Modern UI** - Dark theme with smooth animations and hover effects
- 📊 **Activity Tracking** - Live activity feed with task execution status
- 🚀 **One-Command Start** - Bootstrap and start everything with a single command

### 📋 Requirements

- **Node.js 20.19+** or **22.12+** (LTS recommended)
- **OpenClaw CLI** installed and working (`openclaw` command in PATH)
- **Optional**: Discord webhook URL for notifications

### 🚀 Quick Start

#### Option 1: One-Command Run (Recommended)

```bash
npm run run:website
```

This automatically:
- Installs dependencies if needed
- Creates `.env` from template
- Prompts for Discord webhook (optional)
- Starts frontend (port 5173)
- Starts bridge server (port 8787)

#### Option 2: Manual Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env to configure (optional)
nano .env

# Start everything
npm run dev:all
```

### 🌐 Access the Application

- **Frontend UI**: http://127.0.0.1:5173
- **Bridge API**: http://127.0.0.1:8787/state
- **Session Logs**: http://127.0.0.1:8787/session-log?sessionId=xxx

### 🎮 Usage

#### Creating Tasks

1. Click **"+ New Task"** button
2. Fill in task details:
   - **Task Name**: Brief title
   - **Objective**: Detailed description
   - **Target URL** (optional): For website/frontend tasks
   - **Acceptance Criteria** (optional): One per line
3. Click **"Create Task"**

#### Task Workflow

```
Backlog → Triaged → In Progress → Testing → Archived
              ↓          ↓            ↓
          (Auto      (Coder       (QA Auto
          Pick)      Session)     Test)
```

1. **Backlog**: Draft tasks, manually move to Triaged when ready
2. **Triaged**: Bridge auto-picks every 10 seconds → spawns coder session
3. **In Progress**: OpenClaw agent executes the task
4. **Testing**: Auto QA session tests the implementation
5. **Result**:
   - ✅ Pass → Task archived (removed from board)
   - ❌ Fail → Creates QA fix task in Triaged

#### Drag & Drop

- Drag tasks between lanes to change status
- Visual feedback with rotation and shadow effects
- Drop on lane body or on specific task to reorder

### ⚙️ Configuration

Environment variables in `.env`:

```bash
# Frontend port (default: 5173)
MISSION_CONTROL_PORT=5173

# Bridge API port (default: 8787)
BOARD_BRIDGE_PORT=8787

# Bridge base URL for frontend
VITE_BOARD_BRIDGE_BASE_URL=http://127.0.0.1:8787

# OpenClaw paths (optional, auto-detected)
OPENCLAW_HOME=$HOME/.openclaw
BOARD_SESSION_STORE_DIR=$HOME/.openclaw/agents/main/sessions

# Discord webhook URL (optional but recommended)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
```

**Alternative webhook configuration**: Create `automation/discord-webhook.txt` with your webhook URL.

### 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  React Frontend │ ◄─────► │  Bridge Server   │ ◄─────► │  OpenClaw CLI   │
│  (Vite + TS)    │  HTTP   │  (Node.js)       │  spawn  │  (Agent)        │
│                 │         │                  │         │                 │
│  - Kanban UI    │         │  - Auto dispatch │         │  - Coder        │
│  - Drag & Drop  │         │  - State mgmt    │         │  - QA tester    │
│  - Activity     │         │  - QA ingestion  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  board-state.json│
                            │  dispatch-queue  │
                            │  qa-results/     │
                            └──────────────────┘
```

**Components**:

- **Frontend**: React + TypeScript + Vite, polls bridge every 2 seconds
- **Bridge Server**: Node.js HTTP server, auto-dispatches tasks every 10 seconds
- **OpenClaw Integration**: Spawns agent sessions for execution and QA
- **State Management**: JSON files with merge-on-save conflict resolution

### 🔄 Automation Loop

**Execution Flow**:

1. Task enters **Triaged** lane
2. Bridge detects (10s scan) → spawns `openclaw agent --session-id xxx`
3. Agent executes task, moves to **Testing** on completion
4. Bridge spawns QA session → evaluates against acceptance criteria
5. QA writes result JSON to `automation/qa-results/`
6. Bridge ingests result:
   - **Pass**: Archives task (removes from board)
   - **Fail**: Creates follow-up QA fix task with guidance

**Website Task Detection**:

Bridge automatically detects frontend/website tasks based on:
- Presence of `targetUrl` field
- Keywords: "web", "website", "ui", "frontend", "button", "click", "browser", etc.
- QA sessions for website tasks include browser automation instructions

### 🎨 UI Features

**Modern Design**:
- ✨ Dark theme optimized for long sessions
- 🎭 Smooth animations and transitions
- 💫 Hover effects on all interactive elements
- 📊 Stats cards with glow effects
- 🔄 Drag feedback with rotation and shadows
- 🎪 Modal with backdrop blur and fade-in animation

**Smart Features**:
- 📝 Task count badges on each lane
- 💡 Empty lane hints ("Drop tasks here")
- 🏃 "Now Running" indicator with pulse effect when active
- 📱 Responsive layout (mobile-friendly)
- 🇨🇳 Optimized for Chinese text display

### 📜 Available Scripts

```bash
# Development
npm run dev              # Frontend only
npm run dev:all          # Frontend + Bridge
npm run stop:all         # Stop all processes

# Production
npm run build            # Build frontend
npm run preview          # Preview production build

# Maintenance
npm run doctor           # Health check (frontend/bridge/openclaw)
npm run bootstrap        # Setup env and templates
npm run run:website      # Bootstrap + start (one command)

# Linting
npm run lint             # ESLint check
```

### 🐛 Troubleshooting

#### Discord Webhook Not Sending

1. **Check webhook URL is configured**:
   ```bash
   grep '^DISCORD_WEBHOOK_URL=' .env
   ```

2. **Restart with proper env loading**:
   ```bash
   npm run stop:all
   npm run run:website
   ```

3. **Check bridge logs**:
   ```bash
   tail -f automation/logs/bridge.log
   ```

4. **Verify webhook events**: Webhooks only fire on state changes (dispatch, completion, QA results)

#### Task Stuck in "In Progress"

**Symptom**: Task shows dispatched but never completes

**Causes**:
- OpenClaw not in PATH
- OpenClaw session crashed
- Task state corrupted

**Solution**:
1. Check OpenClaw availability: `which openclaw`
2. Check session logs: `ls ~/.openclaw/agents/main/sessions/`
3. Manually reset task by dragging back to Triaged

#### Frontend Not Loading

1. **Check Node.js version**: `node --version` (need 20.19+ or 22.12+)
2. **Reinstall dependencies**: `rm -rf node_modules package-lock.json && npm install`
3. **Check port conflicts**: `lsof -i :5173`

### 📁 Project Structure

```
mission-control-2.0/
├── src/                    # Frontend source
│   ├── App.tsx            # Main React component
│   ├── App.css            # Styles
│   └── main.tsx           # Entry point
├── automation/            # Bridge and automation
│   ├── board-bridge-server.mjs    # Main bridge server
│   ├── run-board-bridge.sh        # Bridge supervisor
│   ├── board-state.json           # Live task state (gitignored)
│   ├── dispatch-queue.jsonl       # Audit log (gitignored)
│   ├── qa-results/                # QA result JSON (gitignored)
│   └── run-logs/                  # Task execution logs (gitignored)
├── scripts/               # Utility scripts
│   ├── bootstrap.sh       # Initial setup
│   ├── start-all.sh       # Start frontend + bridge
│   ├── stop-all.sh        # Stop all processes
│   └── doctor.sh          # Health check
├── .env.example           # Environment template
├── package.json           # Dependencies and scripts
├── CLAUDE.md              # Claude Code guidance
└── README.md              # This file
```

### 🤝 Contributing

This is a personal project, but suggestions welcome! Key areas for improvement:
- Additional QA validation rules
- More notification channels (Slack, Email)
- Task templates and presets
- Export/import functionality

### 📄 License

MIT License - feel free to use for personal or commercial projects

---

<a name="chinese"></a>

## 中文

### 项目简介

**Mission Control 2.0（任务控制中心 2.0）** 是一个本地优先的智能任务看板，集成了 OpenClaw 自动化功能。它结合了美观的看板界面和自动化桥接服务，能够自动将任务分配给 OpenClaw 的编码和 QA 会话，创建自我维护的开发工作流。

### ✨ 核心功能

- 🎯 **可视化看板** - 美观、响应式的任务管理界面
- 🤖 **自动任务执行** - 从看板自动派发任务到 OpenClaw 代理会话
- 🧪 **智能 QA 测试** - 自动化 QA 验证，前端任务支持浏览器自动化
- 🔄 **自愈工作流** - QA 失败自动创建修复任务
- 💬 **Discord 集成** - 所有任务状态变化实时通知
- 🎨 **现代化界面** - 深色主题，流畅动画和悬停效果
- 📊 **活动追踪** - 实时活动流，显示任务执行状态
- 🚀 **一键启动** - 单个命令完成所有配置和启动

### 📋 系统要求

- **Node.js 20.19+** 或 **22.12+**（推荐 LTS 版本）
- **OpenClaw CLI** 已安装并可用（`openclaw` 命令在 PATH 中）
- **可选**：Discord webhook URL 用于通知

### 🚀 快速开始

#### 方式一：一键运行（推荐）

```bash
npm run run:website
```

这会自动：
- 安装依赖（如需要）
- 从模板创建 `.env` 文件
- 提示输入 Discord webhook（可选）
- 启动前端（端口 5173）
- 启动桥接服务器（端口 8787）

#### 方式二：手动设置

```bash
# 安装依赖
npm install

# 创建环境配置文件
cp .env.example .env

# 编辑配置（可选）
nano .env

# 启动所有服务
npm run dev:all
```

### 🌐 访问应用

- **前端界面**: http://127.0.0.1:5173
- **桥接 API**: http://127.0.0.1:8787/state
- **会话日志**: http://127.0.0.1:8787/session-log?sessionId=xxx

### 🎮 使用说明

#### 创建任务

1. 点击 **"+ New Task"** 按钮
2. 填写任务详情：
   - **任务名称**：简短标题
   - **任务描述**：详细说明
   - **目标网址**（可选）：用于网站/前端任务
   - **验收标准**（可选）：每行一条
3. 点击 **"Create Task"**

#### 任务流程

```
待办 → 已分类 → 进行中 → 测试中 → 已归档
        ↓        ↓         ↓
     (自动     (编码      (QA自动
      派发)     会话)      测试)
```

1. **Backlog（待办）**：草稿任务，准备好后手动移到已分类
2. **Triaged（已分类）**：桥接服务每 10 秒自动检测 → 启动编码会话
3. **In Progress（进行中）**：OpenClaw 代理执行任务
4. **Testing（测试中）**：自动 QA 会话测试实现
5. **结果**：
   - ✅ 通过 → 任务归档（从看板移除）
   - ❌ 失败 → 在已分类中创建 QA 修复任务

#### 拖放操作

- 在列之间拖动任务改变状态
- 拖动时有旋转和阴影视觉反馈
- 可以拖到列上或特定任务上重新排序

### ⚙️ 配置说明

在 `.env` 中设置环境变量：

```bash
# 前端端口（默认：5173）
MISSION_CONTROL_PORT=5173

# 桥接 API 端口（默认：8787）
BOARD_BRIDGE_PORT=8787

# 前端使用的桥接 URL
VITE_BOARD_BRIDGE_BASE_URL=http://127.0.0.1:8787

# OpenClaw 路径（可选，自动检测）
OPENCLAW_HOME=$HOME/.openclaw
BOARD_SESSION_STORE_DIR=$HOME/.openclaw/agents/main/sessions

# Discord webhook URL（可选但推荐）
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
```

**备选 webhook 配置**：创建 `automation/discord-webhook.txt` 文件，写入你的 webhook URL。

### 🏗️ 架构说明

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  React 前端     │ ◄─────► │  桥接服务器      │ ◄─────► │  OpenClaw CLI   │
│  (Vite + TS)    │  HTTP   │  (Node.js)       │  spawn  │  (代理)         │
│                 │         │                  │         │                 │
│  - 看板界面     │         │  - 自动派发      │         │  - 编码器       │
│  - 拖放操作     │         │  - 状态管理      │         │  - QA 测试      │
│  - 活动流       │         │  - QA 结果处理   │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  board-state.json│
                            │  dispatch-queue  │
                            │  qa-results/     │
                            └──────────────────┘
```

**组件说明**：

- **前端**：React + TypeScript + Vite，每 2 秒轮询桥接服务
- **桥接服务器**：Node.js HTTP 服务器，每 10 秒自动派发任务
- **OpenClaw 集成**：为执行和 QA 启动代理会话
- **状态管理**：JSON 文件，保存时合并冲突解决

### 🔄 自动化循环

**执行流程**：

1. 任务进入 **Triaged（已分类）** 列
2. 桥接服务检测到（10秒扫描）→ 启动 `openclaw agent --session-id xxx`
3. 代理执行任务，完成后移到 **Testing（测试中）**
4. 桥接服务启动 QA 会话 → 根据验收标准评估
5. QA 将结果 JSON 写入 `automation/qa-results/`
6. 桥接服务处理结果：
   - **通过**：归档任务（从看板移除）
   - **失败**：创建带指导的 QA 修复任务

**网站任务检测**：

桥接服务根据以下条件自动检测前端/网站任务：
- 存在 `targetUrl` 字段
- 关键词："web"、"website"、"ui"、"frontend"、"button"、"click"、"browser" 等
- 网站任务的 QA 会话包含浏览器自动化指令

### 🎨 界面特性

**现代化设计**：
- ✨ 深色主题，适合长时间使用
- 🎭 流畅的动画和过渡效果
- 💫 所有交互元素的悬停效果
- 📊 带发光效果的统计卡片
- 🔄 拖动反馈，带旋转和阴影
- 🎪 模态框带背景模糊和淡入动画

**智能功能**：
- 📝 每列显示任务计数徽章
- 💡 空列提示（"Drop tasks here"）
- 🏃 "正在运行"指示器，活动时带脉动效果
- 📱 响应式布局（移动端友好）
- 🇨🇳 中文文本显示优化

### 📜 可用脚本

```bash
# 开发
npm run dev              # 仅前端
npm run dev:all          # 前端 + 桥接
npm run stop:all         # 停止所有进程

# 生产
npm run build            # 构建前端
npm run preview          # 预览生产构建

# 维护
npm run doctor           # 健康检查（前端/桥接/openclaw）
npm run bootstrap        # 设置环境和模板
npm run run:website      # 引导 + 启动（一个命令）

# 代码检查
npm run lint             # ESLint 检查
```

### 🐛 故障排查

#### Discord Webhook 不发送

1. **检查 webhook URL 已配置**：
   ```bash
   grep '^DISCORD_WEBHOOK_URL=' .env
   ```

2. **重启并正确加载环境**：
   ```bash
   npm run stop:all
   npm run run:website
   ```

3. **检查桥接日志**：
   ```bash
   tail -f automation/logs/bridge.log
   ```

4. **验证 webhook 事件**：Webhook 仅在状态变化时触发（派发、完成、QA 结果）

#### 任务卡在"进行中"

**症状**：任务显示已派发但从不完成

**原因**：
- OpenClaw 不在 PATH 中
- OpenClaw 会话崩溃
- 任务状态损坏

**解决方案**：
1. 检查 OpenClaw 可用性：`which openclaw`
2. 检查会话日志：`ls ~/.openclaw/agents/main/sessions/`
3. 手动重置任务，拖回已分类列

#### 前端无法加载

1. **检查 Node.js 版本**：`node --version`（需要 20.19+ 或 22.12+）
2. **重新安装依赖**：`rm -rf node_modules package-lock.json && npm install`
3. **检查端口冲突**：`lsof -i :5173`

### 📁 项目结构

```
mission-control-2.0/
├── src/                    # 前端源码
│   ├── App.tsx            # 主 React 组件
│   ├── App.css            # 样式
│   └── main.tsx           # 入口点
├── automation/            # 桥接和自动化
│   ├── board-bridge-server.mjs    # 主桥接服务器
│   ├── run-board-bridge.sh        # 桥接监督程序
│   ├── board-state.json           # 实时任务状态（忽略）
│   ├── dispatch-queue.jsonl       # 审计日志（忽略）
│   ├── qa-results/                # QA 结果 JSON（忽略）
│   └── run-logs/                  # 任务执行日志（忽略）
├── scripts/               # 工具脚本
│   ├── bootstrap.sh       # 初始设置
│   ├── start-all.sh       # 启动前端 + 桥接
│   ├── stop-all.sh        # 停止所有进程
│   └── doctor.sh          # 健康检查
├── .env.example           # 环境模板
├── package.json           # 依赖和脚本
├── CLAUDE.md              # Claude Code 指南
└── README.md              # 本文件
```

### 🤝 贡献

这是个人项目，但欢迎提建议！可改进的关键领域：
- 额外的 QA 验证规则
- 更多通知渠道（Slack、邮件）
- 任务模板和预设
- 导出/导入功能

### 📄 许可证

MIT 许可证 - 可自由用于个人或商业项目
