import '../assets/style.css'



document.querySelector('#sankey_raw_milk_usage').innerHTML = `
  <h2 class="text-2xl font-bold mb-4">Sankey Diagram: Raw Milk Usage</h2>
  <p class="mb-4">
    This Sankey diagram illustrates the flow of raw milk from production to various end uses. The width of the arrows is proportional to the quantity of raw milk being processed or consumed in each stage. The diagram provides insights into the distribution and utilization of raw milk across different sectors, such as dairy products, direct consumption, and industrial applications.
  </p>
  <div id="sankey_diagram"></div>
`
