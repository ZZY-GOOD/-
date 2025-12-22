<script>
	// #ifdef MP-WEIXIN
	import { initWxCloud } from '@/utils/wx-cloud.js'
	// #endif
	export default {
		onLaunch: function() {
			console.log('App Launch')
			// #ifdef MP-WEIXIN
			initWxCloud()
			// #endif
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
