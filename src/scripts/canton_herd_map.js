import '../assets/style.css'
import * as d3 from 'd3'
import { feature as topoFeature } from 'topojson-client'
import cattleCsvRaw from '../../datasets/cattle-canton.csv?raw'
import topology from '../../datasets/geo/ch-cantons.topo.json'

/**
 * Swiss canton: BFS id (TopoJSON feature.id) → two-letter code (CSV columns).
 * @see https://www.bfs.admin.ch/bfs/de/home/basiskarten/geodata.html
 */
const BFS_TO_CODE = {
  1: 'ZH',
  2: 'BE',
  3: 'LU',
  4: 'UR',
  5: 'SZ',
  6: 'OW',
  7: 'NW',
  8: 'GL',
  9: 'ZG',
  10: 'FR',
  11: 'SO',
  12: 'BS',
  13: 'BL',
  14: 'SH',
  15: 'AR',
  16: 'AI',
  17: 'SG',
  18: 'GR',
  19: 'AG',
  20: 'TG',
  21: 'TI',
  22: 'VD',
  23: 'VS',
  24: 'NE',
  25: 'GE',
  26: 'JU',
}

const CANTON_CODES = Object.values(BFS_TO_CODE)

/** Strip BOM / weird prefixes so comment lines and headers parse reliably. */
function normalizeCsvText(raw) {
  return raw.replace(/^\uFEFF+/, '').replace(/\uFEFF/g, '')
}

function parseCattleCantonCsv(text) {
  const normalized = normalizeCsvText(text)
  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))

  if (lines.length < 2) return { rows: [], headerLine: null }

  const header = lines[0].split(';').map((h) => h.trim().replace(/^\uFEFF/, ''))
  if (!header.includes('Year') || !header.includes('Month')) {
    return { rows: [], headerLine: lines[0] }
  }

  const rows = lines.slice(1).map((line) => {
    const parts = line.split(';')
    const row = {}
    header.forEach((key, i) => {
      row[key] = parts[i] !== undefined ? String(parts[i]).trim() : ''
    })
    row.Year = Number(row.Year)
    row.Month = Number(row.Month)
    for (const code of CANTON_CODES) {
      if (row[code] !== undefined && row[code] !== '') row[code] = Number(row[code])
    }
    return row
  })

  return { rows, headerLine: lines[0] }
}

/**
 * @param {ReturnType<typeof parseCattleCantonCsv>['rows']} rows
 * @returns {Map<number, Record<string, number>>}
 */
function aggregateHeadcountByYear(rows) {
  const map = new Map()
  for (const row of rows) {
    if (!Number.isFinite(row.Year) || !Number.isFinite(row.Month)) continue
    let totals = map.get(row.Year)
    if (!totals) {
      totals = Object.fromEntries(CANTON_CODES.map((c) => [c, 0]))
      map.set(row.Year, totals)
    }
    for (const code of CANTON_CODES) {
      const v = row[code]
      if (Number.isFinite(v)) totals[code] += v
    }
  }
  return map
}

