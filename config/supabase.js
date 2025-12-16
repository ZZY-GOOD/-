/**
 * Supabase 配置文件
 * 用于 uni-app 项目连接 Supabase 数据库
 */

// 注意：在生产环境中，这些敏感信息应该通过环境变量管理
// 在 uni-app 中，可以通过条件编译区分不同环境

// 根据平台获取配置
let SUPABASE_URL = 'https://rzmnzblywphmtydbjtkj.supabase.co'
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bW56Ymx5d3BobXR5ZGJqdGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzcxNTMsImV4cCI6MjA4MTQxMzE1M30.AjWEvOQCBfY8hldwoXTewiUUgmPzqzp2LpbX3FBLpfc'

// #ifdef H5
// H5 环境配置
SUPABASE_URL = process.env.VUE_APP_SUPABASE_URL || 'https://rzmnzblywphmtydbjtkj.supabase.co'
SUPABASE_ANON_KEY = process.env.VUE_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bW56Ymx5d3BobXR5ZGJqdGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzcxNTMsImV4cCI6MjA4MTQxMzE1M30.AjWEvOQCBfY8hldwoXTewiUUgmPzqzp2LpbX3FBLpfc'
// #endif

// #ifdef MP-WEIXIN
// 微信小程序环境配置
// 需要在 manifest.json 中配置网络请求域名白名单
// ⚠️ 请替换为你的实际 Supabase 配置
SUPABASE_URL = 'https://rzmnzblywphmtydbjtkj.supabase.co' // 请替换为你的 Supabase 项目 URL，例如：https://xxxxx.supabase.co
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bW56Ymx5d3BobXR5ZGJqdGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzcxNTMsImV4cCI6MjA4MTQxMzE1M30.AjWEvOQCBfY8hldwoXTewiUUgmPzqzp2LpbX3FBLpfc' // 请替换为你的 Supabase Anon Key
// #endif

// #ifdef APP-PLUS
// App 环境配置
// ⚠️ 请替换为你的实际 Supabase 配置
SUPABASE_URL = 'https://rzmnzblywphmtydbjtkj.supabase.co' // 请替换为你的 Supabase 项目 URL
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bW56Ymx5d3BobXR5ZGJqdGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzcxNTMsImV4cCI6MjA4MTQxMzE1M30.AjWEvOQCBfY8hldwoXTewiUUgmPzqzp2LpbX3FBLpfc' // 请替换为你的 Supabase Anon Key
// #endif

/**
 * Supabase 客户端初始化
 * 注意：uni-app 需要使用 @supabase/supabase-js 的兼容版本
 * 或者使用 HTTP 请求方式调用 Supabase REST API
 */
export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  // Supabase REST API 端点
  restUrl: `${SUPABASE_URL}/rest/v1`,
  // 表名常量
  tables: {
    scenes: 'scenes',
    userScenes: 'user_scenes',
    gameRecords: 'game_records'
  }
}

/**
 * 获取 Supabase REST API 请求头
 */
export function getSupabaseHeaders() {
  return {
    'apikey': supabaseConfig.anonKey,
    'Authorization': `Bearer ${supabaseConfig.anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
}

/**
 * Supabase API 请求封装
 * 由于 uni-app 可能不支持 @supabase/supabase-js，使用 HTTP 请求方式
 */
export class SupabaseClient {
  constructor() {
    this.url = supabaseConfig.restUrl
    this.headers = getSupabaseHeaders()
  }

  /**
   * 通用请求方法
   */
  async request(table, options = {}) {
    const {
      method = 'GET',
      query = {},
      body = null,
      select = '*',
      filters = []
    } = options

    let url = `${this.url}/${table}?select=${select}`
    
    // 添加查询参数（limit/offset/order 直接使用，不加 eq. 前缀）
    if (Object.keys(query).length > 0) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        if (key === 'limit' || key === 'offset') {
          url += `&${key}=${value}`
        } else if (key === 'order') {
          // 例如：play_count.desc
          url += `&order=${value}`
        } else {
          // 其他查询键默认使用 eq.
          url += `&${key}=eq.${encodeURIComponent(value)}`
        }
      })
    }

    // 添加过滤器
    if (filters.length > 0) {
      filters.forEach(filter => {
        url += `&${filter}`
      })
    }

    try {
      const response = await uni.request({
        url,
        method,
        header: this.headers,
        data: body,
        timeout: 10000
      })

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { data: response.data, error: null }
      } else {
        return { data: null, error: response.data }
      }
    } catch (error) {
      console.error('Supabase request error:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * 查询数据
   */
  async select(table, options = {}) {
    return this.request(table, { ...options, method: 'GET' })
  }

  /**
   * 插入数据
   */
  async insert(table, data) {
    return this.request(table, {
      method: 'POST',
      body: Array.isArray(data) ? data : [data]
    })
  }

  /**
   * 更新数据
   */
  async update(table, filters, data) {
    let url = `${this.url}/${table}`
    
    // 构建过滤条件
    if (filters && Object.keys(filters).length > 0) {
      const filterString = Object.entries(filters)
        .map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`)
        .join('&')
      url += `?${filterString}`
    }

    try {
      const response = await uni.request({
        url,
        method: 'PATCH',
        header: this.headers,
        data
      })

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { data: response.data, error: null }
      } else {
        return { data: null, error: response.data }
      }
    } catch (error) {
      console.error('Supabase update error:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * 删除数据
   */
  async delete(table, filters) {
    let url = `${this.url}/${table}`
    
    if (filters && Object.keys(filters).length > 0) {
      const filterString = Object.entries(filters)
        .map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`)
        .join('&')
      url += `?${filterString}`
    }

    try {
      const response = await uni.request({
        url,
        method: 'DELETE',
        header: this.headers
      })

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { data: response.data, error: null }
      } else {
        return { data: null, error: response.data }
      }
    } catch (error) {
      console.error('Supabase delete error:', error)
      return { data: null, error: error.message }
    }
  }
}

// 导出单例
export const supabase = new SupabaseClient()

export default supabase

