var socket = io.connect();
$(document).ready(function () {
	var canvas_width = 700;
	var canvas_height = 500;
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

	var tooltip = d3.select("#scatterplot_div")
		.append("div")
		.attr("class", "alextooltip")
		.style("opacity", 0);


	function makeD3(rows) {

		for (key in rows) {
			if (rows[key].hot_shots >= 50) {
				data_points.set(key, rows[key]);
			}
		}

		values = data_points.values();
// <<<<<<< HEAD
        
        for (var i = 0; i < 5; i++) {
            if (!all_diff_names.has(values[i].player_name)) {
                all_diff_names.set(values[i].player_name, values[i]);
            };
        }
        drawLegend(all_diff_names.values());

		var xValue = function(d) { return d.regular_fgp; };
		var yValue = function(d) { return d.hot_fgp; };
// =======

// 		var xValue = function (d) {
// 			return d.reg_fg;
// 		};
// 		var yValue = function (d) {
// 			return d.hot_fg;
// 		};
// >>>>>>> 21692c472d03a985e26be47ebab162169727ff1c

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
				class: "averageline"
				, x1: xScale(d3.min(values, xValue) - .01)
				, x2: xScale(d3.max(values, xValue) + .01)
				, y1: yScale(d3.min(values, xValue) - .01)
				, y2: yScale(d3.max(values, xValue) + .01)
			})
			.style({
				stroke: "gray"
				, "stroke-width": "3px"
				, "stroke-linecap": "round"
			});
// <<<<<<< HEAD
        
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
            .attr("fill", function(d) { return colors(d.player_link); });

        // var li = {
        //     w: 75, h: 30, s: 3, r: 3
        // };
        // svg.append("rect")
        //     .data(all_diff_names)
        //     .attr("rx", li.r)
        //     .attr("ry", li.r)
        //     .attr("width", li.w)
        //     .attr("height", li.h)
        //     .style("fill", function(d) { return colors(d); });

        // svg.append("text")
        //     .data(all_diff_names)
        //     .attr("x", li.w / 2)
        //     .attr("y", li.h / 2)
        //     .attr("dy", "0.35em")
        //     .attr("text-anchor", "middle")
        //     .text(function(d) { return d; });
        

        d3.selectAll("input").on("change", function change() {
            if (this.value == "team") {
                svg.selectAll("circle")
                    .transition()
                    .duration(1000)
                    .attr("fill", function(d) { return colors(d.player_link); });
            } else if (this.value == "name") {
                svg.selectAll("circle")
                    .transition()
                    .duration(1000)
                    .attr("fill", function(d) { return colors(d.player_name); })
            } 
        });
	});

    function drawLegend(all_records) {
        var li = {
            w: 75, h: 30, s: 3, r: 3
        };

        var legend = d3.select("#legend").append("svg")
            .attr("width", li.w)
            .attr("height", (all_records.length) * (li.h + li.s));

        var g = legend.selectAll("g")
            .data(all_records)
            .enter().append("g")
            .attr("transform", function(d, i) {
                return "translate(0," + i * (li.h + li.s) + ")";
            });

        g.append("rect")
            .attr("rx", li.r)
            .attr("ry", li.r)
            .attr("width", li.w)
            .attr("height", li.h)
            .style("fill", function(d) { console.log(d) ;return colors(d.player_name); });

        g.append("text")
            .attr("x", li.w / 2)
            .attr("y", li.h / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(function(d) { 
                fullname = d.player_name.split(" ");
                console.log(fullname);
                result = "";
                for (var i = 0; i < fullname.length; i++) {
                    result += fullname[i].charAt(0) + ".";
                }
                return result; });
}
    

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
        
// =======

// 		svg.selectAll("circle")
// 			.data(data_points.values())
// 			.enter()
// 			.append("circle")
// 			.attr("cx", function (d) {
// 				return xScale(xValue(d))
// 			})
// 			.attr("cy", function (d) {
// 				return yScale(yValue(d))
// 			})
// 			.attr("class", function (d) {
// 				return d.player_link
// 			})
// 			.on("mouseover", handleMouseIn)
// 			.on("mouseout", handleMouseOut)
// 			.attr("r", radius)
// 			.attr("fill", "red");

// 	}




// 	function handleMouseOut() {
// 		tooltip.transition().duration(500).style("opacity", 0);
// 	};

// 	function handleMouseIn() {
// 		var player_link = d3.select(this).attr("class");
// 		var point = data_points.get(player_link);
// 		var difference = ((point.hot_fg - point.reg_fg) * 100).toFixed(1);

// 		tooltip.html(point.player_name + "<br>Hot FG%: " + (point.hot_fg * 100).toFixed(1) + "%<br>Regular FG%: " + (point.reg_fg * 100).toFixed(1) + "%<br>% Difference: " + difference + "%<br>Hot Shots Taken: " + point.hot_shots)
// 			.style("left", (d3.mouse(this)[0] + 100) + "px")
// 			.style("top", d3.mouse(this)[1] + "px")

// >>>>>>> 21692c472d03a985e26be47ebab162169727ff1c
		tooltip.transition()
			.duration(200)
			.style("opacity", .9);
	};
});