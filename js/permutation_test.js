// Adapted from code here: http://bl.ocks.org/mbostock/3048450
var socket = io.connect();
$(document).ready(function() {
	socket.on('permutation_test_results', function(res) {
		
		d3.select("#permutation_svg").remove();
		
		var formatCount = d3.format(",.0f");
		var margin = {top: 20, right: 30, bottom: 30, left: 40};
		var width = 850- margin.left - margin.right;
		var height = 500 - margin.top - margin.bottom;

		var trial_diffs = res.permutation_test_results.trial_diffs;
		var original_diff = res.permutation_test_results.original_diff;
		var p_val = res.permutation_test_results.k;
		console.log('P value: ' + p_val);
		console.log('Orig diff: ' + original_diff);
		
		var x = d3.scale.linear()
			.domain([d3.min(trial_diffs), d3.max(trial_diffs)])
			.range([0, width]);

		var data = d3.layout.histogram()
			.bins(x.ticks(20))(trial_diffs);
		
		var y = d3.scale.linear()
			.domain([0, d3.max(data, function(d) { return d.y; })])
			.range([height, 0]);

		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom");

		var permutation_svg = d3.select("#permutation_test_div")
			.append("svg")
			.attr("id", "permutation_svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var bar = permutation_svg.selectAll(".bar")
			.data(data)
			.enter().append("g")
			.attr("class", "bar")
			.attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

		var create_gradient = function(id, stops) {
			var gradient = permutation_svg.append("linearGradient")
				.attr({
					"id": "gradient" + id,
					"x1": 0,
					"x2": 1,
					"y1": 0,
					"y2": 0});

			for (var i = 0; i < stops.length; i++) {
				gradient.append("stop")
					.attr("offset", stops[i].offset)
					.style("stop-color", stops[i].color)
					.style("stop-opacity", 1);
			}
			
			return "url(#gradient" + id + ")"
		};

		bar.append("rect")
			.attr("x", 1)
			.attr("width", x(d3.min(trial_diffs) + data[0].dx) - 1)
			.attr("height", function(d) { return height - y(d.y); })
			.attr("fill", function(d, id) {
				left = 0;
				right = 0;
				for(var i=0; i < d.length; i++) {
					curr_point = d[i];
					if (Math.abs(curr_point) > Math.abs(original_diff)) {
						if (curr_point < 0) {
							left += 1;
						} else if (curr_point > 0) {
							right += 1;
						}
					}
				}

				var stops = [];
				var l_offset = left / d.length;
				var r_offset = 1-(right / d.length);
				color1 = "red";
				color2 = "steelblue";

				if (left == d.length || right == d.length) {
					return color1;
				} else if (left == 0 && right == 0) {
					return color2;
				} else if (left > 0 && right > 0) {
					stops.push(
						{offset: 0, color: color1},
						{offset: l_offset, color: color1},
						{offset: l_offset, color: color2},
						{offset: r_offset, color: color2},
						{offset: r_offset, color: color1},
						{offset: 1, color: color1});
				} else if (left > 0 && right == 0) {
					stops.push(
						{offset: 0, color: color1},
						{offset: l_offset, color: color1},
						{offset: l_offset, color: color2},
						{offset: 1, color: color2});
				} else if (left == 0 && right > 0) {
					stops.push(
						{offset: 0, color: color2},
						{offset: r_offset, color: color2},
						{offset: r_offset, color: color1},
						{offset: 1, color: color1});
				}

				return create_gradient(id, stops)
			});

		text = bar.append("text")
			.attr("dy", ".75em")
			.attr("y", -15)
			.attr("x", x(d3.min(trial_diffs) + data[0].dx) / 2)
			.attr("text-anchor", "middle")
			.text(function(d) { return formatCount(d.y); });

		text.style("font-size", function() {return Math.min(15, ((x(d3.min(trial_diffs) + data[0].dx)) / this.getComputedTextLength() * 10)) + "px";});
		
		permutation_svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);
	});
});
