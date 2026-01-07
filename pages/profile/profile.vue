<template>
	<view class="page">
		<!-- 顶部个人信息展示 -->
		<view class="profile-card">
			<image class="avatar" :src="avatar" mode="aspectFill" />
			<view class="profile-info">
				<text class="name">{{ nickname || '未命名用户' }}</text>
			</view>
			<!-- 清除数据按钮（测试用） -->
			<view class="clear-btn" @click="clearUserData">清除登录</view>
		</view>

		<!-- 数据卡片（仅展示） -->
		<view class="stats-card">
			<view class="stats-title">挑战数据</view>
			<view class="stats-row">
				<view class="stat-item">
					<text class="stat-value">{{ stats.totalGames }}</text>
					<text class="stat-label">总挑战</text>
				</view>
				<view class="stat-item">
					<text class="stat-value">{{ stats.successCount }}</text>
					<text class="stat-label">成功次数</text>
				</view>
				<view class="stat-item">
					<text class="stat-value">{{ stats.successRate }}%</text>
					<text class="stat-label">成功率</text>
				</view>
				<view class="stat-item">
					<text class="stat-value">{{ stats.uniqueScenes }}</text>
					<text class="stat-label">玩过场景</text>
				</view>
			</view>
		</view>

		<!-- 挑战记录（展示） -->
		<view class="records-card">
			<view class="records-title">最近挑战</view>
			<view v-if="records.length === 0" class="empty">暂无记录</view>
			<view
				v-else
				class="record-item"
				v-for="(rec, idx) in records"
				:key="idx"
				@click="handleRecordClick(rec)"
			>
				<view class="record-main">
					<view class="rec-top">
						<text class="rec-title">{{ rec.sceneTitle || '未知场景' }}</text>
						<text class="rec-result" :class="rec.is_success ? 'ok' : 'fail'">
							{{ rec.is_success ? '成功' : '失败' }}
						</text>
					</view>
					<view class="rec-sub">
						<text>原谅值：{{ rec.final_forgiveness ?? '--' }}</text>
						<text>轮次：{{ rec.interaction_count ?? '--' }}</text>
						<text>{{ rec.created_at ? rec.created_at.split('T')[0] : '' }}</text>
					</view>
				</view>
				<view class="rec-action">
					<text class="rec-cta">再挑战</text>
					<text class="rec-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 底部选择弹窗 -->
		<view v-if="showBottomSheet" class="bottom-sheet-mask" @click="closeBottomSheet">
			<view class="bottom-sheet" @click.stop>
				<view class="sheet-title">{{ bottomSheetTitle }}</view>
				<view class="sheet-options">
					<view 
						v-for="(option, index) in bottomSheetOptions" 
						:key="index"
						class="sheet-option"
						@click="handleBottomOption(index)"
					>
						<image v-if="option.avatar" class="option-avatar" :src="option.avatar" mode="aspectFill" />
						<text class="option-text">{{ option.text }}</text>
					</view>
				</view>
				<view class="sheet-cancel" @click="closeBottomSheet">取消</view>
			</view>
		</view>

		<!-- 输入昵称弹窗 -->
		<view v-if="showNameInput" class="modal-mask" @click="closeNameInput">
			<view class="modal" @click.stop>
				<view class="modal-title">输入昵称</view>
				<input class="modal-input" v-model="inputName" placeholder="请输入昵称" maxlength="20" />
				<view class="modal-actions">
					<button size="mini" @click="closeNameInput">取消</button>
					<button size="mini" type="primary" @click="confirmNameInput">确认</button>
				</view>
			</view>
		</view>

		<!-- 微信一键登录弹窗（使用新组件方式） -->
		<view v-if="showWxLoginModal" class="modal-mask" @click="closeWxLoginModal">
			<view class="modal wx-login-modal" @click.stop>
				<view class="modal-title">微信一键登录</view>
				<view class="wx-login-content">
					<!-- 选择头像 -->
					<view class="wx-login-item">
						<text class="wx-login-label">选择头像</text>
						<!-- #ifdef MP-WEIXIN -->
						<button class="wx-avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
							<image v-if="tempAvatar" class="wx-avatar-preview" :src="tempAvatar" mode="aspectFill" />
							<view v-else class="wx-avatar-placeholder">
								<text>点击选择头像</text>
							</view>
						</button>
						<!-- #endif -->
					</view>
					<!-- 输入昵称 -->
					<view class="wx-login-item">
						<text class="wx-login-label">输入昵称</text>
						<!-- #ifdef MP-WEIXIN -->
						<input 
							class="wx-nickname-input" 
							type="nickname" 
							v-model="tempNickname" 
							placeholder="请输入昵称"
							maxlength="20"
						/>
						<!-- #endif -->
					</view>
				</view>
				<view class="modal-actions">
					<button size="mini" @click="closeWxLoginModal">取消</button>
					<button size="mini" type="primary" @click="confirmWxLogin">确认登录</button>
				</view>
			</view>
		</view>

		<view class="bottom-space" />
	</view>
