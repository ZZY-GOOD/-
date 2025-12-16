# Supabase 配置指南

## 📋 配置步骤

### 第一步：创建 Supabase 项目

1. 访问 [Supabase 官网](https://supabase.com/) 并注册/登录账号
2. 点击 **"New Project"** 创建新项目
3. 填写项目信息：
   - **Name**: `哄一哄他（她）` 或自定义名称
   - **Database Password**: 设置一个强密码（请妥善保存，后续无法查看）
   - **Region**: 建议选择 **Singapore (ap-southeast-1)** 或离你最近的亚洲区域
4. 点击 **"Create new project"**，等待创建完成（约 2 分钟）

### 第二步：获取 API 密钥

1. 项目创建完成后，点击左侧菜单的 **Settings**（设置图标）
2. 选择 **API** 选项
3. 找到以下信息并复制：
   - **Project URL**: 例如 `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: 以 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 开头的长字符串

### 第三步：执行数据库 SQL 脚本

1. 在 Supabase 项目中，点击左侧菜单的 **SQL Editor**
2. 点击 **"New Query"** 按钮
3. 打开项目中的 `database/schema.sql` 文件
4. **复制全部 SQL 代码**（包括注释）
5. 粘贴到 SQL Editor 的编辑框中
6. 点击右下角的 **"Run"** 按钮（或按 `Ctrl+Enter`）
7. 等待执行完成，确认看到 "Success. No rows returned" 或类似的成功提示
8. 验证表是否创建成功：
   - 点击左侧菜单的 **Table Editor**
   - 应该能看到 `scenes`、`user_scenes`、`game_records` 三个表

### 第四步：配置项目代码

#### 方式一：直接在配置文件中填写（适合开发测试）

编辑 `config/supabase.js` 文件，找到以下位置并填入你的配置：

```javascript
// #ifdef MP-WEIXIN
// 微信小程序环境配置
const SUPABASE_URL = 'https://your-project.supabase.co' // 替换为你的 Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // 替换为你的 anon key
// #endif
```

#### 方式二：使用环境变量（推荐，适合生产环境）

1. 参考 `env.example.txt` 文件
2. 在项目根目录创建环境变量配置文件（根据你的构建工具选择）
3. 填入配置信息

### 第五步：配置微信小程序域名白名单

⚠️ **重要**：如果使用微信小程序，必须配置域名白名单，否则无法请求 Supabase API。

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入你的小程序管理后台
3. 左侧菜单：**开发** > **开发管理** > **开发设置**
4. 找到 **"服务器域名"** 部分
5. 在 **"request合法域名"** 中添加：
   ```
   https://your-project.supabase.co
   ```
   （替换为你的实际 Supabase URL）
6. 点击 **"保存"** 并提交审核（如果需要）

### 第六步：测试连接

在项目中创建一个测试页面或使用以下代码测试：

```javascript
// 在 pages/index/index.vue 或其他页面中测试
import { sceneService } from '@/utils/supabase-helper.js'

// 测试获取场景列表
async function testConnection() {
  try {
    const { data, error } = await sceneService.getAllScenes({ limit: 5 })
    
    if (error) {
      console.error('❌ 连接失败:', error)
      uni.showToast({
        title: '数据库连接失败',
        icon: 'none'
      })
    } else {
      console.log('✅ 连接成功！场景数量:', data?.length || 0)
      uni.showToast({
        title: `连接成功，找到 ${data?.length || 0} 个场景`,
        icon: 'success'
      })
    }
  } catch (err) {
    console.error('测试失败:', err)
  }
}
```

## 📁 文件说明

### 已创建的文件

1. **`config/supabase.js`**
   - Supabase 客户端配置文件
   - 包含连接配置和基础请求封装

2. **`database/schema.sql`**
   - 完整的数据库表结构 SQL
   - 包括表、索引、触发器、视图和示例数据

3. **`database/README.md`**
   - 详细的数据库配置说明
   - 包含常用 SQL 查询示例

4. **`utils/supabase-helper.js`**
   - 数据库操作辅助函数
   - 封装了场景、用户提交、游戏记录等常用操作

5. **`env.example.txt`**
   - 环境变量配置示例

## 🗄️ 数据库表结构

### 1. scenes（场景表）
存储所有游戏场景，包括：
- 场景基本信息（标题、描述、分类、角色等）
- 游戏参数（初始原谅值、最大互动次数、难度等）
- 统计数据（播放次数、成功次数、胜率等）

### 2. user_scenes（用户提交场景表）
存储用户提交的自定义场景：
- 用户提交的场景信息
- 审核状态（待审核/已通过/已拒绝）
- 审核通过后关联到 scenes 表

### 3. game_records（游戏记录表）
存储用户的游戏记录：
- 游戏结果（成功/失败）
- 原谅值变化记录
- 游戏时长等统计信息

## 🔒 安全注意事项

1. **不要泄露 Service Role Key**
   - Service Role Key 拥有完全权限，只能在后端使用
   - 前端代码中只使用 Anon Key

2. **配置 Row Level Security (RLS)**
   - SQL 脚本中已包含基本的 RLS 策略
   - 根据实际需求可以调整策略

3. **敏感词过滤**
   - 用户输入内容需要在插入数据库前进行过滤
   - 建议使用第三方敏感词库

4. **API 限流**
   - 在 Supabase Dashboard 中配置 API 限流
   - 防止恶意请求和滥用

## 🐛 常见问题

### Q1: 连接失败，提示网络错误
**A**: 
- 检查 Supabase URL 和 Key 是否正确
- 检查微信小程序域名白名单是否配置
- 检查网络连接

### Q2: SQL 执行失败
**A**:
- 确认已启用 `uuid-ossp` 扩展（SQL 脚本开头已包含）
- 检查 SQL 语法是否正确
- 查看 Supabase Dashboard 的日志获取详细错误

### Q3: 查询返回空结果
**A**:
- 检查 RLS（Row Level Security）策略是否过于严格
- 确认数据已正确插入（可以在 Table Editor 中查看）
- 检查查询条件是否正确

### Q4: 微信小程序无法请求
**A**:
- 确认已在微信公众平台配置域名白名单
- 确认 Supabase URL 格式正确（https://开头）
- 检查小程序版本，某些旧版本可能有兼容性问题

## 📚 更多资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase REST API 文档](https://supabase.com/docs/reference/rest/introduction)
- [微信小程序网络请求文档](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)

## ✅ 配置检查清单

- [ ] 已创建 Supabase 项目
- [ ] 已获取 Project URL 和 Anon Key
- [ ] 已执行 `database/schema.sql` 脚本
- [ ] 已验证表创建成功（在 Table Editor 中查看）
- [ ] 已在 `config/supabase.js` 中配置 URL 和 Key
- [ ] 已配置微信小程序域名白名单（如使用小程序）
- [ ] 已测试数据库连接成功
- [ ] 已阅读安全注意事项

完成以上所有步骤后，你的 Supabase 数据库就配置完成了！🎉

