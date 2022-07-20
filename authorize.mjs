export default {
	'/tests/echo/get': authorization => authorization === 'anon',
};
