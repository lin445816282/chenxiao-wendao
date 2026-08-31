#!/usr/bin/env python3
"""精灵图边缘去白（de-fringe）：把半透明边缘像素的 RGB 染成最近不透明主体颜色，消除白底 halo。"""
import os
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

TARGETS = [
    'monster_basic.png', 'monster_elite.png',
    'pet_linghu.png', 'pet_xuanwu.png',
    'boss.png', 'hero_male.png', 'hero_female.png',
]

def defringe(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im).astype(np.int32)
    alpha = a[:, :, 3]
    rgb = a[:, :, :3]
    fg = alpha > 250  # 完全不透明主体
    if fg.sum() < 50:
        print(f'  {os.path.basename(path)}: 无足够不透明像素，跳过')
        return
    # 每个像素到最近不透明主体的索引
    _, idx = distance_transform_edt(~fg, return_indices=True)
    near_rgb = rgb[idx[0], idx[1]]
    mask = alpha < 250  # 需要 de-fringe 的边缘像素
    out = a.copy()
    out[:, :, :3] = np.where(mask[..., None], near_rgb, rgb)
    out[:, :, :3] = np.clip(out[:, :, :3], 0, 255)
    Image.fromarray(out.astype(np.uint8), 'RGBA').save(path)
    # 报告
    semi = mask.sum()
    print(f'  {os.path.basename(path)}: 处理 {semi} 个边缘像素')

def main():
    dirs = sys.argv[1:] or ['images']
    for d in dirs:
        if not os.path.isdir(d):
            print(f'目录不存在: {d}')
            continue
        print(f'处理目录 {d}:')
        for t in TARGETS:
            p = os.path.join(d, t)
            if os.path.exists(p):
                defringe(p)

if __name__ == '__main__':
    main()
