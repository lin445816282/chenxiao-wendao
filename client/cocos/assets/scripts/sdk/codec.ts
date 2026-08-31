// Cocos 版协议编解码：proto 从内嵌源文件（proto_sources.js）用 parse 加载，无需文件系统。
import protobuf from 'protobufjs';
import protoSources from './proto_sources';

let root: protobuf.Root | null = null;

function ensureRoot(): protobuf.Root {
  if (!root) {
    root = new protobuf.Root();
    for (const src of Object.values(protoSources)) {
      protobuf.parse(src as string, root);
    }
    root.resolveAll();
  }
  return root;
}

function lookup(name: string): protobuf.Type {
  const t = ensureRoot().lookupType(name);
  if (!t) throw new Error('未找到消息类型: ' + name);
  return t;
}

// encodeFrame 编码一帧：msgId + protobuf 消息。
export function encodeFrame(msgId: number, typeName: string, msg: unknown): Uint8Array {
  const t = lookup(typeName);
  const body = t.encode(t.fromObject(msg as Record<string, unknown>)).finish();
  const buf = new ArrayBuffer(8 + body.length);
  const dv = new DataView(buf);
  dv.setUint32(0, msgId);
  dv.setUint32(4, body.length);
  new Uint8Array(buf, 8).set(body);
  return new Uint8Array(buf);
}

// decodeFrame 解出 msgId 与 body。
export function decodeFrame(data: ArrayBuffer): { msgId: number; body: Uint8Array } {
  const buf = new Uint8Array(data);
  const dv = new DataView(data);
  const msgId = dv.getUint32(0);
  const len = dv.getUint32(4);
  return { msgId, body: buf.slice(8, 8 + len) };
}

// decodeBody 把 body 解码为 plain object（int64 -> number，空数组保留 []）。
export function decodeBody<T>(body: Uint8Array, typeName: string): T {
  const t = lookup(typeName);
  return t.toObject(t.decode(body), { longs: Number, enums: Number, arrays: true }) as unknown as T;
}
