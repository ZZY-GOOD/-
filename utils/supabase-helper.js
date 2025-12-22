/**
 * Supabase 数据库操作辅助函数
 * 封装常用的数据库操作，简化业务代码
 */

import { supabase, supabaseConfig } from '@/config/supabase.js'

/**
 * 场景相关操作
 */
export const sceneService = {
  /**
   * 获取所有可用场景
   */
  async getAllScenes(options = {}) {
    const {
      category = null,
      difficulty = null,
      status = 'active',
      limit = 50,
      offset = 0,
      orderBy = 'play_count',
      order = 'desc'
    } = options

    const filters = []
    if (category) filters.push(`category=eq.${encodeURIComponent(category)}`)
    if (difficulty) filters.push(`difficulty=eq.${encodeURIComponent(difficulty)}`)
    if (status) filters.push(`status=eq.${encodeURIComponent(status)}`)

    const { data, error } = await supabase.select(supabaseConfig.tables.scenes, {
      select: '*',
      filters,
      query: {
        limit,
        offset,
        order: `${orderBy}.${order}`
      }
    })

    return { data, error }
  },

  /**
   * 根据分类获取场景
   */
  async getScenesByCategory(category) {
    return this.getAllScenes({ category, status: 'active' })
  },

  /**
   * 获取热门场景
   */
  async getPopularScenes(limit = 10) {
    return this.getAllScenes({
      status: 'active',
      orderBy: 'play_count',
      order: 'desc',
      limit
    })
  },

  /**
   * 获取高胜率场景
   */
  async getHighWinRateScenes(limit = 10) {
    return this.getAllScenes({
      status: 'active',
      orderBy: 'win_rate',
      order: 'desc',
      limit
    })
  },

  /**
   * 根据ID获取场景详情
   */
  async getSceneById(sceneId) {
    const { data, error } = await supabase.select(supabaseConfig.tables.scenes, {
      filters: [`id=eq.${sceneId}`]
    })

    if (error) return { data: null, error }
    return { data: data && data[0] ? data[0] : null, error: null }
  },

  /**
   * 搜索场景
   */
  async searchScenes(keyword) {
    // 注意：Supabase 的全文搜索需要使用其他方式
    // 这里使用简单的 LIKE 查询（PostgreSQL）
    const { data, error } = await supabase.select(supabaseConfig.tables.scenes, {
      filters: [
        `title=ilike.%${encodeURIComponent(keyword)}%`,
        `status=eq.active`
      ]
    })

    return { data, error }
  },

  /**
   * 更新场景统计数据（通常由触发器自动完成）
   */
  async updateSceneStats(sceneId) {
    // 这个操作通常由数据库触发器自动完成
    // 如果需要手动更新，可以调用此方法
    const { data, error } = await supabase.update(
      supabaseConfig.tables.scenes,
      { id: sceneId },
      { updated_at: new Date().toISOString() }
    )

    return { data, error }
  }
}

/**
 * 用户相关操作
 */
export const userService = {
  /**
   * 创建或更新用户信息
   */
  async createOrUpdateUser(userData) {
    const {
      userId,
      nickname,
      avatarUrl,
      loginType = 'guest',
      wxOpenid = null
    } = userData

    // 先查询用户是否存在
    const { data: existingUser, error: queryError } = await supabase.select(
      supabaseConfig.tables.users,
      {
        filters: [`user_id=eq.${encodeURIComponent(userId)}`],
        select: 'id'
      }
    )

    if (queryError) {
      return { data: null, error: queryError }
    }

    const userPayload = {
      user_id: userId,
      nickname: nickname || null,
      avatar_url: avatarUrl || null,
      login_type: loginType,
      wx_openid: wxOpenid || null,
      updated_at: new Date().toISOString()
    }

    if (existingUser && existingUser.length > 0) {
      // 更新现有用户
      const { data, error } = await supabase.update(
        supabaseConfig.tables.users,
        { user_id: userId },
        userPayload
      )
      return { data, error }
    } else {
      // 创建新用户
      const { data, error } = await supabase.insert(supabaseConfig.tables.users, userPayload)
      return { data, error }
    }
  },

  /**
   * 根据 user_id 获取用户信息
   */
  async getUserById(userId) {
    const { data, error } = await supabase.select(supabaseConfig.tables.users, {
      filters: [`user_id=eq.${encodeURIComponent(userId)}`]
    })

    if (error) return { data: null, error }
    return { data: data && data[0] ? data[0] : null, error: null }
  },

  /**
   * 根据微信 openid 获取用户信息
   */
  async getUserByWxOpenid(wxOpenid) {
    const { data, error } = await supabase.select(supabaseConfig.tables.users, {
      filters: [`wx_openid=eq.${encodeURIComponent(wxOpenid)}`]
    })

    if (error) return { data: null, error }
    return { data: data && data[0] ? data[0] : null, error: null }
  }
}

