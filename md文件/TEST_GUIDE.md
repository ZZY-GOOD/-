# Supabase 数据库测试指南

## 🧪 测试方法

### 方法一：在首页点击测试按钮（推荐）

1. 运行项目（H5 或微信小程序）
2. 打开首页 `pages/index/index.vue`
3. 点击页面顶部的 **"🔍 测试数据库连接"** 按钮
4. 查看测试结果：
   - ✅ 绿色提示 = 连接成功
   - ❌ 红色提示 = 连接失败

### 方法二：在控制台测试（H5 环境）

如果是在 H5 浏览器环境，可以在浏览器控制台运行：

```javascript
// 导入测试工具
import { testConnection, runAllTests } from '@/utils/test-supabase.js'

// 简单测试
testConnection().then(result => {
  console.log('测试结果:', result)
})

// 完整测试套件
runAllTests()
```

### 方法三：在代码中直接调用

在任何 Vue 组件中：

```javascript
import { sceneService } from '@/utils/supabase-helper.js'

// 测试获取场景列表
async function test() {
  const { data, error } = await sceneService.getAllScenes({
    status: 'active',
    limit: 5
  })
  
  if (error) {
    console.error('❌ 连接失败:', error)
  } else {
    console.log('✅ 连接成功！场景数量:', data?.length || 0)
    console.log('场景数据:', data)
  }
}

test()
```

## 📋 测试检查清单

### ✅ 基础连接测试

- [ ] 点击测试按钮后，能正常发送请求
- [ ] 控制台没有报错
- [ ] 能看到测试结果提示

### ✅ 数据查询测试

- [ ] 能成功获取场景列表
- [ ] 返回的场景数据格式正确
- [ ] 场景数量 > 0（如果已插入示例数据）

### ✅ 功能测试

- [ ] 能按分类筛选场景
- [ ] 能搜索场景
- [ ] 能获取单个场景详情

## 🐛 常见问题排查

### 问题1: 测试按钮点击无反应

**可能原因：**
- 导入路径错误
- 文件不存在

**解决方法：**
1. 检查 `pages/index/index.vue` 中的导入路径：
   ```javascript
   import { sceneService } from '@/utils/supabase-helper.js'
   ```
2. 确认 `utils/supabase-helper.js` 文件存在
3. 确认 `config/supabase.js` 文件存在

### 问题2: 连接失败，提示网络错误

**可能原因：**
- Supabase URL 或 Key 配置错误
- 微信小程序未配置域名白名单
- 网络问题

**解决方法：**
1. 检查 `config/supabase.js` 中的配置是否正确
2. 如果是微信小程序，检查是否在微信公众平台配置了域名白名单
3. 检查网络连接

### 问题3: 返回空数据

**可能原因：**
- 数据库表未创建
- 表中没有数据
- RLS 策略过于严格

**解决方法：**
1. 确认已在 Supabase 执行了 `database/schema.sql`
2. 在 Supabase Dashboard 的 Table Editor 中查看是否有数据
3. 检查 RLS 策略设置

### 问题4: 控制台报错 "Cannot find module"

**可能原因：**
- uni-app 路径别名未配置
- 文件路径错误

**解决方法：**
1. 检查 `manifest.json` 或 `vue.config.js` 中的路径别名配置
2. 如果 `@/` 别名不工作，尝试使用相对路径：
   ```javascript
   // 从 pages/index/index.vue 导入
   import { sceneService } from '../../utils/supabase-helper.js'
   ```

## 🔍 调试技巧

### 1. 查看网络请求

在浏览器开发者工具的 Network 标签中：
- 查找对 `supabase.co` 的请求
- 查看请求状态码（200 = 成功）
- 查看响应数据

### 2. 查看控制台日志

测试函数中已添加详细的 console.log，查看控制台输出：
- 连接状态
- 返回的数据
- 错误信息

### 3. 在 Supabase Dashboard 中验证

1. 登录 Supabase Dashboard
2. 进入 Table Editor
3. 查看 `scenes` 表是否有数据
4. 在 SQL Editor 中直接查询：
   ```sql
   SELECT * FROM scenes LIMIT 5;
   ```

## 📊 预期测试结果

### 成功的情况

```
✅ 连接成功！找到 X 个场景
```

控制台输出：
```
开始测试 Supabase 连接...
✅ 连接成功！找到 8 个场景
场景数据: [...]
```

### 失败的情况

```
❌ 连接失败: [错误信息]
```

常见错误：
- `Network Error` - 网络问题或域名未配置
- `401 Unauthorized` - API Key 错误
- `404 Not Found` - URL 错误或表不存在
- `Empty response` - 表中没有数据或 RLS 策略阻止

## 🎯 下一步

测试通过后，你可以：

1. **集成真实数据**：将数据库中的场景数据替换硬编码数据
2. **实现游戏逻辑**：创建游戏页面，实现聊天互动
3. **添加用户功能**：实现用户登录、游戏记录等功能

## 💡 提示

- 测试时建议先使用 H5 环境，更容易调试
- 微信小程序测试需要配置域名白名单
- 生产环境建议使用环境变量管理敏感信息

