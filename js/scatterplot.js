// "use strict"
var socket = io.connect();
$(document).ready(function () {
	var canvas_width = 700;
	var canvas_height = 500;
	var margin = 60;
	var radius = 5;
	var data_points = d3.map();

	var playerDict = {};
	var svg = null;

	socket.on('hothandResult', function (res) {
		$(document.getElementById("loading-overlay")).css("display","none");
		$(document.getElementById("page-top")).css("overflow", "auto");

		console.log(res);
		if (Object.keys(res.playerDict).length === 0) {
			d3.select("#alexsvg").remove();
			$('#no-result-modal').modal('show');
			return;
		}
		playerDict = res.playerDict;
		d3.select("#alexsvg").remove();
		data = parseData(playerDict);
		makeD3(data);
	});

	function parseData(rows) {
		data_points = d3.map();
		for (var key in rows) {
			data_points.set(key, rows[key]);
		}
		values = data_points.values();
		return values;
	};

	function makeD3(values) {
		var xValue = function (d) {
			return d.reg_fg;
		};
		var yValue = function (d) {
			return d.hot_fg;
		};

		var minPercentage = Math.min(d3.min(values, xValue), d3.min(values, yValue));
		var maxPercentage = Math.max(d3.max(values, xValue), d3.max(values, yValue));

		var xScale = d3.scale.pow().exponent(.1)
			.domain([minPercentage - .01, maxPercentage + .01])
			.range([margin, canvas_width - margin * 2]);

		var yScale = d3.scale.pow().exponent(.1)
			.domain([minPercentage - .01, maxPercentage + .01])
			.range([canvas_height - margin, margin]);

		var xAxis = d3.svg.axis()
			.scale(xScale)
			.orient("bottom")
			.ticks(10)
			.tickFormat(d3.format(".0%"));

		var yAxis = d3.svg.axis()
			.scale(yScale)
			.orient("left")
			.ticks(10)
			.tickFormat(d3.format(".0%"));

		svg = d3.select("#scatterplot_div").append("svg")
			.attr("id", "alexsvg")
			.attr("width", canvas_width)
			.attr("height", canvas_height);

		svg.append("g")
			.attr("class", "x axis scatteraxis")
			.attr("transform", "translate(0, " + (canvas_height - margin) + ")")
			.call(xAxis)
			.append("text")
			.attr("class", "label")
			.attr("transform", "translate(" + canvas_width/2 + "," + (margin-5) + ")")
			.style("text-anchor", "middle")
			.text("Regular FG%");

		svg.append("g")
			.attr("class", "y axis scatteraxis")
			.attr("transform", "translate(" + margin + ",0)")
			.call(yAxis)
			.append("text")
			.attr("class", "label")
			.attr("transform", "translate(-50,"+(canvas_height/2)+")rotate(-90)")
			.style("text-anchor", "middle")
			.text("Hot Hand FG%");

		svg.append("line")
			.attr({
				class: "averageline"
				, x1: xScale(minPercentage - .01)
				, x2: xScale(maxPercentage + .01)
				, y1: yScale(minPercentage - .01)
				, y2: yScale(maxPercentage + .01)
			})
			.style({
				stroke: "#c0c0c0"
				, "stroke-width": "3px"
				, "stroke-linecap": "round"
				, "stroke-dasharray": ("5, 10")
			});

		all_circle = svg.selectAll("circle")
			.data(values)
			.enter()
			.append("circle")
			.attr("cx", function (d) {
				return xScale(xValue(d))
			})
			.attr("cy", function (d) {
				return yScale(yValue(d))
			})
			.attr("data-name", function (d) {
				return d.player_link
			})
			.on("mouseover", handleMouseIn)
			.on("mouseout", handleMouseOut)
			.on("click", handleOnClick)
			.attr("r", radius)
			.attr("fill", "#225ea8");

		handle_scatterplot_colors();
		d3.select("#coloring_options").on("change", handle_scatterplot_colors);
	};

	function handle_scatterplot_colors() {
		color_option = $('#coloring_options input:radio:checked').val();
		if (color_option == 'None' || color_option == null) {
			svg.selectAll("circle")
				.transition()
				.duration(1000)
				.attr("fill", "#225ea8");
			removeLegend();
		} else {
			socket.emit('scatterplot_colors');
			socket.on('scatterplot_colorResult', function (res) {
				player_to_attribute = d3.map();
				res.colorResults.forEach(function (player) {
					player_to_attribute.set(player["Player_ID"], player[color_option]);
				});

				var color_scale;
				if (color_option == 'Position') {
					color_scale = function (position) {
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
				} else {
					attribute_vals = player_to_attribute.values();
					color_scale = d3.scale.quantile()
						.domain([d3.min(attribute_vals), d3.max(attribute_vals)])
						.range(["#ffffd9", "#c7e9b4", "#41b6c4", "#225ea8", "#081d58"]);
				}
				svg.selectAll("circle")
					.transition()
					.duration(1000)
					.attr("fill", function (d) {
						return color_scale(player_to_attribute.get(d.player_link));
					});

				drawLegend(color_option, color_scale, player_to_attribute.values());
			});
		}
	};

	function drawLegend(color_option, color_scale, vals) {
		removeLegend();
		var li = {
			w: 120
			, h: 40
			, s: 3
			, r: 3
			, num_bins: 5
		};

		data = [];
		if (color_option == 'Position') {
			positions = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"];
			for (var i = 0; i < positions.length; i++) {
				data.push({
					value: positions[i]
					, text: positions[i]
				});
			}
		} else {
			var quantiles = color_scale.quantiles().slice();
			quantiles.unshift(d3.min(vals));
			quantiles.push(d3.max(vals));
			for (var i = 0; i < quantiles.length - 1; i++) {
				var text;
				if (color_option == 'Height') {
					h1 = Math.trunc(quantiles[i] / 12) + "'" + (quantiles[i] % 12).toFixed(1) + "''";
					h2 = Math.trunc(quantiles[i + 1] / 12) + "'" + (quantiles[i + 1] % 12).toFixed(1) + "''";
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

		d3.select("#legend").append("p").text("Legend");
		var legend_svg = d3.select("#legend").append("svg")
			.attr("width", li.w)
			.attr("height", (li.num_bins) * (li.h + li.s));

		var g = legend_svg.selectAll("g")
			.data(data)
			.enter().append("g")
			.attr("transform", function (d, i) {
				return "translate(0," + i * (li.h + li.s) + ")";
			});

		g.append("rect")
			.attr("rx", li.r)
			.attr("ry", li.r)
			.attr("width", li.w)
			.attr("height", li.h)
			.style("fill", function (d) {
				return color_scale(d.value)
			});

		g.append("text")
			.attr("x", li.w / 2)
			.attr("y", li.h / 2)
			.attr("dy", "0.35em")
			.attr("text-anchor", "middle")
			.text(function (d) {
				return d.text;
			})
			.style("fill", function (d, i) {
				return (i > 2 ? "white" : "black")
			});

	};

	function removeLegend() {
		d3.select("#legend").selectAll("*").remove();
	};

	function individualPlayer(player_id) {
		var player_link = d3.select(this).attr("class");
		socket.emit('player_stats', player_link);
	};

	var tooltip = d3.select("#alextooltip").style("opacity", 0);

	function handleMouseOut() {
		tooltip.transition().duration(500).style("opacity", 0);
		d3.select(this).style("stroke-width", 0) // set the stroke width
	};

	function handleMouseIn() {
		var player_link = d3.select(this).attr("data-name");
		var point = data_points.get(player_link);
		var difference = ((point.hot_fg - point.reg_fg) * 100).toFixed(1);
		d3.select(this).style("stroke-width", 2) // set the stroke width
			.style("stroke", "red");
		tooltip.html(point.player_name + "<br>Hot FG%: " + (point.hot_fg * 100).toFixed(1) + "%<br>Regular FG%: " + (point.reg_fg * 100).toFixed(1) + "%<br>% Difference: " + difference + "%<br>Hot Shots Taken: " + point.hot_shots)
		tooltip.transition()
			.duration(200)
			.style("opacity", .9);
	};


	function handleOnClick() {
		var player_link = d3.select(this).attr("data-name");
		var point = data_points.get(player_link);
	
		socket.emit('player_stats', player_link);
		socket.emit('player_info', player_link);
		
		socket.emit('imagePNG', player_link);
		socket.on('imagePNG_res', function(res_png) {
			if (!res_png.isValid) {
				socket.emit('imageJPG', player_link);
				socket.on('imageJPG_res', function(res_jpg) {
					if (!res_jpg.isValid) {
						$('#player-pic-holder').attr('src', "images/nba-logo.jpg");
					} else {
						$('#player-pic-holder').attr('src', res_jpg.imgSrc);
					}
				});
			} else {
				$('#player-pic-holder').attr('src', res_png.imgSrc);
			}
		});

		socket.on('player_info_result', function (res) {
			
			$('#player-name').text(point.player_name);
			$('#player-team').text(res.team);
			$('#player-height').text(Math.trunc(res.Height / 12) + "'" + (res.Height % 12) + "''");
			$('#player-weight').text(res.Weight + ' lb.');
			$('#player-dist').text(res.avg_shot_distance.toFixed(1) + ' ft.');
			$('#player_info').modal('show');
		});

	}
});
