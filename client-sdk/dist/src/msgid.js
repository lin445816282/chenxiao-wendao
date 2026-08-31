"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgId = void 0;
// 消息 ID 常量（与 server/proto/common.proto 的 MsgId 枚举对齐）
exports.MsgId = {
    // 登录/角色
    C2SLogin: 1000,
    S2CLogin: 1001,
    C2SCreateRole: 1002,
    S2CCreateRole: 1003,
    // 挂机/离线
    C2SOfflineRewardQuery: 2000,
    S2COfflineRewardQuery: 2001,
    C2SOfflineRewardClaim: 2002,
    S2COfflineRewardClaim: 2003,
    // 秘境/战斗
    C2SStartStage: 3000,
    S2CStartStage: 3001,
    C2SSweepStage: 3002,
    S2CSweepStage: 3003,
    // 装备
    C2SEquipList: 4000,
    S2CEquipList: 4001,
    C2SEquipStrengthen: 4004,
    S2CEquipStrengthen: 4005,
    // 灵宠
    C2SPetList: 5000,
    S2CPetList: 5001,
    // 背包
    C2SBagList: 6000,
    S2CBagList: 6001,
    // 邮件
    C2SMailList: 7000,
    S2CMailList: 7001,
    // 排行榜
    C2SRankQuery: 8000,
    S2CRankQuery: 8001,
    // 广告
    C2SAdRequest: 9000,
    S2CAdRequest: 9001,
};
