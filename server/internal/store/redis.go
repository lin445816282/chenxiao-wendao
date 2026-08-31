package store

import (
	"context"

	"github.com/redis/go-redis/v9"
)

// Redis 热缓存/排行榜存储封装。
type Redis struct {
	Client *redis.Client
}

// NewRedis 建立连接并 Ping 校验。
func NewRedis(addr, password string, db int) (*Redis, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}
	return &Redis{Client: client}, nil
}

// Close 关闭连接。
func (r *Redis) Close() error {
	if r == nil || r.Client == nil {
		return nil
	}
	return r.Client.Close()
}
