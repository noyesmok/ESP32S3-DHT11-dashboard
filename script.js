const CHANNEL_ID = "3473755";
const READ_API_KEY = "CY11QZ7XRYI4MIE9";
const HISTORY_MINUTES = 1440;
const REFRESH_MS = 5 * 60 * 1000;

const TEMP_MIN = 0;
const TEMP_MAX = 50;
const HUM_MIN = 0;
const HUM_MAX = 100;
const PRESS_MIN = 950;
const PRESS_MAX = 1050;

let tempChart = null;
let humChart = null;
let pressChart = null;

const statusEl = document.getElementById("status");

function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = isError ? "status error" : "status";
}

loadData();
setInterval(loadData, REFRESH_MS);

async function loadData() {
    setStatus("Loading 24h dual-sensor data...");

    try {
        const url =
            "https://api.thingspeak.com/channels/" +
            CHANNEL_ID +
            "/feeds.json?api_key=" +
            READ_API_KEY +
            "&minutes=" +
            HISTORY_MINUTES;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("ThingSpeak HTTP " + response.status);
        }

        const data = await response.json();
        const feeds = data.feeds || [];
        if (feeds.length === 0) {
            setStatus("No feeds in last 24h", true);
            return;
        }

        const labels = [];
        const dhtTemp = [];
        const dhtHum = [];
        const ahtTemp = [];
        const ahtHum = [];
        const pressure = [];

        for (let i = 0; i < feeds.length; i++) {
            const f = feeds[i];
            labels.push(formatTimestamp(f.created_at));
            dhtTemp.push(toNumOrNull(f.field1));
            dhtHum.push(toNumOrNull(f.field2));
            ahtTemp.push(toNumOrNull(f.field3));
            ahtHum.push(toNumOrNull(f.field4));
            pressure.push(toNumOrNull(f.field5));
        }

        const latestDhtT = lastValid(dhtTemp);
        const latestDhtH = lastValid(dhtHum);
        const latestAhtT = lastValid(ahtTemp);
        const latestAhtH = lastValid(ahtHum);
        const latestP = lastValid(pressure);

        setValue("dhtTempValue", latestDhtT, " °C");
        setValue("dhtHumValue", latestDhtH, " %");
        setValue("ahtTempValue", latestAhtT, " °C");
        setValue("ahtHumValue", latestAhtH, " %");
        setValue("pressValue", latestP, " hPa");

        if (latestDhtT != null) drawGauge("dhtTempGauge", latestDhtT, TEMP_MIN, TEMP_MAX, "gradient");
        if (latestDhtH != null) drawGauge("dhtHumGauge", latestDhtH, HUM_MIN, HUM_MAX, "blue");
        if (latestAhtT != null) drawGauge("ahtTempGauge", latestAhtT, TEMP_MIN, TEMP_MAX, "gradient");
        if (latestAhtH != null) drawGauge("ahtHumGauge", latestAhtH, HUM_MIN, HUM_MAX, "blue");
        if (latestP != null) drawGauge("pressGauge", latestP, PRESS_MIN, PRESS_MAX, "green");

        updateStats(validOnly(dhtTemp), "dhtTemp", " °C");
        updateStats(validOnly(dhtHum), "dhtHum", " %");
        updateStats(validOnly(ahtTemp), "ahtTemp", " °C");
        updateStats(validOnly(ahtHum), "ahtHum", " %");
        updateStats(validOnly(pressure), "press", " hPa");

        drawCompareChart(
            "tempChart",
            "tempChart",
            labels,
            [
                { label: "DHT11", data: dhtTemp, color: "#e67e22" },
                { label: "AHT20", data: ahtTemp, color: "#1abc9c" }
            ],
            "Temperature (Celsius)"
        );

        drawCompareChart(
            "humChart",
            "humChart",
            labels,
            [
                { label: "DHT11", data: dhtHum, color: "#3498db" },
                { label: "AHT20", data: ahtHum, color: "#9b59b6" }
            ],
            "Humidity (%)"
        );

        drawCompareChart(
            "pressChart",
            "pressChart",
            labels,
            [{ label: "BMP280", data: pressure, color: "#27ae60" }],
            "Pressure (hPa)"
        );

        setStatus(
            "Updated " +
            formatTimestamp(new Date().toISOString()) +
            " · last 24h · " +
            feeds.length +
            " feeds"
        );
    } catch (error) {
        console.error(error);
        setStatus("Failed to load data: " + error.message, true);
    }
}

