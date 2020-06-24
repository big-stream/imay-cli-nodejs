'use strict'
module.exports = (options) => {
  const defaults = {
    引数あり: [],
    引数なし: [['-d', '--debug'], ['-h', '--help'], ['-v', '--verbose'], ['-V', '--version', '--バージョン'],],
    引数省略可: [],
    排他的: [['--help', '--version',],]
  }
  const {引数あり, 引数なし, 引数省略可, 排他的} = getConf(options, defaults)
  const 予約語 = ['オペランド希望', '標準入力希望', 'オペランド', '未指定', '引数必須', '引数省略', '不明', '曖昧', '排他的']

  検証と変換(引数あり, 引数なし, 引数省略可)
  function 検証と変換(...arr) {
    arr.forEach(リスト => {
      const msg = 'オプション解析エラー: 配列: ' + JSON.stringify(リスト)
      if (!Array.isArray(リスト)) throw msg
      リスト.forEach((e, i) => {
        if (!Array.isArray(e) && typeof e !== 'string') throw msg
        // Arrayへ変換
        if (typeof e === 'string') リスト[i] = [e]
        リスト[i].forEach(str => {
          if (typeof str !== 'string') throw msg
          if (予約語.includes(str.replace(/-/g, '_').replace(/^_+/, ''))) throw `オプション解析エラー: 予約語: ${str}`
        })
      })
    })
  }
  const 全リスト = 引数あり.concat(引数なし, 引数省略可)
  排他的.forEach(e => {
    if (!Array.isArray(e)) throw 'オプション解析エラー: 配列: ' + JSON.stringify(排他的)
    e.forEach(str => {
      if (!最長オプション名(全リスト, str)) throw `オプション解析エラー: 排他的リストにオプション定義にないもの: ${str}`
    })
  })

  // 連綿オプション: 短縮形(-aなど)を-abcのように複数連ねたもの
  const 前半 = get連綿str(引数なし, 引数省略可)
  const 後半 = get連綿str(引数あり)
  const 連綿re = new RegExp('^-([' + 前半 + ']{2,}|[' + 前半 + ']+[' + 後半 + '])$')
  function get連綿str(...arr) {
    const 一文字形re = /^-[^- ]$/
    let str = ''
    arr.forEach(リスト => {
      リスト.forEach(e => e.forEach(e => {if (一文字形re.test(e)) str += e.slice(1)}))
    })
    return str
  }

  //++++++++++++++++++++++++++++++++++++++++++++++

  // オプションやその引数を格納していく
  const opt = {}
  function 格納(key, value) {
    if (!opt[key]) opt[key] = []
    opt[key].push(value)
  }
  const 引数 = process.argv.slice(2) // 2以降が実際のコマンド引数

  let 飛ばす = false
  引数.forEach((e, i) => {

    // オプションに付けた引数の場合
    if (飛ばす) return 飛ばす = false

    // オペランド: 「--」以降すべて
    if (e === '--' && !opt.オペランド希望) return opt.オペランド希望 = true
    if (opt.オペランド希望) return 格納('オペランド', e)

    // 標準入力希望: 「-」
    if (e === '-') return 格納('標準入力希望', true)

    // 連綿
    if (連綿re.test(e)) { // 引数ありは連綿末尾保証
      e.slice(1).split('').forEach((c, 連綿インデックス) => {
        const ハイフン付き = '-' + c
        // 引数なし
        if (オプションなら格納(ハイフン付き)) return // 次の連綿へ
        // 引数あり(連綿末尾保証)
        const 引数ありか = オプションなら格納(ハイフン付き, i)
        if (引数ありか === true) return 飛ばす = true // 正しく格納
        if (引数ありか === null) return // 引数ありなのに無い 飛ばさない
        // 引数省略可
        if (e.length === (連綿インデックス + 2) && !(引数[i + 1] === undefined || 引数[i + 1].startsWith('-'))) {
          // 連綿の末尾(-abcのc)かつ省略せず
          オプションなら格納(ハイフン付き, i, true)
          飛ばす = true
        } else { // 省略
          オプションなら格納(ハイフン付き, undefined, true)
        }
      })
      return
    }

    // 曖昧オプションなら、先にマッチしたもので確定(引数の有無等では判定しない)
    const 曖昧か = 曖昧オプション(e)
    if (曖昧か) e = 曖昧か
    // 以降、曖昧なしとして進む

    // 引数あり
    const 引数ありか = オプションなら格納(e, i)
    if (引数ありか === true) return 飛ばす = true // 正しく格納
    if (引数ありか === null) return // 引数ありなのに無い 飛ばさない

    // 引数なし
    if (オプションなら格納(e)) return

    // 引数省略可: 次の引数が-から始まれば省略とみなす
    if (引数[i + 1] === undefined || 引数[i + 1].startsWith('-')) { // 末尾か次がオプション
      if (オプションなら格納(e, undefined, true)) return
    } else { // 省略しなかった場合
      if (オプションなら格納(e, i, true)) return 飛ばす = true
    }

    // 不明なオプション
    if (e.startsWith('-')) return 格納('不明', e)

    // オプションでもその引数でもないもの(オペランド)
    格納('オペランド', e)
  })

  // 排他的オプション
  排他的.forEach(e => {
    const props = []
    e.forEach(str => {
      const name = 最長オプション名(全リスト, str)
      const prop = name.replace(/-/g, '_').replace(/^_+/, '')
       // 使用済み && 同じオプションの複数回使用は排他的扱いしない
      if (opt[prop] && !props.includes(name)) props.push(name)
    })
    if (props.length >= 2) 格納('排他的', props) // 使用済みが複数
  })

  // 未指定オプション
  全リスト.forEach(オプション => {
    let longer = '' // 最も長いもの、同数なら先のもの優先
    オプション.forEach(e => {if (longer.length < e.length) longer = e})
    const prop = longer.replace(/-/g, '_').replace(/^_+/, '')
    if (!opt[prop]) 格納('未指定', longer)
  })

  return opt

  //++++++++++++++++++++++++++++++++++++++++++++++

  function オプションなら格納(e, i, 省略可能か) {
    let name
    if (省略可能か) {
      name = 最長オプション名(引数省略可, e)
    } else if (i === undefined) { // 引数なし
      name = 最長オプション名(引数なし, e)
    } else { // 引数あり
      name = 最長オプション名(引数あり, e)
    }
    if (!name) return undefined // オプションでない 格納なし

    const prop = name.replace(/-/g, '_').replace(/^_+/, '')
    if (i === undefined && !省略可能か) { // 引数なし todo 省略可能で末尾含む
      格納(prop, true)
    } else if (省略可能か) {
      if (i === undefined) { // 省略
        格納('引数省略', name)
        格納(prop, true)
      } else { // 省略せず
        格納(prop, 引数[i + 1])
      }
    } else { // 引数あり: 次の引数が-から始まるものでも引数とみなす
      if (引数[i + 1] === undefined) { // 末尾オプション
        格納('引数必須', name)
        格納(prop, undefined)
        return null // 格納だけど: 引数ありなのに無い
      } else {
        格納(prop, 引数[i + 1])
      }
    }
    return true // 正しく格納
  }

  function 最長オプション名(リスト, str) {
    let longer = ''
    リスト.forEach(オプション => {
      if (longer) return // 一つあれば他のオプションは無視
      let hit
      オプション.forEach(e => {
        if (longer.length < e.length) longer = e // 最も長いもの、同数なら先のもの優先
        if (e === str) hit = true
      })
      if (!hit) longer = ''
    })
    return longer
  }

  function 曖昧オプション(str) {
    if (!str.startsWith('--')) return
    const 前半一致 = []
    let 完全一致 = false
    全リスト.forEach(オプション => {
      let hit = false
      オプション.forEach(e => {
        if (hit) return // 同じオプションでは一つだけ登録
        if (e !== str && e.startsWith(str)) {
          前半一致.push(e)
          hit = true
        }
        if (e === str) 完全一致 = true
      })
    })
    if (完全一致) return str // --abと--ab-cの定義で、--abは完全一致
    if (前半一致.length === 0) return // 一致なし
    if (前半一致.length > 1) 格納('曖昧', [str].concat(前半一致)) // 曖昧
    return 最長オプション名(全リスト, 前半一致[0]) // 曖昧でない or 先にマッチしたもの優先
  }
}

function getConf(options = {}, defaults = {}) {
  const conf = {}
  for (let [prop, val] of Object.entries(defaults)) {
    conf[prop] = options[prop] ? options[prop] : val
  }
  return conf
}
