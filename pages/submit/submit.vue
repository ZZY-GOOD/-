<template>
	<view class="page">
		<view class="card">
			<view class="title">提交你的场景</view>
			<view class="desc">填写标题、理由和分类，提交后等待审核上线。</view>
			<button class="btn" type="primary" @click="goIndex">返回挑战</button>
		</view>
	</view>
</template>

<script>
export default {
	methods: {
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
	margin-bottom: 24rpx;
}
.btn {
	width: 100%;
}
</style>

