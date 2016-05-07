// "use strict"
var socket = io.connect();
$(document).ready(function () {
	var canvas_width = 700;
	var canvas_height = 500;
	var margin = 40;
	var radius = 5;
	var data_points = d3.map();

  	var all_diff_names = d3.map();
	var playerDict = {};
	var svg = null;
	var legend_svg = null;

	socket.on('hothandResult', function (res) {
		console.log(res);
		playerDict = res.playerDict;
		d3.select("svg").remove();
		data = parseData(playerDict)
		!svg ? makeD3(data) : updateData(data);
	});

	var tooltip = d3.select("#scatterplot_div")
		.append("div")
		.attr("class", "alextooltip")
		.style("opacity", 0);

	function parseData(rows) {
		for (var key in rows) {
			if (rows[key].hot_shots >= 50) {
				data_points.set(key, rows[key]);
			}
		}
		values = data_points.values();
		return values;
	};
	function makeD3(values) {

		for (var i = 0; i < values.length; i++) {
			if (!all_diff_names.has(values[i].player_name)) {
				all_diff_names.set(values[i].player_name, values[i]);
			}
		}

		var xValue = function(d) { return d.reg_fg; };
		var yValue = function(d) { return d.hot_fg; };

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
			.attr("x", canvas_width - margin * 2)
			.attr("y", -6)
			.attr("text-anchor", "end")
			.text("Regular FG%");

		svg.append("g")
			.attr("class", "y axis scatteraxis")
			.attr("transform", "translate(" + margin + ",0)")
			.call(yAxis)
			.append("text")
			.attr("class", "label")
			.attr("transform", "rotate(-90)")
			.attr("y", 12)
			.attr("x", -40)
			.style("text-anchor", "end")
			.text("Hot Hand FG%");

		svg.append("line")
			.attr({
				class: "averageline", 
				x1: xScale(minPercentage - .01),
				x2: xScale(maxPercentage + .01),
				y1: yScale(minPercentage - .01),
				y2: yScale(maxPercentage + .01)
			})
			.style({
				stroke: "#c0c0c0",
				"stroke-width": "3px",
				"stroke-linecap": "round",
				"stroke-dasharray": ("5, 10")
			});
        
      	all_circle = svg.selectAll("circle")
			.data(values)
			.enter()
			.append("circle")
			.attr("cx", function(d) { return xScale(xValue(d)) })
			.attr("cy", function(d) { return yScale(yValue(d)) })
			.attr("class", function(d) { return d.player_link})
			.on("mouseover", handleMouseIn)
			.on("mouseout", handleMouseOut)
			.attr("r", radius)
			.attr("fill", "black");

		d3.select("#coloring_options").on("change", handle_scatterplot_colors);
	};

	function handle_scatterplot_colors() {
		color_option = this.value;
		if (color_option == 'None') {
			console.log('we here');
			svg.selectAll("circle")
				.transition()
				.duration(1000)
				.attr("fill", "black");

			removeLegend();
		} else {
			socket.emit('colors');
			socket.on('colorResult', function(res) {
				player_to_attribute = d3.map();
				res.colorResults.forEach(function(player) {
					player_to_attribute.set(player["Player_ID"], player[color_option]);
				});

				var color_scale;
				if (color_option == 'Position') {
					color_scale = function(position) {
						console.log('in the function');
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
						.range(["#ffffd9","#c7e9b4","#41b6c4","#225ea8","#081d58"]);
				}
				svg.selectAll("circle")
					.transition()
					.duration(1000)
					.attr("fill", function(d) {return color_scale(player_to_attribute.get(d.player_link));});

				drawLegend(color_option, color_scale, player_to_attribute.values());
			});
		}
	};
  	
	function drawLegend(color_option, color_scale, vals) {
		var li = {
			w: 100, h: 40, s: 3, r: 3, num_bins: 5
		};

		if (!legend_svg) {
			legend_svg = d3.select("#legend").append("svg")        
		  		.attr("width", li.w)
				.attr("height", (li.num_bins) * (li.h + li.s));
		}

		data = [];
		if (color_option == 'Position') {
			positions = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"];
			for (var i = 0; i < positions.length; i++) {
				data.push({
					value: positions[i],
					text: positions[i]});
			}
		} else {
			quantiles = color_scale.quantiles();
			data = [{
				value: d3.min(vals),
				text: d3.min(vals).toFixed(1) + " - " + quantiles[0].toFixed(1)}];
			for (var i = 0; i < quantiles.length - 1; i++) {
				data.push({
					value: quantiles[i],
					text: quantiles[i].toFixed(1) + " - " + quantiles[i+1].toFixed(1)});
			}
			data.push({
				value: d3.max(vals),
				text: quantiles[quantiles.length - 1].toFixed(1) + " - " + d3.max(vals).toFixed(1)});
		}

		var g = legend_svg.selectAll("g")
			.data(data)
			.enter().append("g")
			.attr("transform", function(d, i) {
				return "translate(0," + i * (li.h + li.s) + ")";
          });

      	g.append("rect")
          	.attr("rx", li.r)
          	.attr("ry", li.r)
          	.attr("width", li.w)
          	.attr("height", li.h)
          	.style("fill", function(d) {return color_scale(d.value)});

      	g.append("text")
        	.attr("x", li.w / 2)
          	.attr("y", li.h / 2)
          	.attr("dy", "0.35em")
          	.attr("text-anchor", "middle")
          	.text(function(d) {return d.text;})
			.style("fill", function(d, i) { return (i > 2 ? "white" : "black")});

	};
	
	function individualPlayer(player_id) {
		//socket.emit()
		var player_link = d3.select(this).attr("class");
		socket.emit('player_stats', player_link);	
	};

	function stash(d) {
		console.log("stash: "+JSON.stringify(d));
	};

	function updateData(values) {
		all_circle.transition()
			.remove();
		all_circle.data(values)
			.transition()
			.duration(1000)
			.attr("fill", "black");
		// svg.selectAll("circle")
		// 	 .data(values)
		// 	 .enter()
		// 	 .append("circle");
		// svg.selectAll("circle")
		// 	 .transition()
		// 	 .duration(1000)
		// 	 .attr("fill", function(d) { return colors(d.player_name); });

		for (var i = 0; i < values.length; i++) {
	    	if (!all_diff_names.has(values[i].player_name)) {
				all_diff_names.set(values[i].player_name, values[i]);
			}
		}
		//drawLegend(all_diff_names.values());
	};


  	function handleMouseOut() {
		tooltip.transition().duration(500).style("opacity", 0);
  	};

  	function handleMouseIn() {
		var player_link = d3.select(this).attr("class");
		console.log(data_points);
		var point = data_points.get(player_link);
		var difference = ((point.hot_fg - point.reg_fg) * 100).toFixed(1);
		console.log(point);
	  
		tooltip.html(point.player_name + "<br>Hot FG%: " + (point.hot_fg * 100).toFixed(1) + "%<br>Regular FG%: " + (point.reg_fg * 100).toFixed(1) + "%<br>% Difference: " + difference + "%<br>Hot Shots Taken: " + point.hot_shots)
			.style("left", (d3.mouse(this)[0] + 100)+ "px")
			.style("top",  d3.mouse(this)[1] + "px");
		
		tooltip.transition()
			.duration(200)
			.style("opacity", .9);
	};
});
