package store

import (
	"database/sql"
	"fmt"
)

// BagItem 背包物品（可堆叠，对应 t_bag_item）。
type BagItem struct {
	ID       int64
	PlayerID int64
	ItemID   int32
	Count    int64
}

// AddBagItem 增加背包物品（已存在则累加，事务保证原子）。
func AddBagItem(db *sql.DB, playerID int64, itemID int32, count int64) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var id int64
	err = tx.QueryRow(`SELECT id FROM t_bag_item WHERE player_id = ? AND item_id = ?`, playerID, itemID).Scan(&id)
	switch {
	case err == sql.ErrNoRows:
		_, err = tx.Exec(`INSERT INTO t_bag_item (player_id, item_id, count) VALUES (?, ?, ?)`, playerID, itemID, count)
	case err == nil:
		_, err = tx.Exec(`UPDATE t_bag_item SET count = count + ? WHERE id = ?`, count, id)
	}
	if err != nil {
		return err
	}
	return tx.Commit()
}

// DeductBagItem 扣减背包物品数量；数量归零则删除，返回剩余数量。
func DeductBagItem(db *sql.DB, playerID int64, itemUID int64, count int64) (int64, error) {
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var cur int64
	if err := tx.QueryRow(`SELECT count FROM t_bag_item WHERE id = ? AND player_id = ?`, itemUID, playerID).Scan(&cur); err != nil {
		return 0, err
	}
	if cur < count {
		return 0, fmt.Errorf("数量不足")
	}
	newCount := cur - count
	if newCount <= 0 {
		if _, err := tx.Exec(`DELETE FROM t_bag_item WHERE id = ?`, itemUID); err != nil {
			return 0, err
		}
	} else {
		if _, err := tx.Exec(`UPDATE t_bag_item SET count = ? WHERE id = ?`, newCount, itemUID); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return newCount, nil
}

// ListBag 列出玩家背包（数量 > 0）。
func ListBag(db *sql.DB, playerID int64) ([]BagItem, error) {
	rows, err := db.Query(
		`SELECT id, player_id, item_id, count FROM t_bag_item WHERE player_id = ? AND count > 0 ORDER BY item_id`,
		playerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []BagItem
	for rows.Next() {
		var it BagItem
		if err := rows.Scan(&it.ID, &it.PlayerID, &it.ItemID, &it.Count); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}
