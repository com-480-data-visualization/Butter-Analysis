import '../assets/style.css'
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import MilkUsageData from '../../datasets/milk_usage_evolution_switzerland/Evolution_of_the_usage_of_milk_switzerland_2024-2000.csv?url';

// Set up the HTML structure for the Sankey diagram and controls
document.querySelector('#sankey_raw_milk_usage').innerHTML = `
    <div class="controls" style="margin-bottom: 20px;">
        <label for="time-slider" style="font-weight: bold; margin-right: 15px;">Year: <span id="year-label">2010</span></label>
        <input type="range" id="time-slider" min="2000" max="2024" step="1" value="2010">
        
        <div style="margin-top: 10px;">
            <label style="margin-right: 10px;"><input type="radio" name="metric" value="0" checked> Raw Milk Usage</label>
            <label><input type="radio" name="metric" value="1"> Final Product Weight</label>
        </div>
    </div>
    <svg id="sankey-chart" width="800" height="500"></svg>
`;

const width = 800;
const height = 500;

// Setup the Sankey generator
const sankey_generator = sankey()
    .nodeId(d => d.name) // Use the 'name' property as the unique identifier for nodes
    .extent([[1, 1], [width - 1, height - 1]]);

// Select the SVG and create layer groups so links stay behind nodes
const svg = d3.select("#sankey-chart");
const linkGroup = svg.append("g").attr("class", "links");
const nodeGroup = svg.append("g").attr("class", "nodes");

const tooltip = d3.select("body").append("div")
    .attr("class", "absolute hidden bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-50 transition-opacity duration-200")
    .style("opacity", 0);

// Load and Group Data
d3.csv(MilkUsageData).then(data => {
    // Group the flat CSV data by the 'YEAR' column
    const dataByYear = d3.group(data, d => d.YEAR);

    // Get categories from the CSV columns (assuming first column is 'YEAR' and the rest are categories)
    const categories = data.columns.slice(1);

    // D3 Color scale for categories so they stay consistent
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(categories);

    // The Update Function
    function updateChart(selectedYear, metricIndex = 0) {
        const yearData = dataByYear.get(selectedYear.toString());
        
        let nodes = [];
        let links = [];

        // Gather only active flows
        if (yearData && yearData[metricIndex]) {
            const targetRow = yearData[metricIndex];
            const sourceName = metricIndex === 0 ? "Total Raw Milk" : "Final Output";
            
            let activeCategories = new Set();

            categories.forEach(cat => {
                const val = parseFloat(targetRow[cat]);
                // Strictly require a positive flow
                if (!isNaN(val) && val > 0) {
                    links.push({
                        source: sourceName, 
                        target: cat,        
                        value: val
                    });
                    activeCategories.add(cat);
                }
            });

            // Build nodes array ONLY with connected categories
            if (links.length > 0) {
                nodes = [
                    { name: sourceName }, 
                    ...Array.from(activeCategories).map(c => ({ name: c }))
                ];
            }
        }

        // Generate Layout safely
        let graph = { nodes: [], links: [] };
        if (nodes.length > 1 && links.length > 0) {
            graph = sankey_generator({
                nodes: nodes.map(d => Object.assign({}, d)),
                links: links.map(d => Object.assign({}, d))
            });
        }

        // Draw Links (Modern Join Pattern)
        const linkSelection = linkGroup.selectAll(".link")
            .data(graph.links, d => {
                // Safely extract the ID whether D3 has converted it to an object yet or not
                const sourceId = typeof d.source === "object" ? d.source.name : d.source;
                const targetId = typeof d.target === "object" ? d.target.name : d.target;
                return `${sourceId}-${targetId}`;
            }); 

        linkSelection.join(
            enter => enter.append("path")
                .attr("class", "link")
                .attr("fill", "none")
                .attr("stroke", "#a3b1c6")
                .attr("stroke-opacity", 0.4)
                .attr("d", sankeyLinkHorizontal())
                .attr("stroke-width", d => Math.max(1, d.width))
                .style("opacity", 0) // Start hidden
                .call(e => e.transition().duration(750).style("opacity", 1)), // Fade in
            update => update.call(u => u.transition().duration(750)
                .style("opacity", 1)
                .attr("d", sankeyLinkHorizontal())
                .attr("stroke-width", d => Math.max(1, d.width))
            ),
            exit => exit.call(e => e.transition().duration(400)
                .style("opacity", 0)
                .remove()
            )
        );

        // Draw Nodes
        const nodeSelection = nodeGroup.selectAll(".node")
            .data(graph.nodes, d => d.name);

        nodeSelection.join(
            enter => {
                const g = enter.append("g")
                    .attr("class", "node")
                    .attr("transform", d => `translate(${d.x0},${d.y0})`)
                    .style("opacity", 0); // Start hidden

                g.append("rect")
                    .attr("height", d => Math.max(1, d.y1 - d.y0))
                    .attr("width", d => d.x1 - d.x0)
                    .attr("fill", d => (d.name === "Total Raw Milk" || d.name === "Final Output") ? "#cbd5e1" : colorScale(d.name))

                g.append("text")
                    .attr("x", d => d.x0 < width / 2 ? 6 + (d.x1 - d.x0) : -6)
                    .attr("y", d => (d.y1 - d.y0) / 2)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
                    .text(d => d.name);

                g.on("mouseover", (event, d) => {
                    tooltip.interrupt();
                    tooltip.classed("hidden", false) // Remove Tailwind hidden class
                        .style("opacity", 1)
                        .html(`<strong>${d.name}</strong><br/>Amount: ${d.value.toLocaleString()}`);
                })
                .on("mousemove", (event) => {
                    // Position the tooltip slightly offset from the cursor
                    tooltip.style("left", (event.pageX + 15) + "px")
                           .style("top", (event.pageY - 15) + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("opacity", 0)
                        // Wait for transition to finish before hiding display
                        .transition().duration(200).on("end", function() {
                            d3.select(this).classed("hidden", true);
                        });
                });

                // Fade in on enter
                return g.call(e => e.transition().duration(750).style("opacity", 1));
            },
            update => {
                // Animate position changes
                const updateTransition = update.transition().duration(750)
                    .style("opacity", 1)
                    .attr("transform", d => `translate(${d.x0},${d.y0})`);

                // Animate rectangle resizing
                updateTransition.select("rect")
                    .attr("height", d => Math.max(1, d.y1 - d.y0))
                    .attr("width", d => d.x1 - d.x0);

                // Animate text snapping
                updateTransition.select("text")
                    .attr("x", d => d.x0 < width / 2 ? 6 + (d.x1 - d.x0) : -6)
                    .attr("y", d => (d.y1 - d.y0) / 2)
                    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end");

                return update;
            },
            exit => {
                // Ensure nodes safely vanish and are removed from DOM
                return exit.call(e => e.transition().duration(400)
                    .style("opacity", 0)
                    .remove());
            }
        );
    }

    // Listen to all UI Controls (Slider + Toggle)
    function triggerUpdate() {
        const year = document.getElementById("time-slider").value;
        const metric = parseInt(document.querySelector('input[name="metric"]:checked').value);
        
        d3.select("#year-label").text(year);
        updateChart(year, metric);
    }

    // Bind event listeners
    d3.select("#time-slider").on("input", triggerUpdate);
    d3.selectAll('input[name="metric"]').on("change", triggerUpdate);

    // Initialize the very first view
    triggerUpdate();
});