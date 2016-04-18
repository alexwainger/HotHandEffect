var express = require('express')
	, bodyParser = require('body-parser')
	, http = require('http');

//var conn = anyDB.createConnection('sqlite3://chatroom.db');
var app = express();
var server = http.createServer(app);

// add socket.io
var io = require('socket.io').listen(server);