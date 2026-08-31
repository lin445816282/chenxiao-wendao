"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadProto = loadProto;
exports.encodeFrame = encodeFrame;
exports.decodeFrame = decodeFrame;
exports.decodeBody = decodeBody;
// 协议编解码：帧 = [msgId(4B大端)][bodyLen(4B大端)][protobuf body]
const protobufjs_1 = __importDefault(require("protobufjs"));
let root = null;
// loadProto 加载 .proto 文件（相对进程 cwd）。
async function loadProto(files) {
    root = await protobufjs_1.default.load(files);
}
function lookup(name) {
    if (!root)
        throw new Error('proto 未加载，请先调用 loadProto');
    const t = root.lookupType(name);
    if (!t)
        throw new Error('未找到消息类型: ' + name);
    return t;
}
// encodeFrame 编码一帧：msgId + protobuf 消息。
function encodeFrame(msgId, typeName, msg) {
    const t = lookup(typeName);
    const body = t.encode(t.fromObject(msg)).finish();
    const buf = new ArrayBuffer(8 + body.length);
    const dv = new DataView(buf);
    dv.setUint32(0, msgId);
    dv.setUint32(4, body.length);
    new Uint8Array(buf, 8).set(body);
    return new Uint8Array(buf);
}
// decodeFrame 解出 msgId 与 body。
function decodeFrame(data) {
    const buf = new Uint8Array(data);
    const dv = new DataView(data);
    const msgId = dv.getUint32(0);
    const len = dv.getUint32(4);
    return { msgId, body: buf.slice(8, 8 + len) };
}
// decodeBody 把 body 解码为 plain object（int64 -> number，枚举 -> number，空数组保留 []）。
function decodeBody(body, typeName) {
    const t = lookup(typeName);
    return t.toObject(t.decode(body), { longs: Number, enums: Number, arrays: true });
}
