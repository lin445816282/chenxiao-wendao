// gameserver 逻辑服：加载配置、连接存储、承载业务逻辑。
// V1 与 gateway 同进程（由 gateway 内嵌调用），此处为预留入口，后续拆分为独立进程/服务。
package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"chenxiao/internal/app"
)

func main() {
	cfgDir := flag.String("config", "./configs", "配置目录")
	dbPath := flag.String("db", "data/game.db", "SQLite 数据库文件路径")
	flag.Parse()

	a := app.New(*cfgDir, *dbPath)
	log.Printf("gameserver ready: stages=%d equips=%d pets=%d drop_tables=%d",
		len(a.Config.Stages), len(a.Config.Equips), len(a.Config.Pets), len(a.Config.DropTables))

	// 等待退出信号；后续拆分时在此启动对 gateway 的 RPC 服务。
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	<-ch
	log.Println("gameserver shutdown")
}
