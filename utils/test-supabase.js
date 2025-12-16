/**
 * Supabase 连接测试工具
 * 用于快速测试数据库连接和基本功能
 */

import { sceneService, userSceneService, gameRecordService } from './supabase-helper.js'
import { supabaseConfig } from '../config/supabase.js'

/**
 * 测试数据库连接
 */
export async function testConnection() {
  console.log('='.repeat(50))
  console.log('开始测试 Supabase 数据库连接...')
  console.log('Supabase URL:', supabaseConfig.url)
  console.log('='.repeat(50))
  
  const results = {
    connection: false,
    scenes: false,
    error: null,
    sceneCount: 0,
    sceneData: null
  }
  
  try {
    // 测试1: 获取场景列表
    console.log('\n📋 测试1: 获取场景列表...')
    const { data, error } = await sceneService.getAllScenes({
      status: 'active',
      limit: 10
    })
    
    if (error) {
      console.error('❌ 测试失败:', error)
      results.error = error
      return results
    }
    
    console.log('✅ 连接成功！')
    console.log('📊 找到场景数量:', data ? data.length : 0)
    
    if (data && data.length > 0) {
      console.log('\n📝 场景列表:')
      data.forEach((scene, index) => {
        console.log(`${index + 1}. ${scene.title}`)
        console.log(`   分类: ${scene.category} | 难度: ${scene.difficulty} | 播放: ${scene.play_count}次`)
      })
    }
    
    results.connection = true
    results.scenes = true
    results.sceneCount = data ? data.length : 0
    results.sceneData = data
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ 所有测试通过！')
    console.log('='.repeat(50))
    
  } catch (err) {
    console.error('\n❌ 测试异常:', err)
    results.error = err.message || err
  }
  
  return results
}

/**
 * 测试获取单个场景
 */
export async function testGetScene(sceneId) {
  console.log(`\n📋 测试获取场景详情: ${sceneId}`)
  
  try {
    const { data, error } = await sceneService.getSceneById(sceneId)
    
    if (error) {
      console.error('❌ 获取失败:', error)
      return { success: false, error }
    }
    
    if (!data) {
      console.log('⚠️ 场景不存在')
      return { success: false, error: '场景不存在' }
    }
    
    console.log('✅ 获取成功:')
    console.log('标题:', data.title)
    console.log('分类:', data.category)
    console.log('角色:', data.role)
    console.log('初始原谅值:', data.initial_forgiveness)
    
    return { success: true, data }
    
  } catch (err) {
    console.error('❌ 测试异常:', err)
    return { success: false, error: err.message || err }
  }
}

/**
 * 测试搜索场景
 */
export async function testSearchScenes(keyword) {
  console.log(`\n📋 测试搜索场景: "${keyword}"`)
  
  try {
    const { data, error } = await sceneService.searchScenes(keyword)
    
    if (error) {
      console.error('❌ 搜索失败:', error)
      return { success: false, error }
    }
    
    console.log(`✅ 找到 ${data ? data.length : 0} 个结果`)
    
    return { success: true, data, count: data ? data.length : 0 }
    
  } catch (err) {
    console.error('❌ 测试异常:', err)
    return { success: false, error: err.message || err }
  }
}

/**
 * 完整测试套件
 */
export async function runAllTests() {
  console.log('\n🚀 开始运行完整测试套件...\n')
  
  // 测试1: 连接测试
  const connectionTest = await testConnection()
  
  if (!connectionTest.connection) {
    console.log('\n❌ 连接测试失败，停止后续测试')
    return connectionTest
  }
  
  // 测试2: 如果有场景，测试获取第一个场景
  if (connectionTest.sceneData && connectionTest.sceneData.length > 0) {
    const firstScene = connectionTest.sceneData[0]
    await testGetScene(firstScene.id)
  }
  
  // 测试3: 搜索测试
  await testSearchScenes('女朋友')
  
  console.log('\n✨ 测试套件执行完成！')
  
  return connectionTest
}

// 如果在浏览器环境，可以直接运行
if (typeof window !== 'undefined') {
  // 可以通过控制台调用: testConnection() 或 runAllTests()
  window.testSupabase = {
    testConnection,
    testGetScene,
    testSearchScenes,
    runAllTests
  }
  console.log('💡 提示: 可以在控制台使用 window.testSupabase.testConnection() 进行测试')
}

export default {
  testConnection,
  testGetScene,
  testSearchScenes,
  runAllTests
}

