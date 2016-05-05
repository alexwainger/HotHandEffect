var express = require('express'),
	bodyParser = require('body-parser'),
	anyDB = require('any-db'),
	http = require('http');

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

console.log('yup');
function hot_object(curr_game, curr_quarter, curr_time, makes_req, interval) {
	this.time_between_shots = interval;
	this.req_consec_makes = makes_req;
	this.quarter = curr_quarter;
	this.game_id = curr_game;
	this.time = curr_time
	this.consec_makes = 0;
	this.is_player_hot = function(gameid, quarter, time, curr_shot) {
		is_within_time_range = this.compare_times(gameid, quarter, time);
		is_hot = is_within_time_range && (this.consec_makes >= this.req_consec_makes);
		this.game_id = gameid;
		this.quarter = quarter;
		this.time = time;
		if (curr_shot) {
			if (is_within_time_range) {
				this.consec_makes += 1;
			} else {
				this.consec_makes = 1;
			}
		} else {
			this.consec_makes = 0;
		}

		return is_hot;
	};
	this.compare_times = function(new_gameid, new_quarter, new_time) {
		var new_min = parseFloat(new_time.split(":")[0]);
		var old_min = parseFloat(this.time.split(":")[0]);
		var new_sec = parseFloat(new_time.split(":")[1] / 60.0);
		var old_sec = parseFloat(this.time.split(":")[1] / 60.0);

		if (new_quarter > this.quarter) {
			old_min += 12 * (new_quarter - this.quarter)
		}
		return ((new_gameid == this.game_id) && ((old_min + old_sec) - (new_min + new_sec) <= this.time_between_shots));
	};
};

function player_object(curr_link, curr_name) {
	this.player_link = curr_link;
	this.player_name = curr_name;
	this.hot_makes = 0;
	this.hot_shots = 0;
	this.reg_makes = 0;
	this.reg_shots = 0;
	this.hot_fg = 0.0;
	this.reg_fg = 0.0
	this.hot_shot_missed = function() {
		this.hot_shots += 1;
		this.reg_shots += 1; 
	};
	this.hot_shot_made = function () {
		this.hot_shots += 1;
		this.hot_makes += 1;
		this.reg_shots += 1;
		this.reg_makes += 1;
	};
	this.reg_shot_missed = function () {
		this.reg_shots += 1;
	};
	this.reg_shot_made = function () {
		this.reg_shots += 1;
		this.reg_makes += 1;
	};
	this.calculate_hot = function() {
		if (this.hot_shots == 0) {
			this.hot_fg = 0.0;
		}
		else {
			this.hot_fg = parseFloat(this.hot_makes/this.hot_shots);
		}
	};
	this.calculate_reg = function() {
		if (this.reg_shots == 0) {
			this.reg_fg = 0.0;
		} else {
			this.reg_fg = parseFloat(this.reg_makes/this.reg_shots);
		}
	};
};

function distance_object() {
	this.hot_makes = 0;
	this.hot_shots = 0;			
	this.reg_makes = 0;
	this.reg_shots = 0;
	this.hot_fg = 0.0;
	this.reg_fg = 0.0;
	this.hot_freq = 0.0;
	this.reg_freq = 0.0;
	this.hot_shot_missed = function() { 
		this.hot_shots = this.hot_shots + 1;
		this.reg_shots = this.reg_shots + 1;
	};
	this.hot_shot_made = function () {
		this.hot_shots = this.hot_shots + 1;
		this.hot_makes = this.hot_makes + 1;
		this.reg_shots = this.reg_shots + 1;
		this.reg_makes = this.reg_makes + 1;
	};
	this.reg_shot_missed = function () {						
		this.reg_shots = this.reg_shots + 1;						
	};
	this.reg_shot_made = function () {
		this.reg_shots = this.reg_shots + 1;
		this.reg_makes = this.reg_makes + 1;
	};
	this.calculate_all = function(total_hot_shots, total_reg_shots) {
		if (this.hot_shots == 0) {
			this.hot_fg = 0.0;
		}
		else {
			this.hot_fg = parseFloat(this.hot_makes/this.hot_shots);
		}

		if (this.reg_shots == 0) {
			this.reg_fg = 0.0;
		} else {
			this.reg_fg = parseFloat(this.reg_makes/this.reg_shots);
		}

		if (total_hot_shots == 0) {
			this.hot_freq = 0.0;
		} else {
			this.hot_freq = parseFloat(this.hot_shots / total_hot_shots);
		}

		if (total_reg_shots == 0) {
			this.reg_freq = 0.0;
		} else {
			this.reg_freq = parseFloat(this.reg_shots / total_reg_shots);
		}
	};
};

