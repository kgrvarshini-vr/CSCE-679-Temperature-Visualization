
"use strict";

// Path to the temperature dataset
const DATA_FILE = "temperature_daily.csv";

// Load and convert daily temperature data
async function loadTemperatureData() {
    try {
        const data = await d3.csv(DATA_FILE, (row) => ({
            date: d3.timeParse("%Y-%m-%d")(row.date),
            maxTemperature: Number(row.max_temperature),
            minTemperature: Number(row.min_temperature)
        }));

       const monthlyData = calculateMonthlyTemperatures(data);
       
       drawLevelOneHeatmap(monthlyData);
       drawLevelTwoHeatmap(data);

        return data;
    } catch (error) {
        console.error("Error loading temperature data:", error);
    }
}

// Start the visualization
loadTemperatureData();


// Level 1: Monthly temperature heatmap
// Each square represents one month in a specific year.
// The cell color shows the monthly maximum or minimum temperature,
// depending on the option selected by the user.

// Keep the heatmap dimensions in one place so they are easy to adjust.
const HEATMAP_CONFIG = {
    cellWidth: 32,
    cellHeight: 30,
    cellGap: 8,
    marginTop: 40,
    marginRight: 30,
    marginBottom: 30,
    marginLeft: 80
};

// Settings for the Level 2 daily temperature visualization.
const LEVEL2_CONFIG = {
    cellWidth: 55,
    cellHeight: 40,
    cellGap: 8,
    startYear: 2008,
    endYear: 2017,
    margin: { top: 40, right: 30, bottom: 60, left: 80 }
};

// Temperature ranges for the color scales and legends.
const TEMPERATURE_RANGES = {
    level1Max: [14, 40],
    level1Min: [0, 30],
    level2: [0, 40]
};


function calculateMonthlyTemperatures(dailyData) {
    // Group daily records by year and month.
    const monthlyGroups = d3.group(
        dailyData,
        record => record.date.getFullYear(),
        record => record.date.getMonth()
    );

    const monthlyTemperatures = [];

    // Find the highest and lowest recorded temperatures in each month.
    for (const [year, months] of monthlyGroups) {
        for (const [month, records] of months) {
            monthlyTemperatures.push({
                year: year,
                month: month,
                maxTemperature: d3.max(records, record => record.maxTemperature),
                minTemperature: d3.min(records, record => record.minTemperature)
            });
        }
    }

    return monthlyTemperatures;
}



