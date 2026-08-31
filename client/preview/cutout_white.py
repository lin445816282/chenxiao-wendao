#!/usr/bin/env python3
"""白底图标去背景：scipy label 去除连通白色背景 + distance_transform de-fringe。"""
import os
import numpy as np
from PIL import Image
from scipy.ndimage import label, distance_transform_edt

def cutout(src, dst, threshold=235):
    im = Image.open(src).convert('RGBA')
    a = np.array(im).astype(np.int32)
    rgb = a[:, :, :3]
    alpha = a[:, :, 3].copy()
    # 白色背景像素
    white = (rgb.max(axis=2) >= threshold) & (rgb.min(axis=2) >= threshold - 30)
    # 标记与边缘连通的白色区域为背景
    lbl, n = label(white)
    edge = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    edge.discard(0)
    bg = np.isin(lbl, list(edge))
    alpha[bg] = 0
    # de-fringe：半透明边缘染最近不透明主体色
    fg = alpha > 200
    if fg.sum() > 50:
        _, idx = distance_transform_edt(~fg, return_indices=True)
        near_rgb = rgb[idx[0], idx[1]]
        edge_mask = (alpha > 0) & (alpha < 200)
        rgb[edge_mask] = near_rgb[edge_mask]
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(dst)
    opaque = (alpha > 200).mean() * 100
    print(f'{os.path.basename(src)} -> {os.path.basename(dst)}: 不透明占比 {opaque:.1f}%')

if __name__ == '__main__':
    import sys
    src, dst = sys.argv[1], sys.argv[2]
    cutout(src, dst, int(sys.argv[3]) if len(sys.argv) > 3 else 235)
