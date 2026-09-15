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
  d3.select("#donut-chart").selectAll("*").remove();
  const svg = d3.select("#donut-chart").append("svg").attr("width", width).attr("height", height);
  const group = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
  const pie = d3.pie().sort(null).value((item) => item.value).padAngle(0.04);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius).cornerRadius(5);
  const paths = group.selectAll("path").data(pie(filteredValues)).join("path").attr("d", arc).attr("fill", (item) => item.data.color).attr("class", "donut-slice").attr("data-key", (item) => item.data.key).attr("filter", "url(#svg-shadow)").style("transition", "opacity 0.3s");
  paths.on("mouseenter", function (_event, item) { highlightEnergySource(item.data.key); }).on("mouseleave", function (_event, item) { resetHighlightEnergySource(item.data.key); });
  group.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em").attr("font-size", "2.7em").attr("font-weight", "bold").attr("font-family", "Satoshi").attr("fill", "#2d1a00").attr("dominant-baseline", "middle").attr("class", "donut-kw-value").text(`${Math.round(total / 1000)}k`);
  group.append("text").attr("text-anchor", "middle").attr("dy", "1.5em").attr("font-size", "2em").attr("font-family", "Satoshi").attr("font-weight", 500).attr("fill", "#2d1a00").attr("dominant-baseline", "middle").attr("class", "donut-kw-label").text("TJ");
}

function updateEnergyIcons(year) {
  const { values } = getYearData(year);
  const container = document.getElementById("energy-icons");
  container.innerHTML = "";
  values.filter((item) => item.percent >= 1).forEach((source) => {
    const icon = document.createElement("button");
    icon.type = "button";
    icon.className = "energy-icon";
    icon.dataset.key = source.key;
    icon.setAttribute("aria-label", `${source.label}: ${Math.round(source.value).toLocaleString("it-CH")} terajoule`);
    const percentage = document.createElement("div");
    percentage.className = "energy-percentage cubano-font";
    percentage.style.color = source.ink;
    percentage.innerHTML = `<span>${Math.round(source.percent)}</span><span class="percent-symbol">%</span>`;
    icon.appendChild(percentage);
    const imagePlaceholder = document.createElement("div");
    imagePlaceholder.className = "image-placeholder";
    imagePlaceholder.style.setProperty("--placeholder-color", source.color);
    imagePlaceholder.style.setProperty("--placeholder-ink", source.ink);
    imagePlaceholder.textContent = `immagine: ${source.image}`;
    icon.appendChild(imagePlaceholder);
    const label = document.createElement("div");
    label.className = "energy-label";
    label.textContent = source.label;
    icon.appendChild(label);
    const value = document.createElement("div");
    value.className = "energy-value";
    value.textContent = `${Math.round(source.value).toLocaleString("it-CH")} TJ`;
    icon.appendChild(value);
    icon.addEventListener("mouseenter", () => highlightEnergySource(source.key));
    icon.addEventListener("mouseleave", () => resetHighlightEnergySource(source.key));
    icon.addEventListener("focus", () => highlightEnergySource(source.key));
    icon.addEventListener("blur", () => resetHighlightEnergySource(source.key));
    container.appendChild(icon);
  });
}

document.getElementById("year-slider").addEventListener("input", function () {
  const year = +this.value;
  document.getElementById("year-label").textContent = year;
  drawChart(year);
  updateEnergyIcons(year);
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
