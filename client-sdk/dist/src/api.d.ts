import { GameClient } from './client';
export interface RoleBrief {
    playerId: number;
    nickname: string;
    level: number;
    exp: number;
    copper: number;
}
export interface S2CLogin {
    result: {
        code: number;
        msg?: string;
    };
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
    result: {
        code: number;
    };
    win: boolean;
    star: number;
    rounds: BattleRound[];
    rewards: RewardItem[];
    equips: {
        equipUid: number;
        equipId: number;
        pos: number;
    }[];
}
export interface RankEntry {
    rankNo: number;
    playerId: number;
    nickname: string;
    level: number;
    score: number;
}
export declare class GameApi {
    private c;
    constructor(c: GameClient);
    login(code?: string): Promise<S2CLogin>;
    createRole(nickname: string): Promise<{
        result: {
            code: number;
        };
        role?: RoleBrief;
    }>;
    offlineRewardQuery(): Promise<{
        result: {
            code: number;
        };
        offlineSeconds: number;
        rewards: RewardItem[];
        hangMultiplier: number;
    }>;
    offlineRewardClaim(): Promise<{
        result: {
            code: number;
        };
        rewards: RewardItem[];
    }>;
    startStage(stageId: number, stageType?: number): Promise<S2CStartStage>;
    equipList(): Promise<{
        result: {
            code: number;
        };
        equips: {
            equipUid: number;
            equipId: number;
            pos: number;
            strengthenLevel: number;
        }[];
    }>;
    equipStrengthen(equipUid: number): Promise<{
        result: {
            code: number;
        };
        copperCost: number;
        equip: {
            equipUid: number;
            strengthenLevel: number;
        };
    }>;
    petList(): Promise<{
        result: {
            code: number;
        };
        pets: {
            petUid: number;
            petId: number;
            level: number;
            star: number;
        }[];
    }>;
    rankQuery(rankType?: number, page?: number, pageSize?: number): Promise<{
        result: {
            code: number;
        };
        entries: RankEntry[];
        myRank?: RankEntry;
    }>;
}
