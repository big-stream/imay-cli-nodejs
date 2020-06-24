# imay-cli-nodejs

- Node.jsでコマンドを作ろう
- オプション引数を解析するnpmパッケージ


***
## コマンドツールの作り方

### パッケージインストール

```bash
mkdir your-command; cd your-command
npm init --yes
npm install big-stream/imay-cli-nodejs#semver:~1.0.1
```

### package.jsonに追加

```json
  "bin": {
    "your-command": "bin/your-command.js"
  },
```

### bin/your-command.jsを作成

```js
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

const {標準入力, オプション解析} = require('imay-cli-nodejs')
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
```

### コマンド化

```bash
npm install --global

# 実行
your-command --name 'アリス' -dvv --type -- x y z
# 標準入力利用したり
echo 'abc' | your-command -VvvcN 'アリス' - x --col -d -- y z
# オプションによってはエラーにする
your-command --help --version
```


***
## オプション解析の仕様

### 3タイプのオプション: 後続の文字列をどう解釈するか

```bash
mycommand --オプション 後続の文字列
```

1. **引数あり**: 後続を`-`から始まるものでも引数とみなし、末尾に使うとエラー扱い
  - `mycommand -a -b` => -bは-aの引数
2. **引数なし**: 後続の`-`から始まらないものはオペランドとみなす
  - `mycommand -a b` => bはオペランド
3. **引数省略可**: 後続が`-`から始まれば省略とみなす
  - `mycommand -a -b` => -bは別途のオプション
  - `mycommand -a b` => bは-aの引数

### 排他的なオプション

- 同時に使えないオプションを指定

### オプション形式

- ロング形式: `--`から始まるもの (予約語あり)
  - `--name`, `--more-long-name`
- 一文字形式: `-`に加えて一文字
  - `-a`, `-あ`

### 短縮形の自動判別: ロング形式を前半3文字以上に短縮したもの

- `--name`を`--n`など
- 曖昧なとき: 先にマッチ優先(引数あり・なし・省略可の順)
  - `--name`と`--num`の定義順のとき、`--n`は`--name`扱い
  - 引数あり`--name`と引数なし`--none`の定義のとき、`--n`は`--name`扱い
  - `曖昧`プロパティに情報格納: エラー扱いも可

### 連綿形の自動判別: 一文字形式を`-`の後に連ねたもの

- `-a`と`-b`と`-c`を`-abc`など
- 引数を付けるものは末尾のみで使える
- `-abc 引数`のとき、-aや-bは引数ありタイプだとエラー扱い

### オペランド

- オプションでもその引数でもないもの
- `--`の指定で以降のすべての引数は`-`から始まるものもオペランドとみなす

### 標準入力を希望

- `-`の指定で標準入力を希望とする


***
## オプション解析後のプロパティ

```js
const オプション = オプション解析({引数あり, 引数なし, 引数省略可, 排他的})
console.log(オプション.プロパティ)

// プロパティを検証してエラーにしたりする
if (オプション.引数必須) process.exit(2)
```

```js
// オプション.プロパティの例
{
  version: [ true ],
  verbose: [ true, true ],
  '引数省略': [ '--color' ],
  color: [ true ],
  name: [ 'アリス' ],
  '標準入力希望': [ true ],
  'オペランド': [ 'x', 'y', 'z' ],
  '曖昧': [ [ '--col', '--color-red', '--color' ] ],
  color_red: [ true ],
  debug: [ true ],
  'オペランド希望': true,
  '未指定': [ '--number', '--all', '--help', '--type' ]
}
```

### プロパティ名

- ロング形式・一文字形式の最長名で、先に定義されたもの
- 前半`-`を削り、途中`-`を`_`に変換
- `--ちょ-very-ばっ` => `オプション.ちょ_very_ばっ`

### プロパティのデータ型: Array型に下記格納

- 引数: string
- 引数なし・引数省略: `true`
- 引数ありを末尾引数にすると: `undefined`

### 予約語プロパティ

- `オペランド希望`: 引数`--` => `true`
- `標準入力希望`: 引数`-` => `true`のArray
- `オペランド`: オプションでもその引数でもないもの => stringのArray
- `未指定`: 定義オプションで未使用のもの => 最長名のArray
- `引数省略`: 引数省略可で省略したもの => 最長名のArray


- `引数必須`: 引数必須なのに未指定のもの => 最長名
- `不明`: 定義にないもの => stringのArray
- `曖昧`: 短縮形に曖昧さがあるもの => 曖昧リストのArray
- `排他的`: 排他的なのに使用したもの => 排他的リストのArray


***
## ライセンス: The Unlicense

- パブリックドメイン
