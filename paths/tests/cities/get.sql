select cityid, name, urbanarea, metroarea, urbanpop, metropop
from cities
where name like @search || '%'
	or cityid = @citiesid
;