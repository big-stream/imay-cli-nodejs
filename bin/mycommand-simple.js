#!/usr/bin/env node

// コマンドオプションの定義: 配列の中の配列 -> 同一オプション
const 引数あり = [
  ['-N', '--name', '--名前'], // 同一オプションの別名をいくつか登録
  ['-n', '--number', `--count`], // 別のオプション
]
const 引数なし = [
  ['-r', '--color-red'],
  '--all', // 別名がないならstringも可
  ['-d', '--debug'], ['-h', '--help'], ['-v', '--verbose'], ['-V', '--version'],
]
const 引数省略可 = [
  ['-c', '--color'],
  ['-t', '--type', '--タイプ', '--種類', '-種'],
]
const 排他的 = [
  ['--help', '--version'], // <= 同時に使えないオプションの組み合わせ
  ['--name', '--number', '--all'], // 別の組み合わせ
]

const {標準入力, オプション解析} = require('../lib/')
const オプション = オプション解析({引数あり, 引数なし, 引数省略可, 排他的})
console.log('検証前オプション:')
console.log(オプション)

// 検証してエラーにしたり
if (オプション.排他的) {
  console.error(`エラー: 排他的: ${オプション.排他的}`)
  process.exit(1)
}

標準入力(入力の都度コールバック).then(標準入力 => {
  if (標準入力.status) process.stdout.write(`標準入力まとめ:\n${標準入力.data}`)
}).catch(e => console.error(e))

function 入力の都度コールバック(data) {
  if (オプション.verbose && オプション.verbose.length > 1) {
    process.stdout.write(`標準入力ストリーム: ${data}`)
  }
}