function extentAcrossYears(yearTotals) {
  let lo = Infinity
  let hi = 0
  for (const totals of yearTotals.values()) {
    for (const code of CANTON_CODES) {
      const v = totals[code]
      if (Number.isFinite(v) && v > 0) {
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
    }
  }
  if (!Number.isFinite(lo) || hi <= 0) return null
  return [lo, hi]
}

/** Every canton-year total > 0, sorted (for quantile-based colour domain). */
function sortedHeadcountValues(yearTotals) {
  const values = []
  for (const totals of yearTotals.values()) {
    for (const code of CANTON_CODES) {
      const v = totals[code]
      if (Number.isFinite(v) && v > 0) values.push(v)
    }
  }
  return values.sort((a, b) => a - b)
}

const root = document.querySelector('#canton-herd-root')
if (!root) throw new Error('#canton-herd-root missing')

root.innerHTML = `
  <div class="relative flex flex-col gap-5" role="region" aria-labelledby="pasture-heading">
    <div id="canton-herd-status" class="hidden rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"></div>
    <div class="flex w-full justify-center">
      <div class="flex w-full max-w-md items-center justify-center gap-3 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-2.5 sm:px-6">
        <label for="canton-year-slider" class="text-sm font-semibold text-red-950 whitespace-nowrap shrink-0">
          Year <span id="canton-year-label" class="tabular-nums">—</span>
        </label>
        <input id="canton-year-slider" type="range" class="h-2 min-w-0 flex-1 cursor-pointer rounded-lg accent-red-700" />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
      <figure class="m-0 flex flex-col items-stretch">
        <figcaption class="order-2 mt-2 text-xs text-stone-500">
          <span id="canton-map-legend"></span>
        </figcaption>
        <svg id="canton-map-svg" class="order-1 h-auto w-full max-w-[560px] rounded-lg border border-stone-200 bg-stone-100 shadow-sm" role="img" aria-label="Choropleth map of Switzerland by canton"></svg>
      </figure>

      <figure class="m-0 flex min-h-[440px] flex-col">
        <figcaption class="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Ranked cantons (same year)</figcaption>
        <svg id="canton-bars-svg" class="h-[440px] w-full rounded-lg border border-stone-200 bg-white shadow-sm" role="img" aria-label="Horizontal bar chart of cattle by canton"></svg>
      </figure>
    </div>
  </div>
`

const statusEl = root.querySelector('#canton-herd-status')
const mapSvg = d3.select('#canton-map-svg')
const barsSvg = d3.select('#canton-bars-svg')
const yearLabel = d3.select('#canton-year-label')
const yearSlider = d3.select('#canton-year-slider')
const legendEl = d3.select('#canton-map-legend')

const tooltip = d3
  .select(root)
  .append('div')
  .attr('role', 'status')
  .attr('aria-live', 'polite')
  .style('position', 'absolute')
  .style('left', '-9999px')
  .style('width', '1px')
  .style('height', '1px')
  .style('overflow', 'hidden')

const { rows, headerLine } = parseCattleCantonCsv(cattleCsvRaw)
const byYear = aggregateHeadcountByYear(rows)
const years = Array.from(byYear.keys())
  .filter((y) => Number.isFinite(y))
  .sort((a, b) => a - b)

if (rows.length === 0 || years.length === 0 || !headerLine?.includes('Year')) {
  statusEl.classList.remove('hidden')
  statusEl.innerHTML = `
    <strong class="block">Could not load cattle statistics.</strong>
    <span class="mt-1 block text-red-800/90">
      Parsed ${rows.length} data rows from CSV. If this persists, check that the file uses <code class="rounded bg-red-100 px-1">;</code> separators and a header row with <code class="rounded bg-red-100 px-1">Year</code> and <code class="rounded bg-red-100 px-1">Month</code>.
    </span>
  `
  yearSlider.attr('disabled', true)
  console.error('canton_herd_map: CSV parse produced no usable rows', { headerLine, rowCount: rows.length })
} else {
  const extent = extentAcrossYears(byYear)
  if (!extent) {
    statusEl.classList.remove('hidden')
    statusEl.textContent = 'Data loaded but no positive headcount values were found.'
    yearSlider.attr('disabled', true)
    console.error('canton_herd_map: empty extent')
  } else {
    const [globalLo, globalHi] = extent
    const sortedVals = sortedHeadcountValues(byYear)
    const qLow = 0.12
    const qHigh = 0.88
    let domLo = d3.quantileSorted(sortedVals, qLow)
    let domHi = d3.quantileSorted(sortedVals, qHigh)
    if (!Number.isFinite(domLo) || !Number.isFinite(domHi) || domHi <= domLo * 1.02) {
      domLo = globalLo
      domHi = globalHi
    }

    /** Sequential headcount scale: fixed HCL ramp (neutral light → saturated red), domain from ~12–88th percentile. */
    const chromaLow = '#fff8f8'
    const chromaHigh = d3.interpolateReds(0.78)
    const sequentialRed = d3.interpolateHcl(chromaLow, chromaHigh)
    const color = d3.scaleSequential(sequentialRed).domain([domLo, domHi])

    legendEl.text(
      `Head count (cattle), one scale for every year: ${d3.format(',.0f')(domLo)}–${d3.format(',.0f')(domHi)} (roughly ${Math.round(qLow * 100)}th–${Math.round(qHigh * 100)}th percentile of positive values; anything outside is clamped). Full range in the data: ${d3.format(',.0f')(globalLo)}–${d3.format(',.0f')(globalHi)}. Colours: ${chromaLow} → ${chromaHigh} in HCL so the light end stays cleaner than a default reds ramp.`,
    )

const cantonsFc = topoFeature(topology, topology.objects.cantons)

const mapWidth = 560
const mapHeight = 380
const margin = { map: 8 }

mapSvg.attr('viewBox', `0 0 ${mapWidth} ${mapHeight}`)

mapSvg
  .append('rect')
  .attr('x', 0)
  .attr('y', 0)
  .attr('width', mapWidth)
  .attr('height', mapHeight)
  .attr('fill', '#f5f1f1')
  .attr('rx', 6)

/**
 * greenore/swiss-maps TopoJSON is already planar-projected (see topology.transform),
 * not WGS84. Mercator would mis-read coordinates and collapse the geometry.
 * @see https://github.com/greenore/swiss-maps
 */
const projection = d3
  .geoIdentity()
  .fitExtent(
    [
      [margin.map, margin.map],
      [mapWidth - margin.map, mapHeight - margin.map],
    ],
    cantonsFc,
  )
const path = d3.geoPath(projection)

const mapG = mapSvg.append('g').attr('class', 'cantons')

mapG
  .selectAll('path')
  .data(cantonsFc.features)
  .join('path')
  .attr('d', path)
  .attr('vector-effect', 'non-scaling-stroke')
  .attr('fill', chromaLow)
  .attr('stroke', '#ffffff')
  .attr('stroke-width', 0.85)
  .attr('stroke-linejoin', 'round')
  .attr('cursor', 'pointer')

const barMargin = { top: 14, right: 20, bottom: 36, left: 40 }

function barInnerSize() {
  const node = barsSvg.node()
  const w = node ? node.getBoundingClientRect().width : 420
  return {
    width: Math.max(280, w),
    height: 440,
    innerW: Math.max(280, w) - barMargin.left - barMargin.right,
    innerH: 440 - barMargin.top - barMargin.bottom,
  }
}

let selectedCode = null

function codeForFeature(f) {
  const bfs = typeof f.id === 'string' ? Number(f.id) : f.id
  return BFS_TO_CODE[bfs] ?? null
}

function setSelected(code) {
  selectedCode = selectedCode === code ? null : code
  render()
}

function currentYear() {
  return Number(yearSlider.property('value'))
}

const yearMin = years[0]
const yearMax = years[years.length - 1]
yearSlider.attr('min', yearMin).attr('max', yearMax).attr('step', 1).property('value', yearMax)

function render() {
  const year = currentYear()
  yearLabel.text(String(year))
  const totals = byYear.get(year)
  if (!totals) {
    statusEl.classList.remove('hidden')
    statusEl.textContent = `No aggregated data for year ${year}.`
    return
  }
  statusEl.classList.add('hidden')

  mapG
    .selectAll('path')
    .attr('fill', (d) => {
      const code = codeForFeature(d)
      if (!code) return chromaLow
      return color(totals[code] ?? 0)
    })
    .attr('stroke', (d) => {
      const code = codeForFeature(d)
      return code && selectedCode && code === selectedCode ? '#0f172a' : '#ffffff'
    })
    .attr('stroke-width', (d) => {
      const code = codeForFeature(d)
      return code && selectedCode && code === selectedCode ? 2 : 0.85
    })
    .on('click', (event, d) => {
      const code = codeForFeature(d)
      if (code) setSelected(code)
      event.stopPropagation()
    })
    .on('mouseover', (event, d) => {
      const code = codeForFeature(d)
      if (!code) return
      const v = totals[code] ?? 0
      tooltip.text(`${code}: ${d3.format(',.0f')(v)} head (annual sum)`)
    })
    .on('mousemove', (event) => {
      const [bx, by] = d3.pointer(event, root)
      tooltip
        .style('left', `${Math.min(root.clientWidth - 160, bx + 12)}px`)
        .style('top', `${by + 12}px`)
        .style('width', 'auto')
        .style('height', 'auto')
        .style('overflow', 'visible')
        .style('padding', '6px 10px')
        .style('border-radius', '6px')
        .style('background', 'rgba(15,23,42,0.92)')
        .style('color', '#fff')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '50')
        .style('position', 'absolute')
    })
    .on('mouseout', () => {
      tooltip
        .text('')
        .style('left', '-9999px')
        .style('width', '1px')
        .style('height', '1px')
        .style('overflow', 'hidden')
        .style('padding', '0')
    })

  const sorted = CANTON_CODES.map((code) => ({ code, value: totals[code] ?? 0 })).sort((a, b) => b.value - a.value)

  const { width: bw, height: bh, innerW, innerH } = barInnerSize()
  barsSvg.attr('viewBox', `0 0 ${bw} ${bh}`)

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(sorted, (d) => d.value) || 1])
    .nice()
    .range([0, innerW])
  const y = d3.scaleBand().domain(sorted.map((d) => d.code)).range([0, innerH]).padding(0.14)

  const g = barsSvg.selectAll('g.chart-root').data([0]).join('g').attr('class', 'chart-root').attr('transform', `translate(${barMargin.left},${barMargin.top})`)

  g.selectAll('text.y-label')
    .data([0])
    .join('text')
    .attr('class', 'y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -28)
    .attr('text-anchor', 'middle')
    .attr('fill', '#57534e')
    .attr('font-size', '11px')
    .text('Canton')

  const axisG = g.selectAll('g.x-axis').data([0]).join('g').attr('class', 'x-axis').attr('transform', `translate(0,${innerH})`)

  axisG.selectAll('*').remove()
  axisG
    .call(d3.axisBottom(x).ticks(5, 's'))
    .call((s) => s.selectAll('text').attr('font-size', '10px').attr('fill', '#57534e'))
    .call((s) => s.selectAll('line, path').attr('stroke', '#d6d3d1'))

  axisG
    .selectAll('text.canton-x-caption')
    .data([0])
    .join('text')
    .attr('class', 'canton-x-caption')
    .attr('x', innerW / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('fill', '#57534e')
    .attr('font-size', '11px')
    .text('Head count (annual sum)')

  const row = g
    .selectAll('g.row')
    .data(sorted, (d) => d.code)
    .join((enter) => {
      const r = enter.append('g').attr('class', 'row')
      r.append('rect').attr('rx', 3)
      r.append('text').attr('class', 'code').attr('text-anchor', 'end').attr('font-size', '11px').attr('font-weight', '600').attr('fill', '#44403c')
      r.append('text').attr('class', 'val').attr('font-size', '10px').attr('fill', '#57534e')
      return r
    })

  row.attr('transform', (d) => `translate(0,${y(d.code)})`)

  row
    .select('rect')
    .attr('height', y.bandwidth())
    .attr('y', 0)
    .attr('x', 0)
    .attr('width', (d) => Math.max(0, x(d.value)))
    .attr('fill', (d) => color(d.value))
    .attr('stroke', (d) => (selectedCode === d.code ? '#0f172a' : '#d6d3d1'))
    .attr('stroke-width', (d) => (selectedCode === d.code ? 2 : 0.5))
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      setSelected(d.code)
      event.stopPropagation()
    })

  row
    .select('text.code')
    .attr('x', -8)
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .text((d) => d.code)

  row
    .select('text.val')
    .attr('x', (d) => x(d.value) + 6)
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .text((d) => d3.format(',.0f')(d.value))
}

    yearSlider.on('input', () => render())
    window.addEventListener('resize', () => render())

    mapSvg.on('click', () => {
      selectedCode = null
      render()
    })

    render()
  }
}
