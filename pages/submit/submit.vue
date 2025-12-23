<template>
	<view class="page">
		<view class="card">
			<view class="title">提交你的场景</view>
			<view class="desc">填写场景信息，提交后等待审核上线。</view>
			
			<!-- 表单区域 -->
			<view class="form">
				<!-- 场景标题 -->
				<view class="form-item">
					<text class="label">场景标题 <text class="required">*</text></text>
					<input 
						class="input" 
						v-model="formData.title" 
						placeholder="例如：你回家太晚，女朋友很生气"
						maxlength="255"
					/>
				</view>
				
				<!-- 场景描述 -->
				<view class="form-item">
					<text class="label">场景描述（可选）</text>
					<textarea 
						class="textarea" 
						v-model="formData.description" 
						placeholder="简要描述这个场景的背景"
						maxlength="500"
					/>
				</view>
				
				<!-- 场景分类 -->
				<view class="form-item">
					<text class="label">场景分类 <text class="required">*</text></text>
					<picker 
						@change="onCategoryChange" 
						:value="categoryIndex" 
						:range="categoryOptions"
						class="picker"
					>
						<view class="picker-text">
							{{ formData.category || '请选择分类' }}
						</view>
					</picker>
				</view>
				
				<!-- 对象角色 -->
				<view class="form-item">
					<text class="label">对象角色 <text class="required">*</text></text>
					<input 
						class="input" 
						v-model="formData.role" 
						placeholder="例如：女朋友、男朋友、妈妈、老板等"
						maxlength="50"
					/>
				</view>
				
				<!-- 角色性别 -->
				<view class="form-item">
					<text class="label">角色性别 <text class="required">*</text></text>
					<picker 
						@change="onGenderChange" 
						:value="genderIndex" 
						:range="genderOptions"
						class="picker"
					>
						<view class="picker-text">
							{{ formData.roleGender || '请选择性别' }}
						</view>
					</picker>
				</view>
				
				<!-- 生气理由 -->
				<view class="form-item">
					<text class="label">生气理由 <text class="required">*</text></text>
					<textarea 
						class="textarea" 
						v-model="formData.angryReason" 
						placeholder="详细描述对方为什么生气，这将是游戏开始时AI的第一句话"
						maxlength="1000"
					/>
				</view>
				
				<!-- 预期难度 -->
				<view class="form-item">
					<text class="label">预期难度 <text class="required">*</text></text>
					<picker 
						@change="onDifficultyChange" 
						:value="difficultyIndex" 
						:range="difficultyOptions"
						class="picker"
					>
						<view class="picker-text">
							{{ formData.expectedDifficulty || '请选择难度' }}
						</view>
					</picker>
				</view>
			</view>
			
			<!-- 提交按钮 -->
			<button 
				class="submit-btn" 
				type="primary" 
				:loading="submitting"
				@click="handleSubmit"
			>
				{{ submitting ? '提交中...' : '提交场景' }}
			</button>
			
			<button class="back-btn" @click="goIndex">返回挑战</button>
		</view>
	</view>
</template>

<script>
import { sceneService, userSceneService } from '@/utils/supabase-helper.js'

