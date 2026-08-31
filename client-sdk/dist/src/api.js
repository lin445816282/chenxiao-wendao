"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameApi = void 0;
const msgid_1 = require("./msgid");
class GameApi {
    c;
    constructor(c) {
        this.c = c;
    }
    async login(code = '') {
        return this.c.request(msgid_1.MsgId.C2SLogin, 'chenxiao.login.C2SLogin', 'chenxiao.login.S2CLogin', { code }, msgid_1.MsgId.S2CLogin);
    }
    async createRole(nickname) {
        return this.c.request(msgid_1.MsgId.C2SCreateRole, 'chenxiao.login.C2SCreateRole', 'chenxiao.login.S2CCreateRole', { nickname }, msgid_1.MsgId.S2CCreateRole);
    }
    async offlineRewardQuery() {
        return this.c.request(msgid_1.MsgId.C2SOfflineRewardQuery, 'chenxiao.offline.C2SOfflineRewardQuery', 'chenxiao.offline.S2COfflineRewardQuery', {}, msgid_1.MsgId.S2COfflineRewardQuery);
    }
    async offlineRewardClaim() {
        return this.c.request(msgid_1.MsgId.C2SOfflineRewardClaim, 'chenxiao.offline.C2SOfflineRewardClaim', 'chenxiao.offline.S2COfflineRewardClaim', {}, msgid_1.MsgId.S2COfflineRewardClaim);
    }
    async startStage(stageId, stageType = 1) {
        return this.c.request(msgid_1.MsgId.C2SStartStage, 'chenxiao.dungeon.C2SStartStage', 'chenxiao.dungeon.S2CStartStage', { stageId, stageType }, msgid_1.MsgId.S2CStartStage);
    }
    async equipList() {
        return this.c.request(msgid_1.MsgId.C2SEquipList, 'chenxiao.equip.C2SEquipList', 'chenxiao.equip.S2CEquipList', {}, msgid_1.MsgId.S2CEquipList);
    }
    async equipStrengthen(equipUid) {
        return this.c.request(msgid_1.MsgId.C2SEquipStrengthen, 'chenxiao.equip.C2SEquipStrengthen', 'chenxiao.equip.S2CEquipStrengthen', { equipUid }, msgid_1.MsgId.S2CEquipStrengthen);
    }
    async petList() {
        return this.c.request(msgid_1.MsgId.C2SPetList, 'chenxiao.pet.C2SPetList', 'chenxiao.pet.S2CPetList', {}, msgid_1.MsgId.S2CPetList);
    }
    async rankQuery(rankType = 1, page = 0, pageSize = 10) {
        return this.c.request(msgid_1.MsgId.C2SRankQuery, 'chenxiao.rank.C2SRankQuery', 'chenxiao.rank.S2CRankQuery', { rankType, page, pageSize }, msgid_1.MsgId.S2CRankQuery);
    }
}
exports.GameApi = GameApi;
