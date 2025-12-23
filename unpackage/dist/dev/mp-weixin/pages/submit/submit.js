"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_supabaseHelper = require("../../utils/supabase-helper.js");
const _sfc_main = {
  data() {
    return {
      formData: {
        title: "",
        description: "",
        category: "",
        role: "",
        roleGender: "其他",
        angryReason: "",
        expectedDifficulty: "中"
      },
      categoryOptions: [],
      categoryIndex: 0,
      genderOptions: ["男", "女", "其他"],
      genderIndex: 2,
      difficultyOptions: ["易", "中", "难"],
      difficultyIndex: 1,
      submitting: false,
      userId: "",
      userNickname: ""
    };
  },
  onLoad() {
    this.loadUserInfo();
    this.loadCategories();
  },
  methods: {
    loadUserInfo() {
      this.userId = common_vendor.index.getStorageSync("userId") || "";
      this.userNickname = common_vendor.index.getStorageSync("userName") || "匿名用户";
    },
    async loadCategories() {
      try {
        const { data, error } = await utils_supabaseHelper.sceneService.getAllScenes({
          status: "active",
          limit: 200
        });
        if (error) {
          common_vendor.index.__f__("error", "at pages/submit/submit.vue:157", "加载分类失败:", error);
          common_vendor.index.showToast({
            title: "加载分类失败",
            icon: "none"
          });
          return;
        }
        const categorySet = /* @__PURE__ */ new Set();
        if (data && data.length > 0) {
          data.forEach((scene) => {
            if (scene.category) {
              categorySet.add(scene.category);
            }
          });
        }
        this.categoryOptions = Array.from(categorySet).sort();
        if (this.categoryOptions.length === 0) {
          this.categoryOptions = ["情侣", "亲人", "职场", "奇怪", "角色扮演", "其他"];
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/submit/submit.vue:183", "加载分类异常:", err);
        this.categoryOptions = ["情侣", "亲人", "职场", "奇怪", "角色扮演", "其他"];
      }
    },
    onCategoryChange(e) {
      this.categoryIndex = e.detail.value;
      this.formData.category = this.categoryOptions[e.detail.value];
    },
    onGenderChange(e) {
      this.genderIndex = e.detail.value;
      this.formData.roleGender = this.genderOptions[e.detail.value];
    },
    onDifficultyChange(e) {
      this.difficultyIndex = e.detail.value;
      this.formData.expectedDifficulty = this.difficultyOptions[e.detail.value];
    },
    validateForm() {
      if (!this.formData.title || !this.formData.title.trim()) {
        common_vendor.index.showToast({
          title: "请输入场景标题",
          icon: "none"
        });
        return false;
      }
      if (!this.formData.category) {
        common_vendor.index.showToast({
          title: "请选择场景分类",
          icon: "none"
        });
        return false;
      }
      if (!this.formData.role || !this.formData.role.trim()) {
        common_vendor.index.showToast({
          title: "请输入对象角色",
          icon: "none"
        });
        return false;
      }
      if (!this.formData.angryReason || !this.formData.angryReason.trim()) {
        common_vendor.index.showToast({
          title: "请输入生气理由",
          icon: "none"
        });
        return false;
      }
      return true;
    },
    async handleSubmit() {
      if (this.submitting)
        return;
      if (!this.validateForm()) {
        return;
      }
      if (!this.userId) {
        common_vendor.index.showModal({
          title: "提示",
          content: "请先登录后再提交场景",
          success: (res) => {
            if (res.confirm) {
              common_vendor.index.switchTab({ url: "/pages/profile/profile" });
            }
          }
        });
        return;
      }
      this.submitting = true;
      try {
        const { data, error } = await utils_supabaseHelper.userSceneService.submitScene({
          userId: this.userId,
          userNickname: this.userNickname,
          title: this.formData.title.trim(),
          description: this.formData.description.trim() || null,
          category: this.formData.category,
          role: this.formData.role.trim(),
          roleGender: this.formData.roleGender,
          angryReason: this.formData.angryReason.trim(),
          expectedDifficulty: this.formData.expectedDifficulty
        });
        if (error) {
          common_vendor.index.__f__("error", "at pages/submit/submit.vue:272", "提交失败:", error);
          common_vendor.index.showToast({
            title: "提交失败，请稍后重试",
            icon: "none",
            duration: 2e3
          });
          return;
        }
        common_vendor.index.showModal({
          title: "提交成功",
          content: "你的场景已提交，等待审核通过后即可上线。",
          showCancel: false,
          success: () => {
            this.formData = {
              title: "",
              description: "",
              category: "",
              role: "",
              roleGender: "其他",
              angryReason: "",
              expectedDifficulty: "中"
            };
            this.categoryIndex = 0;
            this.genderIndex = 2;
            this.difficultyIndex = 1;
            common_vendor.index.switchTab({ url: "/pages/index/index" });
          }
        });
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/submit/submit.vue:305", "提交异常:", err);
        common_vendor.index.showToast({
          title: "提交异常，请稍后重试",
          icon: "none",
          duration: 2e3
        });
      } finally {
        this.submitting = false;
      }
    },
    goIndex() {
      common_vendor.index.switchTab({ url: "/pages/index/index" });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.formData.title,
    b: common_vendor.o(($event) => $data.formData.title = $event.detail.value),
    c: $data.formData.description,
    d: common_vendor.o(($event) => $data.formData.description = $event.detail.value),
    e: common_vendor.t($data.formData.category || "请选择分类"),
    f: common_vendor.o((...args) => $options.onCategoryChange && $options.onCategoryChange(...args)),
    g: $data.categoryIndex,
    h: $data.categoryOptions,
    i: $data.formData.role,
    j: common_vendor.o(($event) => $data.formData.role = $event.detail.value),
    k: common_vendor.t($data.formData.roleGender || "请选择性别"),
    l: common_vendor.o((...args) => $options.onGenderChange && $options.onGenderChange(...args)),
    m: $data.genderIndex,
    n: $data.genderOptions,
    o: $data.formData.angryReason,
    p: common_vendor.o(($event) => $data.formData.angryReason = $event.detail.value),
    q: common_vendor.t($data.formData.expectedDifficulty || "请选择难度"),
    r: common_vendor.o((...args) => $options.onDifficultyChange && $options.onDifficultyChange(...args)),
    s: $data.difficultyIndex,
    t: $data.difficultyOptions,
    v: common_vendor.t($data.submitting ? "提交中..." : "提交场景"),
    w: $data.submitting,
    x: common_vendor.o((...args) => $options.handleSubmit && $options.handleSubmit(...args)),
    y: common_vendor.o((...args) => $options.goIndex && $options.goIndex(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/submit/submit.js.map
