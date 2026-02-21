
function plotOverviewTabView(type)
{
    $('.table-new-heat').empty();
    var url=  '/etf/GetOverviewData?type='+type;
    $.getJSON(url,
        function(data) {
            var heatmapData = data.heatmapData;
            plotHeatmapView(heatmapData,"table-new-heat");
        });
}

function plotHeatmapView(heatmapData,tableId)
{

	var headingItem = '<tr>';
    var dataItem = '<tr>';

    var count=1;
    $.each(heatmapData, function(key,value){

            headingItem = headingItem+'<th style="width: 150px">'+value.symbol+'</th>';
            dataItem = dataItem+'<td  ><a style="cursor:pointer " data-tooltip="sticky1" onclick="heatMapItemClick(\''+value.symbol+'\',\''+value.companyName+'\')"><div class="'+getColorClass(value.change_pct)+' heatmapItem" id="heat_'+value.symbol+'"><h4>'+value.change_pct+'%</h4></div></a></td>';

        if(count%7==0 && count>1)
        {
			headingItem = headingItem+'</tr>';
            dataItem = dataItem+'</tr>';

            $('.'+tableId).append(headingItem);
            $('.'+tableId).append(dataItem);
            headingItem = '<tr>';
            dataItem = '<tr>';
			}

        count++;
    });

    headingItem = headingItem+'</tr>';
    dataItem = dataItem+'</tr>';
    if(headingItem !='<tr>')
    {
        $('.'+tableId).append(headingItem);
        $('.'+tableId).append(dataItem);
    }

    $.each(heatmapData, function(key,value){
        var color= getColor(value.change_pct);
		if(value.chartPoints!=null && value.chartPoints!=undefined )
		{
        var chartData = value.chartPoints.chartData;
		var startDate = value.chartPoints.startDate;
		var endDate = value.chartPoints.endDate;
        drowAreaChartInHeatmap(chartData,'heat_'+value.symbol, color,startDate,endDate); //chartwithDataPoints.js
		}
    });



}


function drowAreaChartInHeatmap(data, div,color,startDate, endDate)
{
    var width = 155;
    width = $("#"+div).width();
    if(width==0)
		width = 155;

    var  height = 55,
    margin = {
        top: 10,
        right: 0,
        bottom: 0,
        left: 0
    },
    g_width = width - margin.left - margin.right,
    g_height = height - margin.top - margin.bottom;

    //svg
    var svg = d3.select("#"+div).append("svg");
    svg.attr("width",width)
    .attr("height",height);

    var g = svg.append("g");
    //50px
    g.attr("transform", "translate("+ margin.left +","+margin.top+")");


    //x,y
    var x_scale = d3.scale.linear()
    .domain([0,data.length-1])  //
    .range([0,g_width]);  //

    var y_scale = d3.scale.linear()
    .domain([0,d3.max(data)])  //d3.max(data)
    .range([g_height+100,0]);  //

    //
    var area_generator = d3.svg.area()
    .x(function(d,i){
        return x_scale(i);
    })  //path
    .y0(g_height)
    .y1(function(d){
        return y_scale(d);
    })  //path
    .interpolate("cardinal");  //interpolate("cardinal") cardinal


    //
    var path = g.append("path");
    path.attr("d", area_generator(data))
    .attr("fill",color)
    .attr("stroke","white")
    .attr("stroke-width","1");

    //
    var x_axis = d3.svg.axis().scale(x_scale).orient("bottom");
    var x_g = g.append("g");
    x_g.attr("transform","translate(0,"+(g_height)+")")
    .call(x_axis);

	 svg.append("text")
     // .attr("class", "title")
      .attr("x", 5)
	  .attr("fill", "white")
      .attr("y", g_height-1)
      .text(startDate);

    svg.append("text")
     // .attr("class", "title")
      .attr("x", g_width-40)
      .attr("y", g_height)
	  .attr("fill", "white")
      .text(endDate);


}

function getColor(value)
{
    // var value = parseFloat(value1);
    var colorClass ='#565555';
    if(value<=-2)
    {
        colorClass ='#A74242';
    }else if(value>-2 && value<=-.5  ){
        colorClass ='#FC2D2D';
    }else if(value< .5 && value>-.5 ){
        colorClass ='#565555';
    }else if(value<= 2 && value >.5 ){
        colorClass ='#4D754D';
    }
    else if(value>2 ){
        colorClass ='#33DE33';
    }

    return colorClass;
}
function getColorClass(value)
{
    var colorClass ='gray1';
    if(value<=-2)
    {
        colorClass ='red1';
    }else if(value>-2 && value<=-.5 ){
        colorClass ='red2';
    }else if(value< .5 && value>-.5 ){
        colorClass ='gray1';
    }else if(value<= 2 && value >.5 ){
        colorClass ='green1';
    }
    else if(value>2 ){
        colorClass ='green22';
    }

  return colorClass;
}
