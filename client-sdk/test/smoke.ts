// 冒烟测试：用 SDK 连接真实服务器，走通登录/挂机/战斗/排行榜。
import { loadProto } from '../src/codec';
import { GameClient } from '../src/client';
import { GameApi } from '../src/api';

const SERVER = process.env.SERVER_URL || 'ws://127.0.0.1:8080/ws';
const PROTO_FILES = [
  'proto/common.proto', 'proto/login.proto', 'proto/offline.proto',
  'proto/dungeon.proto', 'proto/equip.proto', 'proto/pet.proto',
  'proto/bag.proto', 'proto/mail.proto', 'proto/rank.proto', 'proto/ad.proto',
];

async function main() {
  await loadProto(PROTO_FILES);
  const client = new GameClient();
  await client.connect(SERVER);
  const api = new GameApi(client);
  console.log('✅ 已连接 ' + SERVER);

  const login = await api.login();
  console.log('登录: hasRole=' + login.hasRole + (login.role ? ' nickname=' + login.role.nickname + ' exp=' + login.role.exp + ' copper=' + login.role.copper : ''));

  const off = await api.offlineRewardQuery();
  console.log('离线收益: 秒=' + off.offlineSeconds + ' 奖励=' + JSON.stringify(off.rewards));

  const battle = await api.startStage(1001);
  console.log('战斗(1001): 胜=' + battle.win + ' 星=' + battle.star + ' 回合=' + battle.rounds.length +
    ' 装备掉落=' + battle.equips.length + ' 材料=' + battle.rewards.length);

  const rank = await api.rankQuery();
  console.log('排行榜: 条目=' + rank.entries.length + (rank.myRank ? ' 我的名次=#' + rank.myRank.rankNo + ' 战力=' + rank.myRank.score : ''));

  client.close();
  console.log('✅ 冒烟测试全部通过');
}

main().catch((e) => { console.error('❌ 测试失败:', e); process.exit(1); });