function drawLevelOneHeatmap(monthlyData) {
    const temperatureMode = d3.select("#temperature-mode");
        temperatureMode.on("change", function () {
            const selectedMode = this.value;

        // Update the heatmap cell colors when the user changes the selection.
        d3.selectAll("#heatmap .temperature-cell")
            .attr("fill", record =>
                selectedMode === "max"
                ? temperatureColor(record.maxTemperature)
                : minimumTemperatureColor(record.minTemperature)
            );
        // Update the legend scale for the selected temperature mode.
        legendScale.domain(
            selectedMode === "max"
                ? TEMPERATURE_RANGES.level1Max
                : TEMPERATURE_RANGES.level1Min
        );
        // Update the legend colors and positions.
        const [legendStart, legendEnd] = selectedMode === "max"
            ? TEMPERATURE_RANGES.level1Max
            : TEMPERATURE_RANGES.level1Min;

        const legendStep = (legendEnd - legendStart) / 104;

        d3.selectAll("#heatmap .legend-color")
            .data(d3.range(104).map(i => legendStart + i * legendStep))
            .attr("x", temperature => legendScale(temperature))
            .attr("fill", temperature =>
                selectedMode === "max"
                    ? temperatureColor(temperature)
                    : minimumTemperatureColor(temperature)
            );

        // Update the legend tick labels.
        d3.select("#heatmap .legend-axis")
            .call(
                d3.axisBottom(legendScale)
                    .tickValues(
                        selectedMode === "max"
                            ? [14, 20, 25, 30, 35, 40]
                            : [0, 5, 10, 15, 20, 25, 30]
                    )       
            );
        // Update the legend title.
        d3.select(".temperature-legend-title")
            .text(
                selectedMode === "max"
                    ? "Monthly Maximum Temperature (°C)"
                    : "Monthly Minimum Temperature (°C)"
            );
        });
    // Get the years available in the temperature dataset.
    const years = [...new Set(monthlyData.map(record => record.year))].sort();

    // Arrange the years across the top and months down the left.
    const yearScale = d3.scaleBand()
        .domain(years)
        .range([0, years.length * (HEATMAP_CONFIG.cellWidth + HEATMAP_CONFIG.cellGap)])
        .paddingInner(0);

    const monthScale = d3.scaleBand()
        .domain(d3.range(12))
        .range([0, 12 * (HEATMAP_CONFIG.cellHeight + HEATMAP_CONFIG.cellGap)])
        .paddingInner(0);

    // Leave space around the chart for year and month labels.
    const chartWidth = yearScale.range()[1];
    const chartHeight = monthScale.range()[1];

    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", chartWidth + HEATMAP_CONFIG.marginLeft + HEATMAP_CONFIG.marginRight)
        .attr("height", chartHeight + HEATMAP_CONFIG.marginTop + HEATMAP_CONFIG.marginBottom + 40);

    const chart = svg.append("g")
        .attr("transform", `translate(${HEATMAP_CONFIG.marginLeft}, ${HEATMAP_CONFIG.marginTop})`);
    // Separate the year and month labels from the heatmap.
    chart.append("line")
    .attr("x1", -5)
    .attr("y1", -5)
    .attr("x2", chartWidth)
    .attr("y2", -5)
    .attr("stroke", "black")
    .attr("stroke-width", 1);

    chart.append("line")
    .attr("x1", -5)
    .attr("y1", -5)
    .attr("x2", -5)
    .attr("y2", chartHeight)
    .attr("stroke", "black")
    .attr("stroke-width", 1);

    // Small tick marks for each year.
    chart.selectAll(".year-tick")
    .data(years)
    .join("line")
    .attr("x1", year => yearScale(year) + HEATMAP_CONFIG.cellWidth / 2)
    .attr("x2", year => yearScale(year) + HEATMAP_CONFIG.cellWidth / 2)
    .attr("y1", -5)
    .attr("y2", -10)
    .attr("stroke", "black");

    // Small tick marks for each month.
    chart.selectAll(".month-tick")
    .data(d3.range(12))
    .join("line")
    .attr("x1", -5)
    .attr("x2", -10)
    .attr("y1", month => monthScale(month) + HEATMAP_CONFIG.cellHeight / 2)
    .attr("y2", month => monthScale(month) + HEATMAP_CONFIG.cellHeight / 2)
    .attr("stroke", "black");
    // Draw the month labels on the left.
    const monthNames = d3.timeFormat("%B");

    chart.selectAll(".month-label")
        .data(d3.range(12))
        .join("text")
        .attr("class", "month-label")
        .attr("x", -10)
        .attr("y", month => monthScale(month) + HEATMAP_CONFIG.cellHeight / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 11)
        .text(month => monthNames(new Date(2000, month, 1)));

    // Draw the year labels across the top.
    chart.selectAll(".year-label")
        .data(years)
        .join("text")
        .attr("class", "year-label")
        .attr("x", year => yearScale(year) + HEATMAP_CONFIG.cellWidth / 2)
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .text(year => year);
    
    // Use separate color scales for maximum and minimum temperatures.
    // Yellow represents cooler temperatures, while dark red represents hotter temperatures.
    const temperatureColor = d3.scaleSequential()
        .domain(TEMPERATURE_RANGES.level1Max)
        .interpolator(d3.interpolateYlOrRd);
    const minimumTemperatureColor = d3.scaleSequential()
        .domain(TEMPERATURE_RANGES.level1Min)
        .interpolator(d3.interpolateYlOrRd);
    // Draw one rectangle for each month and year in the dataset.
    chart.selectAll(".temperature-cell")
        .data(monthlyData)
        .join("rect")
        .attr("class", "temperature-cell")
        .attr("x", record => yearScale(record.year))
        .attr("y", record => monthScale(record.month))
        .attr("width", HEATMAP_CONFIG.cellWidth)
        .attr("height", HEATMAP_CONFIG.cellHeight)

        .attr("fill", record =>
            temperatureMode.property("value") === "max"
                ? temperatureColor(record.maxTemperature)
                : minimumTemperatureColor(record.minTemperature)
        )
        .append("title")
        .text(record => {
            const monthName = d3.timeFormat("%B")(
                new Date(record.year, record.month, 1)
            );

            return `${monthName} ${record.year}
Maximum Temperature: ${record.maxTemperature}°C
Minimum Temperature: ${record.minTemperature}°C`;
        });
    
    // Draw a horizontal legend that updates with the selected temperature mode.
    const legendWidth = 260;
    const legendHeight = 14;

    const legend = svg.append("g")
        .attr("transform", `translate(${HEATMAP_CONFIG.marginLeft}, ${HEATMAP_CONFIG.marginTop + chartHeight + 12})`);

    const legendScale = d3.scaleLinear()
        .domain(
            temperatureMode.property("value") === "max"
                ? TEMPERATURE_RANGES.level1Max
                : TEMPERATURE_RANGES.level1Min
        )
        .range([0, legendWidth]);

    legend.selectAll(".legend-color")
        .data(d3.range(104).map(i => {
            const range = temperatureMode.property("value") === "max"
                ? TEMPERATURE_RANGES.level1Max
                : TEMPERATURE_RANGES.level1Min;

            return range[0] + i * (range[1] - range[0]) / 104;
        }))
        .join("rect")
        .attr("class", "legend-color")
        .attr("x", temperature => legendScale(temperature))
        .attr("y", 0)
        .attr("width", legendWidth / 104 + 0.5)
        .attr("height", legendHeight)
        .attr("fill", temperature =>
            temperatureMode.property("value") === "max"
                ? temperatureColor(temperature)
                : minimumTemperatureColor(temperature)
        );

    legend.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .attr("font-size", 11)
        .attr("class", "temperature-legend-title")
        .text(
            temperatureMode.property("value") === "max"
                ? "Monthly Maximum Temperature (°C)"
                : "Monthly Minimum Temperature (°C)"
        );

    legend.append("g")
        .attr("class", "legend-axis")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(
            d3.axisBottom(legendScale)
                .tickValues(
                    temperatureMode.property("value") === "max"
                        ? [14, 20, 25, 30, 35, 40]
                        : [0, 5, 10, 15, 20, 25, 30]
                )
        );

}

