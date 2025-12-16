"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_supabaseHelper = require("../../utils/supabase-helper.js");
const _sfc_main = {
  data() {
    return {
      sceneId: "",
      scene: null,
      loading: false,
      inputText: "",
      forgiveness: 0,
      maxTurns: 10,
      currentTurn: 0,
      messages: [],
      userAvatar: "https://cdn.uviewui.com/uview/common/user.png",
      aiAvatar: "https://cdn.uviewui.com/uview/common/logo.png",
      actionLocked: false,
      lastMsgId: ""
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
    this.initScene();
  },
  methods: {
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
        this.maxTurns = data.max_interactions || 10;
        this.currentTurn = 0;
        this.messages = [];
        this.appendMessage("ai", data.angry_reason || data.title || "我现在很生气，你说说看。");
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/dialog/dialog.vue:103", err);
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
    handleSend() {
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
      setTimeout(() => {
        const delta = this.calcForgivenessDelta(content);
        this.forgiveness = Math.max(0, Math.min(100, this.forgiveness + delta));
        const changeText = delta >= 0 ? `原谅值 +${delta}` : `原谅值 ${delta}`;
        const reply = this.buildAiReply(delta);
        this.appendMessage("ai", reply, changeText);
        this.checkResult();
        this.actionLocked = false;
      }, 300);
    },
    calcForgivenessDelta(text) {
      const lower = text.toLowerCase();
      if (lower.includes("对不起") || lower.includes("抱歉") || lower.includes("sorry")) {
        return this.randomInt(10, 25);
      }
      if (lower.includes("你错") || lower.includes("怪你")) {
        return -this.randomInt(15, 30);
      }
      return this.randomInt(-15, 20);
    },
    buildAiReply(delta) {
      if (!this.scene)
        return "...";
      if (delta >= 15)
        return "好吧，态度还不错。";
      if (delta >= 5)
        return "嗯，勉强听进去一些。";
      if (delta >= 0)
        return "我再听听，你继续说。";
      if (delta >= -10)
        return "你这话让我有点生气。";
      return "你是来气我的吗？";
    },
    randomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
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
