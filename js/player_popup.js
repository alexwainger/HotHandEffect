// Adapted from code here: https://bl.ocks.org/mbostock/3883245
var socket = io.connect();
$(document).ready(function() {
	socket.on('player_stats_result', function(distance_objs) {
		hot_freqs = [];
		reg_freqs = [];
		hot_fgps = [];
		reg_fgps = [];
		for (var i = 0; i <= 30; i++) {
			if (distance_objs.hasOwnProperty(i)) {
				hot_freqs.push({distance: i, value: distance_objs[i].hot_freq});
				reg_freqs.push({distance: i, value: distance_objs[i].reg_freq});
				hot_fgps.push({distance: i, value: distance_objs[i].hot_fg});
				reg_fgps.push({distance: i, value: distance_objs[i].reg_fg});
			} else {
				hot_freqs.push({distance: i, value: 0});
				reg_freqs.push({distance: i, value: 0});
				hot_fgps.push({distance: i, value: 0});
				reg_fgps.push({distance: i, value: 0});
			}
		}

		console.log(hot_fgps);
		console.log(hot_freqs);
		var freqConfigs = {
			svgID: "player_frequency_svg",
			divID: "player_frequency",
			hot_data: hot_freqs,
			reg_data: reg_freqs,
			distFocusLineID: "focusLineDistFreq",
			hotFocusLineID: "focusLineHotFreq",
			regFocusLineID: "focusLineRegFreq",
			hotFocusCircleID: "focusCircleHotFreq",
			regFocusCircleID: "focusCircleRegFreq",
			yLabel: "Frequency of shots"
		};

		var fgpConfigs = {
			svgID: "player_fgp_svg",
			divID: "player_fgp",
			hot_data: hot_fgps,
			reg_data: reg_fgps,
			distFocusLineID: "focusLineDistFGP",
			hotFocusLineID: "focusLineHotFGP",
			regFocusLineID: "focusLineRegFGP",
			hotFocusCircleID: "focusCircleHotFGP",
			regFocusCircleID: "focusCircleRegFGP",
			yLabel: "Field Goal %"
		};

		var createLineGraph = function(configs) {
			d3.select("#" + configs.svgID).remove();
			var w = $(document.getElementById("player_frequency")).width();
			console.log("grpah to get height: "+w);
			var margin = {top: 20, right: 20, bottom: 40, left: 70};
			var width = 400 - margin.left - margin.right;
			var height = 350 - margin.top - margin.bottom;
			
			var xValue = function(d) { return d.distance; };
			var yValue = function(d) { return d.value; };
			
			var xDomain = [0, 30];
			var xScale = d3.scale.linear()
				.domain(xDomain)
		    	.range([0, width]).nice();
			
			var yDomain = [0, Math.max(d3.max(configs.hot_data, yValue), d3.max(configs.reg_data, yValue)) + .02];
			var yScale = d3.scale.linear()
				.domain(yDomain)
				.range([height, 0]).nice();

			var xAxis = d3.svg.axis()
				.scale(xScale)
				.orient("bottom");
		
			var formatPercent = d3.format(".0%");
			var yAxis = d3.svg.axis()
				.scale(yScale)
				.tickFormat(formatPercent)
				.orient("left")
				.ticks(5);
		
			var line = d3.svg.line()
				.interpolate("monotone")
				.x(function(d) { return xScale(xValue(d)); })
				.y(function(d) { return yScale(yValue(d)); });
		
			var svg = d3.select("#" + configs.divID).append("svg")
				.attr("id", configs.svgID)
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis)
				.append("text")
				.attr("transform", "translate(" + width/2 + "," + (margin.bottom-5) + ")")
				.style("text-anchor", "middle")
				.text("Distance (ft)");
		
			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis)
				.append("text")
				.attr("transform", "translate(-50,"+(height/2)+")rotate(-90)")
				.style("text-anchor", "middle")
				.text(configs.yLabel);
		
			svg.append("path")
				.datum(configs.hot_data)
				.attr("class", "line")
				.attr("d", line)
				.style("stroke", "red")
				.style("stroke-width", "3px")
				.style("fill", "none");
		
			svg.append("path")
				.datum(configs.reg_data)
				.attr("class", "line")
				.attr("d", line)
				.style({
					"stroke": "steelblue",
					"stroke-width": "3px",
					"fill": "none"
				});
		
			var focus = svg.append('g').style('display', 'none');
			focus.append('line')
				.attr('id', configs.distFocusLineID)
				.attr('class', 'focusLine')
				.style({
					"fill": "none",
					"stroke": "black",
					"stroke-width": "0.5px"
				});
		
			focus.append('line')
				.attr('id', configs.hotFocusLineID)
				.attr('class', 'focusLine')
				.style({
					"fill": "none",
					"stroke": "red",
					"stroke-width": "1px"
				});
		
			focus.append('line')
				.attr('id', configs.regFocusLineID)
				.attr('class', 'focusLine')
				.style({
					"fill": "none",
					"stroke": "steelblue",
					"stroke-width": "1px"
				});
		
			focus.append('circle')
				.attr('id', configs.hotFocusCircleID)
				.attr('r', 3)
				.attr('class', 'circle focusCircle')
				.style({
					"fill": "red",
					"stroke": "black",
					"stroke-width": ".5px"
				});
		
			focus.append('circle')
				.attr('id', configs.regFocusCircleID)
				.attr('r', 3)
				.attr('class', 'circle focusCircle')
				.style({
					"fill": "steelblue",
					"stroke": "black",
					"stroke-width": ".5px"
				});
		
			var bisectDistance = d3.bisector(function(d) { return xValue(d); }).left;
			svg.append('rect')
				.attr('class', 'overlay')
				.attr('width', width)
				.attr('height', height)
				.style({
					"fill": "none",
					"stroke": "none",
					"pointer-events": "all"
				})
				.on('mouseover', function() { focus.style('display', null); })
				.on('mouseout', function() { focus.style('display', 'none'); })
				.on('mousemove', function() {
					var mouse = d3.mouse(this);
					var mouseDistance = xScale.invert(mouse[0]);

					function getPoint(data) {
						var i = bisectDistance(data, mouseDistance);
						if (i == 0) {
							return data[i];
						} else {
							var d0 = data[i - 1];
							var d1 = data[i];
							return (mouseDistance - xValue(d0) > xValue(d1) - mouseDistance ? d1 : d0);
						}
					}

					d_hot = getPoint(configs.hot_data);
					d_reg = getPoint(configs.reg_data);

					var x_hot = xScale(xValue(d_hot));
					var y_hot = yScale(yValue(d_hot));
					var x_reg = xScale(xValue(d_reg));
					var y_reg = yScale(yValue(d_reg));

					focus.select("#" + configs.hotFocusCircleID)
						.attr('cx', x_hot)
						.attr('cy', y_hot);

					focus.select("#" + configs.regFocusCircleID)
						.attr('cx', x_reg)
						.attr('cy', y_reg);

					focus.select("#" + configs.distFocusLineID)
						.attr('x1', x_hot).attr('y1', yScale(yDomain[0]))
						.attr('x2', x_hot).attr('y2', yScale(yDomain[1]));

					focus.select("#" + configs.hotFocusLineID)
						.attr('x1', xScale(xDomain[0])).attr('y1', y_hot)
						.attr('x2', xScale(xDomain[1])).attr('y2', y_hot);
				
					focus.select("#" + configs.regFocusLineID)
						.attr('x1', xScale(xDomain[0])).attr('y1', y_reg)
						.attr('x2', xScale(xDomain[1])).attr('y2', y_reg);
				});
		}

		createLineGraph(freqConfigs);
		createLineGraph(fgpConfigs);
	});
});
