import crypto from 'crypto';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { readFile } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

const hash = plainText => crypto.createHash('sha384').update(plainText, 'utf8').digest('base64');

const paramRegex = /(@[^,;\s:()]+)/g,
	jsoKey = key => key.replace(/^@|!$/g, '');

const query = (pool, sqlText, jso) => {
	if (jso.key) jso.key = hash(jso.key);
	if (jso.token) jso.key = hash(jso.token);

	const paramOrderMap = Object.fromEntries(
			Object.keys(
				[...sqlText.matchAll(paramRegex)]
					.map(match => match[0])
					.reduce((prev, next) => Object.assign(prev, { [next]: true }), {})
			).map((param, idx) => [param, idx])
		),
		paramsInOrder = Object.keys(paramOrderMap),
		paramArray = paramsInOrder.map(key => jso[jsoKey(key)] ?? null),
		missingParams = paramsInOrder
			.filter(param => param.endsWith('!') && jso[jsoKey(param)] === undefined)
			.map(jsoKey),
		parameterizedSql = sqlText.replace(paramRegex, (match, param) => '$' + (paramOrderMap[param] + 1));

	if (missingParams.length)
		return Promise.reject('Missing required parameters: ' + missingParams.join(', '));

	return pool.connect().then(client =>
		client
			.query(parameterizedSql, paramArray)
			.then(({ rows }) => rows)
			.catch(err => {
				console.error(err);
				return Promise.reject(err);
			})
			.finally(() => client.release())
	);
}; // query

const queryText = (queryCache, path, fname) =>
	Promise.resolve()
		.then(() => queryCache[fname] || readFile(`${__dirname}/${path}/${fname}.sql`, 'utf-8'))
		.then(text => (queryCache[fname] = text));

export default ({ connectionInfo, path }) => {
	const pool = new pg.Pool(connectionInfo);

	const queryCache = {};

	return (fname, jso) => queryText(queryCache, path, fname).then(text => query(pool, text, jso));
}; // exports
