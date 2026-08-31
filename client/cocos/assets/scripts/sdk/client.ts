// WebSocket 客户端：连接 + 顺序请求/响应。
import { decodeBody, decodeFrame, encodeFrame } from './codec';

export class GameClient {
  private ws: WebSocket | null = null;
  private pending: { expect: number; resolve: (body: Uint8Array) => void } | null = null;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => { this.ws = ws; resolve(); };
      ws.onerror = () => reject(new Error('WebSocket 连接失败: ' + url));
      ws.onmessage = (ev) => {
        const { msgId, body } = decodeFrame(ev.data as ArrayBuffer);
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
  request<T>(msgId: number, reqType: string, respType: string, msg: unknown, expectMsgId: number, timeoutMs = 5000): Promise<T> {
    if (!this.ws) return Promise.reject(new Error('未连接'));
    const frame = encodeFrame(msgId, reqType, msg);
    this.ws.send(frame.buffer as unknown as ArrayBuffer);
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending && this.pending.expect === expectMsgId) this.pending = null;
        reject(new Error('请求超时: msgId=' + msgId));
      }, timeoutMs);
      this.pending = {
        expect: expectMsgId,
        resolve: (body) => { clearTimeout(timer); resolve(decodeBody<T>(body, respType)); },
      };
    });
  }

  close() { this.ws?.close(); }
}
