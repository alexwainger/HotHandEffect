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
    
    var colors = d3.scale.category20c();
    var all_diff_names = d3.map();

	var playerDict = {};
	socket.on('hothandResult', function (res) {
		playerDict = res.playerDict;
		console.log("got response");
		d3.select("svg").remove();
		makeD3(playerDict);
	});


	function makeD3(rows) {

		for (key in rows) {
			if (rows[key].hot_shots >= 50) {
				data_points.set(key, rows[key]);
			}
		}

		values = data_points.values();
		values = values.slice(0, 50);

        for (var i = 0; i < values.length; i++) {
        	// var fullname = values[i].player_name.split(" ");
         //    var result = "";
         //    for (var i = 0; i < fullname.length; i++) {
         //        result += fullname[i].charAt(0) + ".";
         //    }
            if (!all_diff_names.has(values[i].player_name)) {
                all_diff_names.set(values[i].player_name, values[i]);
            }
        }
        
        // drawLegend(all_diff_names.values());

		
		var x = d3.scale.ordinal()
		    .rangeRoundBands([0, canvas_width], .1);

		var y = d3.scale.linear()
		    .rangeRound([canvas_height, 0]);

		var xAxis = d3.svg.axis()
		    .scale(x)
		    .orient("bottom");

		var yAxis = d3.svg.axis()
		    .scale(y)
		    .orient("left")
		    .tickFormat(d3.format(".2s"));

		var svg = d3.select("#histogram_div").append("svg")
		    .attr("width", canvas_width + 40) // +left margin +right margin
		    .attr("height", canvas_height + 70) // +top margin + bottom margin
		  	.append("g")
		    .attr("transform", "translate(" + 50 + "," + 10 + ")");


	  	colors.domain(all_diff_names.keys());

	  	// parse data
		var num_bin = 10;
		var bin_elements_count = new Array(num_bin).fill(0);
		var bin_values = d3.map();
	  	values.forEach(function(d) {
	    	var y0 = 0;
	    	d.diff = d.hot_fg-d.reg_fg;
	    	d.bin = Math.min(Math.max(Math.round(d.diff * 100)+num_bin/2, 0), num_bin-1);
	    	bin_elements_count[d.bin] += 1;
	    	// d.category = colors.domain().map(function(player_name) {
	    	// 	var player = all_diff_names.get(player_name);
	    	// 	var diff = player.hot_fg - player.reg_fg;
	    	// 	var bin = Math.min(Math.max(Math.round(diff * 100)+num_bin/2, 0), num_bin-1);
	    	// 	if (bin == d.bin) {
	    	// 		return {player_name:player_name, y0:y0, y1: y0 += 1};
	    	// 	};
	    	// });
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

	  	for (var i = 0; i < bin_values.size(); i++) {
	  		var y0 = 0;
	  		var temp = bin_values.get(i);
	  		if (!temp) continue;
	  		temp.sort(function(a, b) {
	  			return b.player_name.localeCompare(a.player_name);
	  		});
	  		for (var j = 0; j < temp.length; j++) {
	  			temp[j].y0 = y0;
	  			temp[j].y1 = y0 += 1;
	  		}
	  	}


	  	console.log(bin_values);

	  	var x_domain = new Array(num_bin);
	  	for (var i = 0; i < num_bin; i++) {
	  		x_domain[i] = i;
	  	}
	  	x.domain(x_domain); //bin_value.domain()
	  	y.domain([0, d3.max(bin_elements_count)]);

	  	svg.append("g")
	      	.attr("class", "x axis")
	      	.attr("transform", "translate(0," + canvas_height + ")")
	      	.call(xAxis);

	  	svg.append("g")
	      	.attr("class", "y axis")
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
		    	console.log("d = "+d);
		    	return "translate(" + x(d[0].bin) + ",0)"; });

		// var bin = hist.selectAll(".bin")
		// 	.data(function(d) {return d;})
		// 	.enter().append("g")
		// 	.attr("class", "g")
		// 	.attr("transform", function(d) {
		// 		console.log(d);
		// 		return "translate(" + x(d.bin) + ",0)";
		// 	});

		bin.selectAll("rect")
		    .data(function(d) {return d;})
		    .enter().append("rect")
		    .attr("width", function(d) {console.log("width"); return x.rangeBand();})
		    .attr("y", function(d) { return y(d.y1); })
		    .attr("height", function(d) { console.log("hello"); return y(d.y0) - y(d.y1); })
		    .style("fill", function(d) { return colors(d.player_name); });

		// var legend = svg.selectAll(".legend")
		//     .data(color.domain().slice().reverse())
		//     .enter().append("g")
		//     .attr("class", "legend")
		//     .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

		// legend.append("rect")
		//     .attr("x", width - 18)
		//     .attr("width", 18)
		//     .attr("height", 18)
		//     .style("fill", color);

		// legend.append("text")
		//     .attr("x", width - 24)
		//     .attr("y", 9)
		//     .attr("dy", ".35em")
		//     .style("text-anchor", "end")
		//     .text(function(d) { return d; });

    }
});