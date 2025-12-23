<template>
	<view class="app-container">
		<!-- 核心内容区域 -->
		<view class="main-content">
			<!-- 场景选择部分 -->
			<view class="scene-section">
				<!-- 测试按钮 -->
				<view class="test-section">
					<button class="test-btn" @click="testSupabaseConnection" :loading="testing">
						{{ testing ? '测试中...' : '🔍 测试数据库连接' }}
					</button>
					<view v-if="testResult" class="test-result" :class="testResult.type">
						{{ testResult.message }}
					</view>
				</view>
				
			<!-- 欢迎描述 -->
			<view class="welcome-card">
				<text class="welcome-title">欢迎来到哄一哄他（她）</text>
				<text class="welcome-desc">
					本程序基于 AI 技术，你需要使用语言技巧和沟通能力，
					在限定次数内让对方原谅你，这并不容易。
				</text>
			</view>
			
			<text class="section-title">
				<text class="emoji">✨</text> 选择一个场景，然后开始模拟哄你的虚拟男/女朋友吧
			</text>
				
				<!-- 排序选择下拉框 -->
				<picker @change="onSortChange" :value="sortIndex" :range="sortOptions" class="scene-picker">
					<view class="picker-text">{{sortOptions[sortIndex]}}</view>
				</picker>
				
				<!-- 场景分类标签 -->
				<view class="category-tabs">
					<view 
						v-for="(category, index) in categories" 
						:key="index"
						class="category-tab"
						:class="{ active: activeCategory === category.name }"
						@click="onCategoryChange(category.name)"
					>
						{{category.name}} ({{category.count}})
					</view>
				</view>
				
				<!-- 场景列表 -->
				<view class="scene-list">
					<view 
						v-for="(scene, index) in filteredScenes" 
						:key="index"
						class="scene-item"
						@click="onSceneSelect(scene)"
					>
						<text class="scene-title">{{scene.title}}</text>
						<text class="scene-stats">{{scene.times}}次(胜率 {{scene.winRate}}%)</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { sceneService, gameRecordService } from '@/utils/supabase-helper.js'
	
	export default {
		data() {
			return {
				title: '哄哄模拟器',
				sortIndex: 0,
				sortOptions: ['默认', '最新', '最热', '胜率最高', '胜率最低'],
				categories: [],
				activeCategory: '全部',
				scenes: [],
				testing: false,
				testResult: null,
				loadingScenes: false
			}
		},
		onLoad() {
			this.loadScenes()
			// 可以自动测试一次（可选）
			// this.testSupabaseConnection()
		},
		onShow() {
			// 每次返回首页时刷新场景统计数据（挑战次数、胜率）
			this.loadScenes()
		},
		computed: {
			// 过滤并排序场景列表
			filteredScenes() {
				let list = this.activeCategory === '全部'
					? this.scenes
					: this.scenes.filter(scene => scene.category === this.activeCategory)
				
				const option = this.sortOptions[this.sortIndex]
				if (option === '最新') {
					list = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
				} else if (option === '最热') {
					list = [...list].sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
				} else if (option === '胜率最高') {
					list = [...list].sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0))
				} else if (option === '胜率最低') {
					list = [...list].sort((a, b) => (a.win_rate || 0) - (b.win_rate || 0))
				}
				return list
			}
		},
		methods: {
			// 从数据库加载场景
			async loadScenes() {
				this.loadingScenes = true
				try {
					const { data, error } = await sceneService.getAllScenes({
						status: 'active',
						limit: 100,
						orderBy: 'play_count',
						order: 'desc'
					})
					if (error) {
						console.error('加载场景失败:', error)
						uni.showToast({
							title: '加载场景失败',
							icon: 'none'
						})
						return
					}

					// 额外获取全局统计（从 game_records 计算，确保最新）
					const { data: globalStats } = await gameRecordService.getGlobalSceneStats()

					this.scenes = (data || []).map(item => {
						const sid = item.id
						const override = globalStats && globalStats[sid] ? globalStats[sid] : null
						const playCount = override ? override.playCount : (item.play_count ?? 0)
						const winRateRaw = override ? override.winRate : (item.win_rate ?? 0)
						// 胜率显示到小数点后一位
						const winRateDisplay = Number(winRateRaw || 0).toFixed(1)
						return {
							id: item.id,
							title: item.title,
							category: item.category || '其他',
							// 兼容展示字段
							times: playCount,
							winRate: winRateDisplay,
							play_count: playCount,
							win_rate: Number(winRateRaw) || 0,
							created_at: item.created_at
						}
					})
					// 分类标签统计
					const categoryMap = {}
					this.scenes.forEach(s => {
						categoryMap[s.category] = (categoryMap[s.category] || 0) + 1
					})
					this.categories = [{ name: '全部', count: this.scenes.length }].concat(
						Object.entries(categoryMap).map(([name, count]) => ({ name, count }))
					)
					// 默认选中全部
					this.activeCategory = '全部'
				} catch (err) {
					console.error('加载场景异常:', err)
					uni.showToast({
						title: '加载异常',
						icon: 'none'
					})
				} finally {
					this.loadingScenes = false
				}
			},

			// 测试 Supabase 数据库连接
			async testSupabaseConnection() {
				this.testing = true
				this.testResult = null
				
				try {
					console.log('开始测试 Supabase 连接...')
					
					// 测试1: 获取场景列表
					const { data, error } = await sceneService.getAllScenes({
						status: 'active',
						limit: 100
					})
					
					if (error) {
						console.error('数据库连接失败:', error)
						this.testResult = {
							type: 'error',
							message: `❌ 连接失败: ${error.message || error}`
						}
						uni.showToast({
							title: '连接失败',
							icon: 'none',
							duration: 3000
						})
						return
					}
					
					// 测试成功
					const sceneCount = data ? data.length : 0
					console.log('✅ 连接成功！找到', sceneCount, '个场景')
					
					this.testResult = {
						type: 'success',
						message: `✅ 连接成功！找到 ${sceneCount} 个场景`
					}
					
					uni.showToast({
						title: `连接成功，找到 ${sceneCount} 个场景`,
						icon: 'success',
						duration: 2000
					})
					
					// 如果有数据，可以更新本地场景列表
					if (data && data.length > 0) {
						console.log('场景数据:', data)
						// 这里可以将数据库的场景数据更新到本地
						// this.loadScenesFromDatabase(data)
					}
					
				} catch (err) {
					console.error('测试异常:', err)
					this.testResult = {
						type: 'error',
						message: `❌ 测试异常: ${err.message || '未知错误'}`
					}
					uni.showToast({
						title: '测试异常',
						icon: 'none',
						duration: 3000
					})
				} finally {
					this.testing = false
				}
			},
			
			// 排序选择下拉框变化
			onSortChange(e) {
				this.sortIndex = e.detail.value;
			},
			
			// 分类标签点击
			onCategoryChange(category) {
				this.activeCategory = category;
			},
			
			// 场景项点击
			onSceneSelect(scene) {
				if (!scene || !scene.id) {
					uni.showToast({
						title: '场景数据缺失',
						icon: 'none'
					})
					return
				}
				uni.navigateTo({
					url: `/pages/dialog/dialog?id=${scene.id}`
				})
			}
		}
	}