</template>

<script>
import { gameRecordService, userService } from '@/utils/supabase-helper.js'

export default {
		data() {
			return {
				userId: '',
				wxOpenid: '',
				nickname: '',
				avatar: '/static/user.png',
				stats: {
					totalGames: 0,
					successCount: 0,
					successRate: 0,
					uniqueScenes: 0
				},
				records: [],
				showBottomSheet: false,
				bottomSheetTitle: '',
				bottomSheetOptions: [],
			selectedAvatar: '', // 已选择的头像
			showNameInput: false,
			inputName: '',
			loginType: 'guest', // 登录类型：wx 或 guest
			showWxLoginModal: false, // 微信一键登录弹窗
			tempAvatar: '', // 临时头像（选择后）
			tempNickname: '' // 临时昵称（输入后）
			}
		},
	onShow() {
		this.loadUser()
		this.loadStats()
		this.loadRecords()
		if (!this.userId || !this.nickname || !this.avatar) {
			this.promptLogin()
		}
	},
	// #ifdef MP-WEIXIN
	onShareAppMessage() {
		const stats = this.stats
		const shareTitle = stats.totalGames > 0
			? `我的挑战数据：总挑战${stats.totalGames}次，成功率${stats.successRate}%！来挑战吧！`
			: '哄一哄他（她）- AI情感对话游戏，挑战你的沟通技巧！'
		
		return {
			title: shareTitle,
			path: '/pages/index/index',
			imageUrl: '' // 可选：分享图片，建议尺寸 5:4
		}
	},
	onShareTimeline() {
		const stats = this.stats
		const shareTitle = stats.totalGames > 0
			? `我的挑战数据：总挑战${stats.totalGames}次，成功率${stats.successRate}%！来挑战吧！`
			: '哄一哄他（她）- AI情感对话游戏，挑战你的沟通技巧！'
		
		return {
			title: shareTitle,
			query: '',
			imageUrl: '' // 可选：分享图片，建议尺寸 1:1（500x500px）
		}
	},
	// #endif
	methods: {
		loadUser() {
			const storedId = uni.getStorageSync('userId') || ''
			const storedName = uni.getStorageSync('userName') || ''
			const storedAvatar = uni.getStorageSync('userAvatar') || ''
			const storedWxOpenid = uni.getStorageSync('wxOpenid') || ''
			// 优先使用已存的 openid 作为 userId，确保身份稳定
			this.userId = storedWxOpenid || storedId || this.genAnonId()
			this.wxOpenid = storedWxOpenid || ''
			this.nickname = storedName || ''
			if (storedAvatar) this.avatar = storedAvatar
		},
		async saveUser(extra = {}) {
			// 保存到本地存储
			const finalUserId = this.wxOpenid || this.userId || this.genAnonId()
			uni.setStorageSync('userId', finalUserId)
			uni.setStorageSync('userName', this.nickname || '')
			uni.setStorageSync('userAvatar', this.avatar || '/static/user.png')
			uni.setStorageSync('loginType', this.loginType || 'guest')
			if (extra.wxOpenid || this.wxOpenid) {
				uni.setStorageSync('wxOpenid', extra.wxOpenid || this.wxOpenid)
			}
			
			// 保存到 Supabase 数据库
			try {
				const { data, error } = await userService.createOrUpdateUser({
					userId: finalUserId,
					nickname: this.nickname,
					avatarUrl: this.avatar !== '/static/user.png' ? this.avatar : null,
					loginType: this.loginType || 'guest',
					wxOpenid: extra.wxOpenid || this.wxOpenid || null
				})
				
				if (error) {
					console.error('保存用户信息到数据库失败:', error)
					// 即使数据库保存失败，本地存储已成功，仍然提示成功
				}
			} catch (err) {
				console.error('保存用户信息异常:', err)
			}
			
			uni.showToast({ title: '已保存', icon: 'success' })
		},
		genAnonId() {
			const id = `guest-${Math.random().toString(16).slice(2, 10)}`
			this.userId = id
			return id
		},
		promptLogin() {
			this.bottomSheetTitle = '选择登录方式'
			this.bottomSheetOptions = [
				{ text: '微信一键登录', type: 'wx-new' },
				{ text: '手动填写', type: 'manual' }
			]
			this.showBottomSheet = true
		},
		handleBottomOption(index) {
			const option = this.bottomSheetOptions[index]
			if (option.type === 'wx-new') {
				// 使用新的组件方式登录
				this.closeBottomSheet()
				this.showWxLoginModal = true
			} else if (option.type === 'wx') {
				// 旧的 getUserProfile 方式（已废弃，保留兼容）
				this.wxAuthorize()
				this.closeBottomSheet()
			} else if (option.type === 'manual') {
				// 切换到手动填写选项
				this.showManualOptions()
			} else if (option.type === 'avatar') {
				this.chooseAvatarFromAlbum()
			} else if (option.type === 'name') {
				this.closeBottomSheet()
				this.showNameInput = true
			}
		},
		showManualOptions() {
			this.bottomSheetTitle = '手动填写资料'
			this.bottomSheetOptions = [
				{ 
					text: this.selectedAvatar ? '已选择头像' : '从相册选择头像', 
					type: 'avatar',
					avatar: this.selectedAvatar || null
				},
				{ text: '输入昵称', type: 'name' }
			]
			// 不关闭，直接更新选项
		},
		closeBottomSheet() {
			this.showBottomSheet = false
			this.bottomSheetTitle = ''
			this.bottomSheetOptions = []
		},
		wxAuthorize() {
			// #ifdef MP-WEIXIN
			this.wxAuthorizeAndBind()
			// #endif
			// #ifndef MP-WEIXIN
			uni.showToast({ title: '仅支持微信小程序', icon: 'none' })
			// #endif
		},
		// 微信授权 + 云函数 login 获取 openid + 同步到数据库
		async wxAuthorizeAndBind() {
			try {
				const profile = await new Promise((resolve, reject) => {
			uni.getUserProfile({
				desc: '用于完善个人资料',
						success: (res) => resolve(res.userInfo || {}),
						fail: reject
					})
				})

				const openid = await this.ensureWxOpenid()
				this.wxOpenid = openid
				// 使用 openid 作为 userId，避免重复记录
				this.userId = openid
				this.nickname = profile.nickName || this.nickname
				this.avatar = profile.avatarUrl || this.avatar
						this.loginType = 'wx'

				await this.saveUser({ wxOpenid: openid })
						this.closeBottomSheet()
				uni.showToast({ title: '登录成功', icon: 'success' })
			} catch (err) {
				console.error('微信授权失败', err)
					uni.showToast({
					title: err?.errMsg || '授权失败',
						icon: 'none'
					})
				}
		},
		// 调用云函数 login 获取 openid
		getWxOpenid() {
			return new Promise((resolve, reject) => {
				// #ifdef MP-WEIXIN
				if (!wx.cloud) {
					reject(new Error('wx.cloud 未初始化'))
					return
				}
				wx.cloud.callFunction({
					name: 'login',
					success: (res) => {
						const openid = res?.result?.openid
						if (openid) resolve(openid)
						else reject(new Error('未获取到 openid'))
					},
					fail: reject
			})
			// #endif
			// #ifndef MP-WEIXIN
				reject(new Error('仅支持微信小程序'))
			// #endif
			})
		},
		// 确保拿到 openid；拿不到时回退为 guest
		async ensureWxOpenid() {
			if (this.wxOpenid) return this.wxOpenid
			try {
				const openid = await this.getWxOpenid()
				this.wxOpenid = openid
				this.userId = openid
				this.loginType = 'wx'
				uni.setStorageSync('wxOpenid', openid)
				return openid
			} catch (err) {
				// 无法获取 openid 时回退 guest，但会造成新用户；日志提示
				console.warn('获取 openid 失败，回退 guest：', err)
				this.loginType = 'guest'
				return null
			}
		},
		changeAvatar() {
			// 个人中心页面头像不可点击编辑
		},
		async chooseAvatarFromAlbum() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album'],
				success: async (res) => {
					if (res.tempFilePaths && res.tempFilePaths.length > 0) {
						this.selectedAvatar = res.tempFilePaths[0]
						this.avatar = res.tempFilePaths[0]
						// 更新底部选择中的头像显示
						this.showManualOptions()
						// 如果昵称也有了，自动保存并关闭
						if (this.nickname) {
							const openid = await this.ensureWxOpenid()
							if (openid) {
								this.userId = openid
								this.loginType = 'wx'
							} else {
							this.loginType = 'guest'
							}
							await this.saveUser({ wxOpenid: openid || null })
							this.closeBottomSheet()
						} else {
							// 头像已选，提示填写昵称
							uni.showToast({ title: '头像已选择，请填写昵称', icon: 'none' })
						}
					}
				}
			})
		},
		// 微信一键登录相关方法
		onChooseAvatar(e) {
			// #ifdef MP-WEIXIN
			const { avatarUrl } = e.detail
			if (avatarUrl) {
				this.tempAvatar = avatarUrl
			}
			// #endif
		},
		closeWxLoginModal() {
			this.showWxLoginModal = false
			this.tempAvatar = ''
			this.tempNickname = ''
		},
		async confirmWxLogin() {
			// #ifdef MP-WEIXIN
			if (!this.tempNickname || !this.tempNickname.trim()) {
				uni.showToast({ title: '请输入昵称', icon: 'none' })
				return
			}
			
			if (!this.tempAvatar) {
				uni.showToast({ title: '请选择头像', icon: 'none' })
				return
			}
			
			try {
				// 1. 获取 openid
				const openid = await this.getWxOpenid()
				if (!openid) {
					uni.showToast({ title: '获取用户信息失败', icon: 'none' })
					return
				}
				
				// 2. 设置用户信息
				this.wxOpenid = openid
				this.userId = openid
				this.nickname = this.tempNickname.trim()
				this.avatar = this.tempAvatar
				this.loginType = 'wx'
				
				// 3. 保存到数据库和本地存储
				await this.saveUser({ wxOpenid: openid })
				
				// 4. 关闭弹窗
				this.closeWxLoginModal()
				uni.showToast({ title: '登录成功', icon: 'success' })
			} catch (err) {
				console.error('微信一键登录失败:', err)
				uni.showToast({
					title: err?.message || '登录失败，请重试',
					icon: 'none'
				})
			}
			// #endif
		},
		closeNameInput() {
			this.showNameInput = false
			this.inputName = ''
		},
		async confirmNameInput() {
			if (!this.inputName.trim()) {
				uni.showToast({ title: '请输入昵称', icon: 'none' })
				return
			}
			this.nickname = this.inputName.trim()
			// 尝试获取 openid，让手动填写也绑定同一身份
			const openid = await this.ensureWxOpenid()
			if (openid) {
				this.userId = openid
				this.loginType = 'wx'
			} else {
			this.loginType = 'guest'
			}
			// 如果头像也有了，自动保存
			if (this.selectedAvatar) {
				this.avatar = this.selectedAvatar
				await this.saveUser({ wxOpenid: openid || null })
			} else {
				// 昵称已填，提示选择头像
				uni.showToast({ title: '昵称已保存，请选择头像', icon: 'none' })
				// 重新打开底部选择，显示手动填写选项
				this.showManualOptions()
				this.showBottomSheet = true
			}
			this.closeNameInput()
		},
		async loadStats() {
			if (!this.userId) return
			const { data, error } = await gameRecordService.getUserStats(this.userId)
			if (!error && data) {
				this.stats = data
			}
		},
		async loadRecords() {
			if (!this.userId) return
			const { data, error } = await gameRecordService.getRecentScenes(this.userId, 5)
			if (!error && data) {
				this.records = data.map(r => ({
					...r,
					sceneTitle: (r.scene && r.scene.title) || r.scene_title || r.sceneId || '场景'
				}))
			}
		},
		handleRecordClick(rec) {
			const sceneId = rec.scene_id || rec.sceneId
			if (!sceneId) {
				uni.showToast({ title: '缺少场景ID', icon: 'none' })
				return
			}
			uni.navigateTo({ url: `/pages/dialog/dialog?id=${sceneId}` })
		},
		clearUserData() {
			uni.showModal({
				title: '提示',
				content: '确定要清除登录信息吗？清除后需要重新登录',
				success: (res) => {
					if (res.confirm) {
					// 清除本地存储
					uni.removeStorageSync('userId')
					uni.removeStorageSync('userName')
					uni.removeStorageSync('userAvatar')
					uni.removeStorageSync('loginType')
					uni.removeStorageSync('wxOpenid')
					// 重置数据
					this.userId = ''
					this.wxOpenid = ''
					this.nickname = ''
					this.avatar = '/static/user.png'
					this.selectedAvatar = ''
					this.loginType = 'guest'
					this.stats = {
						totalGames: 0,
						successCount: 0,
						successRate: 0,
						uniqueScenes: 0
					}
					this.records = []
					// 弹出登录选择
					this.promptLogin()
					uni.showToast({ title: '已清除，请重新登录', icon: 'success' })
					}
				}
			})
		}
	}
}
</script>

