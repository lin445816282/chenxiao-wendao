# 《尘霄问道》网关外网部署文档

## 0. 现状与结论

- 开发沙箱机器在 **NAT 内网**（内网 `172.23.x.x`，出口公网 IP `183.251.34.69`），且无端口映射权限，**无法从公网直接访问沙箱上的 8080**。
- 代码已具备对外能力：网关默认监听 `:8080`（即 `0.0.0.0`，全接口），提供 `GET /healthz` 健康检查与 `/ws` WebSocket。
- **微信小游戏强制要求**：`wss://` 协议 + **已备案域名** + 在微信公众平台后台配置「socket 合法域名」。因此隧道类临时方案（ngrok/frp 随机域名）**无法过微信审核**，必须走正规云服务器 + 备案域名。

## 1. 部署架构

```
微信小游戏 / 浏览器
      │  wss://game.example.com/ws  (443, TLS)
      ▼
   Nginx（TLS 终结 + WSS 反代）
      │  http://127.0.0.1:8080/ws
      ▼
   Gateway（Go，监听 127.0.0.1:8080）
      │
   ├─ MySQL（持久化）
   └─ Redis（会话/排行榜）
```

## 2. 部署步骤（一次性）

### 2.1 云服务器
- 腾讯云/阿里云等，Linux（Ubuntu/Debian/CentOS），建议 **2C4G** 起步，地域选大陆（需备案）。
- 安全组/防火墙：**开放 80、443**；**8080 不对公网开放**（只允许 127.0.0.1）。

### 2.2 域名 + 备案
- 购买域名，完成 **ICP 备案**（微信小游戏强制，备案周期约 1~3 周，尽早启动）。
- 添加 DNS A 记录：`game.example.com` → 服务器公网 IP。

### 2.3 部署 Go 网关
```bash
# 1) 上传代码到服务器（git clone 或 scp）
# 2) 安装 Go 1.22+ 与 protoc（见 ../README.md）
# 3) 编译
cd server
export GOPROXY=https://goproxy.cn,direct   # 国内网络
make proto && make tidy && make build
mkdir -p /opt/chenxiao/server/bin
go build -o /opt/chenxiao/server/bin/gateway ./cmd/gateway
cp -r configs /opt/chenxiao/server/

# 4) 用 systemd 托管
cp deploy/gateway.service /etc/systemd/system/chenxiao-gateway.service
systemctl daemon-reload
systemctl enable --now chenxiao-gateway
systemctl status chenxiao-gateway
```

### 2.4 Nginx + HTTPS/WSS
```bash
apt install -y nginx certbot python3-certbot-nginx
# 拷贝反代配置（把 game.example.com 换成你的域名）
cp deploy/nginx.conf /etc/nginx/conf.d/chenxiao.conf
# 签发证书（需 80 端口可达、域名已解析）
certbot --nginx -d game.example.com
nginx -t && systemctl reload nginx
```

### 2.5 微信后台配置
1. 微信公众平台 → 开发 → 开发设置 → **服务器域名** → `socket 合法域名`，填 `wss://game.example.com`。
2. （合法域名要求：已备案、已配置 HTTPS 证书。）

## 3. 验证

```bash
# 健康检查（公网）
curl https://game.example.com/healthz          # 期望返回 ok

# WSS 连通（本仓库自带客户端，把 ws:// 改成 wss://域名）
node tools/demo_client.cjs wss://game.example.com/ws
```

## 4. 安全注意

- 网关只监听 `127.0.0.1:8080`，不直接暴露公网。
- 上线前把 `internal/net/ws_server.go` 的 `CheckOrigin` 从 `return true` 收紧为校验域名白名单（微信小游戏无浏览器 Origin，但防普通 Web 滥用）。
- MySQL/Redis 走内网，账号用强密码，不暴露 3306/6379。
- 接入微信登录后，token 放 Redis 带 TTL，离线结算/战斗全部服务端权威（已实现见 `internal/game/combat`、`internal/game/settle`）。
