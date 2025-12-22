"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_supabaseHelper = require("../../utils/supabase-helper.js");
const _sfc_main = {
  data() {
    return {
      userId: "",
      nickname: "",
      avatar: "/static/user.png",
      stats: {
        totalGames: 0,
        successCount: 0,
        successRate: 0,
        uniqueScenes: 0
      },
      records: [],
      showBottomSheet: false,
      bottomSheetTitle: "",
      bottomSheetOptions: [],
      selectedAvatar: "",
      // 已选择的头像
      showNameInput: false,
      inputName: "",
      loginType: "guest"
      // 登录类型：wx 或 guest
    };
  },
  onShow() {
    this.loadUser();
    this.loadStats();
    this.loadRecords();
    if (!this.userId || !this.nickname || !this.avatar) {
      this.promptLogin();
    }
  },
  methods: {
    loadUser() {
      const storedId = common_vendor.index.getStorageSync("userId") || "";
      const storedName = common_vendor.index.getStorageSync("userName") || "";
      const storedAvatar = common_vendor.index.getStorageSync("userAvatar") || "";
      this.userId = storedId || this.genAnonId();
      this.nickname = storedName || "";
      if (storedAvatar)
        this.avatar = storedAvatar;
    },
    async saveUser() {
      const finalUserId = this.userId || this.genAnonId();
      common_vendor.index.setStorageSync("userId", finalUserId);
      common_vendor.index.setStorageSync("userName", this.nickname || "");
      common_vendor.index.setStorageSync("userAvatar", this.avatar || "/static/user.png");
      common_vendor.index.setStorageSync("loginType", this.loginType || "guest");
      try {
        const { data, error } = await utils_supabaseHelper.userService.createOrUpdateUser({
          userId: this.userId || this.genAnonId(),
          nickname: this.nickname,
          avatarUrl: this.avatar !== "/static/user.png" ? this.avatar : null,
          loginType: this.loginType || "guest"
        });
        if (error) {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:162", "保存用户信息到数据库失败:", error);
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:166", "保存用户信息异常:", err);
      }
      common_vendor.index.showToast({ title: "已保存", icon: "success" });
    },
    genAnonId() {
      const id = `guest-${Math.random().toString(16).slice(2, 10)}`;
      this.userId = id;
      return id;
    },
    promptLogin() {
      this.bottomSheetTitle = "选择登录方式";
      this.bottomSheetOptions = [
        { text: "微信授权登录", type: "wx" },
        { text: "手动填写", type: "manual" }
      ];
      this.showBottomSheet = true;
    },
    handleBottomOption(index) {
      const option = this.bottomSheetOptions[index];
      if (option.type === "wx") {
        this.wxAuthorize();
        this.closeBottomSheet();
      } else if (option.type === "manual") {
        this.showManualOptions();
      } else if (option.type === "avatar") {
        this.chooseAvatarFromAlbum();
      } else if (option.type === "name") {
        this.closeBottomSheet();
        this.showNameInput = true;
      }
    },
    showManualOptions() {
      this.bottomSheetTitle = "手动填写资料";
      this.bottomSheetOptions = [
        {
          text: this.selectedAvatar ? "已选择头像" : "从相册选择头像",
          type: "avatar",
          avatar: this.selectedAvatar || null
        },
        { text: "输入昵称", type: "name" }
      ];
    },
    closeBottomSheet() {
      this.showBottomSheet = false;
      this.bottomSheetTitle = "";
      this.bottomSheetOptions = [];
    },
    wxAuthorize() {
      common_vendor.index.getUserProfile({
        desc: "用于完善个人资料",
        success: async (res) => {
          if (res.userInfo) {
            this.nickname = res.userInfo.nickName || this.nickname;
            this.avatar = res.userInfo.avatarUrl || this.avatar;
            this.loginType = "wx";
            await this.saveUser();
            this.closeBottomSheet();
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:231", "getUserProfile fail", err);
          common_vendor.index.showToast({
            title: err && err.errMsg ? err.errMsg : "授权失败",
            icon: "none"
          });
        }
      });
    },
    changeAvatar() {
    },
    async chooseAvatarFromAlbum() {
      common_vendor.index.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album"],
        success: async (res) => {
          if (res.tempFilePaths && res.tempFilePaths.length > 0) {
            this.selectedAvatar = res.tempFilePaths[0];
            this.avatar = res.tempFilePaths[0];
            this.showManualOptions();
            if (this.nickname) {
              this.loginType = "guest";
              await this.saveUser();
              this.closeBottomSheet();
            } else {
              common_vendor.index.showToast({ title: "头像已选择，请填写昵称", icon: "none" });
            }
          }
        }
      });
    },
    closeNameInput() {
      this.showNameInput = false;
      this.inputName = "";
    },
    async confirmNameInput() {
      if (!this.inputName.trim()) {
        common_vendor.index.showToast({ title: "请输入昵称", icon: "none" });
        return;
      }
      this.nickname = this.inputName.trim();
      this.loginType = "guest";
      if (this.selectedAvatar) {
        this.avatar = this.selectedAvatar;
        await this.saveUser();
      } else {
        common_vendor.index.showToast({ title: "昵称已保存，请选择头像", icon: "none" });
        this.showManualOptions();
        this.showBottomSheet = true;
      }
      this.closeNameInput();
    },
    async loadStats() {
      if (!this.userId)
        return;
      const { data, error } = await utils_supabaseHelper.gameRecordService.getUserStats(this.userId);
      if (!error && data) {
        this.stats = data;
      }
    },
    async loadRecords() {
      if (!this.userId)
        return;
      const { data, error } = await utils_supabaseHelper.gameRecordService.getRecentScenes(this.userId, 5);
      if (!error && data) {
        this.records = data.map((r) => ({
          ...r,
          sceneTitle: r.scene && r.scene.title || r.scene_title || r.sceneId || "场景"
        }));
      }
    },
    handleRecordClick(rec) {
      const sceneId = rec.scene_id || rec.sceneId;
      if (!sceneId) {
        common_vendor.index.showToast({ title: "缺少场景ID", icon: "none" });
        return;
      }
      common_vendor.index.navigateTo({ url: `/pages/dialog/dialog?id=${sceneId}` });
    },
    clearUserData() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要清除登录信息吗？清除后需要重新登录",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.removeStorageSync("userId");
            common_vendor.index.removeStorageSync("userName");
            common_vendor.index.removeStorageSync("userAvatar");
            common_vendor.index.removeStorageSync("loginType");
            this.userId = "";
            this.nickname = "";
            this.avatar = "/static/user.png";
            this.selectedAvatar = "";
            this.loginType = "guest";
            this.stats = {
              totalGames: 0,
              successCount: 0,
              successRate: 0,
              uniqueScenes: 0
            };
            this.records = [];
            this.promptLogin();
            common_vendor.index.showToast({ title: "已清除，请重新登录", icon: "success" });
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.avatar,
    b: common_vendor.t($data.nickname || "未命名用户"),
    c: common_vendor.o((...args) => $options.clearUserData && $options.clearUserData(...args)),
    d: common_vendor.t($data.stats.totalGames),
    e: common_vendor.t($data.stats.successCount),
    f: common_vendor.t($data.stats.successRate),
    g: common_vendor.t($data.stats.uniqueScenes),
    h: $data.records.length === 0
  }, $data.records.length === 0 ? {} : {
    i: common_vendor.f($data.records, (rec, idx, i0) => {
      return {
        a: common_vendor.t(rec.sceneTitle || "未知场景"),
        b: common_vendor.t(rec.is_success ? "成功" : "失败"),
        c: common_vendor.n(rec.is_success ? "ok" : "fail"),
        d: common_vendor.t(rec.final_forgiveness ?? "--"),
        e: common_vendor.t(rec.interaction_count ?? "--"),
        f: common_vendor.t(rec.created_at ? rec.created_at.split("T")[0] : ""),
        g: idx,
        h: common_vendor.o(($event) => $options.handleRecordClick(rec), idx)
      };
    })
  }, {
    j: $data.showBottomSheet
  }, $data.showBottomSheet ? {
    k: common_vendor.t($data.bottomSheetTitle),
    l: common_vendor.f($data.bottomSheetOptions, (option, index, i0) => {
      return common_vendor.e({
        a: option.avatar
      }, option.avatar ? {
        b: option.avatar
      } : {}, {
        c: common_vendor.t(option.text),
        d: index,
        e: common_vendor.o(($event) => $options.handleBottomOption(index), index)
      });
    }),
    m: common_vendor.o((...args) => $options.closeBottomSheet && $options.closeBottomSheet(...args)),
    n: common_vendor.o(() => {
    }),
    o: common_vendor.o((...args) => $options.closeBottomSheet && $options.closeBottomSheet(...args))
  } : {}, {
    p: $data.showNameInput
  }, $data.showNameInput ? {
    q: $data.inputName,
    r: common_vendor.o(($event) => $data.inputName = $event.detail.value),
    s: common_vendor.o((...args) => $options.closeNameInput && $options.closeNameInput(...args)),
    t: common_vendor.o((...args) => $options.confirmNameInput && $options.confirmNameInput(...args)),
    v: common_vendor.o(() => {
    }),
    w: common_vendor.o((...args) => $options.closeNameInput && $options.closeNameInput(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/profile/profile.js.map
