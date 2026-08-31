// Package store 封装数据库连接与持久化。
// 开发环境用 SQLite（纯 Go 驱动，零服务）；生产环境换 MySQL（同一套 database/sql 代码）。
package store

import (
	"database/sql"
	"os"
	"path/filepath"

	// SQLite 纯 Go 驱动（无 CGO）
	_ "modernc.org/sqlite"
)

// OpenSQLite 打开 SQLite 数据库，自动创建父目录。
func OpenSQLite(path string) (*sql.DB, error) {
	if dir := filepath.Dir(path); dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, err
		}
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}

// Migrate 建表（SQLite 简化版，字段与 docs/01-database-design.md 对齐）。
// 生产 MySQL 的完整建表语句见该文档。
func Migrate(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS t_account (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			openid TEXT NOT NULL UNIQUE,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS t_player (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			account_id INTEGER NOT NULL DEFAULT 0,
			nickname TEXT NOT NULL DEFAULT '',
			level INTEGER NOT NULL DEFAULT 1,
			exp INTEGER NOT NULL DEFAULT 0,
			copper INTEGER NOT NULL DEFAULT 0,
			last_offline_settle_at INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS t_equip (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			player_id INTEGER NOT NULL DEFAULT 0,
			equip_id INTEGER NOT NULL DEFAULT 0,
			pos INTEGER NOT NULL DEFAULT 0,
			strengthen_level INTEGER NOT NULL DEFAULT 0,
			refine_level INTEGER NOT NULL DEFAULT 0,
			affixes TEXT NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS t_pet (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			player_id INTEGER NOT NULL DEFAULT 0,
			pet_id INTEGER NOT NULL DEFAULT 0,
			level INTEGER NOT NULL DEFAULT 1,
			exp INTEGER NOT NULL DEFAULT 0,
			star INTEGER NOT NULL DEFAULT 1,
			is_combat INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS t_bag_item (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			player_id INTEGER NOT NULL DEFAULT 0,
			item_id INTEGER NOT NULL DEFAULT 0,
			count INTEGER NOT NULL DEFAULT 0,
			UNIQUE(player_id, item_id)
		)`,
		`CREATE TABLE IF NOT EXISTS t_mail (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			player_id INTEGER NOT NULL DEFAULT 0,
			mail_type INTEGER NOT NULL DEFAULT 1,
			title TEXT NOT NULL DEFAULT '',
			content TEXT NOT NULL DEFAULT '',
			attach_item_id INTEGER NOT NULL DEFAULT 0,
			attach_count INTEGER NOT NULL DEFAULT 0,
			is_read INTEGER NOT NULL DEFAULT 0,
			is_claimed INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS t_stage_clear (
			player_id INTEGER NOT NULL DEFAULT 0,
			stage_id INTEGER NOT NULL DEFAULT 0,
			clear_times INTEGER NOT NULL DEFAULT 0,
			max_star INTEGER NOT NULL DEFAULT 0,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (player_id, stage_id)
		)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return err
		}
	}
	// 兼容旧库：补列（新库已含；重复添加的报错忽略）
	_, _ = db.Exec(`ALTER TABLE t_pet ADD COLUMN is_combat INTEGER NOT NULL DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE t_equip ADD COLUMN affixes TEXT NOT NULL DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE t_player ADD COLUMN last_sign_day TEXT NOT NULL DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE t_player ADD COLUMN last_hang_settle_at INTEGER NOT NULL DEFAULT 0`)
	return nil
}
