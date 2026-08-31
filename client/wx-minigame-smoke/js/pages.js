// 独立页面：设置 / 成就 / 隐私（工厂函数注入依赖，函数体内用同名局部变量）
module.exports = function (P) {
  const { ctx, SW, SH, coverDraw, text, panel, btn, renderAmbient, audio, ACHIEVEMENTS, achDone } = P;

  function renderPrivacy() {
    coverDraw('bg', 0, 0, SW, SH);
    ctx.fillStyle = 'rgba(8,16,30,0.9)'; ctx.fillRect(0, 0, SW, SH);
    text('《尘霄问道》', SW / 2, 56, 24, '#ffd76a', 'center', true);
    text('用户协议与隐私政策', SW / 2, 84, 16, '#fff', 'center', true);
    panel(18, 104, SW - 36, SH - 270, 'rgba(15,25,45,0.92)', 14);
    const lines = [
      '欢迎游玩《尘霄问道》！请仔细阅读：',
      '',
      '【隐私政策】',
      '· 登录需使用微信 OpenID 创建并保存角色存档。',
      '· 收集：OpenID、昵称、游戏数据（等级/装备/灵宠等）。',
      '· 不收集身份证、银行卡、通讯录、精确位置等敏感信息。',
      '· 不会向任何第三方出售您的个人信息。',
      '',
      '【用户协议】',
      '· 本游戏无充值内购，仅通过广告变现。',
      '· 请遵守平台规则，文明游戏。',
      '· 未成年人受国家网络游戏防沉迷系统保护。',
      '',
      '点击「同意并继续」即表示您已阅读并同意以上全部内容。',
    ];
    lines.forEach((s, i) => text(s, 34, 132 + i * 22, 12, s.indexOf('【') === 0 ? '#ffd76a' : '#e0e0e0', 'left', s.indexOf('【') === 0));
    btn({ x: 30, y: SH - 152, w: SW - 60, h: 50, label: '同意并继续' });
    btn({ x: 30, y: SH - 92, w: SW - 60, h: 40, label: '不同意' });
  }

  function renderSettings() {
    coverDraw('bg', 0, 0, SW, SH);
    ctx.fillStyle = 'rgba(10,22,40,0.6)'; ctx.fillRect(0, 0, SW, SH);
    renderAmbient('#ffe9a0');
    text('设置', SW / 2, 46, 22, '#ffd76a', 'center', true);
    btn({ x: 15, y: 16, w: 72, h: 36, label: '返回' });
    panel(15, 70, SW - 30, 56, 'rgba(15,25,45,0.85)', 12);
    text('音效', 30, 92, 14, '#fff', 'left', true);
    text(audio.getSoundOn() ? '开' : '关', SW - 40, 92, 14, audio.getSoundOn() ? '#4ade80' : '#f87171', 'right', true);
    panel(15, 134, SW - 30, 56, 'rgba(15,25,45,0.85)', 12);
    text('背景音乐', 30, 156, 14, '#fff', 'left', true);
    text(audio.getBgmOn() ? '开' : '关', SW - 40, 156, 14, audio.getBgmOn() ? '#4ade80' : '#f87171', 'right', true);
    btn({ x: 15, y: 210, w: SW - 30, h: 48, label: '清缓存并重置引导' });
    btn({ x: 15, y: 268, w: SW - 30, h: 48, label: '用户协议与隐私政策' });
    btn({ x: 15, y: 326, w: SW - 30, h: 48, label: '分享给好友' });
    btn({ x: 15, y: 384, w: SW - 30, h: 48, label: '成就' });
    btn({ x: 15, y: 442, w: SW - 30, h: 48, label: '退出登录' });
    text('《尘霄问道》v1.0.0', SW / 2, 500, 12, '#9ab', 'center');
  }

  function renderAchievements() {
    coverDraw('bg', 0, 0, SW, SH);
    ctx.fillStyle = 'rgba(10,22,40,0.6)'; ctx.fillRect(0, 0, SW, SH);
    renderAmbient('#ffe9a0');
    text('成就', SW / 2, 46, 22, '#ffd76a', 'center', true);
    btn({ x: 15, y: 16, w: 72, h: 36, label: '返回' });
    const done = ACHIEVEMENTS.filter(achDone).length;
    text('已达成 ' + done + ' / ' + ACHIEVEMENTS.length, SW / 2, 80, 13, '#9ab', 'center');
    ACHIEVEMENTS.forEach((a, i) => {
      const py = 100 + i * 78;
      const ok = achDone(a);
      panel(15, py, SW - 30, 68, ok ? 'rgba(25,42,70,0.9)' : 'rgba(15,22,35,0.7)', 12);
      if (ok) { ctx.strokeStyle = 'rgba(74,222,128,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(15, py, SW - 30, 68); }
      text((ok ? '🏆 ' : '🔒 ') + a.name, 30, py + 26, 15, ok ? '#ffd76a' : '#777', 'left', true);
      text(a.desc, 30, py + 48, 12, ok ? '#e0e0e0' : '#666', 'left');
      text(ok ? '已达成' : '未达成', SW - 30, py + 34, 12, ok ? '#4ade80' : '#777', 'right');
    });
  }

  return { renderPrivacy, renderSettings, renderAchievements };
};
