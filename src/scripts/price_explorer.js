import '../assets/style.css'
import * as d3 from 'd3';
import * as htmlToImage from 'html-to-image';
import DairyConsumerPrices from '../../datasets/dairy_consumer_prices/dairy_products_consumer_prices.csv?url';
import ProducerMilkPrices from '../../datasets/price_index/price_index_milk_market.csv?url';

// 1. Set up the HTML UI
document.querySelector('#price_explorer').innerHTML = `
  <div class="flex flex-col gap-6 bg-orange-50 p-6 w-full max-w-5xl mx-auto">
    
    <div class="flex flex-wrap gap-4 justify-between items-center pb-4">
      <label class="flex items-center gap-2 font-bold cursor-pointer min-w-max">
        <input type="checkbox" id="toggle-bio" class="w-5 h-5 accent-black border-2 border-black cursor-pointer">
        Display Bio equivalent
      </label>

      <div class="bg-white border-2 border-black rounded-lg flex-1 min-w-[280px] overflow-hidden">
        <div class="p-2 max-h-32 overflow-y-auto w-full">
          <div class="flex gap-2 flex-wrap w-full" id="product-toggles"></div>
        </div>
      </div>
      <div class="flex gap-2 min-w-max">
        <button id="clear-products" class="px-4 py-2 bg-white border-2 border-black rounded font-bold hover:bg-gray-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          Clear
        </button>
        <button id="export-png" class="px-4 py-2 bg-white border-2 border-black rounded font-bold hover:bg-gray-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center" aria-label="Export" title="Export">
          <svg aria-hidden="true" viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v12" />
            <path d="M8 7l4-4 4 4" />
            <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- WRAPPER: Contains both chart and legend for the UI and the export -->
    <div id="export-wrapper" class="relative w-full bg-white border-2 border-black rounded-lg overflow-hidden flex flex-col">
      <div id="chart-container" class="relative w-full overflow-hidden">
        <div id="tooltip" class="absolute hidden bg-yellow-200 border-2 border-black p-2 rounded text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] pointer-events-none transition-all z-10"></div>
      </div>
      
      <!-- LIVE LEGEND -->
      <div id="live-legend" class="flex flex-wrap justify-center gap-x-6 gap-y-3 p-4 bg-gray-50 border-t-2 border-black text-sm font-bold empty:hidden"></div>
    </div>

    <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
      <div class="flex items-center gap-4 font-bold w-full sm:w-1/2">
        <span>Period:</span>
        <div class="relative w-full h-6 flex items-center">
          <div class="absolute w-full h-2 bg-gray-300 rounded pointer-events-none"></div>
          <div id="slider-track" class="absolute h-2 bg-red-500 rounded pointer-events-none"></div>
          
          <input type="range" id="year-slider-min" value="2000" min="2000" max="2026" class="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer z-10">
          <input type="range" id="year-slider-max" value="2026" min="2000" max="2026" class="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer z-20">
        </div>
        <span id="year-label-text" class="min-w-max">2000 - 2026</span>
      </div>

      <div class="flex gap-6 font-bold flex-wrap">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="toggle-producer" class="w-5 h-5 border-2 border-black">
          Producer milk prices
        </label>
      </div>
    </div>
  </div>
`;

// State Management
let state = {
  isBio: false,
  activeProducts: new Set(), 
  showProducer: false,
  minYear: 2000,
  maxYear: 2026
};

let uniqueExactProducts = [];
let exactToCategory = {}; 
let colorScale;

