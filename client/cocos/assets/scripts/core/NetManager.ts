import { _decorator, Component } from 'cc';
import { GameClient } from '../sdk/client';
import { GameApi } from '../sdk/api';
const { ccclass } = _decorator;

// 网络管理器：连接服务器 + 持有 GameApi。挂在一个常驻节点上（如 Canvas 下的 NetManager 节点）。
@ccclass('NetManager')
export class NetManager extends Component {
  static instance: NetManager | null = null;
  api: GameApi | null = null;
  private client: GameClient | null = null;

  onLoad() {
    NetManager.instance = this;
  }

  async connect(url: string): Promise<void> {
    this.client = new GameClient();
    await this.client.connect(url);
    this.api = new GameApi(this.client);
    console.log('[NetManager] 已连接 ' + url);
  }
}
