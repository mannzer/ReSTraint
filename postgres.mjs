import crypto from 'crypto';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { readFile } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

const hash = plainText => crypto.createHash('sha384').update(plainText, 'utf8').digest('base64');

const paramRegex = /(@[^,;\s:()]+)/g,
	valuesKey = key => key.replace(/^@|!$/g, '');

const query = (pool, sqlText, values) => {
	if (values.key) values.key = hash(values.key);
	if (values.token) values.key = hash(values.token);

	const paramOrderMap = Object.fromEntries(
			Object.keys(
				[...sqlText.matchAll(paramRegex)]
					.map(match => match[0])
					.reduce((prev, next) => Object.assign(prev, { [next]: true }), {})
			).map((param, idx) => [param, idx])
		),
		paramsInOrder = Object.keys(paramOrderMap),
		paramArray = paramsInOrder.map(key => values[valuesKey(key)] ?? null),
		missingParams = paramsInOrder
			.filter(param => param.endsWith('!') && values[valuesKey(param)] === undefined)
			.map(valuesKey),
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

	return (fname, values) => queryText(queryCache, path, fname).then(text => query(pool, text, values));
}; // exports
