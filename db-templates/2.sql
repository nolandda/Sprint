CREATE TABLE availability(sprintid integer not null CONSTRAINT sprint REFERENCES sprints(id), userid integer not null CONSTRAINT user REFERENCES users(id), timestamp integer not null, hours integer not null, primary key(sprintid, userid, timestamp));