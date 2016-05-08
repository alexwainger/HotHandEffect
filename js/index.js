var socket = io.connect();

window.addEventListener('load', function () {
	var messageForm = document.getElementById('messagesForm');
	sendMessage();

	$('[data-toggle="tooltip"]').tooltip(); 
	document.getElementById("filter_button").addEventListener("click", function (e) {
		clickToSubmit(e);
	});
	var shot_distance_error_check = 0;
	var season_error_check = 0;

	function clickToSubmit(e) {
		e.preventDefault();
		sendMessage();
	}

	function sendMessage() {
		var checked = $("input[type=checkbox]:checked").length;
		// at least one quater needs to be selected
		var error_msg = $("#submit_warning");
		if (!checked) {
			$(document.getElementById("quarter_filter_div")).css('border', 'solid red');
			error_msg.css("display", "block")
			error_msg.text("Warning! Please select at least one quarter")
			return;
		}

		/* list containing filter information to be sent to server */
		var post_string = [];

		/* Seasons */
		var season_min = messageForm.elements["season_year_min"];
		var season_max = messageForm.elements["season_year_max"];

		var season_min_val = season_min.options[season_min.selectedIndex].value;
		var season_max_val = season_min.options[season_max.selectedIndex].value;

		if (season_min_val == "all") {
			post_string[0] = 2001;
			season_min_val = 2001;
		} else {
			post_string[0] = season_min_val;
		}

		if (season_max_val == "all") {
			post_string[1] = 2016;
			season_max_val = 2016
		} else {
			post_string[1] = season_max_val;
		}
		var season_error_check = false;
		if (season_max_val < season_min_val) {
			$(document.getElementById("season_filter_div")).css('border', 'solid red');
			error_msg.css("display", "block")
			error_msg.text("Warning! Please enter valid Season range")
			return;
		}

		/* Quarters */
		var quarters = [];
		quarter_inputs = document.getElementsByClassName("quarter_check");
		for (var i = 0; i < quarter_inputs.length; i++) {
			if (quarter_inputs[i].checked) {
				quarters.push(quarter_inputs[i].value)
			}
		}
		// var q1 = messageForm.elements["q1_filter"].checked;
		// if (q1 == true) {
		// 	quarters.push(messageForm.elements["q1_filter"].value);
		// }
		// var q2 = messageForm.elements["q2_filter"].checked;
		// if (q2 == true) {
		// 	quarters.push(messageForm.elements["q2_filter"].value);
		// }
		// var q3 = messageForm.elements["q3_filter"].checked;
		// if (q3 == true) {
		// 	quarters.push(messageForm.elements["q3_filter"].value);
		// }
		// var q4 = messageForm.elements["q4_filter"].checked;
		// if (q4 == true) {
		// 	quarters.push(messageForm.elements["q4_filter"].value);
		// }
		// var ot1 = messageForm.elements["1ot_filter"].checked;
		// if (ot1 == true) {
		// 	quarters.push(messageForm.elements["1ot_filter"].value);
		// }
		// var ot2 = messageForm.elements["2ot_filter"].checked;
		// if (ot2 == true) {
		// 	quarters.push(messageForm.elements["2ot_filter"].value);
		// }
		// var ot3 = messageForm.elements["3ot_filter"].checked;
		// if (ot3 == true) {
		// 	quarters.push(messageForm.elements["3ot_filter"].value);
		// }
		// var ot4 = messageForm.elements["4ot_filter"].checked;
		// if (ot4 == true) {
		// 	quarters.push(messageForm.elements["4ot_filter"].value);
		// }

		post_string[2] = quarters;

		/* Shot Distance */
		var shot_distance_min = messageForm.elements["shot_distance_min"].value;
		var shot_distance_max = messageForm.elements["shot_distance_max"].value;

		/* Shot Distance Error Check */
		if (!$.isNumeric(shot_distance_min) || !$.isNumeric(shot_distance_max) ||
			!shot_distance_min || !shot_distance_max ||
			shot_distance_min > shot_distance_max || shot_distance_min < 0 || shot_distance_max <= 0) {
			error_msg.css("display", "block");
			error_msg.text("Warning! Please enter valid shot distance")
			$(document.getElementById("shot_distance_filter")).css('border', 'solid red');
			return
		} else {
			post_string[3] = shot_distance_min;
			post_string[4] = shot_distance_max;
			//messageForm.elements["shot_distance_min"].value = "";
			//messageForm.elements["shot_distance_max"].value = "";
			if (shot_distance_error_check) {
				var distance_div = document.getElementById("shot_distance_filter");
				distance_div.removeChild(distance_div.lastChild);
				shot_distance_error_check = 0;
			}
		}

		/* Shot Type - 2, 3pt, or both */
		var shot_type = messageForm.elements["shot_type"].value;
		post_string[5] = shot_type;

		/* Game Type - home, away, or both*/
		var game_type = messageForm.elements["game_type"].value;
		post_string[6] = game_type;

		/* Hot Hand Definition */
		var consecutive_makes = messageForm.elements["consecutive_shots"].value;
		var time_span = messageForm.elements["time_span"].value;
		if (consecutive_makes === "" || !$.isNumeric(consecutive_makes) ) {
			$(document.getElementById("consecutive_shots_filter")).css('border', 'solid red');
			error_msg.css("display", "block");
			error_msg.text("Warning! Please enter valid values for consecutive makes.");
			return;
		}

		if (!$.isNumeric(time_span) || time_span === "" ) {
			$(document.getElementById("time_span_filter")).css('border', 'solid red');
			error_msg.css("display", "block");
			error_msg.text("Warning! Please enter valid values for time span.");
			return;
		}
		post_string[7] = consecutive_makes;
		post_string[8] = time_span;


		var min_regular = messageForm.elements["min_regular"].value;
		var min_hothand = messageForm.elements["min_hothand"].value;
		if (min_hothand === "") {
			$(document.getElementById("min_hothand")).css('border', 'solid red');
			error_msg.css("display", "block");
			error_msg.text("Warning! Please enter valid values for minimum number of hot hand made.");
			return;
		}
		if (min_regular === "") {
			$(document.getElementById("min_regular")).css('border', 'solid red');
			error_msg.css("display", "block");
			error_msg.text("Warning! Please enter valid values for minimum number of regular shots made.");
			return;
		}
		
		post_string[9] = min_hothand;
		post_string[10] = min_regular;

		// else {
		/* notify the server of the newly submitted message */
		error_msg.css("display", "none")
		$('.filter_div').css("border-style", "hidden")
		socket.emit('filter', post_string);
		// }


	}
}, false);

