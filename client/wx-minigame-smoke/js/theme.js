// 主题配置（武侠风）—— 后续换肤/换风格只改这里，无需动绘制逻辑
const theme = {
  // 按钮：暗金渐变 + 双线描边 + 四角钉装饰，方正古风
  button: {
    radius: 4,
    bgTop: '#c9a24b',            // 渐变顶部（亮金）
    bgBottom: '#7a5a1e',         // 渐变底部（暗金棕）
    border: '#e8c96a',           // 外描边（金）
    borderWidth: 1.5,
    innerBorder: '#4a3416',      // 内描边（深棕，双线古风）
    highlight: 'rgba(255,235,180,0.22)', // 顶部高光
    shadow: 'rgba(0,0,0,0.45)',  // 投影
    textColor: '#f7ecc8',        // 文字（米黄）
    corner: true,                // 四角钉装饰
    cornerColor: '#e8c96a',
  },
  // 面板：宣纸暗底 + 金边
  panel: {
    border: 'rgba(200,162,75,0.35)',
    borderWidth: 1,
  },
  // 主界面标题/强调色
  accent: '#e8c96a',
  accentSoft: '#f7ecc8',
};
module.exports = theme;
