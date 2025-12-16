/**
 * Supabase 使用示例
 * 展示如何在项目中使用 Supabase 进行数据操作
 */

import { sceneService, userSceneService, gameRecordService } from '@/utils/supabase-helper.js'

// ============================================
// 示例 1: 获取场景列表
// ============================================
export async function exampleGetScenes() {
  try {
    // 获取所有场景
    const { data: allScenes, error: error1 } = await sceneService.getAllScenes({
      status: 'active',
      limit: 20
    })
    
    if (error1) {
      console.error('获取场景失败:', error1)
      return
    }
    
    console.log('所有场景:', allScenes)
    
    // 按分类获取场景
    const { data: coupleScenes, error: error2 } = await sceneService.getScenesByCategory('情侣')
    
    if (error2) {
      console.error('获取情侣场景失败:', error2)
      return
    }
    
    console.log('情侣场景:', coupleScenes)
    
    // 获取热门场景
    const { data: popularScenes, error: error3 } = await sceneService.getPopularScenes(10)
    
    if (error3) {
      console.error('获取热门场景失败:', error3)
      return
    }
    
    console.log('热门场景:', popularScenes)
    
  } catch (error) {
    console.error('示例执行失败:', error)
  }
}

// ============================================
// 示例 2: 获取场景详情
// ============================================
export async function exampleGetSceneDetail(sceneId) {
  try {
    const { data: scene, error } = await sceneService.getSceneById(sceneId)
    
    if (error) {
      console.error('获取场景详情失败:', error)
      return null
    }
    
    if (!scene) {
      console.log('场景不存在')
      return null
    }
    
    console.log('场景详情:', scene)
    return scene
    
  } catch (error) {
    console.error('获取场景详情失败:', error)
    return null
  }
}

// ============================================
// 示例 3: 搜索场景
// ============================================
export async function exampleSearchScenes(keyword) {
  try {
    const { data: scenes, error } = await sceneService.searchScenes(keyword)
    
    if (error) {
      console.error('搜索失败:', error)
      return []
    }
    
    console.log(`搜索"${keyword}"的结果:`, scenes)
    return scenes || []
    
  } catch (error) {
    console.error('搜索失败:', error)
    return []
  }
}

// ============================================
// 示例 4: 提交自定义场景
// ============================================
export async function exampleSubmitCustomScene(userId, userNickname) {
  try {
    const sceneData = {
      userId: userId, // 微信 openid
      userNickname: userNickname || '匿名用户',
      title: '你忘记买生日礼物，女朋友很生气',
      description: '生日当天忘记准备礼物',
      category: '情侣',
      role: '女朋友',
      roleGender: '女',
      angryReason: '你完全忘记了她的生日，没有准备任何礼物',
      expectedDifficulty: '中'
    }
    
    const { data, error } = await userSceneService.submitScene(sceneData)
    
    if (error) {
      console.error('提交场景失败:', error)
      uni.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none'
      })
      return
    }
    
    console.log('提交成功:', data)
    uni.showToast({
      title: '提交成功，等待审核',
      icon: 'success'
    })
    
  } catch (error) {
    console.error('提交场景失败:', error)
    uni.showToast({
      title: '提交失败',
      icon: 'none'
    })
  }
}

// ============================================
// 示例 5: 创建游戏记录
// ============================================
export async function exampleCreateGameRecord(userId, sceneId) {
  try {
    // 模拟游戏数据
    const recordData = {
      userId: userId,
      sceneId: sceneId,
      isSuccess: true, // 是否成功
      finalForgiveness: 100, // 最终原谅值
      interactionCount: 5, // 实际互动次数
      maxInteractions: 10, // 最大互动次数
      startForgiveness: 20, // 初始原谅值
      forgivenessChanges: [ // 原谅值变化记录
        { round: 1, change: 15, final: 35 },
        { round: 2, change: 20, final: 55 },
        { round: 3, change: 25, final: 80 },
        { round: 4, change: 20, final: 100 }
      ],
      durationSeconds: 120 // 游戏时长（秒）
    }
    
    const { data, error } = await gameRecordService.createRecord(recordData)
    
    if (error) {
      console.error('保存游戏记录失败:', error)
      return
    }
    
    console.log('游戏记录已保存:', data)
    
    // 注意：场景的统计数据（播放次数、胜率）会自动更新（通过数据库触发器）
    
  } catch (error) {
    console.error('保存游戏记录失败:', error)
  }
}

