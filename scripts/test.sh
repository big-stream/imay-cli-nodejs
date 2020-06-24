#!/bin/bash
script=`readlink -e $0`
cd ${script%/*}

echo "テスト開始:"
echo 引数: -VvvcN 'アリス' - x --col -d -- y z

tmp=$(mktemp)
{
  echo a >> $tmp
  sleep 1
  echo b >> $tmp
  sleep 1
  echo c >> $tmp
} &

tail -f --pid=$! $tmp | ../bin/mycommand-simple.js -VvvcN 'アリス' - x --col -d -- y z

[[ $? = 0 ]] || exit 1

echo "テスト完了:"

# {
#   version: [ true ],
#   verbose: [ true, true ],
#   '引数省略': [ '--color' ],
#   color: [ true ],
#   name: [ 'アリス' ],
#   '標準入力希望': [ true ],
#   'オペランド': [ 'x', 'y', 'z' ],
#   '曖昧': [ [ '--col', '--color-red', '--color' ] ],
#   color_red: [ true ],
#   debug: [ true ],
#   'オペランド希望': true,
#   '未指定': [ '--number', '--all', '--help', '--type' ]
# }
