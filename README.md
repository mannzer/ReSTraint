# ReSTraint

##	auth
	salt = sha384(email)
	key = sha384(salt:password)
	Authorization header: key [key]

	all paths require Authorization header

###	login
	key => token
	Authorization header: token [token]

###	other paths && 404 && anything that sends a token
	refresh token
		
## 1 path per file, 1 possible location
### args are condensed into function arguments
	verb /foo/###/bar/###/baz/###?qux=###&quux=###&corge=### 
		-> /foo/bar/baz/verb.[mjs|sql]
		+ { 
			authorization: (key|token)
			fooid: ###, barid: ###, bazid: ###, 
			qux: ###, quux: ###, corge: ### 
		}

		authorize.mjs exports a map of path-keys to authorization functions


### encoding is utf8 JSON

## path to file mapping
	check for path mjs, sql
		autosql postgres + pg with named parameters from object keys
		missing params default to null
		required parameters end with !
