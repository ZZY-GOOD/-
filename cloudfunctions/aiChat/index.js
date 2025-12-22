/**
 * 微信云函数：aiChat
 * - 云端调用 Moonshot(Kimi) Chat Completions
 * - 返回严格 JSON：{ reply: string, forgivenessDelta: number } 或 { error: string }
 *
 * 配置：
 * - 推荐在云端配置环境变量 MOONSHOT_API_KEY / MOONSHOT_MODEL
 * - 或者创建同级 config.js（参考 config.example.js）
 */

const https = require('https')

function getConfig() {
  let local = {}
  try {
    // eslint-disable-next-line import/no-dynamic-require
    local = require('./config')
  } catch (e) {}

  return {
    apiKey: process.env.MOONSHOT_API_KEY || local.MOONSHOT_API_KEY || '',
    model: process.env.MOONSHOT_MODEL || local.MOONSHOT_MODEL || 'moonshot-v1-8k'
  }
}

function clampInt(v, min, max) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  const i = Math.trunc(n)
  return Math.max(min, Math.min(max, i))
}

function extractJson(text) {
  if (!text) return null
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = text.slice(start, end + 1)
  try {
    return JSON.parse(candidate)
  } catch (e) {
    return null
  }
}

function postJson({ hostname, path, headers, body, timeout = 25000 }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers,
        timeout: timeout
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0, body: raw })
        })
      }
    )
    
    // 设置请求超时
    const timeoutId = setTimeout(() => {
      req.destroy()
      reject(new Error(`请求超时（${timeout}ms）`))
    }, timeout)
    
    req.on('error', (err) => {
      clearTimeout(timeoutId)
      reject(err)
    })
    
    req.on('timeout', () => {
      req.destroy()
      clearTimeout(timeoutId)
      reject(new Error('请求超时'))
    })
    
    req.write(body)
    req.end()
  })
}

exports.main = async (event) => {
  const { apiKey, model } = getConfig()
  if (!apiKey) return { error: '云函数未配置 MOONSHOT_API_KEY' }

  const scene = event?.scene || {}
  const history = Array.isArray(event?.history) ? event.history : []
  const userInput = String(event?.userInput || '').trim()
  const forgiveness = clampInt(event?.forgiveness ?? 0, 0, 100)

  if (!userInput) return { error: 'userInput 为空' }

  const systemPrompt = [
    '你是情感对话游戏引擎，扮演场景角色。',
    '严格只输出JSON，格式：{"reply":"回复内容","forgivenessDelta":数字}',
    '规则：forgiveness范围0-100，forgivenessDelta范围-50到+30，reply用中文1-3句。'
  ].join('\n')

  const sceneBlock = [
    '【场景】',
    `标题：${scene.title || ''}`,
    `分类：${scene.category || ''}`,
    `角色：${scene.role || ''}`,
    `生气原因：${scene.angry_reason || ''}`,
    `难度：${scene.difficulty || ''}`
  ].join('\n')

  const historyBlock = history
    .slice(-12)
    .map((m) => {
      const r = m.role === 'assistant' ? 'AI' : '用户'
      const c = String(m.content || '').replace(/\n/g, ' ')
      return `${r}：${c}`
    })
    .join('\n')

  const userPrompt = [
    sceneBlock,
    '',
    '【当前状态】',
    `forgiveness: ${forgiveness}`,
    '',
    '【对话历史】',
    historyBlock || '（无）',
    '',
    '【用户本轮输入】',
    userInput
  ].join('\n')

  const payload = JSON.stringify({
    model,
    temperature: 0.3,
    max_tokens: 200, // 限制输出长度，加快响应
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  })

  const { statusCode, body } = await postJson({
    hostname: 'api.moonshot.cn',
    path: '/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    body: payload,
    timeout: 25000 // 25秒超时（云函数需要配置更长的超时时间）
  })

  if (statusCode < 200 || statusCode >= 300) {
    return { error: `Kimi 请求失败 HTTP ${statusCode}: ${body?.slice(0, 200)}` }
  }

  let parsed = null
  try {
    parsed = JSON.parse(body)
  } catch (e) {
    return { error: 'Kimi 返回不是 JSON' }
  }

  const content =
    parsed?.choices?.[0]?.message?.content ||
    parsed?.choices?.[0]?.delta?.content ||
    ''

  const obj = extractJson(content)
  if (!obj) return { error: 'Kimi 未按 JSON 输出' }

  const reply = typeof obj.reply === 'string' ? obj.reply.trim() : ''
  const forgivenessDelta = clampInt(obj.forgivenessDelta, -50, 30)
  if (!reply) return { error: 'reply 为空' }

  return { reply, forgivenessDelta }
}


