import { _decorator, Component, Label } from 'cc';
import { NetManager } from '../core/NetManager';
const { ccclass, property } = _decorator;

// 装备面板：列表 + 强化第一件。
@ccclass('EquipPanel')
export class EquipPanel extends Component {
  @property(Label) listLabel: Label | null = null;

  async onRefresh() {
    const api = NetManager.instance?.api;
    if (!api) return;
    const list = await api.equipList();
    this.listLabel!.string = list.equips.length === 0
      ? '暂无装备'
      : list.equips.map((e) => '装备#' + e.equipId + ' 强化+' + e.strengthenLevel).join('\n');
  }

  async onStrengthenFirst() {
    const api = NetManager.instance?.api;
    if (!api) return;
    const list = await api.equipList();
    if (list.equips.length === 0) { this.listLabel!.string = '暂无装备可强化'; return; }
    const r = await api.equipStrengthen(list.equips[0].equipUid);
    this.listLabel!.string = r.result.code === 0
      ? '强化成功，花费铜钱 ' + r.copperCost
      : '强化失败，code=' + r.result.code;
    await this.onRefresh();
  }
}
