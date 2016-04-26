$(document).ready(function() {
    var canvas_width = 700;
    var canvas_height = 500;
    var margin = 40;
    var radius = 4;
	var data_points = d3.map();

    var tooltip = d3.select("#scatterplot_div")
        .append("div")
        .attr("class", "alextooltip")
        .style("opacity", 0);

    d3.csv("/cs1951a_final/data/archive/shooting_numbers.csv", function(d) {
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
		
		var xValue = function(d) { return d.regular_fgp; };
		var yValue = function(d) { return d.hot_fgp; };

		var xScale = d3.scale.pow().exponent(.1)
			.domain([d3.min(values, xValue) - .01, d3.max(values, xValue) + .01])
			.range([margin, canvas_width - margin * 2]);

		var yScale = d3.scale.pow().exponent(.1)
        	.domain([d3.min(values, yValue) - .01, d3.max(values, yValue) + .01])
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
		
        var svg = d3.select("#scatterplot_div").append("svg")
            .attr("id", "alexsvg")
            .attr("width", canvas_width)
            .attr("height", canvas_height);

        svg.append("g")
            .attr("class", "x axis scatteraxis")
            .attr("transform", "translate(0, " + (canvas_height - margin) + ")")
            .call(xAxis)
            .append("text")
            .attr("class", "label")
            .attr("x", canvas_width-margin * 2)
            .attr("y", -6)
            .attr("text-anchor", "end")
            .text("Regular FG%");

        svg.append("g")
            .attr("class", "y axis scatteraxis")
            .attr("transform", "translate(" + margin + ",0)")
            .call(yAxis)
            .append("text")
            .attr("class","label")
            .attr("transform", "rotate(-90)")
            .attr("y", 12)
            .attr("x", -40)
            .style("text-anchor", "end")
            .text("Hot Hand FG%");
		
		svg.append("line")
			.attr({
				class: "averageline",
				x1: xScale(d3.min(values, xValue) - .01),
				x2: xScale(d3.max(values, xValue) + .01),
				y1: yScale(d3.min(values, xValue) - .01),
				y2: yScale(d3.max(values, xValue) + .01)})
			.style({
				stroke: "gray",
				"stroke-width": "3px",
				"stroke-linecap": "round"
			});
        
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
		var difference = ((point.hot_fgp - point.regular_fgp) * 100).toFixed(1);
        
		tooltip.html(point.player_name + "<br>Hot FG%: " + (point.hot_fgp * 100).toFixed(1) + "%<br>Regular FG%: " + (point.regular_fgp * 100).toFixed(1) + "%<br>% Difference: " + difference + "%<br>Hot Shots Taken: " + point.num_hot_shots)
			.style("left", (d3.mouse(this)[0] + 100)+ "px")
			.style("top",  d3.mouse(this)[1] + "px")
        
		tooltip.transition()
            .duration(200)
            .style("opacity", .9);
    };
});
