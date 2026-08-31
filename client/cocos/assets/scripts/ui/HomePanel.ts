import { _decorator, Component, Label } from 'cc';
import { NetManager } from '../core/NetManager';
const { ccclass, property } = _decorator;

// 主界面：离线挂机收益查询与一键领取。
@ccclass('HomePanel')
export class HomePanel extends Component {
  @property(Label) rewardLabel: Label | null = null;

  async onClaimOffline() {
    const api = NetManager.instance?.api;
    if (!api) return;
    const off = await api.offlineRewardQuery();
    const claim = await api.offlineRewardClaim();
    const rewards = claim.rewards
      .map((r) => (r.itemId === 2 ? '修为' : '铜钱') + r.count)
      .join('、');
    this.rewardLabel!.string = '离线 ' + off.offlineSeconds + ' 秒，领取：' + rewards;
  }
}
