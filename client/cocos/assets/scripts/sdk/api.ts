// 高层 API：按业务模块封装请求。
import { GameClient } from './client';
import { MsgId } from './msgid';

export interface RoleBrief {
  playerId: number;
  nickname: string;
  level: number;
  exp: number;
  copper: number;
}

export interface S2CLogin {
  result: { code: number; msg?: string };
  token: string;
  hasRole: boolean;
  role?: RoleBrief;
}

export interface RewardItem {
  itemId: number;
  count: number;
}

export interface BattleAction {
  attackerUid: number;
  targetUid: number;
  skillId: number;
  damage: number;
  heal: number;
  isCrit: boolean;
  isDodge: boolean;
}

export interface BattleRound {
  round: number;
  actions: BattleAction[];
}

export interface S2CStartStage {
  result: { code: number };
  win: boolean;
  star: number;
  rounds: BattleRound[];
  rewards: RewardItem[];
  equips: { equipUid: number; equipId: number; pos: number }[];
}

export interface RankEntry {
  rankNo: number;
  playerId: number;
  nickname: string;
  level: number;
  score: number;
}

export class GameApi {
  constructor(private c: GameClient) {}

  async login(code = ''): Promise<S2CLogin> {
    return this.c.request(MsgId.C2SLogin, 'chenxiao.login.C2SLogin', 'chenxiao.login.S2CLogin', { code }, MsgId.S2CLogin);
  }

  async createRole(nickname: string): Promise<{ result: { code: number }; role?: RoleBrief }> {
    return this.c.request(MsgId.C2SCreateRole, 'chenxiao.login.C2SCreateRole', 'chenxiao.login.S2CCreateRole', { nickname }, MsgId.S2CCreateRole);
  }

  async offlineRewardQuery(): Promise<{ result: { code: number }; offlineSeconds: number; rewards: RewardItem[]; hangMultiplier: number }> {
    return this.c.request(MsgId.C2SOfflineRewardQuery, 'chenxiao.offline.C2SOfflineRewardQuery', 'chenxiao.offline.S2COfflineRewardQuery', {}, MsgId.S2COfflineRewardQuery);
  }

  async offlineRewardClaim(): Promise<{ result: { code: number }; rewards: RewardItem[] }> {
    return this.c.request(MsgId.C2SOfflineRewardClaim, 'chenxiao.offline.C2SOfflineRewardClaim', 'chenxiao.offline.S2COfflineRewardClaim', {}, MsgId.S2COfflineRewardClaim);
  }

  async startStage(stageId: number, stageType = 1): Promise<S2CStartStage> {
    return this.c.request(MsgId.C2SStartStage, 'chenxiao.dungeon.C2SStartStage', 'chenxiao.dungeon.S2CStartStage', { stageId, stageType }, MsgId.S2CStartStage);
  }

  async equipList(): Promise<{ result: { code: number }; equips: { equipUid: number; equipId: number; pos: number; strengthenLevel: number }[] }> {
    return this.c.request(MsgId.C2SEquipList, 'chenxiao.equip.C2SEquipList', 'chenxiao.equip.S2CEquipList', {}, MsgId.S2CEquipList);
  }

  async equipStrengthen(equipUid: number): Promise<{ result: { code: number }; copperCost: number; equip: { equipUid: number; strengthenLevel: number } }> {
    return this.c.request(MsgId.C2SEquipStrengthen, 'chenxiao.equip.C2SEquipStrengthen', 'chenxiao.equip.S2CEquipStrengthen', { equipUid }, MsgId.S2CEquipStrengthen);
  }

  async petList(): Promise<{ result: { code: number }; pets: { petUid: number; petId: number; level: number; star: number }[] }> {
    return this.c.request(MsgId.C2SPetList, 'chenxiao.pet.C2SPetList', 'chenxiao.pet.S2CPetList', {}, MsgId.S2CPetList);
  }

  async rankQuery(rankType = 1, page = 0, pageSize = 10): Promise<{ result: { code: number }; entries: RankEntry[]; myRank?: RankEntry }> {
    return this.c.request(MsgId.C2SRankQuery, 'chenxiao.rank.C2SRankQuery', 'chenxiao.rank.S2CRankQuery', { rankType, page, pageSize }, MsgId.S2CRankQuery);
  }
}
