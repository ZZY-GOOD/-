<template>
	<view class="dialog-page">
		<!-- 头部信息 -->
		<view class="scene-header" v-if="scene">
			<view class="scene-title">{{ scene.title }}</view>
			<view class="meta-row">
				<view class="meta-item">
					<text class="meta-label">原谅值</text>
					<view class="bar">
						<view class="bar-fill" :style="{ width: forgivenessPercent + '%' }"></view>
					</view>
					<text class="meta-value">{{ forgiveness }}/100</text>
				</view>
				<view class="meta-item turns">
					<text class="meta-label">聊天轮次</text>
					<text class="meta-value">{{ currentTurn }}/{{ maxTurns }}</text>
				</view>
			</view>
		</view>

		<!-- 聊天区 -->
		<scroll-view class="chat-list" :class="{ 'game-ended': gameEnded }" :scroll-y="true" scroll-with-animation :scroll-into-view="lastMsgId">
			<view
				v-for="(msg, idx) in messages"
				:key="msg.id"
				:id="msg.id"
				class="chat-item"
				:class="msg.role"
			>
				<view class="avatar-wrapper">
					<image class="avatar" :src="msg.role === 'ai' ? getAiAvatar(msg.forgiveness) : userAvatar" mode="aspectFill" />
					<text v-if="msg.role === 'ai'" class="avatar-expression">{{ getExpression(msg.forgiveness) }}</text>
				</view>
				<view class="bubble">
					<text class="msg-text">{{ msg.text }}</text>
					<text v-if="msg.forgivenessChange" class="forgive-change">{{ msg.forgivenessChange }}</text>
				</view>
			</view>
		</scroll-view>

		<!-- 游戏结束提示 -->
		<view v-if="gameEnded" class="result-banner" :class="gameResult.success ? 'success' : 'failed'">
			<text class="result-text">{{ gameResult.message }}</text>
		</view>

		<!-- 输入区（游戏进行中） -->
		<view v-if="!gameEnded" class="input-area">
			<textarea
				class="text-input multiline"
				v-model="inputText"
				:disabled="actionLocked"
				placeholder="快，说点什么"
				auto-height
				:maxlength="-1"
			/>
			<button class="send-btn" type="primary" :disabled="actionLocked" @click="handleSend">发送</button>
		</view>

		<!-- 操作按钮（游戏结束后） -->
		<view v-if="gameEnded" class="action-buttons">
			<button class="action-btn restart-btn" @click="handleRestart">重开</button>
			<button class="action-btn return-btn" @click="handleReturn">返回</button>
		</view>
	</view>
</template>

<script>
import { sceneService, gameRecordService } from '@/utils/supabase-helper.js'
import { generateReply } from '@/utils/ai-service.js'

