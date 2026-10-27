#!/usr/bin/env bash
# 把 baseball/index.html（claude.ai 预览用的页面片段）包装成完整网页，输出到 _site/
set -euo pipefail
out="${1:-_site}"
mkdir -p "$out/baseball"
{
  printf '%s' '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  # 添加到主屏幕：图标、全屏、状态栏颜色
  printf '%s' '<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/icon-180.png"><meta name="theme-color" content="#0a1d3f">'
  printf '%s' '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="本垒"><meta name="apple-mobile-web-app-status-bar-style" content="black">'
  printf '%s' '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
  cat baseball/index.html
  printf '%s\n' '</body></html>'
} > "$out/baseball/index.html"
cp -r baseball/icons baseball/manifest.webmanifest baseball/sw.js "$out/baseball/"
printf '%s\n' '<!doctype html><meta charset="utf-8"><title>本垒棒球</title><meta http-equiv="refresh" content="0; url=baseball/"><a href="baseball/">打开本垒棒球</a>' > "$out/index.html"
