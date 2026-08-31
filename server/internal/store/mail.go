package store

import (
	"database/sql"
	"errors"
)

// ErrMailClaimed 附件已领取。
var ErrMailClaimed = errors.New("mail already claimed")

// Mail 邮件（单附件简化版，对应 t_mail）。
type Mail struct {
	ID           int64
	PlayerID     int64
	MailType     int32
	Title        string
	Content      string
	AttachItemID int32
	AttachCount  int64
	IsRead       bool
	IsClaimed    bool
}

// InsertMail 插入一封邮件。
func InsertMail(db *sql.DB, playerID int64, mailType int32, title, content string, attachItemID int32, attachCount int64) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO t_mail (player_id, mail_type, title, content, attach_item_id, attach_count) VALUES (?, ?, ?, ?, ?, ?)`,
		playerID, mailType, title, content, attachItemID, attachCount,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ListMail 列出玩家全部邮件（新到旧）。
func ListMail(db *sql.DB, playerID int64) ([]Mail, error) {
	rows, err := db.Query(
		`SELECT id, player_id, mail_type, title, content, attach_item_id, attach_count, is_read, is_claimed
		 FROM t_mail WHERE player_id = ? ORDER BY id DESC`, playerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Mail
	for rows.Next() {
		var m Mail
		var isRead, isClaimed int
		if err := rows.Scan(&m.ID, &m.PlayerID, &m.MailType, &m.Title, &m.Content, &m.AttachItemID, &m.AttachCount, &isRead, &isClaimed); err != nil {
			return nil, err
		}
		m.IsRead = isRead == 1
		m.IsClaimed = isClaimed == 1
		out = append(out, m)
	}
	return out, rows.Err()
}

// GetMail 取单封邮件。
func GetMail(db *sql.DB, mailID int64) (*Mail, error) {
	var m Mail
	var isRead, isClaimed int
	err := db.QueryRow(
		`SELECT id, player_id, mail_type, title, content, attach_item_id, attach_count, is_read, is_claimed
		 FROM t_mail WHERE id = ?`, mailID,
	).Scan(&m.ID, &m.PlayerID, &m.MailType, &m.Title, &m.Content, &m.AttachItemID, &m.AttachCount, &isRead, &isClaimed)
	if err != nil {
		return nil, err
	}
	m.IsRead = isRead == 1
	m.IsClaimed = isClaimed == 1
	return &m, nil
}

// MarkRead 标记已读。
func MarkRead(db *sql.DB, mailID int64) error {
	_, err := db.Exec(`UPDATE t_mail SET is_read = 1 WHERE id = ?`, mailID)
	return err
}

// ClaimMail 领取附件：标记已领并返回附件；已领则返回 ErrMailClaimed。
func ClaimMail(db *sql.DB, mailID int64) (itemID int32, count int64, err error) {
	tx, err := db.Begin()
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback()

	var isClaimed int
	if err := tx.QueryRow(`SELECT is_claimed, attach_item_id, attach_count FROM t_mail WHERE id = ?`, mailID).
		Scan(&isClaimed, &itemID, &count); err != nil {
		return 0, 0, err
	}
	if isClaimed == 1 {
		return 0, 0, ErrMailClaimed
	}
	if _, err := tx.Exec(`UPDATE t_mail SET is_claimed = 1, is_read = 1 WHERE id = ?`, mailID); err != nil {
		return 0, 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, 0, err
	}
	return itemID, count, nil
}