Promise.all([
    d3.csv(DairyConsumerPrices),
    d3.csv(ProducerMilkPrices)
]).then(([pricesData, producerData]) => {
    
    const monthlyDataMap = new Map();

    function ensureMonthExists(dateKey, year, month) {
      if (!monthlyDataMap.has(dateKey)) {
        monthlyDataMap.set(dateKey, { 
          date: new Date(year, month - 1, 1), exactStandard: {}, categoryBio: {}, producerPrice: null
        });
      }
    }

    const BASE_CHF_PRICE = 0.7104; 
    producerData.forEach(row => {
        const monthKey = Object.keys(row).find(k => k.includes('month'));
        if (!monthKey || !row[monthKey]) return;
        
        const dateKey = row[monthKey].trim(); 
        const year = parseInt(dateKey.split('-')[0]);
        const month = parseInt(dateKey.split('-')[1]);
        const indexValue = parseFloat(row.price_index_value);
        if (isNaN(indexValue) || isNaN(year) || isNaN(month)) return;

        const actualPriceCHF = (indexValue / 100) * BASE_CHF_PRICE;
        ensureMonthExists(dateKey, year, month);
        monthlyDataMap.get(dateKey).producerPrice = actualPriceCHF;
    });

    // --- Process Consumer Prices ---
    const conventionalProductsSet = new Set();
    pricesData.forEach(row => {
        const monthKey = Object.keys(row).find(k => k.includes('month'));
        if (!monthKey || !row[monthKey]) return; 
        
        const dateKey = row[monthKey].trim();
        const year = parseInt(dateKey.split('-')[0]);
        const month = parseInt(dateKey.split('-')[1]);
        const exactProd = row.exact_product;
        const category = row.product_category;
        const isBio = row.production_type && row.production_type.toLowerCase().includes('bio');
        const price = parseFloat(row.price_value);
        
        if (!exactProd || isNaN(price) || isNaN(year) || isNaN(month)) return; 

        exactToCategory[exactProd] = category;
        ensureMonthExists(dateKey, year, month);
        
        const monthObj = monthlyDataMap.get(dateKey);
        if (isBio) {
            if (!monthObj.categoryBio[category]) monthObj.categoryBio[category] = [];
            monthObj.categoryBio[category].push(price);
        } else {
            conventionalProductsSet.add(exactProd);
            if (!monthObj.exactStandard[exactProd]) monthObj.exactStandard[exactProd] = [];
            monthObj.exactStandard[exactProd].push(price);
        }
    });

    uniqueExactProducts = Array.from(conventionalProductsSet).sort();
    colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueExactProducts);

    // --- Build final dataset ---
    const chartData = Array.from(monthlyDataMap.values()).sort((a, b) => a.date - b.date).map(monthObj => {
        const averagedStandard = {};
        const averagedBio = {};
        
        uniqueExactProducts.forEach(prod => {
            if (monthObj.exactStandard[prod] && monthObj.exactStandard[prod].length > 0) {
                averagedStandard[prod] = d3.mean(monthObj.exactStandard[prod]);
            }
        });

        Object.keys(monthObj.categoryBio).forEach(cat => {
            if (monthObj.categoryBio[cat] && monthObj.categoryBio[cat].length > 0) {
                averagedBio[cat] = d3.mean(monthObj.categoryBio[cat]);
            }
        });

        return {
            date: monthObj.date,
            year: monthObj.date.getFullYear(),
            exactPrices: averagedStandard,
            bioCatPrices: averagedBio,
            producerPrice: monthObj.producerPrice
        };
    });

    // Setup Slider State
    const allYearsInDataset = Array.from(new Set(chartData.map(d => d.year)));
    
    const absoluteMinYear = d3.min(allYearsInDataset);
    const absoluteMaxYear = d3.max(allYearsInDataset);
    
    state.minYear = absoluteMinYear;
    state.maxYear = absoluteMaxYear;

    if(uniqueExactProducts.length > 0) state.activeProducts.add(uniqueExactProducts[0]);
    if(uniqueExactProducts.length > 1) state.activeProducts.add(uniqueExactProducts[1]);
    
    // Configure Dual Slider UI logic
    const minSlider = document.getElementById('year-slider-min');
    const maxSlider = document.getElementById('year-slider-max');

    const sliderTrack = document.getElementById('slider-track');
    const yearLabel = document.getElementById('year-label-text');

    function updateSliderVisuals() {
        const minVal = parseInt(minSlider.value);
        const maxVal = parseInt(maxSlider.value);
        
        const total = absoluteMaxYear - absoluteMinYear;
        const minPercent = ((minVal - absoluteMinYear) / total) * 100;
        const maxPercent = ((maxVal - absoluteMinYear) / total) * 100;
        
        sliderTrack.style.left = minPercent + '%';
        sliderTrack.style.width = (maxPercent - minPercent) + '%';
        yearLabel.innerText = `${minVal} - ${maxVal}`;
    }
    updateSliderVisuals();

    // Enforce 1-year gap
    minSlider.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (val >= state.maxYear - 1) { 
            val = state.maxYear - 1;
            minSlider.value = val;
        }
        state.minYear = val;
        updateSliderVisuals();
        drawChart(chartData);
    });

    maxSlider.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (val <= state.minYear + 1) { 
            val = state.minYear + 1;
            maxSlider.value = val;
        }
        state.maxYear = val;
        updateSliderVisuals();
        drawChart(chartData);
    });

    document.getElementById('toggle-bio').addEventListener('change', (e) => { 
        state.isBio = e.target.checked; 
        drawChart(chartData); 
    });
    
    document.getElementById('toggle-producer').addEventListener('change', (e) => { 
        state.showProducer = e.target.checked; 
        drawChart(chartData); 
    });

    const clearAllButton = document.getElementById('clear-products');
    clearAllButton.addEventListener('click', () => {
      state.activeProducts.clear();
      state.showProducer = false;
      state.isBio = false;
      state.minYear = absoluteMinYear;
      state.maxYear = absoluteMaxYear;
      document.getElementById('toggle-producer').checked = false;
      document.getElementById('toggle-bio').checked = false;
      document.getElementById('year-slider-min').value = absoluteMinYear;
      document.getElementById('year-slider-max').value = absoluteMaxYear;
      updateSliderVisuals();
      updateProductToggleStyles();
      drawChart(chartData);
    });

    // --- EXPORT LOGIC ---
    document.getElementById('export-png').addEventListener('click', () => {
      // Export the wrapper that contains BOTH the chart and the live legend
      const exportNode = document.getElementById('export-wrapper');
      if (!exportNode) return;

      htmlToImage.toPng(exportNode, { 
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          border: 'none',
          borderRadius: '0px',
          boxShadow: 'none'
        },
        onclone: (documentClone) => {
          // Hide tooltip during export so it doesn't get stuck in the picture
          const clonedTooltip = documentClone.querySelector('#tooltip');
          if (clonedTooltip) clonedTooltip.style.display = 'none';
        }
      })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'dairy_price_chart.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((error) => {
        console.error('Oops, something went wrong with the export!', error);
      });
    });

    // 2. Build the buttons and draw the initial chart state
    buildProductButtons(chartData);
    drawChart(chartData);

}).catch(error => console.error("Error loading data:", error));


