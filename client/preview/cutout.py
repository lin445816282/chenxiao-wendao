#!/usr/bin/env python3
"""用 GrabCut 从深色背景灰度图中抠出主体，生成透明 PNG。"""
import sys
import numpy as np
import cv2
from PIL import Image

def cutout(src, dst, iterations=6):
    img = cv2.imread(src)
    if img is None:
        print(f'无法读取 {src}')
        return
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    # 主体矩形：中央偏下（站立角色），留边缘作背景
    rect = (int(w * 0.08), int(h * 0.03), int(w * 0.84), int(h * 0.94))
    cv2.grabCut(img, mask, rect, bgd, fgd, iterations, cv2.GC_INIT_WITH_RECT)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype('uint8')
    # 形态学清理：闭合补洞 + 开运算去噪
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = fg
    Image.fromarray(rgba).save(dst)
    ratio = (fg > 0).mean() * 100
    print(f'{src} -> {dst}: 前景占比 {ratio:.1f}%')

if __name__ == '__main__':
    cutout(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 6)
