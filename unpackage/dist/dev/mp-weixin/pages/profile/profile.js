"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_supabaseHelper = require("../../utils/supabase-helper.js");
const _sfc_main = {
  data() {
    return {
      userId: "",
      wxOpenid: "",
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
      loginType: "guest",
      // 登录类型：wx 或 guest
      showWxLoginModal: false,
      // 微信一键登录弹窗
      tempAvatar: "",
      // 临时头像（选择后）
      tempNickname: ""
      // 临时昵称（输入后）
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
  onShareAppMessage() {
    const stats = this.stats;
    const shareTitle = stats.totalGames > 0 ? `我的挑战数据：总挑战${stats.totalGames}次，成功率${stats.successRate}%！来挑战吧！` : "哄一哄他（她）- AI情感对话游戏，挑战你的沟通技巧！";
    return {
      title: shareTitle,
      path: "/pages/index/index",
      imageUrl: ""
      // 可选：分享图片，建议尺寸 5:4
    };
  },
  onShareTimeline() {
    const stats = this.stats;
    const shareTitle = stats.totalGames > 0 ? `我的挑战数据：总挑战${stats.totalGames}次，成功率${stats.successRate}%！来挑战吧！` : "哄一哄他（她）- AI情感对话游戏，挑战你的沟通技巧！";
    return {
      title: shareTitle,
      query: "",
      imageUrl: ""
      // 可选：分享图片，建议尺寸 1:1（500x500px）
    };
  },
  methods: {
    loadUser() {
      const storedId = common_vendor.index.getStorageSync("userId") || "";
      const storedName = common_vendor.index.getStorageSync("userName") || "";
      const storedAvatar = common_vendor.index.getStorageSync("userAvatar") || "";
      const storedWxOpenid = common_vendor.index.getStorageSync("wxOpenid") || "";
      this.userId = storedWxOpenid || storedId || this.genAnonId();
      this.wxOpenid = storedWxOpenid || "";
      this.nickname = storedName || "";
      if (storedAvatar)
        this.avatar = storedAvatar;
    },
    async saveUser(extra = {}) {
      const finalUserId = this.wxOpenid || this.userId || this.genAnonId();
      common_vendor.index.setStorageSync("userId", finalUserId);
      common_vendor.index.setStorageSync("userName", this.nickname || "");
      common_vendor.index.setStorageSync("userAvatar", this.avatar || "/static/user.png");
      common_vendor.index.setStorageSync("loginType", this.loginType || "guest");
      if (extra.wxOpenid || this.wxOpenid) {
        common_vendor.index.setStorageSync("wxOpenid", extra.wxOpenid || this.wxOpenid);
      }
      try {
        const { data, error } = await utils_supabaseHelper.userService.createOrUpdateUser({
          userId: finalUserId,
          nickname: this.nickname,
          avatarUrl: this.avatar !== "/static/user.png" ? this.avatar : null,
          loginType: this.loginType || "guest",
          wxOpenid: extra.wxOpenid || this.wxOpenid || null
        });
        if (error) {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:237", "保存用户信息到数据库失败:", error);
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:241", "保存用户信息异常:", err);
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
        { text: "微信一键登录", type: "wx-new" },
        { text: "手动填写", type: "manual" }
      ];
      this.showBottomSheet = true;
    },
    handleBottomOption(index) {
      const option = this.bottomSheetOptions[index];
      if (option.type === "wx-new") {
        this.closeBottomSheet();
        this.showWxLoginModal = true;
      } else if (option.type === "wx") {
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
      this.wxAuthorizeAndBind();
    },
    // 微信授权 + 云函数 login 获取 openid + 同步到数据库
    async wxAuthorizeAndBind() {
      try {
        const profile = await new Promise((resolve, reject) => {
          common_vendor.index.getUserProfile({
            desc: "用于完善个人资料",
            success: (res) => resolve(res.userInfo || {}),
            fail: reject
          });
        });
        const openid = await this.ensureWxOpenid();
        this.wxOpenid = openid;
        this.userId = openid;
        this.nickname = profile.nickName || this.nickname;
        this.avatar = profile.avatarUrl || this.avatar;
        this.loginType = "wx";
        await this.saveUser({ wxOpenid: openid });
        this.closeBottomSheet();
        common_vendor.index.showToast({ title: "登录成功", icon: "success" });
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:327", "微信授权失败", err);
        common_vendor.index.showToast({
          title: (err == null ? void 0 : err.errMsg) || "授权失败",
          icon: "none"
        });
      }
    },
    // 调用云函数 login 获取 openid
    getWxOpenid() {
      return new Promise((resolve, reject) => {
        if (!common_vendor.wx$1.cloud) {
          reject(new Error("wx.cloud 未初始化"));
          return;
        }
        common_vendor.wx$1.cloud.callFunction({
          name: "login",
          success: (res) => {
            var _a;
            const openid = (_a = res == null ? void 0 : res.result) == null ? void 0 : _a.openid;
            if (openid)
              resolve(openid);
            else
              reject(new Error("未获取到 openid"));
          },
          fail: reject
        });
      });
    },
    // 确保拿到 openid；拿不到时回退为 guest
    async ensureWxOpenid() {
      if (this.wxOpenid)
        return this.wxOpenid;
      try {
        const openid = await this.getWxOpenid();
        this.wxOpenid = openid;
        this.userId = openid;
        this.loginType = "wx";
        common_vendor.index.setStorageSync("wxOpenid", openid);
        return openid;
      } catch (err) {
        common_vendor.index.__f__("warn", "at pages/profile/profile.vue:369", "获取 openid 失败，回退 guest：", err);
        this.loginType = "guest";
        return null;
      }
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
              const openid = await this.ensureWxOpenid();
              if (openid) {
                this.userId = openid;
                this.loginType = "wx";
              } else {
                this.loginType = "guest";
              }
              await this.saveUser({ wxOpenid: openid || null });
              this.closeBottomSheet();
            } else {
              common_vendor.index.showToast({ title: "头像已选择，请填写昵称", icon: "none" });
            }
          }
        }
      });
    },
    // 微信一键登录相关方法
    onChooseAvatar(e) {
      const { avatarUrl } = e.detail;
      if (avatarUrl) {
        this.tempAvatar = avatarUrl;
      }
    },
    closeWxLoginModal() {
      this.showWxLoginModal = false;
      this.tempAvatar = "";
      this.tempNickname = "";
    },
    async confirmWxLogin() {
      if (!this.tempNickname || !this.tempNickname.trim()) {
        common_vendor.index.showToast({ title: "请输入昵称", icon: "none" });
        return;
      }
      if (!this.tempAvatar) {
        common_vendor.index.showToast({ title: "请选择头像", icon: "none" });
        return;
      }
      try {
        const openid = await this.getWxOpenid();
        if (!openid) {
          common_vendor.index.showToast({ title: "获取用户信息失败", icon: "none" });
          return;
        }
        this.wxOpenid = openid;
        this.userId = openid;
        this.nickname = this.tempNickname.trim();
        this.avatar = this.tempAvatar;
        this.loginType = "wx";
        await this.saveUser({ wxOpenid: openid });
        this.closeWxLoginModal();
        common_vendor.index.showToast({ title: "登录成功", icon: "success" });
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:455", "微信一键登录失败:", err);
        common_vendor.index.showToast({
          title: (err == null ? void 0 : err.message) || "登录失败，请重试",
          icon: "none"
        });
      }
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
      const openid = await this.ensureWxOpenid();
      if (openid) {
        this.userId = openid;
        this.loginType = "wx";
      } else {
        this.loginType = "guest";
      }
      if (this.selectedAvatar) {
        this.avatar = this.selectedAvatar;
        await this.saveUser({ wxOpenid: openid || null });
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
            common_vendor.index.removeStorageSync("wxOpenid");
            this.userId = "";
            this.wxOpenid = "";
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
  } : {}, {
    x: $data.showWxLoginModal
  }, $data.showWxLoginModal ? common_vendor.e({
    y: $data.tempAvatar
  }, $data.tempAvatar ? {
    z: $data.tempAvatar
  } : {}, {
    A: common_vendor.o((...args) => $options.onChooseAvatar && $options.onChooseAvatar(...args)),
    B: $data.tempNickname,
    C: common_vendor.o(($event) => $data.tempNickname = $event.detail.value),
    D: common_vendor.o((...args) => $options.closeWxLoginModal && $options.closeWxLoginModal(...args)),
    E: common_vendor.o((...args) => $options.confirmWxLogin && $options.confirmWxLogin(...args)),
    F: common_vendor.o(() => {
    }),
    G: common_vendor.o((...args) => $options.closeWxLoginModal && $options.closeWxLoginModal(...args))
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/profile/profile.js.map
