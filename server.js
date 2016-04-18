var express = require('express')
	, bodyParser = require('body-parser')
	, anyDB = require('any-db')
	, http = require('http');

//var conn = anyDB.createConnection('sqlite3://chatroom.db');
var app = express();
var server = http.createServer(app);

// add socket.io
var io = require('socket.io').listen(server);

app.use(express.static(__dirname));
//app.use('/data/shooting_numbers.csv', express.static(__dirname + '../data/shooting_numbers.csv'));
//app.get('*', function(req, res) {
//	res.render(__dirname + '/code/index.html');
//})

//Visit localhost:8080
server.listen(8080);