<style>
.page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 20rpx 20rpx 40rpx 20rpx;
	box-sizing: border-box;
}

.profile-card {
	background: #fff;
	border-radius: 0;
	padding: 30rpx 24rpx;
	margin-bottom: 20rpx;
	display: flex;
	align-items: center;
	position: relative;
}

.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 12rpx;
	background: #f0f0f0;
	margin-right: 24rpx;
	flex-shrink: 0;
}

.profile-info {
	flex: 1;
	display: flex;
	align-items: center;
}

.name {
	font-size: 36rpx;
	font-weight: 500;
	color: #333;
}

.clear-btn {
	position: absolute;
	top: 30rpx;
	right: 24rpx;
	padding: 8rpx 16rpx;
	background: #f5f5f5;
	border: 1rpx solid #e0e0e0;
	border-radius: 8rpx;
	font-size: 22rpx;
	color: #666;
}

.mini-btn {
	background: #1f2937;
	color: #fefefe;
	border: 1rpx solid #2d3748;
}

.profile-actions {
	margin-top: 16rpx;
	display: flex;
	gap: 12rpx;
}

.action-btn {
	flex: 1;
	border: 1rpx solid #2d3748;
	background: #1f2937;
	color: #fefefe;
}

.stats-card,
.records-card {
	background: #fff;
	border-radius: 16rpx;
	padding: 20rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
	margin-bottom: 16rpx;
}

