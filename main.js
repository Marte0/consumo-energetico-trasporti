const ENERGY_SOURCES = [
  { key: "benzina", label: "BENZINA", csv: "benzina (TJ)", image: "pompa di benzina", color: "#FF9233", ink: "#802D00" },
  { key: "diesel", label: "DIESEL", csv: "diesel (TJ)", image: "tanica di diesel", color: "#804600", ink: "#FFD12E" },
  { key: "aviazione", label: "AVIAZIONE", csv: "carburanti per l’aviazione (TJ)", image: "aereo in volo", color: "#ACB5F8", ink: "#142182" },
  { key: "elettrico-privato", label: "ELETTRICO PRIVATO", csv: "elettricità: traffico stradale privato¹ (TJ)", image: "auto elettrica", color: "#FFD12E", ink: "#804600" },
  { key: "elettrico-altri", label: "ELETTRICO PUBBLICO", csv: "elettricità: altri trasporti (ferroviario, pubblico su strada², non stradale³) (TJ)", image: "treno elettrico", color: "#95D9E5", ink: "#005573" },
  { key: "gas-altro", label: "GAS + ALTRO", csv: "gas e altre fonti energetiche (TJ)", image: "serbatoio di gas", color: "#E5B2FF", ink: "#631F66" },
];

let energyDataByYear = {};
let availableYears = [];
let minTotal = 0;
let maxTotal = 1;
let sliderFrame = null;

window.addEventListener("DOMContentLoaded", () => {
  fetch("./data.csv")
    .then((response) => { if (!response.ok) throw new Error("Impossibile caricare il dataset"); return response.text(); })
    .then((csvText) => {
      const data = d3.csvParse(csvText);
      data.forEach((row) => {
        const year = +row.Anno;
        if (!energyDataByYear[year]) energyDataByYear[year] = {};
        ENERGY_SOURCES.forEach((source) => {
          const value = row[source.csv];
          energyDataByYear[year][source.key] = value === "" || value == null ? 0 : +value;
        });
      });
      availableYears = Object.keys(energyDataByYear).map(Number).sort((a, b) => a - b);
      const totals = availableYears.map((year) => getYearData(year).total);
      minTotal = d3.min(totals) || 0;
      maxTotal = d3.max(totals) || 1;
      const slider = document.getElementById("year-slider");
      slider.min = availableYears[0];
      slider.max = availableYears[availableYears.length - 1];
      slider.value = availableYears[0];
      document.getElementById("year-label").textContent = availableYears[0];
      drawChart(availableYears[0]);
      updateEnergyIcons(availableYears[0]);
    })
    .catch(() => { document.getElementById("donut-chart").textContent = "DATI NON DISPONIBILI"; });
});

function getYearData(year) {
  const yearData = energyDataByYear[year] || {};
  const total = ENERGY_SOURCES.reduce((sum, source) => sum + (yearData[source.key] || 0), 0);
  const values = ENERGY_SOURCES.map((source) => ({ ...source, value: yearData[source.key] || 0, percent: total > 0 ? ((yearData[source.key] || 0) / total) * 100 : 0 }));
  return { total, values };
}

function getOuterRadius(total) {
  const minOuter = 154;
  const maxOuter = 190;
  if (maxTotal === minTotal) return maxOuter;
  return minOuter + (maxOuter - minOuter) * ((total - minTotal) / (maxTotal - minTotal));
}

function drawChart(year) {
  const { total, values } = getYearData(year);
  const width = 450;
  const height = 450;
  const innerRadius = 90;
  const outerRadius = getOuterRadius(total);
  const filteredValues = values.filter((item) => item.percent >= 1);
  let svg = d3.select("#donut-chart").select("svg");
  let group;
  if (svg.empty()) {
    svg = d3.select("#donut-chart").append("svg").attr("width", width).attr("height", height);
    group = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
    group.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em").attr("font-size", "2.7em").attr("font-weight", "bold").attr("font-family", "Satoshi").attr("fill", "#2d1a00").attr("dominant-baseline", "middle").attr("class", "donut-kw-value");
    group.append("text").attr("text-anchor", "middle").attr("dy", "1.5em").attr("font-size", "2em").attr("font-family", "Satoshi").attr("font-weight", 500).attr("fill", "#2d1a00").attr("dominant-baseline", "middle").attr("class", "donut-kw-label").text("TJ");
  } else {
    group = svg.select("g");
  }
  const pie = d3.pie().sort(null).value((item) => item.value).padAngle(0.04);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius).cornerRadius(5);
  const paths = group.selectAll("path").data(pie(filteredValues), (item) => item.data.key);

  paths
    .exit()
    .interrupt()
    .transition()
    .duration(280)
    .ease(d3.easeCubicOut)
    .attrTween("d", function (item) {
      const current = this._current || item;
      const collapsed = { ...item, startAngle: current.endAngle, endAngle: current.endAngle };
      const interpolate = d3.interpolate(current, collapsed);
      return (time) => arc(interpolate(time));
    })
    .style("opacity", 0)
    .remove();

  const enteringPaths = paths
    .enter()
    .append("path")
    .attr("class", "donut-slice")
    .attr("data-key", (item) => item.data.key)
    .attr("filter", "url(#svg-shadow)")
    .attr("fill", (item) => item.data.color)
    .style("opacity", 0)
    .each(function (item) {
      this._current = { ...item, endAngle: item.startAngle };
      this._radius = outerRadius;
    })
    .attr("d", function () { return arc(this._current); });

  const mergedPaths = enteringPaths.merge(paths);

  mergedPaths
    .attr("data-key", (item) => item.data.key)
    .attr("fill", (item) => item.data.color)
    .interrupt()
    .transition()
    .duration(420)
    .ease(d3.easeCubicOut)
    .style("opacity", 1)
    .attrTween("d", function (item) {
      const startDatum = this._current || item;
      const startRadius = this._radius ?? outerRadius;
      const interpolateDatum = d3.interpolate(startDatum, item);
      const interpolateRadius = d3.interpolateNumber(startRadius, outerRadius);
      return (time) => {
        const frameDatum = interpolateDatum(time);
        const frameRadius = interpolateRadius(time);
        this._current = frameDatum;
        this._radius = frameRadius;
        return d3.arc().innerRadius(innerRadius).outerRadius(frameRadius).cornerRadius(5)(frameDatum);
      };
    });

  mergedPaths.on("mouseenter", function (_event, item) { highlightEnergySource(item.data.key); }).on("mouseleave", function (_event, item) { resetHighlightEnergySource(item.data.key); });

  group.select(".donut-kw-value").interrupt().transition().duration(420).ease(d3.easeCubicOut).tween("text", function () {
    const start = this._value ?? total;
    const interpolate = d3.interpolateNumber(start, total);
    this._value = total;
    return (time) => { this.textContent = `${Math.round(interpolate(time) / 1000)}k`; };
  });
}

