# 微信小游戏服务器连通性测试

用微信开发者工具导入本目录，验证小游戏能连上 `wss://game.ct256.cn/ws`。

## 使用步骤

1. 打开**微信开发者工具** → 新建项目。
2. 项目类型选 **「小游戏」**，填 AppID（用自己的小游戏 AppID；测试可用「测试号」）。
3. 项目目录选到本目录 `client/wx-minigame-smoke/`。
4. 进入项目后，点右上角 **「详情」→「本地设置」**，勾选：
   > **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**
5. 点 **「编译」**，预览画面会逐行打印测试结果（Console 面板同步输出）。

## 预期结果

```
1) 健康检查 https://game.ct256.cn/healthz
   ✅ healthz: HTTP 200 数据=ok
2) 连接 wss://game.ct256.cn/ws
   ✅ 连接成功
   → 已发送 C2SLogin (msgId=1000)
   ← 收到 msgId=1001 len=14
     body(ascii): ..mock-token        ← 看到 mock-token 即登录链路通
   → 已发送 C2SOfflineRewardQuery (msgId=2000)
   ← 收到 msgId=2001 len=2
```

## 重要说明

- **开发期**：勾选「不校验合法域名」即可连 `game.ct256.cn`，无需备案/白名单。
- **真机预览 / 上线**：必须先在微信公众平台把 `game.ct256.cn` 加入 **「socket 合法域名」**（要求域名已 ICP 备案 + HTTPS），否则连不上。
- 本测试只验证「小游戏 ↔ 服务器」网络链路，不含游戏玩法；正式客户端（Cocos Creator）接入时复用同一套协议帧格式（`msgId + bodyLen + protobuf`）。