export default {
	data() {
		return {
			sceneId: '',
			scene: null,
			loading: false,
			inputText: '',
			forgiveness: 0,
			startForgiveness: 0,
			maxTurns: 10,
			currentTurn: 0,
			messages: [],
			userAvatar: '/static/user.png', // 默认头像，会在 onLoad 时从本地存储读取用户头像
			aiAvatar: '/static/user.png', // TODO: 需要添加 /static/logo.png 作为 AI 头像
			actionLocked: false,
			lastMsgId: '',
			userId: '',
			forgivenessChanges: [],
			startTimestamp: 0,
			recordSaved: false,
			gameEnded: false,
			gameResult: {
				success: false,
				message: ''
			}
		}
	},
	computed: {
		forgivenessPercent() {
			const val = Math.max(0, Math.min(100, this.forgiveness))
			return val
		}
	},
	onLoad(options) {
		if (!options || !options.id) {
			uni.showToast({ title: '缺少场景ID', icon: 'none' })
			return
		}
		this.sceneId = options.id
		this.loadUser()
		this.initScene()
	},
	// #ifdef MP-WEIXIN
	onShareAppMessage() {
		const sceneTitle = this.scene?.title || '哄一哄他（她）'
		const shareTitle = this.gameEnded
			? `${sceneTitle} - ${this.gameResult.success ? '挑战成功！' : '挑战失败，来试试吧！'}`
			: `${sceneTitle} - 来挑战这个场景吧！`
		
		return {
			title: shareTitle,
			path: `/pages/dialog/dialog?id=${this.sceneId}`,
			imageUrl: '' // 可选：分享图片，建议尺寸 5:4
		}
	},
	onShareTimeline() {
		const sceneTitle = this.scene?.title || '哄一哄他（她）'
		const shareTitle = this.gameEnded
			? `${sceneTitle} - ${this.gameResult.success ? '挑战成功！' : '挑战失败，来试试吧！'}`
			: `${sceneTitle} - 来挑战这个场景吧！`
		
		return {
			title: shareTitle,
			query: `id=${this.sceneId}`,
			imageUrl: '' // 可选：分享图片，建议尺寸 1:1（500x500px）
		}
	},
	// #endif
	methods: {
		// 根据原谅值获取表情emoji
		getExpression(forgiveness) {
			const val = forgiveness !== undefined ? forgiveness : this.forgiveness
			if (val <= 30) return '😠' // 生气
			if (val <= 50) return '😑' // 中性/不开心
			if (val <= 70) return '😐' // 平静
			if (val <= 85) return '😊' // 微笑
			return '😄' // 开心
		},
		// 根据原谅值获取通用场景头像（不区分具体人物，只看情绪）
		getAiAvatar(forgiveness) {
			// 当前原谅值（优先使用消息里的值）
			const val = forgiveness !== undefined && forgiveness !== null ? forgiveness : this.forgiveness

			// 基于原谅值划分情绪阶段
			let mood = 'angry' // 生气
			if (val > 30 && val <= 60) mood = 'normal'   // 一般
			else if (val > 60 && val <= 85) mood = 'smile' // 微笑
			else if (val > 85) mood = 'happy'             // 很开心

			// 通用头像命名规则（不区分人物，只区分情绪）：
			// 需要在 static/avatars 下准备 4 张通用 GIF 头像：
			// /static/avatars/role_angry.gif   （生气）
			// /static/avatars/role_normal.gif  （一般/平静）
			// /static/avatars/role_smile.gif   （微笑）
			// /static/avatars/role_happy.gif   （很开心）
			// 如果没有对应图片，微信只是不显示，不会影响逻辑
			return `/static/avatars/role_${mood}.gif`
		},
		loadUser() {
			const storedAvatar = uni.getStorageSync('userAvatar')
			if (storedAvatar) {
				this.userAvatar = storedAvatar
			} else {
				this.userAvatar = '/static/user.png'
			}
			const storedId = uni.getStorageSync('userId')
			this.userId = storedId || this.genAnonId()
			if (!storedId) {
				uni.setStorageSync('userId', this.userId)
			}
		},
		genAnonId() {
			return `guest-${Math.random().toString(16).slice(2, 10)}`
		},
		async initScene() {
			this.loading = true
			try {
				const { data, error } = await sceneService.getSceneById(this.sceneId)
				if (error || !data) {
					uni.showToast({ title: '加载场景失败', icon: 'none' })
					return
				}
				this.scene = data
				this.forgiveness = data.initial_forgiveness ?? 40
				this.startForgiveness = this.forgiveness
				this.maxTurns = data.max_interactions || 10
				this.currentTurn = 0
				this.messages = []
				this.forgivenessChanges = []
				this.recordSaved = false
				this.gameEnded = false
				this.gameResult = { success: false, message: '' }
				this.actionLocked = false
				this.startTimestamp = Date.now()
				// 初始消息使用初始原谅值
				this.appendMessage('ai', data.angry_reason || data.title || '我现在很生气，你说说看。', '', this.forgiveness)
			} catch (err) {
				console.error(err)
				uni.showToast({ title: '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		appendMessage(role, text, forgivenessChange = '', forgiveness = null) {
			const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
			// 保存当前原谅值，用于显示表情
			const currentForgiveness = forgiveness !== null ? forgiveness : this.forgiveness
			this.messages.push({ 
				id, 
				role, 
				text, 
				forgivenessChange,
				forgiveness: currentForgiveness // 保存消息发送时的原谅值
			})
			this.lastMsgId = id
		},
		async handleSend() {
			if (this.actionLocked) return
			const content = this.inputText.trim()
			if (!content) {
				uni.showToast({ title: '请输入内容', icon: 'none' })
				return
			}
			this.inputText = ''
			this.currentTurn++
			this.appendMessage('user', content)
			this.actionLocked = true
			try {
				// 组装历史消息（仅取最近 10 条）
				const history = this.messages.slice(-10).map(m => ({
					role: m.role === 'ai' ? 'assistant' : 'user',
					content: m.text
				}))

				const aiRes = await generateReply({
					scene: this.scene,
					history,
					userInput: content,
					forgiveness: this.forgiveness
				})

				// AI 不可用：不消耗轮次、不改变原谅值，仅提示
				if (aiRes && aiRes.error) {
					this.currentTurn = Math.max(0, this.currentTurn - 1)
					this.appendMessage('ai', 'AI 暂时不能使用，请稍后再试。')
					return
				}

				const { reply, forgivenessDelta } = aiRes || {}
				// AI 返回缺字段也视为不可用
				if (typeof reply !== 'string' || !reply.trim() || !Number.isFinite(forgivenessDelta)) {
					this.currentTurn = Math.max(0, this.currentTurn - 1)
					this.appendMessage('ai', 'AI 暂时不能使用，请稍后再试。')
					return
				}
				const delta = forgivenessDelta

				this.forgiveness = this.clampForgiveness(this.forgiveness + delta)
				this.forgivenessChanges.push({
					round: this.currentTurn,
					change: delta,
					final: this.forgiveness
				})
				const changeText = delta >= 0 ? `原谅值 +${delta}` : `原谅值 ${delta}`
				// 传递更新后的原谅值，用于显示表情
				this.appendMessage('ai', reply, changeText, this.forgiveness)
				this.checkResult()
			} catch (err) {
				console.error('AI 处理异常:', err)
				// 异常同样视为 AI 不可用：不消耗轮次、不改变原谅值，仅提示
				this.currentTurn = Math.max(0, this.currentTurn - 1)
				this.appendMessage('ai', 'AI 暂时不能使用，请稍后再试。')
			} finally {
				this.actionLocked = false
			}
		},
		clampForgiveness(val) {
			return Math.max(0, Math.min(100, val))
		},
		checkResult() {
			if (this.forgiveness >= 100) {
				this.forgiveness = 100
				this.showResult(true)
				return
			}
			if (this.forgiveness <= 0) {
				this.forgiveness = 0
				this.showResult(false)
				return
			}
			if (this.currentTurn >= this.maxTurns) {
				this.showResult(false, '已用完所有对话次数')
			}
		},
		showResult(success, reason = '') {
			this.actionLocked = true
			this.gameEnded = true
			this.persistRecord(success)
			
			if (success) {
				this.gameResult = {
					success: true,
					message: '恭喜，哄好了！原谅值达到 100，胜利！'
				}
					} else {
				this.gameResult = {
					success: false,
					message: reason || `挑战失败，原谅值 ${this.forgiveness}`
					}
				}
		},
		handleRestart() {
			this.initScene()
		},
		handleReturn() {
			uni.navigateBack()
		},
		async persistRecord(isSuccess) {
			// 避免重复保存
			if (this.recordSaved) return
			this.recordSaved = true

			const durationSeconds = this.startTimestamp
				? Math.max(0, Math.round((Date.now() - this.startTimestamp) / 1000))
				: null

			try {
				await gameRecordService.createRecord({
					userId: this.userId || this.genAnonId(),
					sceneId: this.sceneId,
					isSuccess,
					finalForgiveness: this.forgiveness,
					interactionCount: this.currentTurn,
					maxInteractions: this.maxTurns,
					startForgiveness: this.startForgiveness,
					forgivenessChanges: this.forgivenessChanges,
					durationSeconds
				})
			} catch (err) {
				console.error('保存游戏记录失败:', err)
			}
		}
	}
}
</script>

<style>
.dialog-page {
	min-height: 100vh;
	background-color: #f5f6fa;
	display: flex;
	flex-direction: column;
}

.scene-header {
	padding: 20rpx 24rpx 0 24rpx;
}

.scene-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #222;
	margin-bottom: 12rpx;
}

.meta-row {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.meta-item {
	flex: 1;
}

.meta-label {
	font-size: 24rpx;
	color: #666;
	margin-bottom: 8rpx;
	display: block;
}

.bar {
	width: 100%;
	height: 12rpx;
	background: #e5e7eb;
	border-radius: 12rpx;
	overflow: hidden;
}

.bar-fill {
	height: 100%;
	background: #ff6b6b;
}

.meta-value {
	font-size: 24rpx;
	color: #333;
	margin-top: 6rpx;
	display: inline-block;
}

.turns {
	flex: 0 0 180rpx;
	text-align: right;
}

.chat-list {
	flex: 1;
	padding: 20rpx 16rpx;
	padding-bottom: 140rpx;
}

/* 游戏结束时增加底部间距，避免被横幅遮挡 */
.chat-list.game-ended {
	padding-bottom: 280rpx;
}

.chat-item {
	display: flex;
	margin-bottom: 20rpx;
}

.chat-item.user {
	flex-direction: row-reverse;
}

.avatar-wrapper {
	position: relative;
	margin: 0 12rpx;
}

.avatar {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	background: #ddd;
}

.avatar-expression {
	position: absolute;
	bottom: -8rpx;
	right: -4rpx;
	font-size: 32rpx;
	background: #fff;
	border-radius: 50%;
	width: 36rpx;
	height: 36rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
	line-height: 1;
}

.bubble {
	max-width: 80%;
	padding: 18rpx 20rpx;
	border-radius: 20rpx;
	background: #fff;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
	color: #333;
	font-size: 28rpx;
	line-height: 40rpx;
}

.chat-item.user .bubble {
	background: #4f46e5;
	color: #fff;
}

.msg-text {
	display: block;
}

.forgive-change {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #888;
}

.chat-item.user .forgive-change {
	color: #e5e7eb;
}

.input-area {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 12rpx 16rpx;
	background: #fff;
	box-shadow: 0 -4rpx 10rpx rgba(0, 0, 0, 0.06);
	display: flex;
	align-items: flex-end;
	gap: 12rpx;
}

.text-input {
	flex: 1;
	min-height: 88rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 12rpx 16rpx;
	font-size: 28rpx;
	line-height: 42rpx;
	box-sizing: border-box;
}

.text-input.multiline {
	max-height: 220rpx;
}

.send-btn {
	height: 88rpx;
	line-height: 88rpx;
	padding: 0 32rpx;
	font-size: 28rpx;
	border-radius: 12rpx;
	background: linear-gradient(135deg, #4f46e5, #7c3aed);
	border: none;
}

/* 游戏结束提示 */
.result-banner {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 148rpx;
	padding: 20rpx 24rpx;
	background: rgba(0, 0, 0, 0.8);
	z-index: 100;
	text-align: center;
}

.result-banner.success {
	background: rgba(16, 185, 129, 0.9);
}

.result-banner.failed {
	background: rgba(239, 68, 68, 0.9);
}

.result-text {
	font-size: 28rpx;
	color: #fff;
	font-weight: 500;
}

/* 操作按钮区域 */
.action-buttons {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 20rpx 24rpx;
	background: #fff;
	box-shadow: 0 -4rpx 10rpx rgba(0, 0, 0, 0.06);
	display: flex;
	gap: 20rpx;
	z-index: 99;
}

.action-btn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 12rpx;
	font-size: 30rpx;
	border: none;
}

.restart-btn {
	background: #4f46e5;
	color: #fff;
}

.restart-btn:active {
	background: #4338ca;
}

.return-btn {
	background: #f5f5f5;
	color: #333;
}

.return-btn:active {
	background: #e0e0e0;
}
</style>

