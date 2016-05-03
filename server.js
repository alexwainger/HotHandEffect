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


io.sockets.on('connection', function (socket) {
	console.log("user connected");

	socket.on('filter', function (data) {
		console.log(data);
		var makes = data[7];
		var span = data[8];
		//console.log(data[7]);
		//console.log(data[8]);

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
		for (var i = 1; i < quarters.length; i++) {
			quarterfilter += " OR Quarter=" + quarters[i];
		}
		if (quarterfilter.length > 1) {
			quarterfilter = '(' + quarterfilter;
			quarterfilter += ')';
		}

		// get home/away/both filter
		var is_home = ""
		if (data[5] == 1) {
			is_home = " AND Is_Home_Game=1";
		} else if (data[5] == 2) {
			is_home = " AND Is_Home_Game=0";
		}

		// get 2/3-pointer/both filter
		var is_two_pointer = ""
		if (data[6] == 1) {
			is_two_pointer = " AND Is_Two_Pointer=1";
		} else if (data[6] == 2) {
			is_two_pointer = " AND Is_Two_Pointer=0";
		}


		var queryStr = "SELECT Time, Quarter, Player_Name, Player_ID, Is_Make, Distance, Game_ID FROM RAW_SHOTS WHERE Year >=$1 AND Year<=$2 AND " + quarterfilter + " AND Distance>=$3 AND Distance<= $4" + is_home + is_two_pointer + ";";

		console.log(queryStr);

		conn.query(queryStr, [data[0], data[1], data[3], data[4]], function (err, result) {
			if (result.rows.length > 0) {
				//console.log(result);
				shot_data = result.rows;
				//console.log(makes);
				//console.log(span);
				calculate_percentages(shot_data, makes, span);
			} else if (err) {
				console.log(err);
			}
		});
		/*var player_dict = {};
		player_dict['key'] = "yes";
		if('key' in player_dict) {
			console.log("YES");
		}
		else {
			console.log("NO");
		}*/
		function calculate_percentages(data, makes, span) {
			console.log("Calc");
			console.log(makes);
			console.log(span);
			player_dict = {};
			hot_dict = {};
			for (var i = 0; i < data.length; i++) {

				var curr_time = data[i].Time;
				var curr_name = data[i].Player_Name;
				var curr_quarter = data[i].Quarter;
				var curr_link = data[i].Player_ID;
				var curr_shot = data[i].Is_Make;
				var curr_game = data[i].Game_ID;

				if (!(curr_link in player_dict)) {
					if (curr_shot) {
						var player = {
							player_name: curr_name
							, hot_makes: 0
							, hot_shots: 0
							, reg_makes: 1
							, reg_shots: 1
							, hot_shot_missed: function () {
								this.hot_shots = this.hot_shots + 1;
								this.reg_shots = this.reg_shots + 1;
							}
							, hot_shot_made: function () {
								this.hot_shots = this.hot_shots + 1;
								this.hot_makes = this.hot_makes + 1;
								this.reg_shots = this.reg_shots + 1;
								this.reg_makes = this.reg_makes + 1;
							}
							, reg_shot_missed: function () {
								this.reg_shots = this.reg_shots + 1;
							}
							, reg_shot_made: function () {
								this.reg_shots = this.reg_shots + 1;
								this.reg_makes = this.reg_makes + 1;

							}
						};

						player_dict[curr_link] = player;

						var hot_obj = {
							req_consec_makes: makes
							, quarter: curr_quarter
							, game_id: curr_game
							, time: curr_time
							, consec_makes: 1
							, set_time: function (time) {
								this.time = time;
							}
							, set_quarter: function (quarter) {
								this.quarter = quarter;
							}
							, set_game_id: function (gameid) {
								this.game_id = gameid;
							}
							, is_hot: function () {
								return this.consec_makes >= this.req_consec_makes;
							}
						};

						hot_dict[curr_link] = hot_obj;
					} else {
						var player = {

							player_name: curr_name
							, hot_makes: 0
							, hot_shots: 0
							, reg_makes: 0
							, reg_shots: 1
							, hot_shot_missed: function () {
								this.hot_shots = this.hot_shots + 1;
								this.reg_shots = this.reg_shots + 1;
							}
							, hot_shot_made: function () {
								this.hot_shots = this.hot_shots + 1;
								this.hot_makes = this.hot_makes + 1;
								this.reg_shots = this.reg_shots + 1;
								this.reg_makes = this.reg_makes + 1;
							}
							, reg_shot_missed: function () {
								this.reg_shots = this.reg_shots + 1;
							}
							, reg_shot_made: function () {
								this.reg_shots = this.reg_shots + 1;
								this.reg_makes = this.reg_makes + 1;

							}
						};

						player_dict[curr_link] = player;

						var hot_obj = {
							req_consec_makes: makes
							, quarter: curr_quarter
							, game_id: curr_game
							, time: curr_time
							, consec_makes: 0
							, set_time: function (time) {
								this.time = time;
							}
							, set_quarter: function (quarter) {
								this.quarter = quarter;
							}
							, set_game_id: function (gameid) {
								this.game_id = gameid;
							}
							, is_hot: function () {
								//console.log(this.consec_makes);
								//console.log(this.req_consec_makes);
								return this.consec_makes >= this.req_consec_makes;
							}

						};

						hot_dict[curr_link] = hot_obj;
					}
				} else {
					hot_obj = hot_dict[curr_link];
					/* if hot */
					if (hot_obj.is_hot() == 1 && compare_times(curr_time, hot_obj.time, span) && (hot_obj.quarter == curr_quarter) && (hot_obj.game_id == curr_game)) {
						if (curr_shot) {
							player_dict[curr_link].hot_shot_made();
							hot_obj.consec_makes += 1;

						} else {
							player_dict[curr_link].hot_shot_missed();
							hot_obj.consec_makes = 0;
						}
					} else {
						if (curr_shot) {
							player_dict[curr_link].reg_shot_made();
							if (!compare_times(curr_time, hot_obj.time, span) || (hot_obj.quarter != curr_quarter) || (hot_obj.game_id != curr_game)) {
								hot_obj.consec_makes = 0;

							}
							hot_obj.consec_makes += 1;
						} else {
							player_dict[curr_link].reg_shot_missed();
							hot_obj.consec_makes = 0;
						}
					}

					hot_obj.set_quarter(curr_quarter);
					hot_obj.set_game_id(curr_game);
					hot_obj.set_time(curr_time);
				}

			}

			console.log(player_dict);
			socket.emit('hothandResult', {
				playerDict: player_dict
			});
		}

		function compare_times(time1, time2, interval) {
			var min1 = parseFloat(time1.split(":")[0]);
			var min2 = parseFloat(time2.split(":")[0]);
			var sec1 = parseFloat(time1.split(":")[1] / 60.0);
			var sec2 = parseFloat(time2.split(":")[1] / 60.0);



			return ((min2 + sec2) - (min1 + sec1) <= interval);
		}

	})
})

//Visit localhost:8080
server.listen(8080);