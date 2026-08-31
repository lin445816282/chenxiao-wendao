import { _decorator, Component, Label } from 'cc';
import { NetManager } from '../core/NetManager';
const { ccclass, property } = _decorator;

// 排行榜面板：查询战力榜。
@ccclass('RankPanel')
export class RankPanel extends Component {
  @property(Label) listLabel: Label | null = null;

  async onRefresh() {
    const api = NetManager.instance?.api;
    if (!api) return;
    const rank = await api.rankQuery();
    const lines = rank.entries.map((e) => '#' + e.rankNo + ' ' + e.nickname + ' 战力' + e.score);
    if (rank.myRank) lines.push('我的名次：#' + rank.myRank.rankNo);
    this.listLabel!.string = lines.join('\n');
  }
}