/**
 * 用户提交场景相关操作
 */
export const userSceneService = {
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
    } = sceneData

    const { data, error } = await supabase.insert(supabaseConfig.tables.userScenes, {
      user_id: userId,
      user_nickname: userNickname,
      title,
      description,
      category,
      role,
      role_gender: roleGender || '其他',
      angry_reason: angryReason,
      expected_difficulty: expectedDifficulty || '中',
      status: 'pending'
    })

    return { data, error }
  },

  /**
   * 获取用户的提交记录
   */
  async getUserSubmissions(userId) {
    const { data, error } = await supabase.select(supabaseConfig.tables.userScenes, {
      filters: [`user_id=eq.${encodeURIComponent(userId)}`],
      query: {
        order: 'created_at.desc'
      }
    })

    return { data, error }
  }
}

/**
 * 游戏记录相关操作
 */
export const gameRecordService = {
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
    } = recordData

    const { data, error } = await supabase.insert(supabaseConfig.tables.gameRecords, {
      user_id: userId,
      scene_id: sceneId,
      is_success: isSuccess,
      final_forgiveness: finalForgiveness,
      interaction_count: interactionCount,
      max_interactions: maxInteractions,
      start_forgiveness: startForgiveness,
      forgiveness_changes: JSON.stringify(forgivenessChanges),
      duration_seconds: durationSeconds,
      ended_at: new Date().toISOString()
    })

    // 更新场景的更新时间，便于最近挑战排序
    if (!error && sceneId) {
      await supabase.update(
        supabaseConfig.tables.scenes,
        { id: sceneId },
        { updated_at: new Date().toISOString() }
      )
    }

    return { data, error }
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
    } = options

    const filters = [`user_id=eq.${encodeURIComponent(userId)}`]
    if (sceneId) filters.push(`scene_id=eq.${sceneId}`)

    const { data, error } = await supabase.select(supabaseConfig.tables.gameRecords, {
      filters,
      select: withScene ? '*,scene:scenes(title)' : '*',
      query: {
        order: 'created_at.desc',
        limit,
        offset
      }
    })

    return { data, error }
  },

  /**
   * 获取用户最近挑战的唯一场景（去重后取前 N 条）
   */
  async getRecentScenes(userId, limit = 3) {
    // 先多取一些记录，防止去重后不足
    const { data, error } = await this.getUserRecords(userId, {
      limit: limit * 5,
      withScene: true
    })

    if (error || !data) return { data: null, error }

    const seen = new Set()
    const recent = []

    for (const rec of data) {
      if (seen.has(rec.scene_id)) continue
      seen.add(rec.scene_id)
      recent.push(rec)
      if (recent.length >= limit) break
    }

    return { data: recent, error: null }
  },

  /**
   * 获取用户的游戏统计
   */
  async getUserStats(userId) {
    const { data, error } = await supabase.select(supabaseConfig.tables.gameRecords, {
      filters: [`user_id=eq.${encodeURIComponent(userId)}`],
      select: 'is_success,scene_id'
    })

    if (error) return { data: null, error }

    const stats = {
      totalGames: data.length,
      successCount: data.filter(r => r.is_success).length,
      successRate: data.length > 0 
        ? ((data.filter(r => r.is_success).length / data.length) * 100).toFixed(2)
        : 0,
      uniqueScenes: new Set(data.map(r => r.scene_id)).size
    }

    return { data: stats, error: null }
  },

  /**
   * 获取场景的游戏记录统计
   */
  async getSceneRecords(sceneId, limit = 100) {
    const { data, error } = await supabase.select(supabaseConfig.tables.gameRecords, {
      filters: [`scene_id=eq.${sceneId}`],
      query: {
        order: 'created_at.desc',
        limit
      }
    })

    return { data, error }
  }
}

/**
 * 工具函数
 */
export const supabaseHelper = {
  /**
   * 格式化原谅值变化数据
   */
  formatForgivenessChanges(changes) {
    if (typeof changes === 'string') {
      try {
        return JSON.parse(changes)
      } catch (e) {
        return []
      }
    }
    return changes || []
  },

  /**
   * 计算难度标签（根据胜率）
   */
  calculateDifficulty(winRate) {
    if (winRate >= 60) return '易'
    if (winRate >= 30) return '中'
    return '难'
  },

  /**
   * 处理 Supabase 错误
   */
  handleError(error) {
    if (!error) return '未知错误'
    
    if (typeof error === 'string') return error
    if (error.message) return error.message
    if (error.error_description) return error.error_description
    
    return '操作失败，请稍后重试'
  }
}

export default {
  sceneService,
  userSceneService,
  gameRecordService,
  supabaseHelper
}

