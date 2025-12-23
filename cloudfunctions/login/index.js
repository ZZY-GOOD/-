// 云函数：login
// 返回当前小程序用户的 openid（无外部依赖）

const cloud = require('wx-server-sdk')

cloud.init({
  // 使用当前环境 ID，避免写死 envId
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || null
  }
}

