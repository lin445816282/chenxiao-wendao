// Package settle 提供服务端权威的离线/挂机收益结算。
// 客户端只展示预览与到账结果，不参与数值计算，杜绝本地篡改。
package settle

import "chenxiao/internal/config"

// Reward 挂机产出。
type Reward struct {
	Exp    int64
	Copper int64
}

// CapSeconds 离线时长封顶（负数归零，超出 MaxOfflineSeconds 截断）。
func CapSeconds(hang config.Hang, seconds int64) int64 {
	if seconds < 0 {
		return 0
	}
	if hang.MaxOfflineSeconds > 0 && seconds > hang.MaxOfflineSeconds {
		return hang.MaxOfflineSeconds
	}
	return seconds
}

// CalcOffline 计算离线收益。
// 公式：seconds(已封顶) × 每秒产出 × 关卡系数(stageCoeff) × 广告倍率(adMult)。
func CalcOffline(hang config.Hang, seconds int64, stageCoeff float64, adMult int32) Reward {
	if seconds < 0 {
		seconds = 0
	}
	if stageCoeff <= 0 {
		stageCoeff = 1
	}
	if adMult <= 0 {
		adMult = 1
	}
	return Reward{
		Exp:    int64(float64(hang.ExpPerSecond) * float64(seconds) * stageCoeff * float64(adMult)),
		Copper: int64(float64(hang.CopperPerSecond) * float64(seconds) * stageCoeff * float64(adMult)),
	}
}
