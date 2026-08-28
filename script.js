const CHANNEL_ID = "3473755";
const READ_API_KEY = "ZD662I6GZEHMSGIT";

let tempChart = null;
let humChart = null;

loadData();

setInterval(loadData, 30000);

async function loadData() {

    try {

        const url =
            `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=40`;

        const response = await fetch(url);

        const data = await response.json();

        const feeds = data.feeds;

        if (!feeds || feeds.length === 0) {
            return;
        }

        const temperatures = feeds
            .map(feed => Number(feed.field1))
            .filter(v => !isNaN(v));

        const humidities = feeds
            .map(feed => Number(feed.field2))
            .filter(v => !isNaN(v));

        const labels = feeds.map(feed =>
            new Date(feed.created_at).toLocaleTimeString()
        );

        const latestTemp =
            temperatures[temperatures.length - 1];

        const latestHum =
            humidities[humidities.length - 1];

        document.getElementById("tempValue").innerText =
            latestTemp.toFixed(2) + " °C";

        document.getElementById("humValue").innerText =
            latestHum.toFixed(2) + " %";

        updateStats(temperatures, "temp");
        updateStats(humidities, "hum");

        drawTemperatureChart(labels, temperatures);
        drawHumidityChart(labels, humidities);

    } catch (error) {

        console.error(error);

    }

}

function updateStats(values, prefix) {

    const min = Math.min(...values);
    const max = Math.max(...values);

    const avg =
        values.reduce((a, b) => a + b, 0)
        / values.length;

    document.getElementById(prefix + "Min").innerText =
        min.toFixed(2);
