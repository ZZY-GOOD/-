import { CLOUD_ENV_ID } from '@/config/cloud.js'

let inited = false

/**
 * 初始化微信云开发
 * 仅在 MP-WEIXIN 下可用
 */
export function initWxCloud() {
  // #ifdef MP-WEIXIN
  if (inited) return true
  if (typeof wx === 'undefined' || !wx.cloud) return false

  try {
    wx.cloud.init({
      env: CLOUD_ENV_ID || undefined,
      traceUser: true
    })
    inited = true
    return true
  } catch (e) {
    console.error('wx.cloud.init failed:', e)
    return false
  }
  // #endif

  // #ifndef MP-WEIXIN
  return false
  // #endif
}


