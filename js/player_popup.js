// Adapted from code here: https://bl.ocks.org/mbostock/3883245
var socket = io.connect();
$(document).ready(function() {
	socket.on('player_stats_result', function(distance_objs) {
		hot_freqs = [];
		hot_fgp = [];
		reg_freqs = [];
		reg_fgp = [];
		for (var i = 0; i <= 30; i++) {
			if (distance_objs.hasOwnProperty(i)) {
				hot_freqs.push({distance: i, freq: distance_objs[i].hot_freq});
			} else {
				hot_freqs.push({distance: i, freq: 0});
			}
		}
		console.log(distance_objs);
		console.log(hot_freqs);
		/*
		for (distance in distance_objs) {
			curr_obj = distance_objs[distance];
			hot_fgp.push({distance: distance, fgp: curr_obj.hot_fg});
			reg_freqs.push({distance: distance, freq: curr_obj.reg_freq});
			reg_fgp.push({distance: distance, fgp: curr_obj.reg_fg});
		}
*/
		d3.select("#hot_frequency_svg").remove();
		
		var margin = {top: 20, right: 20, bottom: 40, left: 70};
		var width = 400 - margin.left - margin.right;
		var height = 300 - margin.top - margin.bottom;

		var xValue = function(d) { return d.distance; };
		var yValue = function(d) { return d.freq; };

		var xDomain = [0, 30];
		var xScale = d3.scale.linear()
			.domain(xDomain)
		    .range([0, width]).nice();

		var yDomain = [0, d3.max(hot_freqs, yValue) + .03];
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
			.orient("left");

		var line = d3.svg.line()
			.interpolate("monotone")
			.x(function(d) { console.log(yScale(yValue(d)));
				console.log(d);
				return xScale(xValue(d)); })
			.y(function(d) { return yScale(yValue(d)); });

		var svg = d3.select("#hot_frequency").append("svg")
			.attr("id", "hot_frequency_svg")
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
			.text("Frequency of shots");

		svg.append("path")
			.datum(hot_freqs)
			.attr("class", "line hot_frequencies")
			.attr("d", line)
			.style("stroke", "red")
			.style("stroke-width", "2px")
			.style("fill", "none");
		
		var focus = svg.append('g').style('display', 'none');
		
		focus.append('line')
			.attr('id', 'focusLineDist')
			.attr('class', 'focusLine')
			.style({
				"fill": "none",
				"stroke": "steelblue",
				"stroke-width": "0.5px"
			});

		focus.append('line')
			.attr('id', 'focusLineHotFreq')
			.attr('class', 'focusLine')
			.style({
				"fill": "none",
				"stroke": "steelblue",
				"stroke-width": "0.5px"
			});
		
		focus.append('circle')
			.attr('id', 'focusCircle')
			.attr('r', 5)
			.attr('class', 'circle focusCircle')
			.style({
				"fill": "red",
				"stroke": "black",
				"stroke-width": "2px"
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
				var i = bisectDistance(hot_freqs, mouseDistance);
				var d0 = hot_freqs[i - 1];
				var d1 = hot_freqs[i];

				var d = mouseDistance - xValue(d0) > xValue(d1) - mouseDistance ? d1 : d0;
				var x = xScale(xValue(d));
				var y = yScale(yValue(d));

				focus.select('#focusCircle')
					.attr('cx', x)
					.attr('cy', y);

				focus.select('#focusLineDist')
					.attr('x1', x).attr('y1', yScale(yDomain[0]))
					.attr('x2', x).attr('y2', yScale(yDomain[1]));
			
				focus.select('#focusLineHotFreq')
					.attr('x1', xScale(xDomain[0])).attr('y1', y)
					.attr('x2', xScale(xDomain[1])).attr('y2', y);
			});
	});
});