// ============================================
// 示例 6: 获取用户游戏记录
// ============================================
export async function exampleGetUserRecords(userId) {
  try {
    const { data: records, error } = await gameRecordService.getUserRecords(userId, {
      limit: 20
    })
    
    if (error) {
      console.error('获取游戏记录失败:', error)
      return []
    }
    
    console.log('用户游戏记录:', records)
    return records || []
    
  } catch (error) {
    console.error('获取游戏记录失败:', error)
    return []
  }
}

// ============================================
// 示例 7: 获取用户统计
// ============================================
export async function exampleGetUserStats(userId) {
  try {
    const { data: stats, error } = await gameRecordService.getUserStats(userId)
    
    if (error) {
      console.error('获取用户统计失败:', error)
      return null
    }
    
    console.log('用户统计:', stats)
    // stats 包含：
    // - totalGames: 总游戏次数
    // - successCount: 成功次数
    // - successRate: 成功率（百分比）
    // - uniqueScenes: 玩过的不同场景数
    
    return stats
    
  } catch (error) {
    console.error('获取用户统计失败:', error)
    return null
  }
}

// ============================================
// 示例 8: 在 Vue 组件中使用
// ============================================
/*
// 在 pages/index/index.vue 中使用示例

<script>
import { sceneService } from '@/utils/supabase-helper.js'

export default {
  data() {
    return {
      scenes: [],
      loading: false
    }
  },
  onLoad() {
    this.loadScenes()
  },
  methods: {
    async loadScenes() {
      this.loading = true
      try {
        const { data, error } = await sceneService.getAllScenes({
          status: 'active',
          limit: 20
        })
        
        if (error) {
          console.error('加载场景失败:', error)
          uni.showToast({
            title: '加载失败',
            icon: 'none'
          })
          return
        }
        
        this.scenes = data || []
      } catch (error) {
        console.error('加载场景失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    async onSceneSelect(scene) {
      // 跳转到游戏页面
      uni.navigateTo({
        url: `/pages/game/game?sceneId=${scene.id}`
      })
    }
  }
}
</script>
*/

// ============================================
// 示例 9: 在游戏页面中保存记录
// ============================================
/*
// 在 pages/game/game.vue 中使用示例

<script>
import { gameRecordService } from '@/utils/supabase-helper.js'

export default {
  data() {
    return {
      sceneId: '',
      userId: '', // 从微信登录获取
      forgiveness: 20,
      interactions: 0,
      maxInteractions: 10,
      forgivenessHistory: []
    }
  },
  onLoad(options) {
    this.sceneId = options.sceneId
    // 获取用户ID（从微信登录或本地存储）
    this.userId = uni.getStorageSync('userId') || 'anonymous'
  },
  methods: {
    async onGameEnd(isSuccess) {
      // 游戏结束时保存记录
      const recordData = {
        userId: this.userId,
        sceneId: this.sceneId,
        isSuccess: isSuccess,
        finalForgiveness: this.forgiveness,
        interactionCount: this.interactions,
        maxInteractions: this.maxInteractions,
        startForgiveness: 20,
        forgivenessChanges: this.forgivenessHistory,
        durationSeconds: Math.floor((Date.now() - this.gameStartTime) / 1000)
      }
      
      const { error } = await gameRecordService.createRecord(recordData)
      
      if (error) {
        console.error('保存记录失败:', error)
      } else {
        console.log('游戏记录已保存')
      }
    }
  }
}
</script>
*/

