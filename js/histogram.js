"use strict";
var socket = io.connect();
$(document).ready(function () {
	var margin = {top: 20, right: 20, bottom: 30, left: 40},
    canvas_width = 960 - margin.left - margin.right,
    canvas_height = 500 - margin.top - margin.bottom;
	// var canvas_width = 70;
	// var canvas_height = 500;
	var margin = 40;
	var radius = 4;
	var data_points = d3.map();
	var values;
	var x_domain = ["-10%~-8%", "-8%~-6%", "-6%~-4%", "-4%~-2%", "-2%~0%", "0%~2%", "2%~4%", "4%~6%", "6%~8%", "8%~10%"];
    
    var colors = d3.scale.category20();
    var all_diff_positions = d3.map();

	var playerDict = {};
	// var colorList; // Array
	var colorDict = d3.map();
	socket.on('hothandResult', function (res) {
		socket.emit("colors");
		playerDict = res.playerDict;
		d3.select("#histogramsvg").remove();
	});
	socket.on("colorResult", function (res) {
		// colorList = res.colorResults;
		makeD3(playerDict, res.colorResults);
	});

	function makeD3(rows, colorList) {

		for (var key in rows) {
			if (rows[key].hot_shots >= 50) {
				data_points.set(key, rows[key]);
			}
		}

		values = data_points.values();

		for (var i = 0; i < colorList.length; i++) {
			colorDict.set(colorList[i].Player_ID, colorList[i]);
			if (!all_diff_positions.has(colorList[i].Position)) {
				all_diff_positions.set(colorList[i].Position, colorList[i]);
			}
		}
        
        // drawLegend(all_diff_names.values());

		var x = d3.scale.ordinal()
		    .rangeRoundBands([0, canvas_width], .1);

		var y = d3.scale.linear()
		    .rangeRound([canvas_height, 0]);

		var xAxis = d3.svg.axis()
		    .scale(x)
		    .orient("bottom")
		    .tickValues(x_domain);

		var yAxis = d3.svg.axis()
		    .scale(y)
		    .orient("left")
		    .tickFormat(d3.format(".2s"));

		var svg = d3.select("#histogram_div").append("svg").attr("id", "histogramsvg")
		    .attr("width", canvas_width + 40) // +left margin +right margin
		    .attr("height", canvas_height + 70) // +top margin + bottom margin
		  	.append("g")
		    .attr("transform", "translate(" + 50 + "," + 10 + ")");


	  	colors.domain(all_diff_positions.keys());

	  	// parse data
		var num_bin = 10;
		var bin_elements_count = new Array(num_bin).fill(0);
		var bin_values = d3.map();
	  	values.forEach(function(d) {
	    	var y0 = 0;
	    	d.diff = d.hot_fg-d.reg_fg;
	    	var bin_int = Math.min(Math.max(Math.round(d.diff * 100), -10), 8);
	    	if (bin_int%2 != 0) {
	    		if (bin_int>=0) bin_int += 1;
	    		else bin_int -=1;
	    	}
	    	d.bin = bin_int+"%~"+(bin_int+2)+"%";
	    	bin_elements_count[(bin_int+10)/2] += 1;

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
	  	console.log(bin_values.keys());

	  	for (var i = 0; i < bin_values.size(); i++) {
	  		var y0 = 0;
	  		var temp = bin_values.get(x_domain[i]);
	  		if (i == bin_values.size()-1) {
	  			console.log("8 TO 10");
	  			console.log(temp);
	  		}
	  		if (!temp) continue;
	  		temp.sort(function(a, b) {
	  			var record1 = colorDict.get(a.player_link);
	  			var record2 = colorDict.get(b.player_link);
	  			return record2.Position.localeCompare(record1.Position);
	  		});
	  		for (var j = 0; j < temp.length; j++) {
	  			temp[j].y0 = y0;
	  			temp[j].y1 = y0 += 1;
	  		}
	  	}

	  	// var x_domain = new Array(num_bin);
	  	// for (var i = 0; i < num_bin; i++) {
	  	// 	x_domain[i] = i;
	  	// }
	  	x.domain(x_domain); //bin_value.domain()
	  	y.domain([0, d3.max(bin_elements_count)]);

	  	svg.append("g")
	      	.attr("class", "x axis histoaxis")
	      	.attr("transform", "translate(0," + canvas_height + ")")
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
		    .attr("transform", function(d) {
		    	return "translate(" + x(d[0].bin) + ",0)"; });

		bin.selectAll("rect")
		    .data(function(d) { return d; })
		    .enter().append("rect")
		    .attr("width", function(d) { return x.rangeBand();})
		    .attr("y", function(d) {
		    	if (d.y1 === undefined) console.log(d);
		    	return y(d.y1); })
		    .attr("height", function(d) { 
		    	return y(d.y0) - y(d.y1); })
		    .style("fill", function(d) { 
		    	var color_record = colorDict.get(d.player_link);
		    	return colors(color_record.Position); 
		    });

		var legend = svg.selectAll(".legend")
		    .data(colors.domain().slice().reverse())
		    .enter().append("g")
		    .attr("class", "legend")
		    .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

		legend.append("rect")
		    .attr("x", 100+30)
		    .attr("width", 18)
		    .attr("height", 18)
		    .style("fill", colors);

		legend.append("text")
		    .attr("x", 100+24)
		    .attr("y", 9)
		    .attr("dy", ".35em")
		    .style("text-anchor", "end")
		    .text(function(d) { return d; });

    }
});
