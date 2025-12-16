"use strict";
const config_supabase = require("../config/supabase.js");
const sceneService = {
  /**
   * 获取所有可用场景
   */
  async getAllScenes(options = {}) {
    const {
      category = null,
      difficulty = null,
      status = "active",
      limit = 50,
      offset = 0,
      orderBy = "play_count",
      order = "desc"
    } = options;
    const filters = [];
    if (category)
      filters.push(`category=eq.${encodeURIComponent(category)}`);
    if (difficulty)
      filters.push(`difficulty=eq.${encodeURIComponent(difficulty)}`);
    if (status)
      filters.push(`status=eq.${encodeURIComponent(status)}`);
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.scenes, {
      select: "*",
      filters,
      query: {
        limit,
        offset,
        order: `${orderBy}.${order}`
      }
    });
    return { data, error };
  },
  /**
   * 根据分类获取场景
   */
  async getScenesByCategory(category) {
    return this.getAllScenes({ category, status: "active" });
  },
  /**
   * 获取热门场景
   */
  async getPopularScenes(limit = 10) {
    return this.getAllScenes({
      status: "active",
      orderBy: "play_count",
      order: "desc",
      limit
    });
  },
  /**
   * 获取高胜率场景
   */
  async getHighWinRateScenes(limit = 10) {
    return this.getAllScenes({
      status: "active",
      orderBy: "win_rate",
      order: "desc",
      limit
    });
  },
  /**
   * 根据ID获取场景详情
   */
  async getSceneById(sceneId) {
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.scenes, {
      filters: [`id=eq.${sceneId}`]
    });
    if (error)
      return { data: null, error };
    return { data: data && data[0] ? data[0] : null, error: null };
  },
  /**
   * 搜索场景
   */
  async searchScenes(keyword) {
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.scenes, {
      filters: [
        `title=ilike.%${encodeURIComponent(keyword)}%`,
        `status=eq.active`
      ]
    });
    return { data, error };
  },
  /**
   * 更新场景统计数据（通常由触发器自动完成）
   */
  async updateSceneStats(sceneId) {
    const { data, error } = await config_supabase.supabase.update(
      config_supabase.supabaseConfig.tables.scenes,
      { id: sceneId },
      { updated_at: (/* @__PURE__ */ new Date()).toISOString() }
    );
    return { data, error };
  }
};
exports.sceneService = sceneService;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/supabase-helper.js.map
