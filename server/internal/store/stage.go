package store

import (
	"database/sql"
)

// StageClear 关卡通关记录（对应 t_stage_clear）。
type StageClear struct {
	PlayerID   int64
	StageID    int32
	ClearTimes int32
	MaxStar    int32
}

// RecordStageClear 记录一次通关：通关次数 +1，保留最高星级。
// 服务端权威记录，供「扫荡」等玩法校验是否已通关。
func RecordStageClear(db *sql.DB, playerID int64, stageID, star int32) error {
	if _, err := db.Exec(`
		INSERT INTO t_stage_clear (player_id, stage_id, clear_times, max_star)
		VALUES (?, ?, 1, ?)
		ON CONFLICT(player_id, stage_id) DO UPDATE SET
			clear_times = clear_times + 1,
			max_star = MAX(max_star, excluded.max_star)`,
		playerID, stageID, star); err != nil {
		return err
	}
	return nil
}

// HasClearedStage 是否已通关该关卡。
func HasClearedStage(db *sql.DB, playerID int64, stageID int32) bool {
	var n int
	err := db.QueryRow(`SELECT 1 FROM t_stage_clear WHERE player_id = ? AND stage_id = ?`, playerID, stageID).Scan(&n)
	return err == nil
}

// HasThreeStarClaimed 是否已领取该关卡三星首通奖励。
func HasThreeStarClaimed(db *sql.DB, playerID int64, stageID int32) bool {
	var n int
	err := db.QueryRow(`SELECT 1 FROM t_stage_clear WHERE player_id = ? AND stage_id = ? AND three_star_claimed = 1`, playerID, stageID).Scan(&n)
	return err == nil
}

// MarkThreeStarClaimed 标记三星首通奖励已领取。
func MarkThreeStarClaimed(db *sql.DB, playerID int64, stageID int32) error {
	_, err := db.Exec(`UPDATE t_stage_clear SET three_star_claimed = 1 WHERE player_id = ? AND stage_id = ?`, playerID, stageID)
	return err
}

// ListStageClear 玩家全部通关记录。
func ListStageClear(db *sql.DB, playerID int64) ([]StageClear, error) {
	rows, err := db.Query(`SELECT stage_id, clear_times, max_star FROM t_stage_clear WHERE player_id = ? ORDER BY stage_id`, playerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]StageClear, 0, 8)
	for rows.Next() {
		var c StageClear
		c.PlayerID = playerID
		if err := rows.Scan(&c.StageID, &c.ClearTimes, &c.MaxStar); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