io.sockets.on('connection', function (socket) {
	console.log("user connected");
	var glob_queryStr;
	var makes_req;
	var span_req;
	socket.on('filter', function (data) {
		console.log(data);
		makes_req = data[7];
		span_req = data[8];
	
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
		var glob_queryStr = "SELECT Time, Quarter, Player_Name, Player_ID, Is_Make, Distance, Game_ID FROM RAW_SHOTS WHERE Year >= " + data[0] + " AND Year<= " + data[1] + " AND " + quarterfilter + is_home;

		conn.query(queryStr, [data[0], data[1], data[3], data[4]], function (err, result) {
			if (result.rows.length > 0) {
				shot_data = result.rows;
				calculate_percentages(shot_data);
			} else if (err) {
				console.log(err);
			}
		});
		
		function calculate_percentages(data) {
			player_dict = {};
			hot_dict = {};
			for (var i = 0; i < data.length; i++) {
				var curr_time = data[i].Time;
				var curr_name = data[i].Player_Name;
				var curr_quarter = data[i].Quarter;
				var curr_link = data[i].Player_ID;
				var curr_shot = data[i].Is_Make;
				var curr_game = data[i].Game_ID;

				/* If this is the first time we're seeing this player, add him to the dictionaries */
				if (!(curr_link in player_dict)) {
					player_dict[curr_link] = new player_object(curr_link, curr_name);
					hot_dict[curr_link] = new hot_object(curr_game, curr_quarter, curr_time, makes_req, span_req);
				}

				hot_obj = hot_dict[curr_link];
				player_obj = player_dict[curr_link];

				is_hot = hot_obj.is_player_hot(curr_game, curr_quarter, curr_time, curr_shot);
				if (curr_shot) {
					if (is_hot) {
						player_obj.hot_shot_made();
					} else {
						player_obj.reg_shot_made();
					}
				} else {
					if (is_hot) {
						player_obj.hot_shot_missed();
					} else {
						player_obj.reg_shot_missed();
					}
				}
			}

			for(key in player_dict) {
				player_dict[key].calculate_reg();
				player_dict[key].calculate_hot();
			}
			console.log(player_dict);
			socket.emit('hothandResult', {
				playerDict: player_dict
			});
			console.log("sent player Dict");
		};

		socket.on('player_stats', function(player_link) {
			var queryStr = glob_queryStr + " AND Player_ID = $1;";
			console.log(player_link);
			console.log(glob_queryStr);
			conn.query(queryStr, [player_link], function (err, result) {
				var shot_data = result.rows;
				console.log(shot_data);
				console.log(calculate_player_stats(shot_data, player_link));
			});

			function calculate_player_stats(data, link) {
				var distance_dict = {};
				var player_obj = new player_object(link, "");
				var hot_obj = new hot_object("-1", 0,"0:00", makes_req, span_req);

				for (var i = 0; i < data.length; i++) {
					var distance = data[i].Distance;
					if (!(distance in distance_dict)) {
						distance_dict[distance] = new distance_object();
					}

					var curr_quarter = data[i].Quarter;
					var curr_game = data[i].Game_ID;
					var curr_time = data[i].Time;
					var curr_shot = data[i].Is_Make;
					var distance_obj = distance_dict[distance];

					is_hot = hot_obj.is_player_hot(curr_game, curr_quarter, curr_time, curr_shot);
					if (curr_shot) {
						if (is_hot) {
							player_obj.hot_shot_made();
							distance_obj.hot_shot_made();
						} else {
							player_obj.reg_shot_made();
							distance_obj.reg_shot_made();
						}
					} else {
						if (is_hot) {
							player_obj.hot_shot_missed();
							distance_obj.hot_shot_missed();
						} else {
							player_obj.reg_shot_missed();
							distance_obj.reg_shot_missed();
						}
					}
				}

				for(key in distance_dict) {
					distance_dict[key].calculate_all(player_obj.hot_shots, player_obj.reg_shots);
				}
				return distance_dict;
			}
		});
	})
});

//Visit localhost:8080
server.listen(8080);
