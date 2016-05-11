var express = require('express')
	, bodyParser = require('body-parser')
	, anyDB = require('any-db')
	, http = require('http');

var conn = anyDB.createConnection('sqlite3://data/database.sqlite3');
var app = express();

//app.set('port', (process.env.PORT || 5000));

// add socket.io
var server = http.createServer(app);
var io = require('socket.io').listen(server);

app.use(express.static(__dirname));
//app.use('/data/shooting_numbers.csv', express.static(__dirname + '../data/shooting_numbers.csv'));
//app.get('*', function(req, res) {
//	res.render(__dirname + '/code/index.html');
//})

console.log('yup');
io.sockets.on('connection', function (socket) {
	console.log("user connected");
	var glob_queryStr;
	var makes_req;
	var span_req;
	var players;
	socket.on('filter', function (data) {
		console.log(data);
		makes_req = data[7];
		span_req = data[8];
		min_hotshots = data[9];
		min_regshots = data[10];
		console.log("min hot " + min_hotshots);

		// get quarters filter
		var quarters = data[2];
		var quarterfilter = "";
		if (quarters.length > 0) {
			quarterfilter = "Quarter in (" + quarters[0];
		}
		for (var i = 1; i < quarters.length; i++) {
			quarterfilter += ", " + quarters[i];
		}
		quarterfilter += ") ";

		// get 2/3-pointer/both filter
		var is_two_pointer = ""
		if (data[5] == 1) {
			is_two_pointer = " AND Is_Two_Pointer=1";
		} else if (data[5] == 2) {
			is_two_pointer = " AND Is_Two_Pointer=0";
		}
		// get home/away/both filter
		var is_home = ""
		if (data[6] == 1) {
			is_home = " AND Is_Home_Game=1";
		} else if (data[6] == 2) {
			is_home = " AND Is_Home_Game=0";
		}

		var queryStr = "SELECT Time, Quarter, Player_Name, Player_ID, Is_Make, Distance, Game_ID FROM RAW_SHOTS WHERE Year >=$1 AND Year<=$2 AND " + quarterfilter + " AND Distance>=$3 AND Distance<= $4" + is_home + is_two_pointer + ";";
		glob_queryStr = "SELECT Time, Quarter, Is_Make, Distance, Game_ID, Year FROM RAW_SHOTS WHERE Year >= " + data[0] + " AND Year<= " + data[1] + " AND " + quarterfilter + is_home;

		start_time = parseFloat(Date.now());
		conn.query(queryStr, [data[0], data[1], data[3], data[4]], function (err, result) {
			console.log("That query took " + ((parseFloat(Date.now()) - start_time) / 1000) + " seconds");
			if (!result || result.rows.length == 0) {
				console.log("no results retrieved.");
				socket.emit('hothandResult', {playerDict: 0});
				socket.emit('permutation_test_results', {});
			} else if (result.rows.length > 0) {
				players = calculate_percentages(result.rows);
				socket.emit('hothandResult', {
					playerDict: players
				});
				console.log("sent player Dict");

				socket.emit('permutation_test_results', {
					permutation_test_results: run_permutation_test(players)
				});

				console.log('emitted perm results');

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
				var curr_distance = data[i].Distance;

				var id = curr_link;
				/* If this is the first time we're seeing this player, add him to the dictionaries */
				if (!(id in player_dict)) {
					player_dict[id] = new player_object(curr_link, curr_name);
					hot_dict[id] = new hot_object(curr_game, curr_quarter, curr_time, makes_req, span_req);
				}

				hot_obj = hot_dict[id];
				player_obj = player_dict[id];

				is_hot = hot_obj.is_player_hot(curr_game, curr_quarter, curr_time, curr_shot);
				if (curr_shot) {
					if (is_hot) {
						player_obj.hot_shot_made(curr_distance);
					} else {
						player_obj.reg_shot_made(curr_distance);
					}
				} else {
					if (is_hot) {
						player_obj.hot_shot_missed(curr_distance);
					} else {
						player_obj.reg_shot_missed(curr_distance);
					}
				}
			}

			for (key in player_dict) {
				if (player_dict[key].hot_shots < min_hotshots || player_dict[key].reg_shots < min_regshots) {
					delete player_dict[key];
				} else {
					player_dict[key].calculate_reg();
					player_dict[key].calculate_hot();
				}
			}
			return player_dict;
		};

		function run_permutation_test(players) {
			hotPercentages = [];
			regPercentages = [];
			for (key in players) {
				hotPercentages.push(players[key].hot_fg);
				regPercentages.push(players[key].reg_fg);
			}

			n = hotPercentages.length;
			hot_avg = average(hotPercentages);
			reg_avg = average(regPercentages);
			original_diff = hot_avg - reg_avg

			all_elements = hotPercentages.concat(regPercentages);
			k = 0;
			trial_diffs = [];

			iters = 100000;
			for (var it = 0; it < iters; it++) {
				// Shuffle array
				for (var i = all_elements.length - 1; i > 0; i--) {
					var j = Math.floor(Math.random() * (i + 1));
					var temp = all_elements[i];
					all_elements[i] = all_elements[j];
					all_elements[j] = temp;
				}

				avg1 = average(all_elements.slice(0, n));
				avg2 = average(all_elements.slice(-n));
				trial_diff = avg1 - avg2;
				if (Math.abs(original_diff) < Math.abs(trial_diff)) {
					k += 1;
				}

				trial_diffs.push(trial_diff);
			}

			k = k / iters;

			return {
				original_diff: original_diff
				, trial_diffs: trial_diffs
				, k: k
			};
		};

		function average(arr) {
			avg = 0.0;
			for (var i = 0; i < arr.length; i++) {
				avg += arr[i];
			}
			return avg / arr.length;
		};
	});
	socket.on('player_stats', function (player_link) {
		var queryStr = glob_queryStr + " AND Distance <= 30 AND Player_ID = $1;";
		conn.query(queryStr, [player_link], function (err, result) {
			var shot_data = result.rows;
			socket.emit('player_stats_result', calculate_player_stats(shot_data, player_link));
		});

		function calculate_player_stats(data, link) {
			var distance_dict = {};
			var player_obj = new player_object(link, "", 0);
			var hot_obj = new hot_object("-1", 0, "0:00", makes_req, span_req);

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
						player_obj.hot_shot_made(distance);
						distance_obj.hot_shot_made(distance);
					} else {
						player_obj.reg_shot_made(distance);
						distance_obj.reg_shot_made(distance);
					}
				} else {
					if (is_hot) {
						player_obj.hot_shot_missed(distance);
						distance_obj.hot_shot_missed(distance);
					} else {
						player_obj.reg_shot_missed(distance);
						distance_obj.reg_shot_missed(distance);
					}
				}
			}

			for (key in distance_dict) {
				distance_dict[key].calculate_all(player_obj.hot_shots, player_obj.reg_shots);
			}
			return distance_dict;
		};
	});

	socket.on('scatterplot_colors', function () {
		handle_colorRequest("scatterplot");
	});

	socket.on('histogram_colors', function () {
		handle_colorRequest("histogram");
	});

	socket.on('player_info', function (player_link) {
		queryString = "SELECT Player_Id, Height, Weight, Position FROM Players WHERE Player_Id=$1;";

		conn.query(queryString, [player_link], function (err, result) {
			//			console.log("player info " + result.rows);
			if (!result || result.rows.length == 0) {
				console.log("no results retrieved.");
				socket.emit('player_info_result', {});
			} else if (result.rows.length > 0) {
				players[result.rows[0].Player_ID].calculate_avg_shot_distance();
				result.rows[0].avg_shot_distance = players[result.rows[0].Player_ID].avg_shot_distance;

				teamQuery = "SELECT Team_abr FROM Player_Team_Pairs WHERE Player_ID = $1 Order By Year DESC LIMIT 1;";
				conn.query(teamQuery, [result.rows[0].Player_ID], function (err, r) {
					if (!r || r.rows.length == 0) {
						console.log("no results retrieved.");
						result.rows[0].team = "";
						socket.emit('player_info_result', result.rows[0]);
					} else if (r.rows.length > 0) {
						result.rows[0].team = r.rows[0].Team_abr;
						socket.emit('player_info_result', result.rows[0]);
					} else if (err) {
						console.log(err);
					}
				});

				//				socket.emit('player_info_result', result.rows[0]);
			} else if (err) {
				console.log(err);
			}

		});
	});

	var handle_colorRequest = function (viz) {
		queryString = "SELECT Player_Id, Height, Weight, Position FROM Players WHERE Player_Id IN (";
		for (key in players) {
			if (players[key].hot_shots >= 50) {
				queryString += '"' + key + '",';
				players[key].calculate_avg_shot_distance();
			}
		}

		queryString = queryString.slice(0, -1);
		queryString += ");";

		conn.query(queryString, function (err, result) {
			to_emit = [];
			if (!result || result.rows.length == 0) {
				console.log("no results retrieved.");
				socket.emit(viz + '_colorResult', {});
			} else if (result.rows.length > 0) {
				for (var i = 0; i < result.rows.length; i++) {
					result.rows[i].avg_shot_distance = players[result.rows[i].Player_ID].avg_shot_distance;
					to_emit.push(result.rows[i]);
				}
			} else if (err) {
				console.log(err);
			}

			socket.emit(viz + '_colorResult', {
				colorResults: to_emit
			});
		});
	};
});

