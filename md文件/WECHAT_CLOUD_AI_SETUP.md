# 微信云开发接入 Kimi（Moonshot）配置指南

## 目标
- 小程序前端 **不直接持有 Kimi API Key**
- 通过 **微信云开发云函数** 调用 Kimi，并返回：
  - `reply`：AI 回复内容
  - `forgivenessDelta`：本轮原谅值变化（整数）

## 已在项目中生成的文件
- `cloudfunctions/aiChat/index.js`：云函数主代码（云端调用 Kimi）
- `cloudfunctions/aiChat/config.example.js`：云函数本地配置示例
- `cloudfunctions/aiChat/package.json`
- `utils/ai-service.js`：前端通过 `wx.cloud.callFunction` 调用云函数
- `utils/wx-cloud.js`：云开发初始化
- `config/cloud.js`：云环境 ID 配置（你需要填写）

## 第 1 步：在微信开发者工具开通云开发
1. 微信开发者工具右上角选择 **云开发**，创建一个环境（记住 `envId`）
2. 把环境 `envId` 填入 `config/cloud.js` 的 `CLOUD_ENV_ID`

## 第 2 步：上传云函数
1. 打开微信开发者工具左侧文件树，找到 `cloudfunctions/aiChat`
2. 右键 `aiChat` → **上传并部署（云端安装依赖）**

## 第 3 步：配置 Kimi Key（强烈推荐用环境变量）
### 方式 A（推荐）：云端环境变量
在云开发控制台为云函数配置环境变量：
- `MOONSHOT_API_KEY`：你的 Kimi API Key
- `MOONSHOT_MODEL`：模型名称（例如 `kimi-k2-0905-preview` 或 `moonshot-v1-8k`）

### 方式 B（仅本地开发，不推荐）：本地 config.js
1. 复制 `cloudfunctions/aiChat/config.example.js` 为 `cloudfunctions/aiChat/config.js`
2. 填入你的 Key

> 注意：不要把真实 Key 提交到仓库。

## 第 4 步：真机测试
1. 运行小程序到微信开发者工具
2. 进入对话页，发送消息
3. 若云函数配置正确，会返回 AI 回复和原谅值变化
4. 若提示 “AI 暂时不能使用”，查看：
   - 微信开发者工具 → 云开发 → 云函数日志（`aiChat`）

## 常见问题
### 1）提示“微信云开发未初始化”
- 检查 `config/cloud.js` 是否已填写正确的 `envId`
- 确认已在微信开发者工具开通云开发并选择了同一环境

### 2）提示“云函数未配置 MOONSHOT_API_KEY”
- 你还没在云端配置 `MOONSHOT_API_KEY`，或没创建 `config.js`

### 3）提示“Kimi 未按 JSON 输出”
- 模型没有严格按要求输出 JSON
- 可在云函数 `systemPrompt` 中加强约束（已做强约束）


