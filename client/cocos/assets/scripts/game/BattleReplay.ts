import { S2CStartStage, BattleRound } from '../sdk/api';

// 战斗回放：读服务端下发的回合序列，逐回合取出行动（驱动动画/飘字）。
// 服务端权威结算，客户端只按此序列播放表现，不参与数值计算。
export class BattleReplay {
  private rounds: BattleRound[];
  private index = 0;

  constructor(battle: S2CStartStage) {
    this.rounds = battle.rounds;
  }

  hasNext(): boolean {
    return this.index < this.rounds.length;
  }

  nextRound(): BattleRound | null {
    return this.hasNext() ? this.rounds[this.index++] : null;
  }

  totalRounds(): number {
    return this.rounds.length;
  }
}
