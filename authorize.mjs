const allowAnon = ({ key }) => key === 'anon' && { key: 'anon' };

export default {
	'/tests/echo/get': allowAnon,
	'/tests/cities/get': allowAnon,
	'/tests/cities/post': allowAnon,
};
