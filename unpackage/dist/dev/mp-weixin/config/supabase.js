"use strict";
const common_vendor = require("../common/vendor.js");
let SUPABASE_URL = "https://rzmnzblywphmtydbjtkj.supabase.co";
let SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bW56Ymx5d3BobXR5ZGJqdGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzcxNTMsImV4cCI6MjA4MTQxMzE1M30.AjWEvOQCBfY8hldwoXTewiUUgmPzqzp2LpbX3FBLpfc";
SUPABASE_URL = "https://rzmnzblywphmtydbjtkj.supabase.co";
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bW56Ymx5d3BobXR5ZGJqdGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzcxNTMsImV4cCI6MjA4MTQxMzE1M30.AjWEvOQCBfY8hldwoXTewiUUgmPzqzp2LpbX3FBLpfc";
const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  // Supabase REST API 端点
  restUrl: `${SUPABASE_URL}/rest/v1`,
  // 表名常量
  tables: {
    users: "users",
    scenes: "scenes",
    userScenes: "user_scenes",
    gameRecords: "game_records"
  }
};
function getSupabaseHeaders() {
  return {
    "apikey": supabaseConfig.anonKey,
    "Authorization": `Bearer ${supabaseConfig.anonKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };
}
class SupabaseClient {
  constructor() {
    this.url = supabaseConfig.restUrl;
    this.headers = getSupabaseHeaders();
  }
  /**
   * 通用请求方法
   */
  async request(table, options = {}) {
    const {
      method = "GET",
      query = {},
      body = null,
      select = "*",
      filters = []
    } = options;
    let url = `${this.url}/${table}?select=${select}`;
    if (Object.keys(query).length > 0) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === void 0 || value === null || value === "")
          return;
        if (key === "limit" || key === "offset") {
          url += `&${key}=${value}`;
        } else if (key === "order") {
          url += `&order=${value}`;
        } else {
          url += `&${key}=eq.${encodeURIComponent(value)}`;
        }
      });
    }
    if (filters.length > 0) {
      filters.forEach((filter) => {
        url += `&${filter}`;
      });
    }
    try {
      const response = await common_vendor.index.request({
        url,
        method,
        header: this.headers,
        data: body,
        timeout: 1e4
      });
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { data: response.data, error: null };
      } else {
        return { data: null, error: response.data };
      }
    } catch (error) {
      common_vendor.index.__f__("error", "at config/supabase.js:127", "Supabase request error:", error);
      return { data: null, error: error.message };
    }
  }
  /**
   * 查询数据
   */
  async select(table, options = {}) {
    return this.request(table, { ...options, method: "GET" });
  }
  /**
   * 插入数据
   */
  async insert(table, data) {
    return this.request(table, {
      method: "POST",
      body: Array.isArray(data) ? data : [data]
    });
  }
  /**
   * 更新数据
   */
  async update(table, filters, data) {
    let url = `${this.url}/${table}`;
    if (filters && Object.keys(filters).length > 0) {
      const filterString = Object.entries(filters).map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`).join("&");
      url += `?${filterString}`;
    }
    try {
      const response = await common_vendor.index.request({
        url,
        method: "PATCH",
        header: this.headers,
        data
      });
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { data: response.data, error: null };
      } else {
        return { data: null, error: response.data };
      }
    } catch (error) {
      common_vendor.index.__f__("error", "at config/supabase.js:177", "Supabase update error:", error);
      return { data: null, error: error.message };
    }
  }
  /**
   * 删除数据
   */
  async delete(table, filters) {
    let url = `${this.url}/${table}`;
    if (filters && Object.keys(filters).length > 0) {
      const filterString = Object.entries(filters).map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`).join("&");
      url += `?${filterString}`;
    }
    try {
      const response = await common_vendor.index.request({
        url,
        method: "DELETE",
        header: this.headers
      });
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { data: response.data, error: null };
      } else {
        return { data: null, error: response.data };
      }
    } catch (error) {
      common_vendor.index.__f__("error", "at config/supabase.js:208", "Supabase delete error:", error);
      return { data: null, error: error.message };
    }
  }
}
const supabase = new SupabaseClient();
exports.supabase = supabase;
exports.supabaseConfig = supabaseConfig;
//# sourceMappingURL=../../.sourcemap/mp-weixin/config/supabase.js.map
