import { _decorator, Component, Label } from 'cc';
import { NetManager } from '../core/NetManager';
const { ccclass, property } = _decorator;

// 灵宠面板：列表。
@ccclass('PetPanel')
export class PetPanel extends Component {
  @property(Label) listLabel: Label | null = null;

  async onRefresh() {
    const api = NetManager.instance?.api;
    if (!api) return;
    const list = await api.petList();
    this.listLabel!.string = list.pets.length === 0
      ? '暂无灵宠'
      : list.pets.map((p) => '灵宠#' + p.petId + ' 等级' + p.level + ' 星' + p.star).join('\n');
  }
}