.stats-title,
.records-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #222;
	margin-bottom: 12rpx;
}

.stats-row {
	display: flex;
	justify-content: space-between;
	gap: 12rpx;
}

.stat-item {
	flex: 1;
	background: #f8f9fb;
	border-radius: 12rpx;
	padding: 16rpx;
	text-align: center;
}

.stat-value {
	font-size: 32rpx;
	font-weight: 700;
	color: #111;
	display: block;
	margin-bottom: 4rpx;
}

.stat-label {
	font-size: 24rpx;
	color: #777;
}

.record-item {
	padding: 20rpx 16rpx;
	border: 1rpx solid #eef1f5;
	border-radius: 14rpx;
	background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
	margin-bottom: 14rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.rec-top {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 6rpx;
	gap: 12rpx;
}

.rec-title {
	font-size: 28rpx;
	color: #222;
	font-weight: 600;
	flex: 1;
}

.rec-result {
	font-size: 24rpx;
	padding: 4rpx 10rpx;
	border-radius: 10rpx;
	white-space: nowrap;
}

.rec-result.ok {
	background: #e6f6ef;
	color: #0f9d58;
}

.rec-result.fail {
	background: #fdecec;
	color: #d93025;
}

.rec-sub {
	font-size: 24rpx;
	color: #777;
	display: flex;
	gap: 20rpx;
	flex-wrap: wrap;
}

.empty {
	font-size: 26rpx;
	color: #999;
	padding: 12rpx 0;
}

.record-main {
	flex: 1;
	min-width: 0;
}

.rec-action {
	display: flex;
	align-items: center;
	gap: 6rpx;
	color: #4f46e5;
	font-size: 26rpx;
	font-weight: 600;
	padding-left: 8rpx;
}

.rec-cta {
	line-height: 1;
}

.rec-arrow {
	font-size: 32rpx;
	line-height: 1;
}

.bottom-space {
	height: 60rpx;
}

/* 底部选择弹窗 */
.bottom-sheet-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 999;
	display: flex;
	align-items: flex-end;
}

