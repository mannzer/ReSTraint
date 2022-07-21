#! /bin/bash


# expected exports
# PGSQL_USER
# PGSQL_PASS
# PGSQL_HOST
# PGSQL_DB

echo 'Starting Tests'

lsof -i :8000 | grep -Po '\d+' | head -1 | xargs kill &> /dev/null

PORT=8000

DEBUG=1 PORT=$PORT ./server.mjs 2> /dev/null &
PID=$!

sleep 0.5

ok () { echo -ne '\t\x1b[32m✓\x1b[0m'; }
fail () { echo -ne '\t\x1b[31m✗\x1b[0m'; }
test () { ! got=$($1) && ok || fail; [[ ! -z $got ]] && echo " $1: $got" || echo " $1"; }

pathsAreSecuredAgainstDot() { curl -w "%{http_code}" -so /dev/null http://localhost:$PORT/../../../../tests/echo -H "authorization: anon"| grep -v 200; }
test pathsAreSecuredAgainstDot

allowGETWithoutPayload() { curl -w "%{http_code}" -so /dev/null http://localhost:$PORT/tests/echo -H "authorization: anon"| grep -v 200; }
test allowGETWithoutPayload

onlyJSON() { curl -w "%{http_code}" -so /dev/null -X GET http://localhost:$PORT/tests/echo -d "not JSON" -H "authorization: 1" | grep -v 400; }
test onlyJSON

requireAuthorizationHeader() { curl -w "%{http_code}" -so /dev/null -X GET http://localhost:$PORT/tests/echo -d "{}" | grep -v 401; }
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

idsInURLViolence() { curl -w "%{http_code}" -s -X GET "http://localhost:$PORT/tests/1/echo" -d '{"hello":"world"}' -H "authorization: anon" | grep -v '{"testsid":"1","hello":"world","authorization":true}200'; }
test idsInURLViolence

idsInURLClobber() { curl -w "%{http_code}" -s -X GET "http://localhost:$PORT/tests/1/echo?testsid=777" -d '{"hello":"world"}' -H "authorization: anon" | grep -v '{"testsid":"777","hello":"world","authorization":true}200'; }
test idsInURLClobber

pgSqlParametersWork() { curl -w "%{http_code}" -s -X GET "http://localhost:$PORT/tests/cities?search=Be" -H "authorization: anon" | grep -vF '[{"cityid":1,"name":"Belgrade","urbanarea":1035,"metroarea":3223,"urbanpop":1344844,"metropop":1687132},{"cityid":2,"name":"Berlin","urbanarea":892,"metroarea":30370,"urbanpop":4473101,"metropop":6144600}]200'; }
test pgSqlParametersWork

optionalPGSqlParametersWork() { curl -w "%{http_code}" -s -X GET "http://localhost:$PORT/tests/cities/3" -H "authorization: anon" | grep -vF '[{"cityid":3,"name":"Budapest","urbanarea":2538,"metroarea":7626,"urbanpop":2997958,"metropop":3011598}]200'; }
test optionalPGSqlParametersWork

requiredPGSqlParametersNotifyIfMissing() { curl -w "%{http_code}" -s -X POST "http://localhost:$PORT/tests/cities/3" -d '{"name":"moon","urbanarea":0,"metroarea":0,"urbanpop":0}' -H "authorization: anon" | grep -vF '"Missing required parameters: metropop"400'; }
test requiredPGSqlParametersNotifyIfMissing

kill $PID
