# Supabase 数据库配置说明

## 快速开始

### 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - **Name**: 哄一哄他（她）
   - **Database Password**: 设置一个强密码（请妥善保存）
   - **Region**: 选择离你最近的区域（建议选择亚洲区域，如 Singapore）
4. 等待项目创建完成（约 2 分钟）

### 2. 获取项目配置信息

1. 进入项目后，点击左侧菜单的 **Settings** > **API**
2. 找到以下信息：
   - **Project URL**: 例如 `https://xxxxx.supabase.co`
   - **anon public key**: 以 `eyJ...` 开头的长字符串
3. 复制这些信息，稍后需要用到

### 3. 执行 SQL 脚本

1. 在 Supabase 项目中，点击左侧菜单的 **SQL Editor**
2. 点击 **New Query**
3. 打开项目中的 `database/schema.sql` 文件
4. 复制全部 SQL 代码
5. 粘贴到 SQL Editor 中
6. 点击 **Run** 执行脚本
7. 确认所有表、索引、触发器创建成功

### 4. 配置项目环境变量

#### 方式一：在代码中直接配置（开发阶段）

编辑 `config/supabase.js` 文件，填入你的 Supabase 配置：

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key-here'
```

#### 方式二：使用环境变量（推荐）

1. 复制 `.env.example` 为 `.env`
2. 填入你的配置信息：
   ```
   VUE_APP_SUPABASE_URL=https://your-project.supabase.co
   VUE_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. 注意：`.env` 文件不应提交到 Git

### 5. 配置微信小程序域名白名单

如果使用微信小程序，需要在微信公众平台配置服务器域名：

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入你的小程序后台
3. 设置 > 开发设置 > 服务器域名
4. 在 **request合法域名** 中添加你的 Supabase URL：
   ```
   https://your-project.supabase.co
   ```

### 6. 验证配置

在项目中测试连接：

```javascript
import { supabase } from '@/config/supabase.js'

// 测试查询场景列表
async function testConnection() {
  const { data, error } = await supabase.select('scenes', {
    select: '*',
    filters: ['status=eq.active'],
    query: { limit: 10 }
  })
  
  if (error) {
    console.error('连接失败:', error)
  } else {
    console.log('连接成功，场景数量:', data.length)
  }
}
```

## 数据库表说明

### 1. scenes（场景表）
存储所有游戏场景信息，包括：
- 场景基本信息（标题、描述、分类等）
- 游戏参数（初始原谅值、最大互动次数等）
- 统计数据（播放次数、胜率等）

### 2. user_scenes（用户提交场景表）
存储用户提交的自定义场景，等待审核：
- 用户提交的场景信息
- 审核状态和备注
- 审核通过后关联到 scenes 表

### 3. game_records（游戏记录表）
存储用户的游戏记录：
- 游戏结果（成功/失败）
- 原谅值变化
- 游戏时长等统计信息

## 常用 SQL 查询示例

### 查询热门场景
```sql
SELECT * FROM scenes 
WHERE status = 'active' 
ORDER BY play_count DESC 
LIMIT 10;
```

### 查询高胜率场景
```sql
SELECT * FROM scenes 
WHERE status = 'active' AND play_count > 100
ORDER BY win_rate DESC 
LIMIT 10;
```

### 查询用户游戏记录
```sql
SELECT gr.*, s.title as scene_title 
FROM game_records gr
JOIN scenes s ON gr.scene_id = s.id
WHERE gr.user_id = 'user_openid_here'
ORDER BY gr.created_at DESC;
```

### 更新场景统计数据
```sql
-- 手动更新某个场景的统计数据
UPDATE scenes 
SET 
  play_count = (
    SELECT COUNT(*) FROM game_records WHERE scene_id = scenes.id
  ),
  win_count = (
    SELECT COUNT(*) FROM game_records 
    WHERE scene_id = scenes.id AND is_success = true
  ),
  win_rate = (
    SELECT CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(COUNT(*) FILTER (WHERE is_success = true)::DECIMAL / COUNT(*) * 100, 2)
      ELSE 0
    END
    FROM game_records 
    WHERE scene_id = scenes.id
  )
WHERE id = 'scene_id_here';
```

## 安全建议

1. **不要在前端使用 Service Role Key**
   - Service Role Key 拥有完全权限，只能在后端使用
   - 前端只使用 Anon Key

2. **配置 Row Level Security (RLS)**
   - SQL 脚本中已包含基本的 RLS 策略
   - 根据实际需求调整策略

3. **敏感数据过滤**
   - 用户输入内容需要过滤敏感词
   - 建议在插入数据库前进行验证

4. **API 限流**
   - 在 Supabase Dashboard 中配置 API 限流
   - 防止恶意请求

## 故障排查

### 问题：连接失败
- 检查 Supabase URL 和 Key 是否正确
- 检查网络连接
- 检查微信小程序域名白名单配置

### 问题：SQL 执行失败
- 检查 SQL 语法是否正确
- 确认已启用 uuid-ossp 扩展
- 查看 Supabase 日志获取详细错误信息

### 问题：查询返回空结果
- 检查 RLS 策略是否过于严格
- 确认数据已正确插入
- 检查查询条件是否正确

## 更多资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase REST API](https://supabase.com/docs/reference/javascript/introduction)

