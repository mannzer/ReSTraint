#! /usr/bin/env node

import { join, sep } from 'path';

import authorize from './authorize.mjs';
import cluster from 'cluster';
import color from './color.mjs';
import connectionInfo from './pgsql.config.mjs';
import http from 'http';
import os from 'os';
import postgres from './postgres.mjs';

const query = postgres({ connectionInfo, path: 'paths' });

const require = path => import(path);

const logo =
	`${color.FgYellow}Ѻ𝆘𝆘Ѻ${color.Reset} ` +
	`${color.Bright + color.FgRed}Re${color.FgGreen}S${color.FgBlue}T${color.FgMagenta}raint${color.Reset}`;

const PORT = parseInt(process.env.PORT) || 80,
	{ DEBUG } = process.env;

const flow = (...args) => args.reduce((prev, current) => Promise.resolve(prev).then(current)),
	waitAll = Promise.all.bind(Promise);

const sanitize = path => path.replace(/\.\./g, '.').replace(/^\//, '');

const workers = Math.max(2, os.cpus().length);

const checkAuthorized = jso => async authFn => {
	// eslint-disable-next-line no-extra-parens
	const authorization = authFn && (await authFn(jso.authorization));

	if (authorization) return { ...jso, authorization };

	const error = new Error();
	error.message = authFn ? 'Not Authorized' : 'Not Found';
	error.status = authFn ? 401 : 404;
	return Promise.reject(error);
};

const loadPath = path => (jso, res) =>
	flow(
		authorize[path],
		checkAuthorized(jso),
		data => [data, require('./paths/' + sanitize(path + '.mjs'))], //
		waitAll,
		([data, module]) => module.default(data, res)
	).catch(err =>
		err.code === 'ERR_MODULE_NOT_FOUND'
			? query(sanitize(path), jso) //
					.catch(error =>
						Promise.reject(
							DEBUG ? error : typeof error === 'string' ? error : 'There was an error with your request.'
						)
					)
			: Promise.reject(err)
	);

const tryJsonParse = json =>
	new Promise((ok, fail) => {
		try {
			ok(json && JSON.parse(json));
		} catch (error) {
			error.status = 400;
			error.message = `The request payload must be JSON. That didn't parse.`;
			fail(error);
		}
	});

const sendResponse =
	res =>
	(output, status = 200) => {
		if (output) {
			res.writeHead(status, {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-store',
			});
			res.end(output);
		}
	};

const errorHandler = res => error => {
	if (['ERR_MODULE_NOT_FOUND', 'ENOENT'].includes(error.code)) {
		error.status = 404;
		error.message = 'Not Found';
	} // if
	sendResponse(res)(JSON.stringify(error.message || error), error.status || 400);
	if (DEBUG) console.error(error);
}; // errorHandler

if (cluster.isMaster && !DEBUG) {
	console.log(logo, 'cluster', process.pid, 'is running on', workers, 'cores');

	for (let idx = 0; idx < workers; idx++) cluster.fork(); // fork workers

	cluster.on('exit', (worker, code, signal) => {
		console.error(`${logo} worker ${worker.process.pid} died (${signal || code}). restarting...`);
		// cluster.fork();
	}); // on exit
} else {
	http
		.createServer((req, res) => {
			const url = new URL('http://localhost' + req.url),
				chunks = [],
				method = req.method.toLowerCase(),
				{ authorization } = req.headers,
				routeParts = join(url.pathname, method)
					.split(sep)
					.map((part, idx, list) => ('0123456789'.includes(part[0]) ? [list[idx - 1] + 'id', part] : part)),
				route = routeParts.filter(part => typeof part === 'string').join(sep),
				routeParams = Object.fromEntries(routeParts.filter(Array.isArray));

			const queryParams = Object.fromEntries(url.searchParams);

			if (!authorization) {
				const error = new Error('Authorization Required');
				error.status = 401;
				return errorHandler(res)(error);
			}

			req.on('data', [].push.bind(chunks));
			req.on('end', () =>
				flow(
					chunks.join('') || decodeURIComponent(url.searchParams.getAll('json')), //
					tryJsonParse,
					data => ({ ...routeParams, ...queryParams, ...data, authorization }),
					data =>
						flow(
							route,
							loadPath,
							handler => handler(data, res),
							val => val !== undefined && flow(val, JSON.stringify, sendResponse(res))
						)
				).catch(errorHandler(res))
			);

			return null;
		})
		.listen(PORT).keepAliveTimeout = 62 * 1000;
	console.log(logo, 'worker', process.pid, 'listening on port', PORT);
} // else