// --- CHART RENDERING LOGIC ---
const margin = { top: 40, right: 60, bottom: 40, left: 60 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart-container")
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleTime().range([0, width]);
const yPrice = d3.scaleLinear().range([height, 0]);
const yProducer = d3.scaleLinear().range([height, 0]);

const xAxis = svg.append("g").attr("transform", `translate(0,${height})`).attr("class", "font-bold");
const yAxisLeft = svg.append("g").attr("class", "font-bold");
const yAxisRight = svg.append("g").attr("transform", `translate(${width},0)`).attr("class", "font-bold");

svg.append("text").attr("x", 0).attr("y", -15).text("Price / kg (CHF)").attr("font-weight", "bold").attr("font-size", "12px");
svg.append("text").attr("x", width).attr("y", -15).attr("text-anchor", "end").text("Producer price / kg (CHF)").attr("font-weight", "bold").attr("font-size", "12px");

const chartContainer = document.getElementById("chart-container");
const tooltip = d3.select("#tooltip");
const formatDate = d3.timeFormat("%B %Y");
const formatPrice = d3.format(".2f");

function positionTooltip(event) {
  if (!chartContainer) return;
  const bounds = chartContainer.getBoundingClientRect();
  const left = event.clientX - bounds.left + 15;
  const top = event.clientY - bounds.top - 40;
  tooltip.style("left", left + "px").style("top", top + "px");
}

function showTooltip(html, event) {
  tooltip.style("display", "block").html(html);
  positionTooltip(event);
}

function hideTooltip() {
  tooltip.style("display", "none");
}

function drawChart(data) {
  // 1. FILTERING
  const minDate = new Date(state.minYear, 0, 1);
  const maxDate = new Date(state.maxYear, 11, 31);
  const filteredData = data.filter(d => d.date >= minDate && d.date <= maxDate);

  x.domain([minDate, maxDate]);
  
  // 2. DYNAMIC PRICE SCALING
  let maxPrice = -Infinity; 
  let minPrice = Infinity;

  filteredData.forEach(d => {
      state.activeProducts.forEach(prod => {
          if (d.exactPrices[prod] !== undefined && d.exactPrices[prod] !== null) {
              if (d.exactPrices[prod] > maxPrice) maxPrice = d.exactPrices[prod];
              if (d.exactPrices[prod] < minPrice) minPrice = d.exactPrices[prod];
          }
          if (state.isBio) {
              const cat = exactToCategory[prod];
              if (cat && d.bioCatPrices[cat] !== undefined && d.bioCatPrices[cat] !== null) {
                  if (d.bioCatPrices[cat] > maxPrice) maxPrice = d.bioCatPrices[cat];
                  if (d.bioCatPrices[cat] < minPrice) minPrice = d.bioCatPrices[cat];
              }
          }
      });
  });
  
  if (minPrice === Infinity) minPrice = 0;
  if (maxPrice === -Infinity) maxPrice = 1;

  const pricePadding = (maxPrice - minPrice) * 0.05;
  yPrice.domain([Math.max(0, minPrice - pricePadding), maxPrice + pricePadding]);

  // 3. PRODUCER PRICE SCALING
  let maxProducer = -Infinity;
  let minProducer = Infinity;
  filteredData.forEach(d => {
    if (d.producerPrice !== undefined && d.producerPrice !== null && !isNaN(d.producerPrice)) {
      if (d.producerPrice > maxProducer) maxProducer = d.producerPrice;
      if (d.producerPrice < minProducer) minProducer = d.producerPrice;
    }
  });

  if (minProducer === Infinity) minProducer = 0;
  if (maxProducer === -Infinity) maxProducer = 1;

  const producerPadding = (maxProducer - minProducer) * 0.05;
  yProducer.domain([Math.max(0, minProducer - producerPadding), maxProducer + producerPadding]);

  // 4. DRAW AXES
  xAxis.call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")));
  yAxisLeft.call(d3.axisLeft(yPrice));
  yAxisRight.call(d3.axisRight(yProducer));

  // --- LINES (Consumer Products) ---
  const isDefinedPrice = d => d.price !== null && d.price !== undefined && !isNaN(d.price);

  const lineGenerator = d3.line()
    .defined(isDefinedPrice)
    .curve(d3.curveMonotoneX) 
    .x(d => x(d.date)) 
    .y(d => yPrice(d.price));

  const producerLineGenerator = d3.line()
    .defined(isDefinedPrice)
    .curve(d3.curveMonotoneX)
    .x(d => x(d.date))
    .y(d => yProducer(d.price));

  let lineData = [];
  Array.from(state.activeProducts).forEach(prod => {
      lineData.push({
      id: `${prod}-standard`,
      label: `${prod}`,
      color: colorScale(prod),
      type: 'standard',
      yScale: yPrice,
      values: filteredData.map(d => ({ date: d.date, price: d.exactPrices[prod] }))
      });
      const cat = exactToCategory[prod];
      if (state.isBio && cat) {
        lineData.push({
          id: `${prod}-bio`,
          label: `${cat} (Bio)`,
          color: colorScale(prod),
          type: 'bio',
          yScale: yPrice,
          values: filteredData.map(d => ({ date: d.date, price: d.bioCatPrices[cat] }))
        });
      }
  });

  const lines = svg.selectAll(".product-line").data(lineData, d => d.id);
  lines.enter().append("path").attr("class", "product-line").attr("fill", "none")
    .attr("stroke", d => d.color).attr("stroke-width", 3)
    .attr("stroke-dasharray", d => d.type === 'bio' ? "8,8" : "none") 
    .style("pointer-events", "none") 
    .merge(lines).attr("d", d => lineGenerator(d.values));
  lines.exit().remove();

  // --- PRODUCER PRICE LINE ---
  const producerLineData = state.showProducer ? [{ id: 'producer', values: filteredData.map(d => ({date: d.date, price: d.producerPrice})) }] : [];
  const prodLine = svg.selectAll(".producer-line").data(producerLineData, d => d.id);
  prodLine.enter().append("path").attr("class", "producer-line").attr("fill", "none")
    .attr("stroke", "#374151").attr("stroke-width", 4).attr("stroke-dasharray", "1,6").attr("stroke-linecap", "round").style("pointer-events", "none")
    .merge(prodLine).attr("d", d => producerLineGenerator(d.values));
  prodLine.exit().remove();

  // --- UPDATE LIVE UI LEGEND ---
  const legendContainer = document.getElementById('live-legend');
  if (legendContainer) {
    let legendHTML = '';
    Array.from(state.activeProducts).forEach(prod => {
      const color = colorScale(prod);
      legendHTML += `
        <div class="flex items-center gap-2">
          <span class="w-6 h-0 inline-block border-t-[3px]" style="border-color: ${color}; border-style: solid;"></span>
          <span>${prod}</span>
        </div>
      `;
      const cat = exactToCategory[prod];
      if (state.isBio && cat) {
        legendHTML += `
          <div class="flex items-center gap-2">
            <span class="w-6 h-0 inline-block border-t-[3px]" style="border-color: ${color}; border-style: dashed;"></span>
            <span>${cat} (Bio)</span>
          </div>
        `;
      }
    });

    if (state.showProducer) {
      legendHTML += `
        <div class="flex items-center gap-2">
          <span class="w-6 h-0 inline-block border-t-[3px]" style="border-color: #374151; border-style: dotted;"></span>
          <span>Producer milk price</span>
        </div>
      `;
    }
    legendContainer.innerHTML = legendHTML;
  }

  // --- TOOLTIP HOVER DATA ---
  const hoverSeries = lineData.concat(
    producerLineData.map(series => ({
      id: series.id,
      label: "Producer milk price",
      color: "#374151",
      type: "producer",
      values: series.values,
      yScale: yProducer
    }))
  );

  const pointGroups = svg.selectAll(".price-point-group").data(hoverSeries, d => d.id);
  pointGroups.enter().append("g").attr("class", "price-point-group")
    .merge(pointGroups)
    .each(function(series) {
      const points = d3.select(this).selectAll("circle").data(series.values.filter(isDefinedPrice), d => d.date);
      const pointsEnter = points.enter().append("circle")
        .attr("r", 10)
        .attr("fill", "#fff")
        .attr("fill-opacity", 0)
        .attr("stroke", "none")
        .attr("cursor", "pointer")
        .style("pointer-events", "all")
        .on("mouseenter", (event, d) => {
          const html = `<strong>${series.label}</strong><br>${formatDate(d.date)}<br>${formatPrice(d.price)} CHF/kg`;
          showTooltip(html, event);
          d3.select(event.currentTarget)
            .attr("fill", "#fff")
            .attr("stroke", series.color)
            .attr("stroke-width", 2);
        })
        .on("mousemove", (event) => positionTooltip(event))
        .on("mouseleave", (event) => {
          hideTooltip();
          d3.select(event.currentTarget)
            .attr("fill", "transparent")
            .attr("stroke", "none");
        });

      const yScale = series.yScale || yPrice;
      pointsEnter.merge(points)
        .attr("cx", d => x(d.date))
        .attr("cy", d => yScale(d.price));
      points.exit().remove();
    });
  pointGroups.exit().remove();
}

const productToggleBaseClass = "px-3 py-1 text-sm font-bold border-2 border-black rounded transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";

function updateProductToggleStyles() {
  const buttons = d3.select("#product-toggles").selectAll("button");
  buttons.each(function(prod) {
    const isActive = state.activeProducts.has(prod);
    d3.select(this)
      .classed("bg-white", isActive)
      .classed("bg-gray-300", !isActive)
      .classed("opacity-50", !isActive);
  });
}

function buildProductButtons(data) {
  const container = d3.select("#product-toggles");
  const buttons = container.selectAll("button").data(uniqueExactProducts, d => d);

  buttons.enter().append("button")
    .attr("class", productToggleBaseClass)
    .style("color", d => colorScale(d))
    .text(d => d)
    .on("click", function(event, prod) {
      if (state.activeProducts.has(prod)) {
        state.activeProducts.delete(prod);
      } else {
        state.activeProducts.add(prod);
      }
      updateProductToggleStyles();
      drawChart(data);
    });

  buttons.exit().remove();
  updateProductToggleStyles();
}