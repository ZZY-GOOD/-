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
const userService = {
  /**
   * 创建或更新用户信息
   */
  async createOrUpdateUser(userData) {
    const {
      userId,
      nickname,
      avatarUrl,
      loginType = "guest",
      wxOpenid = null
    } = userData;
    const { data: existingUser, error: queryError } = await config_supabase.supabase.select(
      config_supabase.supabaseConfig.tables.users,
      {
        filters: [`user_id=eq.${encodeURIComponent(userId)}`],
        select: "id"
      }
    );
    if (queryError) {
      return { data: null, error: queryError };
    }
    const userPayload = {
      user_id: userId,
      nickname: nickname || null,
      avatar_url: avatarUrl || null,
      login_type: loginType,
      wx_openid: wxOpenid || null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (existingUser && existingUser.length > 0) {
      const { data, error } = await config_supabase.supabase.update(
        config_supabase.supabaseConfig.tables.users,
        { user_id: userId },
        userPayload
      );
      return { data, error };
    } else {
      const { data, error } = await config_supabase.supabase.insert(config_supabase.supabaseConfig.tables.users, userPayload);
      return { data, error };
    }
  },
  /**
   * 根据 user_id 获取用户信息
   */
  async getUserById(userId) {
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.users, {
      filters: [`user_id=eq.${encodeURIComponent(userId)}`]
    });
    if (error)
      return { data: null, error };
    return { data: data && data[0] ? data[0] : null, error: null };
  },
  /**
   * 根据微信 openid 获取用户信息
   */
  async getUserByWxOpenid(wxOpenid) {
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.users, {
      filters: [`wx_openid=eq.${encodeURIComponent(wxOpenid)}`]
    });
    if (error)
      return { data: null, error };
    return { data: data && data[0] ? data[0] : null, error: null };
  }
};
const userSceneService = {
  /**
   * 提交自定义场景
   */
  async submitScene(sceneData) {
    const {
      userId,
      userNickname,
      title,
      description,
      category,
      role,
      roleGender,
      angryReason,
      expectedDifficulty
    } = sceneData;
    const { data, error } = await config_supabase.supabase.insert(config_supabase.supabaseConfig.tables.userScenes, {
      user_id: userId,
      user_nickname: userNickname,
      title,
      description,
      category,
      role,
      role_gender: roleGender || "其他",
      angry_reason: angryReason,
      expected_difficulty: expectedDifficulty || "中",
      status: "pending"
    });
    return { data, error };
  },
  /**
   * 获取用户的提交记录
   */
  async getUserSubmissions(userId) {
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.userScenes, {
      filters: [`user_id=eq.${encodeURIComponent(userId)}`],
      query: {
        order: "created_at.desc"
      }
    });
    return { data, error };
  }
};
const gameRecordService = {
  /**
   * 创建游戏记录
   */
  async createRecord(recordData) {
    const {
      userId,
      sceneId,
      isSuccess,
      finalForgiveness,
      interactionCount,
      maxInteractions,
      startForgiveness,
      forgivenessChanges,
      durationSeconds
    } = recordData;
    const { data, error } = await config_supabase.supabase.insert(config_supabase.supabaseConfig.tables.gameRecords, {
      user_id: userId,
      scene_id: sceneId,
      is_success: isSuccess,
      final_forgiveness: finalForgiveness,
      interaction_count: interactionCount,
      max_interactions: maxInteractions,
      start_forgiveness: startForgiveness,
      forgiveness_changes: JSON.stringify(forgivenessChanges),
      duration_seconds: durationSeconds,
      ended_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (!error && sceneId) {
      await config_supabase.supabase.update(
        config_supabase.supabaseConfig.tables.scenes,
        { id: sceneId },
        { updated_at: (/* @__PURE__ */ new Date()).toISOString() }
      );
    }
    return { data, error };
  },
  /**
   * 获取用户的游戏记录
   */
  async getUserRecords(userId, options = {}) {
    const {
      sceneId = null,
      limit = 50,
      offset = 0,
      withScene = false
    } = options;
    const filters = [`user_id=eq.${encodeURIComponent(userId)}`];
    if (sceneId)
      filters.push(`scene_id=eq.${sceneId}`);
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.gameRecords, {
      filters,
      select: withScene ? "*,scene:scenes(title)" : "*",
      query: {
        order: "created_at.desc",
        limit,
        offset
      }
    });
    return { data, error };
  },
  /**
   * 获取用户最近挑战的唯一场景（去重后取前 N 条）
   */
  async getRecentScenes(userId, limit = 3) {
    const { data, error } = await this.getUserRecords(userId, {
      limit: limit * 5,
      withScene: true
    });
    if (error || !data)
      return { data: null, error };
    const seen = /* @__PURE__ */ new Set();
    const recent = [];
    for (const rec of data) {
      if (seen.has(rec.scene_id))
        continue;
      seen.add(rec.scene_id);
      recent.push(rec);
      if (recent.length >= limit)
        break;
    }
    return { data: recent, error: null };
  },
  /**
   * 获取用户的游戏统计
   */
  async getUserStats(userId) {
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.gameRecords, {
      filters: [`user_id=eq.${encodeURIComponent(userId)}`],
      select: "is_success,scene_id"
    });
    if (error)
      return { data: null, error };
    const stats = {
      totalGames: data.length,
      successCount: data.filter((r) => r.is_success).length,
      successRate: data.length > 0 ? (data.filter((r) => r.is_success).length / data.length * 100).toFixed(2) : 0,
      uniqueScenes: new Set(data.map((r) => r.scene_id)).size
    };
    return { data: stats, error: null };
  },
  /**
   * 获取场景的游戏记录统计
   */
  async getSceneRecords(sceneId, limit = 100) {
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.gameRecords, {
      filters: [`scene_id=eq.${sceneId}`],
      query: {
        order: "created_at.desc",
        limit
      }
    });
    return { data, error };
  },
  /**
   * 获取所有场景的全局统计（总挑战次数 & 平均胜率）
   * 用于首页场景卡片展示
   */
  async getGlobalSceneStats(limit = 1e4) {
    const { data, error } = await config_supabase.supabase.select(config_supabase.supabaseConfig.tables.gameRecords, {
      select: "scene_id,is_success",
      query: {
        limit
      }
    });
    if (error || !data)
      return { data: null, error };
    const statsMap = {};
    data.forEach((rec) => {
      const sid = rec.scene_id;
      if (!sid)
        return;
      if (!statsMap[sid]) {
        statsMap[sid] = {
          playCount: 0,
          winCount: 0
        };
      }
      statsMap[sid].playCount += 1;
      if (rec.is_success) {
        statsMap[sid].winCount += 1;
      }
    });
    Object.keys(statsMap).forEach((sid) => {
      const { playCount, winCount } = statsMap[sid];
      const rate = playCount > 0 ? winCount / playCount * 100 : 0;
      statsMap[sid].winRate = Number(rate.toFixed(1));
    });
    return { data: statsMap, error: null };
  }
};
exports.gameRecordService = gameRecordService;
exports.sceneService = sceneService;
exports.userSceneService = userSceneService;
exports.userService = userService;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/supabase-helper.js.map