function updateEnergyIcons(year) {
  const { values } = getYearData(year);
  const visibleValues = values.filter((item) => item.percent >= 1);
  const icons = d3.select("#energy-icons").selectAll("button.energy-icon").data(visibleValues, (source) => source.key);

  icons.exit().interrupt().transition().duration(220).style("opacity", 0).style("transform", "scale(.86)").remove();

  const enteringIcons = icons.enter().append("button").attr("type", "button").attr("class", "energy-icon").style("opacity", 0).style("transform", "translateY(8px)");
  enteringIcons.append("div").attr("class", "energy-percentage cubano-font").html('<span>0</span><span class="percent-symbol">%</span>');
  enteringIcons.append("div").attr("class", "image-placeholder");
  enteringIcons.append("div").attr("class", "energy-label");
  enteringIcons.append("div").attr("class", "energy-value");

  const mergedIcons = enteringIcons.merge(icons).attr("data-key", (source) => source.key).attr("aria-label", (source) => `${source.label}: ${Math.round(source.value).toLocaleString("it-CH")} terajoule`);
  mergedIcons.select(".energy-percentage").style("color", (source) => source.ink).select("span:first-child").interrupt().transition().duration(420).ease(d3.easeCubicOut).tween("text", function (source) {
    const start = this._value ?? source.percent;
    const interpolate = d3.interpolateNumber(start, source.percent);
    this._value = source.percent;
    return (time) => { this.textContent = Math.round(interpolate(time)); };
  });
  mergedIcons.select(".image-placeholder").style("--placeholder-color", (source) => source.color).style("--placeholder-ink", (source) => source.ink).text((source) => `immagine: ${source.image}`);
  mergedIcons.select(".energy-label").text((source) => source.label);
  mergedIcons.select(".energy-value").interrupt().transition().duration(420).ease(d3.easeCubicOut).tween("text", function (source) {
    const start = this._value ?? source.value;
    const interpolate = d3.interpolateNumber(start, source.value);
    this._value = source.value;
    return (time) => { this.textContent = `${Math.round(interpolate(time)).toLocaleString("it-CH")} TJ`; };
  });
  mergedIcons.interrupt().transition().duration(320).ease(d3.easeCubicOut).style("opacity", 1).style("transform", "translateY(0)");
  mergedIcons.on("mouseenter", (_event, source) => highlightEnergySource(source.key)).on("mouseleave", (_event, source) => resetHighlightEnergySource(source.key)).on("focus", (_event, source) => highlightEnergySource(source.key)).on("blur", (_event, source) => resetHighlightEnergySource(source.key));
}

document.getElementById("year-slider").addEventListener("input", function () {
  const year = +this.value;
  document.getElementById("year-label").textContent = year;
  if (sliderFrame) cancelAnimationFrame(sliderFrame);
  sliderFrame = requestAnimationFrame(() => {
    drawChart(year);
    updateEnergyIcons(year);
    sliderFrame = null;
  });
});

function highlightEnergySource(key) {
  const year = +document.getElementById("year-slider").value;
  const { total } = getYearData(year);
  const baseRadius = getOuterRadius(total);
  d3.selectAll("#donut-chart path").each(function () {
    const element = d3.select(this);
    element.interrupt().attr("d", d3.arc().innerRadius(90).outerRadius(baseRadius).cornerRadius(5));
    element.style("opacity", element.attr("data-key") === key ? 1 : 0.5);
  });
  d3.selectAll(`#donut-chart path[data-key='${key}']`).transition().duration(200).attr("d", d3.arc().innerRadius(90).outerRadius(baseRadius + 18).cornerRadius(5)).style("opacity", 1);
  document.querySelectorAll(".energy-icon").forEach((element) => {
    const active = element.dataset.key === key;
    element.style.opacity = active ? "1" : "0.5";
    element.style.transform = active ? "scale(1.1)" : "scale(1)";
  });
}

function resetHighlightEnergySource(key) {
  const year = +document.getElementById("year-slider").value;
  const { total } = getYearData(year);
  const baseRadius = getOuterRadius(total);
  if (key) d3.selectAll(`#donut-chart path[data-key='${key}']`).transition().duration(200).attr("d", d3.arc().innerRadius(90).outerRadius(baseRadius).cornerRadius(5)).style("opacity", 1);
  document.querySelectorAll(".energy-icon").forEach((element) => { element.style.opacity = "1"; element.style.transform = "scale(1)"; });
  d3.selectAll("#donut-chart path").transition().duration(200).style("opacity", 1);
}
