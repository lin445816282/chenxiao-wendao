package game

import (
	"database/sql"

	"chenxiao/internal/config"
	"chenxiao/internal/store"
)

// Service 业务服务：持有配置、数据库、Redis 与微信登录，handler 为 Service 的方法。
type Service struct {
	Config *config.ConfigSet
	DB     *sql.DB
	Redis  *store.Redis  // 可为 nil（未连接时排行榜不可用）
	WeChat *WeChatLogin  // 可为 nil（未配置时登录走 mock 账号）
}

// NewService 构造业务服务。
func NewService(cfg *config.ConfigSet, db *sql.DB, rdb *store.Redis, wx *WeChatLogin) *Service {
	return &Service{Config: cfg, DB: db, Redis: rdb, WeChat: wx}
}
