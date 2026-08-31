// 音效 + BGM（Web Audio 程序生成，无需音频文件）
let audioCtx = null;
let soundOn = true, bgmOn = true;
try { soundOn = wx.getStorageSync('cxwd_sound') !== 0; bgmOn = wx.getStorageSync('cxwd_bgm') !== 0; } catch (e) {}
let bgmTimer = null, bgmStarted = false;
const BGM = [523, 587, 659, 784, 880, 784, 659, 587]; // 古风五声音阶循环

function initAudio() { try { audioCtx = wx.createWebAudioContext(); } catch (e) { audioCtx = null; } }
function playTone(freq, dur, type, vol) {
  if (!audioCtx || !soundOn) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol; g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur);
}
function sndClick() { playTone(880, 0.06, 'sine', 0.18); }
function sndHit() { playTone(200, 0.14, 'square', 0.22); }
function sndCrit() { playTone(150, 0.2, 'sawtooth', 0.28); }
function sndVictory() { playTone(523, 0.1, 'sine', 0.22); setTimeout(() => playTone(659, 0.1, 'sine', 0.22), 110); setTimeout(() => playTone(784, 0.25, 'sine', 0.22), 220); }
function sndDodge() { playTone(1200, 0.06, 'sine', 0.14); }
function sndOpen() { playTone(660, 0.06, 'sine', 0.13); }
function sndClose() { playTone(440, 0.06, 'sine', 0.11); }
function sndDrop() { playTone(587, 0.09, 'sine', 0.2); setTimeout(() => playTone(880, 0.12, 'sine', 0.2), 90); }
function sndUpgrade() { playTone(523, 0.08, 'triangle', 0.2); setTimeout(() => playTone(784, 0.14, 'triangle', 0.2), 80); }
function sndError() { playTone(180, 0.15, 'square', 0.16); }
function startBGM() {
  if (bgmStarted || !audioCtx || !bgmOn) return;
  bgmStarted = true;
  let i = 0;
  const step = () => { if (!bgmOn) { bgmTimer = null; bgmStarted = false; return; } playTone(BGM[i % BGM.length], 0.5, 'sine', 0.06); i++; bgmTimer = setTimeout(step, 460); };
  step();
}
function setSoundOn(v) { soundOn = v; try { wx.setStorageSync('cxwd_sound', v ? 1 : 0); } catch (e) {} }
function setBgmOn(v) { bgmOn = v; try { wx.setStorageSync('cxwd_bgm', v ? 1 : 0); } catch (e) {} if (v) startBGM(); }
function getSoundOn() { return soundOn; }
function getBgmOn() { return bgmOn; }

module.exports = {
  initAudio, playTone, startBGM,
  sndClick, sndHit, sndCrit, sndVictory, sndDodge, sndOpen, sndClose, sndDrop, sndUpgrade, sndError,
  setSoundOn, setBgmOn, getSoundOn, getBgmOn,
};
