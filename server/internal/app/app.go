// Package app 组装配置、存储与消息分发，供 gateway / gameserver 复用。
package app

import (
	"log"
	"os"

	"chenxiao/internal/config"
	"chenxiao/internal/game"
	"chenxiao/internal/handler"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
)

// App 服务运行态。
type App struct {
	Config *config.ConfigSet
	Redis  *store.Redis

	dispatcher *handler.Dispatcher
}

// New 加载配置、初始化数据库与 Redis、注册 handler。
func New(cfgDir, dbPath string) *App {
	cs, err := config.Load(cfgDir)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}
	db, err := store.OpenSQLite(dbPath)
	if err != nil {
		log.Fatalf("打开数据库失败: %v", err)
	}
	if err := store.Migrate(db); err != nil {
		log.Fatalf("初始化表结构失败: %v", err)
	}
	log.Printf("数据库已就绪: %s", dbPath)

	// Redis（可选：连接失败仅告警，排行榜不可用）
	var rdb *store.Redis
	if r, err := store.NewRedis("127.0.0.1:6379", "", 0); err != nil {
		log.Printf("Redis 连接失败（排行榜不可用）: %v", err)
	} else {
		rdb = r
		log.Printf("Redis 已就绪: 127.0.0.1:6379")
	}

	// 微信登录（可选，未配置则登录走 mock 账号）
	wx := &game.WeChatLogin{AppID: os.Getenv("WX_APP_ID"), AppSecret: os.Getenv("WX_APP_SECRET")}
	if wx.Enabled() {
		log.Printf("微信登录已配置 (appid=%s)", wx.AppID)
	} else {
		log.Printf("微信登录未配置，登录使用 mock 账号")
	}

	a := &App{Config: cs, Redis: rdb}
	a.dispatcher = handler.NewDispatcher()
	svc := game.NewService(cs, db, rdb, wx)
	handler.RegisterAll(a.dispatcher, svc)
	return a
}

// Dispatch 处理一条消息（由网关层在连接上收到消息后调用）。
func (a *App) Dispatch(conn *net.Connection, msgID uint32, body []byte) {
	a.dispatcher.Dispatch(conn, msgID, body)
}