</script>

<style>
	/* 全局样式重置 */
	page {
		background-color: #f8f9fa;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}
	
	.app-container {
		min-height: 100vh;
		padding: 20rpx;
	}
	
	.main-content {
		max-width: 600rpx;
		margin: 0 auto;
	}
	
	/* 场景选择部分 */
	.scene-section {
		background-color: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
	}
	
	.section-title {
		font-size: 30rpx;
		color: #333;
		margin-bottom: 24rpx;
		display: block;
		line-height: 48rpx;
	}
	
	.emoji {
		margin-right: 10rpx;
	}
	
	/* 场景选择下拉框 */
	.scene-picker {
		background-color: #f5f5f5;
		border-radius: 10rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
	}
	
	.picker-text {
		font-size: 28rpx;
		color: #666;
	}
	
	/* 分类标签 */
	.category-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 15rpx;
		margin-bottom: 30rpx;
	}
	
	.category-tab {
		padding: 12rpx 20rpx;
		background-color: #f0f0f0;
		border-radius: 20rpx;
		font-size: 24rpx;
		color: #666;
		cursor: pointer;
		transition: all 0.3s;
	}
	
	.category-tab.active {
		background-color: #ff6b6b;
		color: #fff;
	}
	
	/* 场景列表 */
	.scene-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}
	
	.scene-item {
		background-color: #fafafa;
		border-radius: 15rpx;
		padding: 25rpx;
		border-left: 6rpx solid #ff6b6b;
		cursor: pointer;
		transition: all 0.3s;
	}
	
	.scene-item:hover {
		background-color: #f0f0f0;
		transform: translateY(-2rpx);
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
	}
	
	.scene-title {
		font-size: 28rpx;
		color: #333;
		line-height: 42rpx;
		margin-bottom: 10rpx;
		display: block;
	}
	
	.scene-stats {
		font-size: 22rpx;
		color: #999;
	}

	/* 欢迎描述卡片 */
	.welcome-card {
		background-color: #f9fafb;
		border: 1px solid #eef2f7;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
	}
	.welcome-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #222;
		display: block;
		margin-bottom: 12rpx;
	}
	.welcome-desc {
		font-size: 26rpx;
		color: #666;
		line-height: 40rpx;
		display: block;
	}
	
	/* 测试区域 */
	.test-section {
		margin-bottom: 30rpx;
		padding: 20rpx;
		background-color: #f8f9fa;
		border-radius: 10rpx;
	}
	
	.test-btn {
		width: 100%;
		padding: 20rpx;
		background-color: #007aff;
		color: #fff;
		border-radius: 10rpx;
		font-size: 28rpx;
		border: none;
	}
	
	.test-btn:active {
		background-color: #0056b3;
	}
	
	.test-result {
		margin-top: 20rpx;
		padding: 15rpx;
		border-radius: 8rpx;
		font-size: 24rpx;
		line-height: 36rpx;
	}
	
	.test-result.success {
		background-color: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}
	
	.test-result.error {
		background-color: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}
</style>