function hot_object(curr_game, curr_quarter, curr_time, makes_req, interval) {
	this.time_between_shots = interval;
	this.req_consec_makes = makes_req;
	this.quarter = curr_quarter;
	this.game_id = curr_game;
	this.time = curr_time
	this.consec_makes = 0;
	this.is_player_hot = function (gameid, quarter, time, curr_shot) {
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
	this.compare_times = function (new_gameid, new_quarter, new_time) {
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
	this.reg_fg = 0.0;
	this.shot_distance = 0.0;
	this.avg_shot_distance = -1.0;

	this.hot_shot_missed = function (distance) {
		this.hot_shots += 1;
		this.reg_shots += 1;
		this.shot_distance += distance;
	};
	this.hot_shot_made = function (distance) {
		this.hot_shots += 1;
		this.hot_makes += 1;
		this.reg_shots += 1;
		this.reg_makes += 1;
		this.shot_distance += distance;
	};
	this.reg_shot_missed = function (distance) {
		this.reg_shots += 1;
		this.shot_distance += distance;
	};
	this.reg_shot_made = function (distance) {
		this.reg_shots += 1;
		this.reg_makes += 1;
		this.shot_distance += distance;
	};
	this.calculate_hot = function () {
		if (this.hot_shots == 0) {
			this.hot_fg = 0.0;
		} else {
			this.hot_fg = parseFloat(this.hot_makes / this.hot_shots);
		}
	};
	this.calculate_reg = function () {
		if (this.reg_shots == 0) {
			this.reg_fg = 0.0;
		} else {
			this.reg_fg = parseFloat(this.reg_makes / this.reg_shots);
		}
	};

	this.calculate_avg_shot_distance = function () {
		this.avg_shot_distance = parseFloat(this.shot_distance / this.reg_shots);
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
	this.hot_shot_missed = function () {
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
	this.calculate_all = function (total_hot_shots, total_reg_shots) {
		if (this.hot_shots == 0) {
			this.hot_fg = 0.0;
		} else {
			this.hot_fg = parseFloat(this.hot_makes / this.hot_shots);
		}

		if (this.reg_shots == 0) {
			this.reg_fg = 0.0;
		} else {
			this.reg_fg = parseFloat(this.reg_makes / this.reg_shots);
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

//Visit localhost:8080
server.listen(8080);
//app.listen(app.get('port'), function() {
//  console.log('Node app is running on port', app.get('port'));
//});