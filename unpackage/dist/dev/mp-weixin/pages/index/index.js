"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_supabaseHelper = require("../../utils/supabase-helper.js");
const _sfc_main = {
  data() {
    return {
      title: "哄哄模拟器",
      sortIndex: 0,
      sortOptions: ["默认", "最新", "最热", "胜率最高", "胜率最低"],
      categories: [],
      activeCategory: "全部",
      scenes: [],
      loadingScenes: false
    };
  },
  onLoad() {
    this.loadScenes();
  },
  onShow() {
    this.loadScenes();
    this.checkLoginAtStartup();
  },
  onShareAppMessage() {
    return {
      title: "哄一哄他（她）- AI情感对话游戏，挑战你的沟通技巧！",
      path: "/pages/index/index",
      imageUrl: ""
      // 可选：分享图片，建议尺寸 5:4
    };
  },
  onShareTimeline() {
    return {
      title: "哄一哄他（她）- AI情感对话游戏，挑战你的沟通技巧！",
      query: "",
      imageUrl: ""
      // 可选：分享图片，建议尺寸 1:1（500x500px）
    };
  },
  computed: {
    // 过滤并排序场景列表（支持多分类）
    filteredScenes() {
      let list = this.activeCategory === "全部" ? this.scenes : this.scenes.filter((scene) => {
        const categories = (scene.category || "").split(",").map((c) => c.trim());
        return categories.includes(this.activeCategory);
      });
      const option = this.sortOptions[this.sortIndex];
      if (option === "最新") {
        list = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      } else if (option === "最热") {
        list = [...list].sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
      } else if (option === "胜率最高") {
        list = [...list].sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));
      } else if (option === "胜率最低") {
        list = [...list].sort((a, b) => (a.win_rate || 0) - (b.win_rate || 0));
      }
      return list;
    }
  },
  methods: {
    // 进入首页时检查是否已登录，如果未登录则跳转到个人中心触发登录弹窗
    checkLoginAtStartup() {
      const userId = common_vendor.index.getStorageSync("userId") || "";
      const userName = common_vendor.index.getStorageSync("userName") || "";
      const userAvatar = common_vendor.index.getStorageSync("userAvatar") || "";
      if (!userId && !userName && !userAvatar) {
        common_vendor.index.switchTab({ url: "/pages/profile/profile" });
      }
    },
    // 从数据库加载场景
    async loadScenes() {
      this.loadingScenes = true;
      try {
        const { data, error } = await utils_supabaseHelper.sceneService.getAllScenes({
          status: "active",
          limit: 100,
          orderBy: "play_count",
          order: "desc"
        });
        if (error) {
          common_vendor.index.__f__("error", "at pages/index/index.vue:140", "加载场景失败:", error);
          common_vendor.index.showToast({
            title: "加载场景失败",
            icon: "none"
          });
          return;
        }
        const { data: globalStats } = await utils_supabaseHelper.gameRecordService.getGlobalSceneStats();
        this.scenes = (data || []).map((item) => {
          const sid = item.id;
          const override = globalStats && globalStats[sid] ? globalStats[sid] : null;
          const playCount = override ? override.playCount : item.play_count ?? 0;
          const winRateRaw = override ? override.winRate : item.win_rate ?? 0;
          const winRateDisplay = Number(winRateRaw || 0).toFixed(1);
          return {
            id: item.id,
            title: item.title,
            category: item.category || "其他",
            // 兼容展示字段
            times: playCount,
            winRate: winRateDisplay,
            play_count: playCount,
            win_rate: Number(winRateRaw) || 0,
            created_at: item.created_at
          };
        });
        const categoryMap = {};
        this.scenes.forEach((s) => {
          const categories = (s.category || "").split(",").map((c) => c.trim()).filter((c) => c);
          if (categories.length === 0) {
            categoryMap["其他"] = (categoryMap["其他"] || 0) + 1;
          } else {
            categories.forEach((cat) => {
              categoryMap[cat] = (categoryMap[cat] || 0) + 1;
            });
          }
        });
        this.categories = [{ name: "全部", count: this.scenes.length }].concat(
          Object.entries(categoryMap).map(([name, count]) => ({ name, count }))
        );
        this.activeCategory = "全部";
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:191", "加载场景异常:", err);
        common_vendor.index.showToast({
          title: "加载异常",
          icon: "none"
        });
      } finally {
        this.loadingScenes = false;
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
        common_vendor.index.showToast({
          title: "场景数据缺失",
          icon: "none"
        });
        return;
      }
      common_vendor.index.navigateTo({
        url: `/pages/dialog/dialog?id=${scene.id}`
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.sortOptions[$data.sortIndex]),
    b: common_vendor.o((...args) => $options.onSortChange && $options.onSortChange(...args)),
    c: $data.sortIndex,
    d: $data.sortOptions,
    e: common_vendor.f($data.categories, (category, index, i0) => {
      return {
        a: common_vendor.t(category.name),
        b: common_vendor.t(category.count),
        c: index,
        d: $data.activeCategory === category.name ? 1 : "",
        e: common_vendor.o(($event) => $options.onCategoryChange(category.name), index)
      };
    }),
    f: common_vendor.f($options.filteredScenes, (scene, index, i0) => {
      return {
        a: common_vendor.t(scene.title),
        b: common_vendor.t(scene.times),
        c: common_vendor.t(scene.winRate),
        d: index,
        e: common_vendor.o(($event) => $options.onSceneSelect(scene), index)
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
