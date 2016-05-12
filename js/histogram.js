"use strict";
var socket = io.connect();
$(document).ready(function () {
	//var margin = {top: 20, right: 20, bottom: 30, left: 40},
	var canvas_width = 700; // - margin.left - margin.right,
	var canvas_height = 500; // - margin.top - margin.bottom;
	// var canvas_width = 70;
	// var canvas_height = 500;
	var margin = 40;
	// var hist_data_points = d3.map();
	// var hist_values;
	var x_domain = ["-10%~-8%", "-8%~-6%", "-6%~-4%", "-4%~-2%", "-2%~0%", "0%~2%", "2%~4%", "4%~6%", "6%~8%", "8%~10%"];


	var all_diff_positions = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"];

	var playerDict;
	// var colorList; // Array
	socket.on('hothandResult', function (res) {
		if (Object.keys(res.playerDict).length === 0) {
			d3.select("#histogramsvg").remove();
			d3.select("#hist_legendsvg").remove();
			return;
		}
		socket.emit("histogram_colors");
		playerDict = res.playerDict;
	});
	socket.on("histogram_colorResult", function (res) {
		if (res.length === 0) {
			return;
		}
		// colorList = res.colorResults;
		d3.select("#histogramsvg").remove();
		d3.select("#hist_legendsvg").remove();
		makeD3(playerDict, res.colorResults);
		d3.select("#hist_coloring_options").on("change", function (change) {
			d3.select("#histogramsvg").remove();
			d3.select("#hist_legendsvg").remove();
			makeD3(playerDict, res.colorResults);
		});
	});


	function makeD3(rows, colorList) {
		var colorDict = d3.map();
		var color_option = $("#hist_coloring_options input:radio:checked").val();
		//var color_option = "Height";

		for (var i = 0; i < colorList.length; i++) {
			var item = colorList[i];
			colorDict.set(item.Player_ID, item[color_option]);
		}

		var colors;
		if (color_option == 'Position') {
			colors = function (position) {
				switch (position) {
				case "Point Guard":
					return "#ffffd9";
					break;
				case "Shooting Guard":
					return "#c7e9b4";
					break;
				case "Small Forward":
					return "#41b6c4";
					break;
				case "Power Forward":
					return "#225ea8";
					break;
				case "Center":
					return "#081d58";
					break;
				}
			};
		} else if (color_option == 'None') {
			colors = function (input) {
				return "#808080";
			}
		} else {
			var attribute_vals = colorDict.values();
			colors = d3.scale.quantile()
				.domain([d3.min(attribute_vals), d3.max(attribute_vals)])
				.range(["#ffffd9", "#c7e9b4", "#41b6c4", "#225ea8", "#081d58"]);
		}

		var hist_data_points = d3.map();
		for (var key in rows) {
			hist_data_points.set(key, rows[key]);
		}

		var hist_values = hist_data_points.values();

		var x = d3.scale.ordinal()
			.rangeRoundBands([0, canvas_width - margin * 2], .1);

		var y = d3.scale.linear()
			.rangeRound([canvas_height - margin * 2, 0]);

		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom")
			.tickValues(x_domain);

		var yAxis = d3.svg.axis()
			.scale(y)
			.orient("left")
			.tickFormat(d3.format(".2s"));

		var svg = d3.select("#histogram_div").append("svg").attr("id", "histogramsvg")
			.attr("width", canvas_width + 2 * margin) // +left margin +right margin
			.attr("height", canvas_height + 2 * margin) // +top margin + bottom margin
			.append("g")
			.attr("transform", "translate(" + 50 + "," + 10 + ")");

		// parse data
		var num_bin = 10;
		var bin_elements_count = new Array(num_bin).fill(0);
		var bin_values = d3.map();
		hist_values.forEach(function (d) {
			d.diff = d.hot_fg - d.reg_fg;
			var bin_int = Math.min(Math.max(Math.round(d.diff * 100), -10), 8);
			if (bin_int % 2 != 0) {
				if (bin_int >= 0) bin_int += 1;
				else bin_int -= 1;
			}
			d.bin = bin_int + "%~" + (bin_int + 2) + "%";
			bin_elements_count[(bin_int + 10) / 2] += 1;

			if (bin_values.has(d.bin)) {
				var players = bin_values.get(d.bin);
				players.push(d);
				bin_values.set(d.bin, players);
			} else {
				var temp = new Array()
				temp.push(d);
				bin_values.set(d.bin, temp);
			}

		});

		for (var i = 0; i < x_domain.length; i++) {
			var y0 = 0;
			var temp = bin_values.get(x_domain[i]);
			console.log("temp = " + temp);

			if (!temp) continue;
			if (temp.length > 1) {
				temp.sort(function (a, b) {
					var record1 = String(colorDict.get(a.player_link));
					var record2 = String(colorDict.get(b.player_link));
					return record1.localeCompare(record2);
				});
			}

			for (var j = 0; j < temp.length; j++) {
				temp[j].y0 = y0;
				temp[j].y1 = y0 += 1;
			}
		}

		x.domain(x_domain); //bin_value.domain()
		y.domain([0, d3.max(bin_elements_count)]);

		svg.append("g")
			.attr("class", "x axis histoaxis")
			.attr("transform", "translate(0," + (canvas_height - margin * 2 + 1) + ")")
			.call(xAxis);

		svg.append("g")
			.attr("class", "y axis histoaxis")
			.call(yAxis)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text("# People");

		var bin = svg.selectAll(".bin")
			.data(bin_values.values())
			.enter().append("g")
			.attr("class", "g")
			.attr("transform", function (d) {
				return "translate(" + x(d[0].bin) + ",0)";
			});

		bin.selectAll("rect")
			.data(function (d) {
				return d;
			})
			.enter().append("rect")
			.attr("width", function (d) {
				return x.rangeBand();
			})
			.attr("y", function (d) {
				console.log(d);
				return y(d.y1);
			})
			.attr("height", function (d) {
				return y(d.y0) - y(d.y1);
			})
			.style("fill", function (d) {
				var color_record = colorDict.get(d.player_link);
				return colors(color_record);
			});

		// Draw Legends
		if (color_option != "None") {
			data = [];
			if (color_option == 'Position') {
				for (var i = 0; i < all_diff_positions.length; i++) {
					data.push({
						value: all_diff_positions[i]
						, text: all_diff_positions[i]
					});
				}
			} else {
				var quantiles = colors.quantiles().slice();
				quantiles.unshift(d3.min(colorDict.values()));
				quantiles.push(d3.max(colorDict.values()));
				for (var i = 0; i < quantiles.length - 1; i++) {
					var text;
					if (color_option == 'Height') {
						var h1 = Math.trunc(quantiles[i] / 12) + "'" + (quantiles[i] % 12).toFixed(1) + "''";
						var h2 = Math.trunc(quantiles[i + 1] / 12) + "'" + (quantiles[i + 1] % 12).toFixed(1) + "''";
						text = h1 + " - " + h2;
					} else if (color_option == 'Weight') {
						text = quantiles[i].toFixed(1) + " - " + quantiles[i + 1].toFixed(1) + " lbs.";
					} else if (color_option == 'avg_shot_distance') {
						text = quantiles[i].toFixed(1) + " - " + quantiles[i + 1].toFixed(1) + " ft.";
					}

					data.push({
						value: quantiles[i]
						, text: text
					});
				}
			}

			var legend = d3.select("#histo-legend").append("svg").attr("id", "hist_legendsvg")
				.selectAll("g")
				.data(data)
				.enter().append("g")
				.attr("class", "legend")
				.attr("transform", function (d, i) {
					return "translate(0," + i * 20 + ")";
				});

			legend.append("rect")
				.attr("x", 100 + 30)
				.attr("width", 18)
				.attr("height", 18)
				.style("fill", function (d) {
					return colors(d.value)
				});

			legend.append("text")
				.attr("x", 100 + 24)
				.attr("y", 9)
				.attr("dy", ".35em")
				.style("text-anchor", "end")
				.text(function (d) {
					return d.text;
				});
		}

	}
});