function toNumOrNull(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function lastValid(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != null) return arr[i];
    }
    return null;
}

function validOnly(arr) {
    return arr.filter(function (v) { return v != null; });
}

function setValue(id, value, unit) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value == null ? "--" + unit : value.toFixed(2) + unit;
}

function formatTimestamp(iso) {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd + " " + hh + ":" + mi + ":" + ss;
}

function updateStats(values, prefix, unit) {
    const countEl = document.getElementById(prefix + "Count");
    const minEl = document.getElementById(prefix + "Min");
    const maxEl = document.getElementById(prefix + "Max");
    const avgEl = document.getElementById(prefix + "Avg");

    if (!values || values.length === 0) {
        if (countEl) countEl.textContent = "0";
        if (minEl) minEl.textContent = "--";
        if (maxEl) maxEl.textContent = "--";
        if (avgEl) avgEl.textContent = "--";
        return;
    }

    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i];
    const avg = sum / values.length;

    if (countEl) countEl.textContent = String(values.length);
    if (minEl) minEl.textContent = min.toFixed(2) + unit;
    if (maxEl) maxEl.textContent = max.toFixed(2) + unit;
    if (avgEl) avgEl.textContent = avg.toFixed(2) + unit;
}

function drawGauge(canvasId, value, min, max, style) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h - 16;
    const radius = Math.min(w / 2 - 14, h - 28);
    const start = Math.PI;
    const clamped = Math.max(min, Math.min(max, value));
    const ratio = (clamped - min) / (max - min);
    const needle = start + ratio * Math.PI;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.lineWidth = 16;
    ctx.strokeStyle = "#e8e8e8";
    ctx.arc(cx, cy, radius, start, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 16;
    if (style === "gradient") {
        const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        grad.addColorStop(0, "#2ecc71");
        grad.addColorStop(0.45, "#f1c40f");
        grad.addColorStop(1, "#e67e22");
        ctx.strokeStyle = grad;
    } else if (style === "green") {
        ctx.strokeStyle = "#27ae60";
    } else {
        ctx.strokeStyle = "#5dade2";
    }
    ctx.arc(cx, cy, radius, start, needle);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(
        cx + Math.cos(needle) * (radius - 8),
        cy + Math.sin(needle) * (radius - 8)
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "#555";
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
}

const chartRefs = {
    tempChart: null,
    humChart: null,
    pressChart: null
};

function drawCompareChart(refKey, canvasId, labels, seriesList, yTitle) {
    if (typeof Chart === "undefined") return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const datasets = seriesList.map(function (s) {
        return {
            label: s.label,
            data: s.data,
            borderColor: s.color,
            backgroundColor: s.color,
            pointRadius: 2,
            pointHoverRadius: 4,
            borderWidth: 2,
            tension: 0.15,
            spanGaps: true
        };
    });

    if (chartRefs[refKey]) {
        chartRefs[refKey].data.labels = labels;
        chartRefs[refKey].data.datasets = datasets;
        chartRefs[refKey].update();
        return;
    }

    chartRefs[refKey] = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: true, position: "top" }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 12,
                        font: { size: 10 }
                    },
                    grid: { display: false }
                },
                y: {
                    title: { display: true, text: yTitle, font: { size: 12 } },
                    grid: { color: "#e6e6e6" }
                }
            }
        }
    });
}
