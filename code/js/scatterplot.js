$(document).ready(function() {
    var canvas_width = 700;
    var canvas_height = 500;
    var margin = 40;
    var radius = 4;
	var data_points = d3.map();

    var tooltip = d3.select("#alex")
        .append("div")
        .attr("class", "alextooltip")
        .style("opacity", 0);

    d3.csv("../data/shooting_numbers.csv", function(d) {
	
		return {
			player_link: d.player_link,
			player_name: d.player_name,
			regular_fgp: parseFloat(d.regular_fgp),
			hot_fgp: parseFloat(d.hot_fgp),
			num_hot_shots: parseInt(d.num_hot_shots)
		}; 
	
	}, function(rows) {

		for (var i = 0; i < rows.length; i++) {
			if (rows[i].num_hot_shots >= 50) {
				data_points.set(rows[i].player_link, rows[i]);
			}
		}

		values = data_points.values();

    	var xValue = function(d) { return d.num_hot_shots; };
    	var yValue = function(d) { return d.hot_fgp - d.regular_fgp; };

    	var xScale = d3.scale.pow().exponent(.5)
			.domain([d3.min(values, xValue) - 10, d3.max(values, xValue) + 10])
			.range([margin, canvas_width - margin * 2]);
    	
		var yScale = d3.scale.linear()
        	.domain([d3.min(values, yValue) - .01, d3.max(values, yValue) + .01])
        	.range([canvas_height - margin, margin]);

    	var xAxis = d3.svg.axis()
			.scale(xScale)
			.orient("bottom")
			.ticks(5);

    	var yAxis = d3.svg.axis()
	        .scale(yScale)
    	    .orient("left")
        	.ticks(5);
		
        var svg = d3.select("#alex").append("svg")
            .attr("id", "alexsvg")
            .attr("width", canvas_width)
            .attr("height", canvas_height);

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0, " + (canvas_height - margin) + ")")
            .call(xAxis)
            .append("text")
            .attr("class", "label")
            .attr("x", canvas_width-margin * 2)
            .attr("y", -6)
            .attr("text-anchor", "end")
            .text("# Hot Shots");

        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + margin + ",0)")
            .call(yAxis)
            .append("text")
            .attr("class","label")
            .attr("transform", "rotate(-90)")
            .attr("y", 12)
            .attr("x", -40)
            .style("text-anchor", "end")
            .text("Percent Difference");
        
        svg.selectAll("circle")
            .data(data_points.values())
            .enter()
            .append("circle")
            .attr("cx", function(d) { return xScale(xValue(d)) })
            .attr("cy", function(d) { return yScale(yValue(d)) })
            .attr("class", function(d) { return d.player_link })
            .on("mouseover", handleMouseIn)
            .on("mouseout", handleMouseOut)
            .attr("r", radius)
            .attr("fill", "red");
    });
    

    function handleMouseOut() {
        tooltip.transition().duration(500).style("opacity", 0);
    };

    function handleMouseIn() {
        var player_link = d3.select(this).attr("class");
        var point = data_points.get(player_link);
        
		tooltip.html(point.player_name + "<br>Hot Percentage: " + point.hot_fgp.toFixed(3) + "<br>Regular Percentage: " + point.regular_fgp + "<br>Hot Shots Taken: " + point.num_hot_shots)
			.style("left", d3.event.pageX + "px")
			.style("top", (d3.event.pageY -28) + "px");
        
		tooltip.transition()
            .duration(200)
            .style("opacity", .9);
    };
});
