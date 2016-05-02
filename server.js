var express = require('express')
	, bodyParser = require('body-parser')
	, anyDB = require('any-db')
	, http = require('http');

var conn = anyDB.createConnection('sqlite3://data/database.sqlite3');
var app = express();
var server = http.createServer(app);

// add socket.io
var io = require('socket.io').listen(server);

app.use(express.static(__dirname));
//app.use('/data/shooting_numbers.csv', express.static(__dirname + '../data/shooting_numbers.csv'));
//app.get('*', function(req, res) {
//	res.render(__dirname + '/code/index.html');
//})

io.sockets.on('connection', function(socket) {
	console.log("user connected");
	
	socket.on('filter', function(data) {
		console.log(data);
		
//		conn.query("SELECT * FROM RAW_SHOTS WHERE Player_Name='Stephen Curry' AND Quarter=1;", function(err, result) {
//			if (err) {
//				console.log(err);
//			} else {console.log(result);}
//		});
		// get quarters filter
		var quarters = data[2];
		var quarterfilter = "";
		if (quarters.length > 0) {
			quarterfilter = "Quarter=" + quarters[0];
		}
		for (var i=1; i < quarters.length; i++) {
			quarterfilter += " OR Quarter=" + quarters[i];
		}
		if(quarterfilter.length>1) {
			quarterfilter = '(' + quarterfilter;
			quarterfilter+=')';}
		
		// get home/away/both filter
		var is_home = ""
		if(data[5] == 1) {
			is_home = "Is_Home_Game=1";
		} else if (data[5] == 2) {
			is_home = "Is_Home_Game=0";
		}
		
		// get 2/3-pointer/both filter
		var is_two_pointer = ""
		if(data[6] == 1) {
			is_two_pointer = "Is_Two_Pointer=1";
		} else if (data[6] == 2) {
			is_two_pointer = "Is_Two_Pointer=0";
		}
		
		var queryStr = "SELECT Time, Quarter, Player_Name, Player_ID, Is_Make, Distance, Game_ID FROM RAW_SHOTS WHERE Year >=$1 AND Year<=$2 AND " + quarterfilter + " AND Distance>=$3 AND Distance<= $4 AND " + is_home + " AND " + is_two_pointer + ";";
		
		console.log(queryStr);
		
		conn.query(queryStr, [data[0], data[1], data[3], data[4]], function(err, result) {
			if (result.rows.length > 0) {
				console.log(result);
			} else if (err) {
				console.log(err);
			}
		});
	})
})

//Visit localhost:8080
server.listen(8080);