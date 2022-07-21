drop table if exists cities;
create table cities (
	cityid serial,
	name text not null,
	urbanarea int,
	metroarea int,
	urbanpop int,
	metropop int
);

insert into cities (name, urbanarea, metroarea, urbanpop, metropop)
values 
	('Belgrade', 1035, 3223, 1344844, 1687132),
	('Berlin', 892, 30370, 4473101, 6144600),
	('Budapest', 2538, 7626, 2997958, 3011598),
	('Bratislava', 853, 2053, 475503, 666000)
;

drop user if exists demouser;
create user demouser with encrypted password ''; -- put a demo password here

grant all privileges on all tables in schema public to demouser;
grant all privileges on all sequences in schema public to demouser;