export default {
	data() {
		return {
			formData: {
				title: '',
				description: '',
				category: '',
				role: '',
				roleGender: '其他',
				angryReason: '',
				expectedDifficulty: '中'
			},
			categoryOptions: [],
			categoryIndex: 0,
			genderOptions: ['男', '女', '其他'],
			genderIndex: 2,
			difficultyOptions: ['易', '中', '难'],
			difficultyIndex: 1,
			submitting: false,
			userId: '',
			userNickname: ''
		}
	},
	onLoad() {
		this.loadUserInfo()
		this.loadCategories()
	},
	methods: {
		loadUserInfo() {
			this.userId = uni.getStorageSync('userId') || ''
			this.userNickname = uni.getStorageSync('userName') || '匿名用户'
		},
		async loadCategories() {
			try {
				const { data, error } = await sceneService.getAllScenes({
					status: 'active',
					limit: 200
				})
				
				if (error) {
					console.error('加载分类失败:', error)
					uni.showToast({
						title: '加载分类失败',
						icon: 'none'
					})
					return
				}
				
				// 提取所有分类并去重
				const categorySet = new Set()
				if (data && data.length > 0) {
					data.forEach(scene => {
						if (scene.category) {
							categorySet.add(scene.category)
						}
					})
				}
				
				// 转换为数组并排序
				this.categoryOptions = Array.from(categorySet).sort()
				
				// 如果没有分类，提供默认选项
				if (this.categoryOptions.length === 0) {
					this.categoryOptions = ['情侣', '亲人', '职场', '奇怪', '角色扮演', '其他']
				}
			} catch (err) {
				console.error('加载分类异常:', err)
				// 使用默认分类
				this.categoryOptions = ['情侣', '亲人', '职场', '奇怪', '角色扮演', '其他']
			}
		},
		onCategoryChange(e) {
			this.categoryIndex = e.detail.value
			this.formData.category = this.categoryOptions[e.detail.value]
		},
		onGenderChange(e) {
			this.genderIndex = e.detail.value
			this.formData.roleGender = this.genderOptions[e.detail.value]
		},
		onDifficultyChange(e) {
			this.difficultyIndex = e.detail.value
			this.formData.expectedDifficulty = this.difficultyOptions[e.detail.value]
		},
		validateForm() {
			if (!this.formData.title || !this.formData.title.trim()) {
				uni.showToast({
					title: '请输入场景标题',
					icon: 'none'
				})
				return false
			}
			
			if (!this.formData.category) {
				uni.showToast({
					title: '请选择场景分类',
					icon: 'none'
				})
				return false
			}
			
			if (!this.formData.role || !this.formData.role.trim()) {
				uni.showToast({
					title: '请输入对象角色',
					icon: 'none'
				})
				return false
			}
			
			if (!this.formData.angryReason || !this.formData.angryReason.trim()) {
				uni.showToast({
					title: '请输入生气理由',
					icon: 'none'
				})
				return false
			}
			
			return true
		},
		async handleSubmit() {
			if (this.submitting) return
			
			if (!this.validateForm()) {
				return
			}
			
			// 检查用户是否已登录
			if (!this.userId) {
				uni.showModal({
					title: '提示',
					content: '请先登录后再提交场景',
					success: (res) => {
						if (res.confirm) {
							uni.switchTab({ url: '/pages/profile/profile' })
						}
					}
				})
				return
			}
			
			this.submitting = true
			
			try {
				const { data, error } = await userSceneService.submitScene({
					userId: this.userId,
					userNickname: this.userNickname,
					title: this.formData.title.trim(),
					description: this.formData.description.trim() || null,
					category: this.formData.category,
					role: this.formData.role.trim(),
					roleGender: this.formData.roleGender,
					angryReason: this.formData.angryReason.trim(),
					expectedDifficulty: this.formData.expectedDifficulty
				})
				
				if (error) {
					console.error('提交失败:', error)
					uni.showToast({
						title: '提交失败，请稍后重试',
						icon: 'none',
						duration: 2000
					})
					return
				}
				
				uni.showModal({
					title: '提交成功',
					content: '你的场景已提交，等待审核通过后即可上线。',
					showCancel: false,
					success: () => {
						// 重置表单
						this.formData = {
							title: '',
							description: '',
							category: '',
							role: '',
							roleGender: '其他',
							angryReason: '',
							expectedDifficulty: '中'
						}
						this.categoryIndex = 0
						this.genderIndex = 2
						this.difficultyIndex = 1
						
						// 返回首页
						uni.switchTab({ url: '/pages/index/index' })
					}
				})
			} catch (err) {
				console.error('提交异常:', err)
				uni.showToast({
					title: '提交异常，请稍后重试',
					icon: 'none',
					duration: 2000
				})
			} finally {
				this.submitting = false
			}
		},
		goIndex() {
			uni.switchTab({ url: '/pages/index/index' })
		}
	}
}
</script>

<style>
.page {
	min-height: 100vh;
	background: #f8f9fa;
	padding: 32rpx;
	box-sizing: border-box;
}

.card {
	background: #fff;
	border-radius: 16rpx;
	padding: 28rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
}

.title {
	font-size: 32rpx;
	font-weight: 600;
	color: #222;
	margin-bottom: 12rpx;
}

.desc {
	font-size: 26rpx;
	color: #666;
	line-height: 40rpx;
	margin-bottom: 32rpx;
}

.form {
	margin-bottom: 32rpx;
}

.form-item {
	margin-bottom: 32rpx;
}

.label {
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
	display: block;
	margin-bottom: 12rpx;
}

.required {
	color: #ff6b6b;
}

.input {
	width: 100%;
	height: 88rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	color: #333;
	box-sizing: border-box;
}

.textarea {
	width: 100%;
	min-height: 160rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 20rpx 24rpx;
	font-size: 28rpx;
	color: #333;
	box-sizing: border-box;
	line-height: 40rpx;
}

.picker {
	width: 100%;
	height: 88rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	padding: 0 24rpx;
	box-sizing: border-box;
}

.picker-text {
	font-size: 28rpx;
	color: #333;
	flex: 1;
}

.picker-text::after {
	content: '';
	display: inline-block;
	width: 0;
	height: 0;
	border-left: 8rpx solid transparent;
	border-right: 8rpx solid transparent;
	border-top: 10rpx solid #999;
	margin-left: 12rpx;
	vertical-align: middle;
}

.submit-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background: linear-gradient(135deg, #4f46e5, #7c3aed);
	border: none;
	border-radius: 12rpx;
	font-size: 32rpx;
	color: #fff;
	margin-bottom: 24rpx;
}

.submit-btn:active {
	opacity: 0.8;
}

.back-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background: #f5f5f5;
	border: none;
	border-radius: 12rpx;
	font-size: 28rpx;
	color: #666;
}

.back-btn:active {
	background: #e0e0e0;
}
</style>
