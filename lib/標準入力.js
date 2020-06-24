'use strict'
module.exports = (コールバック) => {
  return new Promise((resolve, reject) => {
    const result = {status: true, data: ''}
    if (process.stdin.isTTY) { // 標準入力がない
      result.status = false
      resolve(result)
    } else { // 標準入力あり
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', data => {
        if (typeof コールバック === 'function') コールバック(data)
        result.data += data
      }).on('end', () => {
        if (!result.data) result.status = null // 空文字: echo -n ''
        resolve(result)
      })
    }
  })
}
