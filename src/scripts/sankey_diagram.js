import '../assets/style.css'
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyJustify, sankeyLeft} from 'd3-sankey';
import MilkUsageData from '../../datasets/milk_usage_evolution_switzerland/Evolution_of_the_usage_of_milk_switzerland_2024-2000.csv?url';
import colors from 'tailwindcss/colors';

// Set up the HTML structure for the Sankey diagram and controls
document.querySelector('#sankey_raw_milk_usage').innerHTML = `
    <div class="w-full max-w-5xl mx-auto px-20 pt-5 pb-2.5">
        <svg id="sankey-chart" viewBox="0 0 800 500" class="w-full h-auto"></svg>
    </div>
    <div class="flex items-center justify-center p-2.5 mb-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm max-w-2xl mx-auto gap-5">
        
        <label for="time-slider" class="font-bold text-amber-800 whitespace-nowrap">
            Year: <span id="year-label" class="text-amber-800 tabular-nums">2010</span>
        </label>
        
        <input type="range" id="time-slider" min="2000" max="2024" step="1" value="2010" 
               class="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-amber-800 hover:accent-amber-900 transition-all">
               
    </div>
`;

const width = 800;
const height = 500;

const dairyColors = {
    "Total Raw Milk": colors.slate[300],
    "Added Ingredients": colors.stone[300],  
    "Cheese": colors.yellow[400],          
    "Butter": colors.yellow[200],  
    "Cream for consumption": colors.red[300],
    "Milk for consumption": colors.blue[200],  
    "Yogurt and fresh milk products": colors.teal[300],     
    "Preserved milk": colors.blue[500],         
    "Other or evaporation": colors.slate[400],      
    "Full fat milk for feeding": colors.slate[500],
    "Mass Loss & Byproducts": colors.slate[200]
};

// A safe fallback color
const defaultColor = "#e5e7eb";

// Setup the Sankey generator
const sankey_generator = sankey()
    .nodeId(d => d.name)
    .nodeAlign((d) => {
        if (d.name === "Added Ingredients") return 1; 
        return d.depth;
    })
    .nodeWidth(15)            
    .nodePadding(15)          
    .nodeSort(null);

const svg = d3.select("#sankey-chart");
const linkGroup = svg.append("g").attr("class", "links");
const nodeGroup = svg.append("g").attr("class", "nodes");

const tooltip = d3.select("body").append("div")
    .attr("class", "absolute hidden bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-50 transition-opacity duration-200")
    .style("opacity", 0);

// Custom Path Generator for Tapered Flows
function taperedLinkPath(d) {
    const x0 = d.source.x1;
    const x1 = d.target.x0;
    const xmid = (x0 + x1) / 2;

    let syTop, syBottom;
    if (d.source.sourceLinks.length === 1) {
        syTop = d.source.y0;
        syBottom = d.source.y1;
    } else {
        syTop = d.y0 - d.width / 2;
        syBottom = d.y0 + d.width / 2;
    }

    let tyTop, tyBottom;
    if (d.target.targetLinks.length === 1) {
        tyTop = d.target.y0;
        tyBottom = d.target.y1;
    } else {
        tyTop = d.y1 - d.width / 2;
        tyBottom = d.y1 + d.width / 2;
    }

    return `
        M ${x0} ${syTop} 
        C ${xmid} ${syTop}, ${xmid} ${tyTop}, ${x1} ${tyTop} 
        L ${x1} ${tyBottom} 
        C ${xmid} ${tyBottom}, ${xmid} ${syBottom}, ${x0} ${syBottom} 
        Z
    `;
}

