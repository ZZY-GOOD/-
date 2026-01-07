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
      recordSaved: false,
      gameEnded: false,
      gameResult: {
        success: false,
        message: ""
      }
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
  onShareAppMessage() {
    var _a;
    const sceneTitle = ((_a = this.scene) == null ? void 0 : _a.title) || "哄一哄他（她）";
    const shareTitle = this.gameEnded ? `${sceneTitle} - ${this.gameResult.success ? "挑战成功！" : "挑战失败，来试试吧！"}` : `${sceneTitle} - 来挑战这个场景吧！`;
    return {
      title: shareTitle,
      path: `/pages/dialog/dialog?id=${this.sceneId}`,
      imageUrl: ""
      // 可选：分享图片，建议尺寸 5:4
    };
  },
  onShareTimeline() {
    var _a;
    const sceneTitle = ((_a = this.scene) == null ? void 0 : _a.title) || "哄一哄他（她）";
    const shareTitle = this.gameEnded ? `${sceneTitle} - ${this.gameResult.success ? "挑战成功！" : "挑战失败，来试试吧！"}` : `${sceneTitle} - 来挑战这个场景吧！`;
    return {
      title: shareTitle,
      query: `id=${this.sceneId}`,
      imageUrl: ""
      // 可选：分享图片，建议尺寸 1:1（500x500px）
    };
  },
  methods: {
    // 根据原谅值获取表情emoji
    getExpression(forgiveness) {
      const val = forgiveness !== void 0 ? forgiveness : this.forgiveness;
      if (val <= 30)
        return "😠";
      if (val <= 50)
        return "😑";
      if (val <= 70)
        return "😐";
      if (val <= 85)
        return "😊";
      return "😄";
    },
    // 根据原谅值获取通用场景头像（不区分具体人物，只看情绪）
    getAiAvatar(forgiveness) {
      const val = forgiveness !== void 0 && forgiveness !== null ? forgiveness : this.forgiveness;
      let mood = "angry";
      if (val > 30 && val <= 60)
        mood = "normal";
      else if (val > 60 && val <= 85)
        mood = "smile";
      else if (val > 85)
        mood = "happy";
      return `/static/avatars/role_${mood}.gif`;
    },
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
        this.forgiveness = data.initial_forgiveness ?? 40;
        this.startForgiveness = this.forgiveness;
        this.maxTurns = data.max_interactions || 10;
        this.currentTurn = 0;
        this.messages = [];
        this.forgivenessChanges = [];
        this.recordSaved = false;
        this.gameEnded = false;
        this.gameResult = { success: false, message: "" };
        this.actionLocked = false;
        this.startTimestamp = Date.now();
        this.appendMessage("ai", data.angry_reason || data.title || "我现在很生气，你说说看。", "", this.forgiveness);
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/dialog/dialog.vue:208", err);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
      } finally {
        this.loading = false;
      }
    },
    appendMessage(role, text, forgivenessChange = "", forgiveness = null) {
      const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const currentForgiveness = forgiveness !== null ? forgiveness : this.forgiveness;
      this.messages.push({
        id,
        role,
        text,
        forgivenessChange,
        forgiveness: currentForgiveness
        // 保存消息发送时的原谅值
      });
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
        this.appendMessage("ai", reply, changeText, this.forgiveness);
        this.checkResult();
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/dialog/dialog.vue:279", "AI 处理异常:", err);
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
      this.gameEnded = true;
      this.persistRecord(success);
      if (success) {
        this.gameResult = {
          success: true,
          message: "恭喜，哄好了！原谅值达到 100，胜利！"
        };
      } else {
        this.gameResult = {
          success: false,
          message: reason || `挑战失败，原谅值 ${this.forgiveness}`
        };
      }
    },
    handleRestart() {
      this.initScene();
    },
    handleReturn() {
      common_vendor.index.navigateBack();
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
        common_vendor.index.__f__("error", "at pages/dialog/dialog.vue:350", "保存游戏记录失败:", err);
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
        a: msg.role === "ai" ? $options.getAiAvatar(msg.forgiveness) : $data.userAvatar,
        b: msg.role === "ai"
      }, msg.role === "ai" ? {
        c: common_vendor.t($options.getExpression(msg.forgiveness))
      } : {}, {
        d: common_vendor.t(msg.text),
        e: msg.forgivenessChange
      }, msg.forgivenessChange ? {
        f: common_vendor.t(msg.forgivenessChange)
      } : {}, {
        g: msg.id,
        h: msg.id,
        i: common_vendor.n(msg.role)
      });
    }),
    h: $data.gameEnded ? 1 : "",
    i: $data.lastMsgId,
    j: $data.gameEnded
  }, $data.gameEnded ? {
    k: common_vendor.t($data.gameResult.message),
    l: common_vendor.n($data.gameResult.success ? "success" : "failed")
  } : {}, {
    m: !$data.gameEnded
  }, !$data.gameEnded ? {
    n: $data.actionLocked,
    o: -1,
    p: $data.inputText,
    q: common_vendor.o(($event) => $data.inputText = $event.detail.value),
    r: $data.actionLocked,
    s: common_vendor.o((...args) => $options.handleSend && $options.handleSend(...args))
  } : {}, {
    t: $data.gameEnded
  }, $data.gameEnded ? {
    v: common_vendor.o((...args) => $options.handleRestart && $options.handleRestart(...args)),
    w: common_vendor.o((...args) => $options.handleReturn && $options.handleReturn(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/dialog/dialog.js.map
