package store

import (
	"database/sql"
	"fmt"
)

// Equip 装备实例（对应 t_equip）。
type Equip struct {
	ID              int64
	PlayerID        int64
	EquipID         int32
	Pos             int32
	StrengthenLevel int32
	RefineLevel     int32
	AffixesJSON     string // 随机词条（JSON 序列化）
}

// InsertEquip 插入一件装备（初始在背包 pos=0），返回实例 ID。
func InsertEquip(db *sql.DB, playerID int64, equipID int32, affixesJSON string) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO t_equip (player_id, equip_id, pos, affixes) VALUES (?, ?, 0, ?)`,
		playerID, equipID, affixesJSON,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ListEquip 列出玩家全部装备。
func ListEquip(db *sql.DB, playerID int64) ([]Equip, error) {
	rows, err := db.Query(
		`SELECT id, player_id, equip_id, pos, strengthen_level, refine_level, affixes FROM t_equip WHERE player_id = ? ORDER BY id`,
		playerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Equip
	for rows.Next() {
		var e Equip
		if err := rows.Scan(&e.ID, &e.PlayerID, &e.EquipID, &e.Pos, &e.StrengthenLevel, &e.RefineLevel, &e.AffixesJSON); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// GetEquip 取单件装备。
func GetEquip(db *sql.DB, equipUID int64) (*Equip, error) {
	e := &Equip{}
	err := db.QueryRow(
		`SELECT id, player_id, equip_id, pos, strengthen_level, refine_level, affixes FROM t_equip WHERE id = ?`,
		equipUID,
	).Scan(&e.ID, &e.PlayerID, &e.EquipID, &e.Pos, &e.StrengthenLevel, &e.RefineLevel, &e.AffixesJSON)
	return e, err
}

// SetEquipPos 设置穿戴位置（0=背包，1-8=部位）。
func SetEquipPos(db *sql.DB, equipUID int64, pos int32) error {
	_, err := db.Exec(`UPDATE t_equip SET pos = ? WHERE id = ?`, pos, equipUID)
	return err
}

// UnwearPos 把某玩家某部位所有已穿戴装备脱下（pos=0），保证同部位唯一。
func UnwearPos(db *sql.DB, playerID int64, pos int32) error {
	_, err := db.Exec(`UPDATE t_equip SET pos = 0 WHERE player_id = ? AND pos = ?`, playerID, pos)
	return err
}

// DeleteEquip 删除装备（分解）。
func DeleteEquip(db *sql.DB, equipUID int64, playerID int64) error {
	_, err := db.Exec(`DELETE FROM t_equip WHERE id = ? AND player_id = ?`, equipUID, playerID)
	return err
}

// DeductCopper 扣除铜钱（余额不足返回错误，事务保证原子）。
func DeductCopper(db *sql.DB, playerID, cost int64) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var copper int64
	if err := tx.QueryRow(`SELECT copper FROM t_player WHERE id = ?`, playerID).Scan(&copper); err != nil {
		return err
	}
	if copper < cost {
		return fmt.Errorf("铜钱不足: 需 %d 有 %d", cost, copper)
	}
	if _, err := tx.Exec(`UPDATE t_player SET copper = copper - ? WHERE id = ?`, cost, playerID); err != nil {
		return err
	}
	return tx.Commit()
}

// StrengthenEquip 强化 +1，返回新等级。
func StrengthenEquip(db *sql.DB, equipUID int64) (int32, error) {
	if _, err := db.Exec(`UPDATE t_equip SET strengthen_level = strengthen_level + 1 WHERE id = ?`, equipUID); err != nil {
		return 0, err
	}
	var lv int32
	if err := db.QueryRow(`SELECT strengthen_level FROM t_equip WHERE id = ?`, equipUID).Scan(&lv); err != nil {
		return 0, err
	}
	return lv, nil
}

// RefineEquip 精炼 +1，返回新等级。
func RefineEquip(db *sql.DB, equipUID int64) (int32, error) {
	if _, err := db.Exec(`UPDATE t_equip SET refine_level = refine_level + 1 WHERE id = ?`, equipUID); err != nil {
		return 0, err
	}
	var lv int32
	if err := db.QueryRow(`SELECT refine_level FROM t_equip WHERE id = ?`, equipUID).Scan(&lv); err != nil {
		return 0, err
	}
	return lv, nil
}
