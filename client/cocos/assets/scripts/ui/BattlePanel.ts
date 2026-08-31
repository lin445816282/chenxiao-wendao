import { _decorator, Component, Label } from 'cc';
import { NetManager } from '../core/NetManager';
const { ccclass, property } = _decorator;

// 秘境战斗面板：发起战斗，展示服务端结算结果。
@ccclass('BattlePanel')
export class BattlePanel extends Component {
  @property(Label) resultLabel: Label | null = null;

  async onStartBattle() {
    const api = NetManager.instance?.api;
    if (!api) return;
    const battle = await api.startStage(1001); // 尘息小径
    this.resultLabel!.string =
      (battle.win ? '胜利' : '失败') +
      ' 星级=' + battle.star +
      ' 回合=' + battle.rounds.length +
      ' 装备掉落=' + battle.equips.length +
      ' 材料=' + battle.rewards.length;
  }
}
