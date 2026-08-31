package store

import (
	"database/sql"
)

// Player 角色存档（对应 t_player）。
type Player struct {
	ID                  int64
	AccountID           int64
	Nickname            string
	Level               int32
	Exp                 int64
	Copper              int64
	LastOfflineSettleAt int64
	LastSignDay         string
	LastHangSettleAt    int64
}

// GetPlayerByAccount 按账号取玩家；不存在返回 sql.ErrNoRows。
func GetPlayerByAccount(db *sql.DB, accountID int64) (*Player, error) {
	p := &Player{}
	err := db.QueryRow(
		`SELECT id, account_id, nickname, level, exp, copper, last_offline_settle_at, last_sign_day, last_hang_settle_at
		 FROM t_player WHERE account_id = ?`,
		accountID,
	).Scan(&p.ID, &p.AccountID, &p.Nickname, &p.Level, &p.Exp, &p.Copper, &p.LastOfflineSettleAt, &p.LastSignDay, &p.LastHangSettleAt)
	return p, err
}

// GetPlayerByID 按玩家 ID 取玩家。
func GetPlayerByID(db *sql.DB, id int64) (*Player, error) {
	p := &Player{}
	err := db.QueryRow(
		`SELECT id, account_id, nickname, level, exp, copper, last_offline_settle_at, last_sign_day, last_hang_settle_at FROM t_player WHERE id = ?`,
		id,
	).Scan(&p.ID, &p.AccountID, &p.Nickname, &p.Level, &p.Exp, &p.Copper, &p.LastOfflineSettleAt, &p.LastSignDay, &p.LastHangSettleAt)
	return p, err
}

// CreatePlayer 创建角色，返回玩家 ID。
func CreatePlayer(db *sql.DB, accountID int64, nickname string) (int64, error) {
	res, err := db.Exec(`INSERT INTO t_player (account_id, nickname) VALUES (?, ?)`, accountID, nickname)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateLastHangSettleAt 更新在线挂机上次结算时间。
func UpdateLastHangSettleAt(db *sql.DB, playerID, ts int64) error {
	_, err := db.Exec(`UPDATE t_player SET last_hang_settle_at = ? WHERE id = ?`, ts, playerID)
	return err
}

// UpdateLastSignDay 更新每日签到日期。
func UpdateLastSignDay(db *sql.DB, playerID int64, day string) error {
	_, err := db.Exec(`UPDATE t_player SET last_sign_day = ? WHERE id = ?`, day, playerID)
	return err
}

// AddResources 增加修为/铜钱，修为达阈值自动升级，返回最新 (exp, copper)。
// 升级规则：升到下一级所需修为 = 当前等级 × 1000。
func AddResources(db *sql.DB, playerID, exp, copper int64) (int64, int64, error) {
	tx, err := db.Begin()
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE t_player SET exp = exp + ?, copper = copper + ? WHERE id = ?`, exp, copper, playerID); err != nil {
		return 0, 0, err
	}
	var lv int32
	var e int64
	if err := tx.QueryRow(`SELECT level, exp FROM t_player WHERE id = ?`, playerID).Scan(&lv, &e); err != nil {
		return 0, 0, err
	}
	for e >= int64(lv)*1000 {
		e -= int64(lv) * 1000
		lv++
	}
	if _, err := tx.Exec(`UPDATE t_player SET level = ?, exp = ? WHERE id = ?`, lv, e, playerID); err != nil {
		return 0, 0, err
	}
	var newCopper int64
	if err := tx.QueryRow(`SELECT copper FROM t_player WHERE id = ?`, playerID).Scan(&newCopper); err != nil {
		return 0, 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, 0, err
	}
	return e, newCopper, nil
}
