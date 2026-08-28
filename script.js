const CHANNEL_ID = "3473755";
const READ_API_KEY = "CY11QZ7XRYI4MIE9";
const RESULTS = 40;

const TEMP_MIN = 0;
const TEMP_MAX = 50;
const HUM_MIN = 0;
const HUM_MAX = 100;

let tempChart = null;

const statusEl = document.getElementById("status");

function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = isError ? "status error" : "status";
}

loadData();
setInterval(loadData, 30000);

async function loadData() {
    setStatus("Loading data...");

    try {
        const url =
            "https://api.thingspeak.com/channels/" +
            CHANNEL_ID +
            "/feeds.json?api_key=" +
            READ_API_KEY +
            "&results=" +
            RESULTS;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("ThingSpeak HTTP " + response.status);
        }

        const data = await response.json();
        const feeds = data.feeds || [];

        if (feeds.length === 0) {
            setStatus("ThingSpeak returned 0 feeds", true);
            return;
        }

        const points = [];
        for (let i = 0; i < feeds.length; i++) {
            const feed = feeds[i];
            const temp = Number(feed.field1);
            const hum = Number(feed.field2);
            if (Number.isFinite(temp) && Number.isFinite(hum)) {
                points.push({
                    label: formatTimestamp(feed.created_at),
                    temp: temp,
                    hum: hum
                });
            }
        }

        if (points.length === 0) {
            setStatus("No valid temperature/humidity values", true);
            return;
        }

        const temperatures = points.map(function (p) { return p.temp; });
        const humidities = points.map(function (p) { return p.hum; });
        const labels = points.map(function (p) { return p.label; });

        const latestTemp = temperatures[temperatures.length - 1];
        const latestHum = humidities[humidities.length - 1];

        document.getElementById("tempValue").textContent =
            latestTemp.toFixed(2) + " °C";
        document.getElementById("humValue").textContent =
            latestHum.toFixed(2) + " %";

        updateStats(temperatures, "temp", " °C");
        updateStats(humidities, "hum", " %");

        document.getElementById("tempCount").textContent = String(temperatures.length);
        document.getElementById("humCount").textContent = String(humidities.length);

        drawTempGauge(latestTemp);
        drawHumGauge(latestHum);
        drawTemperatureChart(labels, temperatures);

        setStatus(
            "Updated " +
            formatTimestamp(new Date().toISOString()) +
            " · " +
            points.length +
            " readings"
        );
    } catch (error) {
        console.error(error);
        setStatus("Failed to load data: " + error.message, true);
    }
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
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i];
    const avg = sum / values.length;

    document.getElementById(prefix + "Min").textContent = min.toFixed(2) + unit;
    document.getElementById(prefix + "Max").textContent = max.toFixed(2) + unit;
    document.getElementById(prefix + "Avg").textContent = avg.toFixed(2) + unit;
}

function drawTempGauge(value) {
    drawGauge(document.getElementById("tempGauge"), value, TEMP_MIN, TEMP_MAX, "gradient");
}

function drawHumGauge(value) {
    drawGauge(document.getElementById("humGauge"), value, HUM_MIN, HUM_MAX, "blue");
}

function drawGauge(canvas, value, min, max, style) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h - 18;
    const radius = Math.min(w / 2 - 16, h - 30);
    const start = Math.PI;
    const clamped = Math.max(min, Math.min(max, value));
    const ratio = (clamped - min) / (max - min);
    const needle = start + ratio * Math.PI;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.lineWidth = 18;
    ctx.lineCap = "butt";
    ctx.strokeStyle = "#e8e8e8";
    ctx.arc(cx, cy, radius, start, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 18;
    if (style === "gradient") {
        const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        grad.addColorStop(0, "#2ecc71");
        grad.addColorStop(0.45, "#f1c40f");
        grad.addColorStop(1, "#e67e22");
        ctx.strokeStyle = grad;
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
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
}

const valueLabelPlugin = {
    id: "valueLabels",
    afterDatasetsDraw: function (chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data) return;

        ctx.save();
        ctx.fillStyle = "#222";
        ctx.font = "600 10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        meta.data.forEach(function (point, index) {
            const raw = chart.data.datasets[0].data[index];
            if (raw == null || point.skip) return;
            ctx.fillText(Number(raw).toFixed(2), point.x, point.y - 6);
        });

        ctx.restore();
    }
};

function drawTemperatureChart(labels, temperatures) {
    if (typeof Chart === "undefined") {
        console.warn("Chart.js not loaded");
        return;
    }

    const canvas = document.getElementById("tempChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (tempChart) {
        tempChart.data.labels = labels;
        tempChart.data.datasets[0].data = temperatures;
        tempChart.update();
        return;
    }

    tempChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Temperature",
                    data: temperatures,
                    borderColor: "#1abc9c",
                    backgroundColor: "#1abc9c",
                    pointBackgroundColor: "#ffffff",
                    pointBorderColor: "#1abc9c",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 5,
                    borderWidth: 2,
                    tension: 0.15
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: { top: 24, bottom: 8 }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (c) {
                            return c.parsed.y.toFixed(2) + " °C";
                        }
                    }
                }
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
                    title: {
                        display: true,
                        text: "Temperature (Celsius)",
                        font: { size: 12 }
                    },
                    suggestedMin: 15,
                    suggestedMax: 40,
                    ticks: { stepSize: 5 },
                    grid: { color: "#e6e6e6" }
                }
            }
        },
        plugins: [valueLabelPlugin]
    });
}
