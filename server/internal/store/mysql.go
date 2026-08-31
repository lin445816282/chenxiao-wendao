// Package store 封装 MySQL / Redis 连接。
package store

import (
	"database/sql"
	"time"

	// 注册 MySQL 驱动
	_ "github.com/go-sql-driver/mysql"
)

// MySQL 持久化存储封装。
type MySQL struct {
	DB *sql.DB
}

// NewMySQL 建立连接并做 Ping 校验。dsn 形如 "user:pass@tcp(127.0.0.1:3306)/chenxiao?charset=utf8mb4&parseTime=true"。
func NewMySQL(dsn string) (*MySQL, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(time.Hour)
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &MySQL{DB: db}, nil
}

// Close 关闭连接池。
func (m *MySQL) Close() error {
	if m == nil || m.DB == nil {
		return nil
	}
	return m.DB.Close()
}
