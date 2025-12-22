/**
 * AI 服务封装（微信云开发版本）
 * - MP-WEIXIN：通过 wx.cloud.callFunction 调用云函数 aiChat（云端调用 Kimi，Key 不在前端）
 * - 非 MP-WEIXIN：返回 error
 */

import { initWxCloud } from '@/utils/wx-cloud.js'

export async function generateReply(params) {
  // #ifdef MP-WEIXIN
  const ok = initWxCloud()
  if (!ok) return { error: '微信云开发未初始化（请检查 CLOUD_ENV_ID 和云环境配置）' }

  const { scene, history = [], userInput, forgiveness } = params || {}

  try {
    const res = await wx.cloud.callFunction({
      name: 'aiChat',
      data: {
        scene: {
          id: scene?.id,
          title: scene?.title,
          category: scene?.category,
          role: scene?.role,
          angry_reason: scene?.angry_reason,
          difficulty: scene?.difficulty
        },
        history,
        userInput,
        forgiveness
      }
    })

    const result = res?.result
    if (!result) return { error: '云函数无返回' }
    return result
  } catch (err) {
    console.error('wx.cloud.callFunction failed:', err)
    return { error: err?.message || err?.errMsg || '云函数调用失败' }
  }
  // #endif

  // #ifndef MP-WEIXIN
  return { error: '当前平台不支持微信云开发 AI 调用' }
  // #endif
}

export default {
  generateReply
}