// Load and Group Data
d3.csv(MilkUsageData).then(data => {
    const dataByYear = d3.group(data, d => d.YEAR);
    const categories = data.columns.slice(1);

    let globalMaxVolume = 0;
    dataByYear.forEach((yearRows) => {
        let rawTotal = 0;
        let finalTotal = 0;
        
        categories.forEach(cat => {
            const rVal = parseFloat(yearRows[0][cat]);
            const fVal = parseFloat(yearRows[1][cat]);
            if (!isNaN(rVal) && rVal > 0) rawTotal += rVal;
            if (!isNaN(fVal) && fVal > 0) finalTotal += fVal;
        });
        if (rawTotal > globalMaxVolume) globalMaxVolume = rawTotal;
        if (finalTotal > globalMaxVolume) globalMaxVolume = finalTotal;
    });

    function updateChart(selectedYear) {
        const yearData = dataByYear.get(selectedYear.toString());
        
        let nodesMap = new Map();
        let links = [];
        let currentTotalRaw = 0;
        let currentTotalFinal = 0;

        if (yearData && yearData.length >= 2) {
            const rawRow = yearData[0];
            const finalRow = yearData[1];
            const sourceName = "Total Raw Milk";

            nodesMap.set(sourceName, { name: sourceName });

            categories.forEach(cat => {
                const rawVal = parseFloat(rawRow[cat]);
                const finalVal = parseFloat(finalRow[cat]);
                const cleanCat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase(); 

                if (!isNaN(rawVal) && rawVal > 0) {
                    const rawNodeName = `${cleanCat} (Raw)`;
                    nodesMap.set(rawNodeName, { name: rawNodeName, baseCategory: cleanCat });
                    
                    links.push({ source: sourceName, target: rawNodeName, value: rawVal });
                    currentTotalRaw += rawVal; 

                    if (!isNaN(finalVal) && finalVal > 0) {
                        const finalNodeName = `${cleanCat} (Final)`;
                        nodesMap.set(finalNodeName, { name: finalNodeName, baseCategory: cleanCat });

                        if (finalVal > rawVal) {
                            // Added Ingredients Logic
                            const addedMassName = `Added Ingredients`;
                            if (!nodesMap.has(addedMassName)) {
                                nodesMap.set(addedMassName, { name: addedMassName, baseCategory: "Added Ingredients" });
                            }
                            links.push({ source: addedMassName, target: finalNodeName, value: finalVal - rawVal });
                            links.push({ source: rawNodeName, target: finalNodeName, value: rawVal });

                        } else if (rawVal > finalVal) {
                            const lossNodeName = `Mass Loss & Byproducts`;
                            if (!nodesMap.has(lossNodeName)) {
                                nodesMap.set(lossNodeName, { name: lossNodeName, baseCategory: "Mass Loss & Byproducts" });
                            }
                            
                            // Send the actual product weight to the final node
                            links.push({ source: rawNodeName, target: finalNodeName, value: finalVal });
                            
                            // Send the remaining missing weight to the ghost node
                            links.push({ source: rawNodeName, target: lossNodeName, value: rawVal - finalVal });

                        } else {
                            // Exact match
                            links.push({ source: rawNodeName, target: finalNodeName, value: finalVal });
                        }
                        currentTotalFinal += finalVal;
                    } else {
                        // Edge case: Raw milk exists, but 0 final product (100% loss)
                        const lossNodeName = `Mass Loss & Byproducts`;
                        if (!nodesMap.has(lossNodeName)) {
                            nodesMap.set(lossNodeName, { name: lossNodeName, baseCategory: "Mass Loss & Byproducts" });
                        }
                        links.push({ source: rawNodeName, target: lossNodeName, value: rawVal });
                    }
                }
            });
        }

        let nodes = Array.from(nodesMap.values());
        let graph = { nodes: [], links: [] };

        if (nodes.length > 1 && links.length > 0) {
            const currentMaxLayer = Math.max(currentTotalRaw, currentTotalFinal);
            const heightRatio = currentMaxLayer / globalMaxVolume; 
            const headerMargin = 40;
            const targetHeight = heightRatio * (height - 40 - headerMargin); 
            const yOffset = headerMargin + ((height - headerMargin - targetHeight) / 2);

            sankey_generator.extent([
                [1, Math.max(headerMargin, yOffset)], 
                [width - 1, Math.max(headerMargin + 2, yOffset + targetHeight)]
            ]);

            graph = sankey_generator({
                nodes: nodes.map(d => Object.assign({}, d)),
                links: links.map(d => Object.assign({}, d))
            });

            const xPositions = Array.from(new Set(graph.nodes.map(d => d.x0))).sort((a, b) => a - b);
            const columnTitles = [
                ["Raw Milk", "(1000 metric tons)"], 
                ["Raw Milk used in Final Products", "(1000 metric tons)"], 
                ["Final Product Weight", "(1000 metric tons)"]
            ];

            const headerSelection = svg.selectAll(".column-header").data(xPositions);
            
            headerSelection.join(
                enter => {
                    const textGroup = enter.append("text")
                        .attr("class", "column-header")
                        .attr("y", 15)
                        .attr("font-weight", "bold")
                        .attr("font-size", "14px")
                        .attr("fill", "#4b5563") 
                        .style("opacity", 0);

                    textGroup.selectAll("tspan")
                        .data((d, i) => columnTitles[i] ? columnTitles[i].map(str => ({ text: str, parentD: d, parentI: i })) : [])
                        .enter()
                        .append("tspan")
                        .attr("text-anchor", d => d.parentI === 0 ? "start" : (d.parentI === 1 ? "middle" : "end"))
                        .attr("x", d => d.parentI === 0 ? d.parentD : (d.parentI === 1 ? d.parentD + 7.5 : d.parentD + 15))
                        .attr("dy", (d, idx) => idx === 0 ? "0em" : "1.2em")
                        .text(d => d.text);

                    return textGroup.call(e => e.transition().duration(750).style("opacity", 1));
                },
                update => {
                    update.selectAll("tspan")
                        .data((d, i) => columnTitles[i] ? columnTitles[i].map(str => ({ text: str, parentD: d, parentI: i })) : [])
                        .transition().duration(750)
                        .attr("text-anchor", d => d.parentI === 0 ? "start" : (d.parentI === 1 ? "middle" : "end"))
                        .attr("x", d => d.parentI === 0 ? d.parentD : (d.parentI === 1 ? d.parentD + 7.5 : d.parentD + 15));
                    return update;
                },
                exit => exit.remove()
            );
        }

        // Draw Links
        const linkSelection = linkGroup.selectAll(".link")
            .data(graph.links, d => {
                const sourceId = typeof d.source === "object" ? d.source.name : d.source;
                const targetId = typeof d.target === "object" ? d.target.name : d.target;
                return `${sourceId}-${targetId}`;
            }); 

        linkSelection.join(
            enter => enter.append("path")
                .attr("class", "link")
                .style("fill", d => {
                    const sourceNode = typeof d.source === "object" ? d.source : null;
                    if (sourceNode) return dairyColors[sourceNode.baseCategory] || dairyColors[sourceNode.name] || defaultColor;
                    return defaultColor;
                })
                .style("stroke", "none")
                .style("fill-opacity", d => {
                    const targetNode = typeof d.target === "object" ? d.target.name : d.target;
                    return targetNode === "Mass Loss & Byproducts" ? 0.15 : 0.4;
                })
                .attr("d", taperedLinkPath)
                .style("opacity", 0) 
                .call(e => e.transition().duration(750).style("opacity", 1)), 
            update => update.call(u => u.transition().duration(750)
                .style("opacity", 1)
                .style("fill-opacity", d => {
                    const targetNode = typeof d.target === "object" ? d.target.name : d.target;
                    return targetNode === "Mass Loss & Byproducts" ? 0.15 : 0.4;
                })
                .attr("d", taperedLinkPath)
            ),
            exit => exit.call(e => e.transition().duration(400).style("opacity", 0).remove())
        );

        // Draw Nodes
        const nodeSelection = nodeGroup.selectAll(".node")
            .data(graph.nodes, d => d.name);

        nodeSelection.join(
            enter => {
                const g = enter.append("g")
                    .attr("class", "node")
                    .attr("transform", d => `translate(${d.x0},${d.y0})`)
                    .style("opacity", 0); 

                g.append("rect")
                    .attr("height", d => Math.max(1, d.y1 - d.y0))
                    .attr("width", d => d.x1 - d.x0)
                    .attr("fill", d => dairyColors[d.baseCategory] || dairyColors[d.name] || defaultColor);              
                    
                g.append("text")
                    .attr("x", d => d.depth === 2 ? -6 : (d.x1 - d.x0) + 6) 
                    .attr("y", d => (d.y1 - d.y0) / 2)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", d => d.depth === 2 ? "end" : "start") 
                    .style("fill", "#374151")
                    .style("stroke", "#ffffff")
                    .style("stroke-width", "4px")
                    .style("stroke-linejoin", "round")
                    .style("stroke-linecap", "round")
                    .style("paint-order", "stroke")
                    .style("font-size", "14px")
                    .text(d => {
                        let label = "";
                        if (d.name.includes("(Final)")) label = d.baseCategory;
                        else if (d.name.includes("(Raw)") && d.sourceLinks.length === 0) label = d.baseCategory;
                        else if (d.name === "Added Ingredients") label = d.baseCategory;
                        else if (d.name === "Total Raw Milk") label = d.name;
                        else if (d.name === "Mass Loss & Byproducts") label = d.name; // Show label for ghost node
                        
                        if (label !== "") return `${label}: ${Math.round(d.value)}`;
                        return "";
                    })  
                    .style("opacity", d => {
                        if (d.name.includes("(Final)")) return 1;
                        if (d.name.includes("(Raw)") && d.sourceLinks.length === 0) return 1;
                        if (d.name === "Added Ingredients") return 1;
                        if (d.name === "Total Raw Milk") return 1;
                        if (d.name === "Mass Loss & Byproducts") return 0.6; 
                        return 0; 
                    });

                g.on("mouseover", (event, d) => {
                    tooltip.interrupt();
                    tooltip.classed("hidden", false) 
                        .style("opacity", 1)
                        .html(`<strong>${d.name}</strong><br/>Amount: ${Math.round(d.value * 100) / 100}`);
                })
                .on("mousemove", (event) => {
                    tooltip.style("left", (event.pageX + 15) + "px")
                           .style("top", (event.pageY - 15) + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("opacity", 0)
                        .transition().duration(200).on("end", function() {
                            d3.select(this).classed("hidden", true);
                        });
                });

                return g.call(e => e.transition().duration(750).style("opacity", 1));
            },
            update => {
                const updateTransition = update.transition().duration(750)
                    .style("opacity", 1)
                    .attr("transform", d => `translate(${d.x0},${d.y0})`);

                updateTransition.select("rect")
                    .attr("height", d => Math.max(1, d.y1 - d.y0))
                    .attr("width", d => d.x1 - d.x0);

                updateTransition.select("text")
                    .attr("x", d => d.depth === 2 ? -6 : (d.x1 - d.x0) + 6)
                    .attr("y", d => (d.y1 - d.y0) / 2)
                    .attr("text-anchor", d => d.depth === 2 ? "end" : "start")
                    .text(d => {
                        let label = "";
                        if (d.name.includes("(Final)")) label = d.baseCategory;
                        else if (d.name.includes("(Raw)") && d.sourceLinks.length === 0) label = d.baseCategory;
                        else if (d.name === "Added Ingredients") label = d.baseCategory;
                        else if (d.name === "Total Raw Milk") label = d.name;
                        else if (d.name === "Mass Loss & Byproducts") label = d.name;
                        
                        if (label !== "") return `${label}: ${Math.round(d.value)}`;
                        return "";
                    })  
                    .style("opacity", d => {
                        if (d.name.includes("(Final)")) return 1;
                        if (d.name.includes("(Raw)") && d.sourceLinks.length === 0) return 1;
                        if (d.name === "Added Ingredients") return 1;
                        if (d.name === "Total Raw Milk") return 1;
                        if (d.name === "Mass Loss & Byproducts") return 0.6;
                        return 0; 
                    });

                return update;
            },
            exit => {
                return exit.call(e => e.transition().duration(400)
                    .style("opacity", 0)
                    .remove());
            }
        );
    }

    function triggerUpdate() {
        const year = document.getElementById("time-slider").value;
        d3.select("#year-label").text(year);
        updateChart(year);
    }

    d3.select("#time-slider").on("input", triggerUpdate);
    triggerUpdate();
});