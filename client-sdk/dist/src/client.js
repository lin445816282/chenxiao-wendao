"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameClient = void 0;
// WebSocket 客户端：连接 + 顺序请求/响应。
const codec_1 = require("./codec");
class GameClient {
    ws = null;
    pending = null;
    connect(url) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            ws.binaryType = 'arraybuffer';
            ws.onopen = () => { this.ws = ws; resolve(); };
            ws.onerror = () => reject(new Error('WebSocket 连接失败: ' + url));
            ws.onmessage = (ev) => {
                const { msgId, body } = (0, codec_1.decodeFrame)(ev.data);
                if (this.pending && msgId === this.pending.expect) {
                    const p = this.pending;
                    this.pending = null;
                    p.resolve(body);
                }
            };
            ws.onclose = () => { this.ws = null; };
        });
    }
    // request 发请求并等待匹配的响应（顺序使用）。
    request(msgId, reqType, respType, msg, expectMsgId, timeoutMs = 5000) {
        if (!this.ws)
            return Promise.reject(new Error('未连接'));
        const frame = (0, codec_1.encodeFrame)(msgId, reqType, msg);
        this.ws.send(frame.buffer);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (this.pending && this.pending.expect === expectMsgId)
                    this.pending = null;
                reject(new Error('请求超时: msgId=' + msgId));
            }, timeoutMs);
            this.pending = {
                expect: expectMsgId,
                resolve: (body) => { clearTimeout(timer); resolve((0, codec_1.decodeBody)(body, respType)); },
            };
        });
    }
    close() { this.ws?.close(); }
}
exports.GameClient = GameClient;
