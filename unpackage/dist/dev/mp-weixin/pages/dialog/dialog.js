"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_supabaseHelper = require("../../utils/supabase-helper.js");
const utils_aiService = require("../../utils/ai-service.js");
const _sfc_main = {
  data() {
    return {
      sceneId: "",
      scene: null,
      loading: false,
      inputText: "",
      forgiveness: 0,
      startForgiveness: 0,
      maxTurns: 10,
      currentTurn: 0,
      messages: [],
      userAvatar: "/static/user.png",
      // 默认头像，会在 onLoad 时从本地存储读取用户头像
      aiAvatar: "/static/user.png",
      // TODO: 需要添加 /static/logo.png 作为 AI 头像
      actionLocked: false,
      lastMsgId: "",
      userId: "",
      forgivenessChanges: [],
      startTimestamp: 0,
      recordSaved: false
    };
  },
  computed: {
    forgivenessPercent() {
      const val = Math.max(0, Math.min(100, this.forgiveness));
      return val;
    }
  },
  onLoad(options) {
    if (!options || !options.id) {
      common_vendor.index.showToast({ title: "缺少场景ID", icon: "none" });
      return;
    }
    this.sceneId = options.id;
    this.loadUser();
    this.initScene();
  },
  methods: {
    loadUser() {
      const storedAvatar = common_vendor.index.getStorageSync("userAvatar");
      if (storedAvatar) {
        this.userAvatar = storedAvatar;
      } else {
        this.userAvatar = "/static/user.png";
      }
      const storedId = common_vendor.index.getStorageSync("userId");
      this.userId = storedId || this.genAnonId();
      if (!storedId) {
        common_vendor.index.setStorageSync("userId", this.userId);
      }
    },
    genAnonId() {
      return `guest-${Math.random().toString(16).slice(2, 10)}`;
    },
    async initScene() {
      this.loading = true;
      try {
        const { data, error } = await utils_supabaseHelper.sceneService.getSceneById(this.sceneId);
        if (error || !data) {
          common_vendor.index.showToast({ title: "加载场景失败", icon: "none" });
          return;
        }
        this.scene = data;
        this.forgiveness = data.initial_forgiveness || 20;
        this.startForgiveness = this.forgiveness;
        this.maxTurns = data.max_interactions || 10;
        this.currentTurn = 0;
        this.messages = [];
        this.forgivenessChanges = [];
        this.recordSaved = false;
        this.startTimestamp = Date.now();
        this.appendMessage("ai", data.angry_reason || data.title || "我现在很生气，你说说看。");
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/dialog/dialog.vue:130", err);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
      } finally {
        this.loading = false;
      }
    },
    appendMessage(role, text, forgivenessChange = "") {
      const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.messages.push({ id, role, text, forgivenessChange });
      this.lastMsgId = id;
    },
    async handleSend() {
      if (this.actionLocked)
        return;
      const content = this.inputText.trim();
      if (!content) {
        common_vendor.index.showToast({ title: "请输入内容", icon: "none" });
        return;
      }
      this.inputText = "";
      this.currentTurn++;
      this.appendMessage("user", content);
      this.actionLocked = true;
      try {
        const history = this.messages.slice(-10).map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.text
        }));
        const aiRes = await utils_aiService.generateReply({
          scene: this.scene,
          history,
          userInput: content,
          forgiveness: this.forgiveness
        });
        if (aiRes && aiRes.error) {
          this.currentTurn = Math.max(0, this.currentTurn - 1);
          this.appendMessage("ai", "AI 暂时不能使用，请稍后再试。");
          return;
        }
        const { reply, forgivenessDelta } = aiRes || {};
        if (typeof reply !== "string" || !reply.trim() || !Number.isFinite(forgivenessDelta)) {
          this.currentTurn = Math.max(0, this.currentTurn - 1);
          this.appendMessage("ai", "AI 暂时不能使用，请稍后再试。");
          return;
        }
        const delta = forgivenessDelta;
        this.forgiveness = this.clampForgiveness(this.forgiveness + delta);
        this.forgivenessChanges.push({
          round: this.currentTurn,
          change: delta,
          final: this.forgiveness
        });
        const changeText = delta >= 0 ? `原谅值 +${delta}` : `原谅值 ${delta}`;
        this.appendMessage("ai", reply, changeText);
        this.checkResult();
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/dialog/dialog.vue:192", "AI 处理异常:", err);
        this.currentTurn = Math.max(0, this.currentTurn - 1);
        this.appendMessage("ai", "AI 暂时不能使用，请稍后再试。");
      } finally {
        this.actionLocked = false;
      }
    },
    clampForgiveness(val) {
      return Math.max(0, Math.min(100, val));
    },
    checkResult() {
      if (this.forgiveness >= 100) {
        this.forgiveness = 100;
        this.showResult(true);
        return;
      }
      if (this.forgiveness <= 0) {
        this.forgiveness = 0;
        this.showResult(false);
        return;
      }
      if (this.currentTurn >= this.maxTurns) {
        this.showResult(false, "已用完所有对话次数");
      }
    },
    showResult(success, reason = "") {
      this.actionLocked = true;
      this.persistRecord(success);
      const title = success ? "恭喜，哄好了！" : "挑战失败";
      const content = success ? `原谅值达到 100，胜利！` : reason || `原谅值 ${this.forgiveness}，挑战失败`;
      common_vendor.index.showModal({
        title,
        content,
        confirmText: "重新挑战",
        cancelText: "返回首页",
        success: (res) => {
          if (res.confirm) {
            this.actionLocked = false;
            this.initScene();
          } else {
            common_vendor.index.reLaunch({ url: "/pages/index/index" });
          }
        }
      });
    },
    async persistRecord(isSuccess) {
      if (this.recordSaved)
        return;
      this.recordSaved = true;
      const durationSeconds = this.startTimestamp ? Math.max(0, Math.round((Date.now() - this.startTimestamp) / 1e3)) : null;
      try {
        await utils_supabaseHelper.gameRecordService.createRecord({
          userId: this.userId || this.genAnonId(),
          sceneId: this.sceneId,
          isSuccess,
          finalForgiveness: this.forgiveness,
          interactionCount: this.currentTurn,
          maxInteractions: this.maxTurns,
          startForgiveness: this.startForgiveness,
          forgivenessChanges: this.forgivenessChanges,
          durationSeconds
        });
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/dialog/dialog.vue:262", "保存游戏记录失败:", err);
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.scene
  }, $data.scene ? {
    b: common_vendor.t($data.scene.title),
    c: $options.forgivenessPercent + "%",
    d: common_vendor.t($data.forgiveness),
    e: common_vendor.t($data.currentTurn),
    f: common_vendor.t($data.maxTurns)
  } : {}, {
    g: common_vendor.f($data.messages, (msg, idx, i0) => {
      return common_vendor.e({
        a: msg.role === "ai" ? $data.aiAvatar : $data.userAvatar,
        b: common_vendor.t(msg.text),
        c: msg.forgivenessChange
      }, msg.forgivenessChange ? {
        d: common_vendor.t(msg.forgivenessChange)
      } : {}, {
        e: msg.id,
        f: msg.id,
        g: common_vendor.n(msg.role)
      });
    }),
    h: $data.lastMsgId,
    i: $data.actionLocked,
    j: common_vendor.o((...args) => $options.handleSend && $options.handleSend(...args)),
    k: $data.inputText,
    l: common_vendor.o(($event) => $data.inputText = $event.detail.value),
    m: $data.actionLocked,
    n: common_vendor.o((...args) => $options.handleSend && $options.handleSend(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/dialog/dialog.js.map
