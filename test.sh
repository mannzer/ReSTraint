#! /bin/bash

echo 'Starting Tests'

lsof -i :8000 | grep -Po '\d+' | head -1 | xargs kill &> /dev/null

PORT=8000

DEBUG=1 PORT=$PORT ./server.mjs 2> /dev/null &
PID=$!

sleep 0.5

ok () { echo -ne '\t\x1b[32m✓\x1b[0m'; }
fail () { echo -ne '\t\x1b[31m✗\x1b[0m'; }
test () { ! got=$($1) && ok || fail; [[ ! -z $got ]] && echo " $1: $got" || echo " $1"; }

allowGETWithoutPayload() { curl -w "%{http_code}" -so /dev/null http://localhost:$PORT/tests/echo -H "authorization: anon"| grep -v 200; }
test allowGETWithoutPayload

onlyJSON() { curl -w "%{http_code}" -so /dev/null http://localhost:$PORT/tests/echo -d "not JSON" -H "authorization: 1" | grep -v 400; }
test onlyJSON

requireAuthorizationHeader() { curl -w "%{http_code}" -so /dev/null http://localhost:$PORT/echo -d "{}" | grep -v 401; }
test requireAuthorizationHeader

validAuthorizationWorks() { curl -w "%{http_code}" -so /dev/null -X GET http://localhost:$PORT/tests/echo -d "{}" -H "authorization: anon" | grep -v 200; }
test validAuthorizationWorks

invalidAuthorizationFails() { curl -w "%{http_code}" -so /dev/null -X GET http://localhost:$PORT/tests/echo -d "{}" -H "authorization: bob" | grep -v 401; }
test invalidAuthorizationFails

missingIs404() { curl -w "%{http_code}" -so /dev/null -X GET http://localhost:$PORT/tests/missing -d "{}" -H "authorization: anon" | grep -v 404; }
test missingIs404

basicEcho() { curl -w "%{http_code}" -s -X GET http://localhost:$PORT/tests/echo -d '{"hello":"world"}' -H "authorization: anon" | grep -v '{"hello":"world","authorization":true}200'; }
test basicEcho

queryStringEcho() { curl -w "%{http_code}" -s -X GET "http://localhost:$PORT/tests/echo?world=1-1" -d '{"hello":"world"}' -H "authorization: anon" | grep -v '{"world":"1-1","hello":"world","authorization":true}200'; }
test queryStringEcho

kill $PID
