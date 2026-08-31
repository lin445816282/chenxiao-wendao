package store

import "database/sql"

// Pet 灵宠实例（对应 t_pet）。
type Pet struct {
	ID       int64
	PlayerID int64
	PetID    int32
	Level    int32
	Exp      int64
	Star     int32
	IsCombat bool
}

// InsertPet 插入一只灵宠，返回实例 ID。
func InsertPet(db *sql.DB, playerID int64, petID int32) (int64, error) {
	res, err := db.Exec(`INSERT INTO t_pet (player_id, pet_id) VALUES (?, ?)`, playerID, petID)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ListPet 列出玩家全部灵宠。
func ListPet(db *sql.DB, playerID int64) ([]Pet, error) {
	rows, err := db.Query(
		`SELECT id, player_id, pet_id, level, exp, star, is_combat FROM t_pet WHERE player_id = ? ORDER BY id`,
		playerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Pet
	for rows.Next() {
		var p Pet
		var isCombat int
		if err := rows.Scan(&p.ID, &p.PlayerID, &p.PetID, &p.Level, &p.Exp, &p.Star, &isCombat); err != nil {
			return nil, err
		}
		p.IsCombat = isCombat == 1
		out = append(out, p)
	}
	return out, rows.Err()
}

// GetPet 取单只灵宠。
func GetPet(db *sql.DB, petUID int64) (*Pet, error) {
	var p Pet
	var isCombat int
	err := db.QueryRow(
		`SELECT id, player_id, pet_id, level, exp, star, is_combat FROM t_pet WHERE id = ?`, petUID,
	).Scan(&p.ID, &p.PlayerID, &p.PetID, &p.Level, &p.Exp, &p.Star, &isCombat)
	if err != nil {
		return nil, err
	}
	p.IsCombat = isCombat == 1
	return &p, nil
}

// SetPetCombat 设置出战状态；出战前先清空该玩家其他出战灵宠（V1 单一出战位）。
func SetPetCombat(db *sql.DB, playerID, petUID int64, combat bool) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if combat {
		if _, err := tx.Exec(`UPDATE t_pet SET is_combat = 0 WHERE player_id = ?`, playerID); err != nil {
			return err
		}
	}
	c := 0
	if combat {
		c = 1
	}
	if _, err := tx.Exec(`UPDATE t_pet SET is_combat = ? WHERE id = ?`, c, petUID); err != nil {
		return err
	}
	return tx.Commit()
}

// AddPetExp 给出战灵宠加经验并自动升级（升到下一级所需 = 当前等级 × 500）。
func AddPetExp(db *sql.DB, playerID int64, exp int64) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var petID int64
	var lv int32
	if err := tx.QueryRow(`SELECT id, level FROM t_pet WHERE player_id = ? AND is_combat = 1`, playerID).Scan(&petID, &lv); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE t_pet SET exp = exp + ? WHERE id = ?`, exp, petID); err != nil {
		return err
	}
	var e int64
	if err := tx.QueryRow(`SELECT exp FROM t_pet WHERE id = ?`, petID).Scan(&e); err != nil {
		return err
	}
	for e >= int64(lv)*500 {
		e -= int64(lv) * 500
		lv++
	}
	if _, err := tx.Exec(`UPDATE t_pet SET level = ?, exp = ? WHERE id = ?`, lv, e, petID); err != nil {
		return err
	}
	return tx.Commit()
}

// UpgradePet 升级 +1，返回新等级。
func UpgradePet(db *sql.DB, petUID int64) (int32, error) {
	if _, err := db.Exec(`UPDATE t_pet SET level = level + 1 WHERE id = ?`, petUID); err != nil {
		return 0, err
	}
	var lv int32
	if err := db.QueryRow(`SELECT level FROM t_pet WHERE id = ?`, petUID).Scan(&lv); err != nil {
		return 0, err
	}
	return lv, nil
}

// EvolvePet 进化（星级 +1），返回新星级。
func EvolvePet(db *sql.DB, petUID int64) (int32, error) {
	if _, err := db.Exec(`UPDATE t_pet SET star = star + 1 WHERE id = ?`, petUID); err != nil {
		return 0, err
	}
	var star int32
	if err := db.QueryRow(`SELECT star FROM t_pet WHERE id = ?`, petUID).Scan(&star); err != nil {
		return 0, err
	}
	return star, nil
}
