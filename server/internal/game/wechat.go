package game

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// WeChatLogin 微信登录配置（从环境变量 WX_APP_ID / WX_APP_SECRET 读取）。
type WeChatLogin struct {
	AppID     string
	AppSecret string
}

// Enabled 是否已配置微信登录参数。
func (w *WeChatLogin) Enabled() bool {
	return w != nil && w.AppID != "" && w.AppSecret != ""
}

// Code2Session 用 wx.login 返回的 code 换取 openid 与 session_key。
// 参考：https://developers.weixin.qq.com/minigame/dev/guide/open-ability/login.html
func (w *WeChatLogin) Code2Session(code string) (openid, sessionKey string, err error) {
	u := "https://api.weixin.qq.com/sns/jscode2session?" + url.Values{
		"appid":      {w.AppID},
		"secret":     {w.AppSecret},
		"js_code":    {code},
		"grant_type": {"authorization_code"},
	}.Encode()

	resp, err := http.Get(u)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var r struct {
		OpenID     string `json:"openid"`
		SessionKey string `json:"session_key"`
		ErrCode    int    `json:"errcode"`
		ErrMsg     string `json:"errmsg"`
	}
	if err := json.Unmarshal(body, &r); err != nil {
		return "", "", err
	}
	if r.ErrCode != 0 {
		return "", "", fmt.Errorf("code2session 失败: %d %s", r.ErrCode, r.ErrMsg)
	}
	return r.OpenID, r.SessionKey, nil
}
