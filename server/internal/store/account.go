package store

import "database/sql"

// GetOrCreateAccount 按微信 openid 取账号，不存在则创建，返回 account_id。
func GetOrCreateAccount(db *sql.DB, openid string) (int64, error) {
	var id int64
	err := db.QueryRow(`SELECT id FROM t_account WHERE openid = ?`, openid).Scan(&id)
	if err == sql.ErrNoRows {
		res, err := db.Exec(`INSERT INTO t_account (openid) VALUES (?)`, openid)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	}
	if err != nil {
		return 0, err
	}
	return id, nil
}
