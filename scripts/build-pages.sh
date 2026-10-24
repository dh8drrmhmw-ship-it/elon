#!/usr/bin/env bash
# 把 baseball/index.html（claude.ai 预览用的页面片段）包装成完整网页，输出到 _site/
set -euo pipefail
out="${1:-_site}"
mkdir -p "$out/baseball"
{
  printf '%s' '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  printf '%s' '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
  cat baseball/index.html
  printf '%s\n' '</body></html>'
} > "$out/baseball/index.html"
printf '%s\n' '<!doctype html><meta charset="utf-8"><title>本垒棒球</title><meta http-equiv="refresh" content="0; url=baseball/"><a href="baseball/">打开本垒棒球</a>' > "$out/index.html"