// Level 2: Show daily temperature patterns within each month.
function drawLevelTwoHeatmap(dailyData) {
    // Group daily readings by year and month for the daily temperature lines.
    const dailyGroups = d3.group(
        dailyData,
        record => record.date.getFullYear(),
        record => record.date.getMonth()
    );

    // Use larger cells to display daily temperature lines.
    const { cellWidth, cellHeight, cellGap } = LEVEL2_CONFIG;

    // Level 2 focuses on the most recent ten years.
    const years = d3.range(
        LEVEL2_CONFIG.startYear,
        LEVEL2_CONFIG.endYear + 1
    );
    const months = d3.range(12);


    // Set the spacing for the years and months.
    const yearScale = d3.scaleBand()
        .domain(years)
        .range([0, years.length * (cellWidth + cellGap)]);

    const monthScale = d3.scaleBand()
        .domain(months)
        .range([0, months.length * (cellHeight + cellGap)]);

    // Create a separate SVG for Level 2.
    const margin = LEVEL2_CONFIG.margin;
    const chartWidth = yearScale.range()[1];
    const chartHeight = monthScale.range()[1];

    const svg = d3.select("#heatmap-level2")
        .append("svg")
        .attr("width", chartWidth + margin.left + margin.right + 70)
        .attr("height", chartHeight + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Separate the year and month labels from the Level 2 heatmap.
    chart.append("line")
    .attr("x1", -5)
    .attr("y1", -5)
    .attr("x2", chartWidth)
    .attr("y2", -5)
    .attr("stroke", "black")
    .attr("stroke-width", 1);

    chart.append("line")
    .attr("x1", -5)
    .attr("y1", -5)
    .attr("x2", -5)
    .attr("y2", chartHeight)
    .attr("stroke", "black")
    .attr("stroke-width", 1);

    // Small tick marks for each year.
    chart.selectAll(".level2-year-tick")
    .data(years)
    .join("line")
    .attr("x1", year => yearScale(year) + cellWidth / 2)
    .attr("x2", year => yearScale(year) + cellWidth / 2)
    .attr("y1", -5)
    .attr("y2", -10)
    .attr("stroke", "black");

    // Small tick marks for each month.
    chart.selectAll(".level2-month-tick")
    .data(months)
    .join("line")
    .attr("x1", -5)
    .attr("x2", -10)
    .attr("y1", month => monthScale(month) + cellHeight / 2)
    .attr("y2", month => monthScale(month) + cellHeight / 2)
    .attr("stroke", "black");
    
    // Show the years across the top of the heatmap.
    chart.selectAll(".level2-year-label")
        .data(years)
        .join("text")
        .attr("class", "level2-year-label")
        .attr("x", year => yearScale(year) + cellWidth / 2)
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .text(year => year);

    // Show the months along the left side.
    chart.selectAll(".level2-month-label")
        .data(months)
        .join("text")
        .attr("class", "level2-month-label")
        .attr("x", -10)
        .attr("y", month => monthScale(month) + cellHeight / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 11)
        .text(month => d3.timeFormat("%B")(new Date(2000, month, 1)));


    // Use monthly maximum temperatures to color each cell.
    const monthlyData = calculateMonthlyTemperatures(dailyData)
        .filter(record => years.includes(record.year));

    const temperatureColor = d3.scaleSequential()
        .domain(TEMPERATURE_RANGES.level2)
        .interpolator(t => d3.interpolateRdYlBu(1 - t));

    // Draw the monthly temperature cells.
    chart.selectAll(".level2-cell")
        .data(monthlyData)
        .join("rect")
        .attr("class", "level2-cell")
        .attr("x", record => yearScale(record.year))
        .attr("y", record => monthScale(record.month))
        .attr("width", cellWidth)
        .attr("height", cellHeight)
        .attr("fill", record => temperatureColor(record.maxTemperature))
        .append("title")
        .text(record => {
            const monthName = d3.timeFormat("%B")(
                new Date(record.year, record.month, 1)
            );

            return `${monthName} ${record.year}
Maximum Temperature: ${record.maxTemperature}°C
Minimum Temperature: ${record.minTemperature}°C`;
});

    // Draw daily maximum and minimum temperature lines inside each monthly cell.
    for (const [year, months] of dailyGroups) {
        if (!years.includes(year)) continue;

        for (const [month, records] of months) {
            const x = d3.scaleLinear()
                .domain([1, 31])
                .range([3, cellWidth - 3]);

            const y = d3.scaleLinear()
                .domain(TEMPERATURE_RANGES.level2)
                .range([cellHeight - 3, 3]);

            const maxLine = d3.line()
                .x(record => x(record.date.getDate()))
                .y(record => y(record.maxTemperature));

            const minLine = d3.line()
                .x(record => x(record.date.getDate()))
                .y(record => y(record.minTemperature));

            chart.append("path")
                .datum(records.slice().sort((a, b) => a.date - b.date))
                .attr("d", maxLine)
                .attr("transform", `translate(${yearScale(year)}, ${monthScale(month)})`)
                .attr("fill", "none")
                .attr("stroke", "#008000")
                .attr("stroke-width", 1.5)
                .attr("pointer-events", "none");
                
            // Draw the daily minimum temperatures in cyan.
            chart.append("path")
                .datum(records.slice().sort((a, b) => a.date - b.date))
                .attr("d", minLine)
                .attr("transform", `translate(${yearScale(year)}, ${monthScale(month)})`)
                .attr("fill", "none")
                .attr("stroke", "#00ffff")
                .attr("stroke-width", 1.5)
                .attr("pointer-events", "none");
        }
    }    

    
    // Position the temperature legend to the right of Level 2.
    const legendX = margin.left + chartWidth + 15;
    const legendY = margin.top;
    const legendHeight = chartHeight;
    const legendWidth = 15;


    // Create a vertical color scale from 0°C to 40°C.
    const legendScale = d3.scaleLinear()
        .domain(TEMPERATURE_RANGES.level2)
        .range([0, legendHeight]);

    // Draw the legend as small colored rectangles.
    svg.selectAll(".level2-legend-color")
        .data(d3.range(0, 40, 0.25))
        .join("rect")
        .attr("class", "level2-legend-color")
        .attr("x", legendX)
        .attr("y", temperature => legendY + legendScale(temperature))
        .attr("width", legendWidth)
        .attr("height", legendHeight / 160 + 0.5)
        .attr("fill", temperature => temperatureColor(temperature));
    // Label the coolest and hottest ends of the legend.
    svg.append("text")
        .attr("x", legendX + legendWidth + 5)
        .attr("y", legendY + 5)
        .attr("font-size", 11)
        .text("0°C");

    svg.append("text")
        .attr("x", legendX + legendWidth + 5)
        .attr("y", legendY + legendHeight)
        .attr("font-size", 11)
        .text("40°C");


}

