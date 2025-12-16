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
		<scroll-view class="chat-list" :scroll-y="true" scroll-with-animation :scroll-into-view="lastMsgId">
			<view
				v-for="(msg, idx) in messages"
				:key="msg.id"
				:id="msg.id"
				class="chat-item"
				:class="msg.role"
			>
				<image class="avatar" :src="msg.role === 'ai' ? aiAvatar : userAvatar" mode="aspectFill" />
				<view class="bubble">
					<text class="msg-text">{{ msg.text }}</text>
					<text v-if="msg.forgivenessChange" class="forgive-change">{{ msg.forgivenessChange }}</text>
				</view>
			</view>
		</scroll-view>

		<!-- 输入区 -->
		<view class="input-area">
			<input
				class="text-input"
				v-model="inputText"
				:disabled="actionLocked"
				placeholder="快，说点什么"
				confirm-type="send"
				@confirm="handleSend"
			/>
			<button class="send-btn" type="primary" :disabled="actionLocked" @click="handleSend">发送</button>
		</view>
	</view>
</template>

<script>
import { sceneService } from '@/utils/supabase-helper.js'

export default {
	data() {
		return {
			sceneId: '',
			scene: null,
			loading: false,
			inputText: '',
			forgiveness: 0,
			maxTurns: 10,
			currentTurn: 0,
			messages: [],
			userAvatar: 'https://cdn.uviewui.com/uview/common/user.png',
			aiAvatar: 'https://cdn.uviewui.com/uview/common/logo.png',
			actionLocked: false,
			lastMsgId: ''
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
		this.initScene()
	},
	methods: {
		async initScene() {
			this.loading = true
			try {
				const { data, error } = await sceneService.getSceneById(this.sceneId)
				if (error || !data) {
					uni.showToast({ title: '加载场景失败', icon: 'none' })
					return
				}
				this.scene = data
				this.forgiveness = data.initial_forgiveness || 20
				this.maxTurns = data.max_interactions || 10
				this.currentTurn = 0
				this.messages = []
				this.appendMessage('ai', data.angry_reason || data.title || '我现在很生气，你说说看。')
			} catch (err) {
				console.error(err)
				uni.showToast({ title: '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		appendMessage(role, text, forgivenessChange = '') {
			const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
			this.messages.push({ id, role, text, forgivenessChange })
			this.lastMsgId = id
		},
		handleSend() {
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
			// 模拟 AI 回复和原谅值变化
			setTimeout(() => {
				const delta = this.calcForgivenessDelta(content)
				this.forgiveness = Math.max(0, Math.min(100, this.forgiveness + delta))
				const changeText = delta >= 0 ? `原谅值 +${delta}` : `原谅值 ${delta}`
				const reply = this.buildAiReply(delta)
				this.appendMessage('ai', reply, changeText)
				this.checkResult()
				this.actionLocked = false
			}, 300)
		},
		calcForgivenessDelta(text) {
			// 简单策略：含有“抱歉/对不起”正向，大写词负向，默认随机
			const lower = text.toLowerCase()
			if (lower.includes('对不起') || lower.includes('抱歉') || lower.includes('sorry')) {
				return this.randomInt(10, 25)
			}
			if (lower.includes('你错') || lower.includes('怪你')) {
				return -this.randomInt(15, 30)
			}
			return this.randomInt(-15, 20)
		},
		buildAiReply(delta) {
			if (!this.scene) return '...'
			if (delta >= 15) return '好吧，态度还不错。'
			if (delta >= 5) return '嗯，勉强听进去一些。'
			if (delta >= 0) return '我再听听，你继续说。'
			if (delta >= -10) return '你这话让我有点生气。'
			return '你是来气我的吗？'
		},
		randomInt(min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min
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
			const title = success ? '恭喜，哄好了！' : '挑战失败'
			const content = success
				? `原谅值达到 100，胜利！`
				: reason || `原谅值 ${this.forgiveness}，挑战失败`
			uni.showModal({
				title,
				content,
				confirmText: '重新挑战',
				cancelText: '返回首页',
				success: (res) => {
					if (res.confirm) {
						this.actionLocked = false
						this.initScene()
					} else {
						uni.reLaunch({ url: '/pages/index/index' })
					}
				}
			})
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
	padding: 20rpx 16rpx 140rpx 16rpx;
}

.chat-item {
	display: flex;
	margin-bottom: 20rpx;
}

.chat-item.user {
	flex-direction: row-reverse;
}

.avatar {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	margin: 0 12rpx;
	background: #ddd;
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
	align-items: center;
	gap: 12rpx;
}

.text-input {
	flex: 1;
	height: 88rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 16rpx;
	font-size: 28rpx;
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
</style>

