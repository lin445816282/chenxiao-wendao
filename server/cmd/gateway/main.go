// gateway 网关：WebSocket 接入 + 鉴权 + 消息路由（V1 单体，逻辑层内嵌同进程）。
package main

import (
	"flag"
	"log"
	"net/http"

	"chenxiao/internal/app"
	"chenxiao/internal/net"
)

func main() {
	cfgDir := flag.String("config", "./configs", "配置目录")
	addr := flag.String("addr", ":8080", "监听地址")
	dbPath := flag.String("db", "data/game.db", "SQLite 数据库文件路径（开发用；生产换 MySQL）")
	smokeDir := flag.String("smoke", "", "冒烟测试静态文件目录（可选，如 ../client/wx-minigame-smoke）")
	flag.Parse()

	a := app.New(*cfgDir, *dbPath)

	ws := net.NewWSServer(
		func(conn *net.Connection, msgID uint32, body []byte) { a.Dispatch(conn, msgID, body) },
		func(conn *net.Connection) {
			// TODO(M2): 清理玩家在线态/会话缓存
			if conn.PlayerID != 0 {
				log.Printf("连接关闭 player_id=%d", conn.PlayerID)
			}
		},
	)

	http.Handle("/ws", ws)
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	if *smokeDir != "" {
		http.Handle("/smoke/", http.StripPrefix("/smoke/", http.FileServer(http.Dir(*smokeDir))))
		log.Printf("冒烟测试文件服务: /smoke/ -> %s", *smokeDir)
	}
	log.Printf("gateway listening on %s (ws=/ws health=/healthz)", *addr)
	log.Fatal(http.ListenAndServe(*addr, nil))
}
