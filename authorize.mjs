const allowAnon = authorization => authorization === 'anon';

export default {
	'/tests/echo/get': allowAnon,
	'/tests/cities/get': allowAnon,
};
