import { _decorator, Component, Label, EditBox } from 'cc';
import { NetManager } from '../core/NetManager';
const { ccclass, property } = _decorator;

// 登录/建号面板：连接后登录，未建号则创建角色。
@ccclass('LoginPanel')
export class LoginPanel extends Component {
  @property(Label) statusLabel: Label | null = null;
  @property(EditBox) nameInput: EditBox | null = null;

  async onLogin() {
    const api = NetManager.instance?.api;
    if (!api) { this.statusLabel!.string = '未连接服务器'; return; }
    const login = await api.login();
    this.statusLabel!.string = login.hasRole
      ? '欢迎回来，' + (login.role?.nickname ?? '')
      : '未建号，请输入名字创建角色';
  }

  async onCreateRole() {
    const api = NetManager.instance?.api;
    if (!api) return;
    const nickname = this.nameInput?.string || '无名修士';
    await api.createRole(nickname);
    this.statusLabel!.string = '创建成功：' + nickname;
  }
}