.bottom-sheet {
	width: 100%;
	background: #fff;
	border-radius: 24rpx 24rpx 0 0;
	padding: 20rpx 0;
	animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
	from {
		transform: translateY(100%);
	}
	to {
		transform: translateY(0);
	}
}

.sheet-title {
	font-size: 28rpx;
	color: #999;
	text-align: center;
	padding: 0 20rpx 20rpx;
}

.sheet-options {
	padding: 0 20rpx;
}

.sheet-option {
	display: flex;
	align-items: center;
	padding: 24rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.sheet-option:last-child {
	border-bottom: none;
}

.option-avatar {
	width: 60rpx;
	height: 60rpx;
	border-radius: 8rpx;
	margin-right: 20rpx;
}

.option-text {
	font-size: 32rpx;
	color: #333;
}

.sheet-cancel {
	text-align: center;
	padding: 24rpx 0;
	margin-top: 20rpx;
	border-top: 1rpx solid #f0f0f0;
	font-size: 32rpx;
	color: #333;
}

/* 输入昵称弹窗 */
.modal-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
}

.modal {
	width: 600rpx;
	background: #fff;
	border-radius: 16rpx;
	padding: 40rpx;
}

.modal-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	margin-bottom: 30rpx;
	text-align: center;
}

.modal-input {
	width: 100%;
	padding: 20rpx;
	border: 1rpx solid #e0e0e0;
	border-radius: 8rpx;
	font-size: 28rpx;
	margin-bottom: 30rpx;
}

.modal-actions {
	display: flex;
	gap: 20rpx;
	justify-content: flex-end;
}

/* 微信一键登录弹窗样式 */
.wx-login-modal {
	min-width: 600rpx;
}

.wx-login-content {
	padding: 20rpx 0;
}

.wx-login-item {
	margin-bottom: 30rpx;
}

.wx-login-label {
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
	display: block;
	margin-bottom: 16rpx;
}

.wx-avatar-btn {
	width: 100%;
	height: 200rpx;
	padding: 0;
	background: #f5f5f5;
	border: 2rpx dashed #ddd;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	overflow: hidden;
}

.wx-avatar-btn::after {
	border: none;
}

.wx-avatar-preview {
	width: 100%;
	height: 100%;
	border-radius: 10rpx;
}

.wx-avatar-placeholder {
	font-size: 26rpx;
	color: #999;
}

.wx-nickname-input {
	width: 100%;
	height: 88rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	color: #333;
	box-sizing: border-box;
}
</style>

