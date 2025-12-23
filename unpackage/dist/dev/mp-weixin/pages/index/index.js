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
      testing: false,
      testResult: null,
      loadingScenes: false
    };
  },
  onLoad() {
    this.loadScenes();
  },
  onShow() {
    this.loadScenes();
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
          common_vendor.index.__f__("error", "at pages/index/index.vue:127", "加载场景失败:", error);
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
        common_vendor.index.__f__("error", "at pages/index/index.vue:178", "加载场景异常:", err);
        common_vendor.index.showToast({
          title: "加载异常",
          icon: "none"
        });
      } finally {
        this.loadingScenes = false;
      }
    },
    // 测试 Supabase 数据库连接
    async testSupabaseConnection() {
      this.testing = true;
      this.testResult = null;
      try {
        common_vendor.index.__f__("log", "at pages/index/index.vue:194", "开始测试 Supabase 连接...");
        const { data, error } = await utils_supabaseHelper.sceneService.getAllScenes({
          status: "active",
          limit: 100
        });
        if (error) {
          common_vendor.index.__f__("error", "at pages/index/index.vue:203", "数据库连接失败:", error);
          this.testResult = {
            type: "error",
            message: `❌ 连接失败: ${error.message || error}`
          };
          common_vendor.index.showToast({
            title: "连接失败",
            icon: "none",
            duration: 3e3
          });
          return;
        }
        const sceneCount = data ? data.length : 0;
        common_vendor.index.__f__("log", "at pages/index/index.vue:218", "✅ 连接成功！找到", sceneCount, "个场景");
        this.testResult = {
          type: "success",
          message: `✅ 连接成功！找到 ${sceneCount} 个场景`
        };
        common_vendor.index.showToast({
          title: `连接成功，找到 ${sceneCount} 个场景`,
          icon: "success",
          duration: 2e3
        });
        if (data && data.length > 0) {
          common_vendor.index.__f__("log", "at pages/index/index.vue:233", "场景数据:", data);
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:239", "测试异常:", err);
        this.testResult = {
          type: "error",
          message: `❌ 测试异常: ${err.message || "未知错误"}`
        };
        common_vendor.index.showToast({
          title: "测试异常",
          icon: "none",
          duration: 3e3
        });
      } finally {
        this.testing = false;
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
  return common_vendor.e({
    a: common_vendor.t($data.testing ? "测试中..." : "🔍 测试数据库连接"),
    b: common_vendor.o((...args) => $options.testSupabaseConnection && $options.testSupabaseConnection(...args)),
    c: $data.testing,
    d: $data.testResult
  }, $data.testResult ? {
    e: common_vendor.t($data.testResult.message),
    f: common_vendor.n($data.testResult.type)
  } : {}, {
    g: common_vendor.t($data.sortOptions[$data.sortIndex]),
    h: common_vendor.o((...args) => $options.onSortChange && $options.onSortChange(...args)),
    i: $data.sortIndex,
    j: $data.sortOptions,
    k: common_vendor.f($data.categories, (category, index, i0) => {
      return {
        a: common_vendor.t(category.name),
        b: common_vendor.t(category.count),
        c: index,
        d: $data.activeCategory === category.name ? 1 : "",
        e: common_vendor.o(($event) => $options.onCategoryChange(category.name), index)
      };
    }),
    l: common_vendor.f($options.filteredScenes, (scene, index, i0) => {
      return {
        a: common_vendor.t(scene.title),
        b: common_vendor.t(scene.times),
        c: common_vendor.t(scene.winRate),
        d: index,
        e: common_vendor.o(($event) => $options.onSceneSelect(scene), index)
      };
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
