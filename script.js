const CHANNEL_ID = "3473755";
const READ_API_KEY = "ZD662I6GZEHMSGIT";

let tempChart;
let humChart;

loadData();

setInterval(loadData, 30000);

asynchannels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=40`;

        const response = await fetch(url);

        const data = await response.json();

        const feeds = data.feeds;

        const temperatures = feeds
            .map(feed => parseFloat(feed.field1))
            .filter(value => !isNaN(value));

        const humidities = feeds
            .map(feed => parseFloat(feed.field2))
            .filter(value => !isNaN(value));

        const labels = feeds.map(feed =>
            new Date(feed.created_at)
            .toLocaleTimeString()
        );

        if (
            temperatures.length === 0 ||
            humidities.length === 0
        ) {
            return;
        }

        const latestTemp =
            temperatures[temperatures.length - 1];

        const latestHum =
            humidities[humidities.length - 1];

        document.getElementById("tempValue")
            .innerText =
            latestTemp.toFixed(2) + " °C";

        document.getElementById("humValue")
            .innerText =
            latestHum.toFixed(2) + " %";

        updateStats(
            temperatures,
            "temp"
        );

        updateStats(
            humidities,
            "hum"
        );

        drawTemperatureChart(
            labels,
            temperatures
        );

        drawHumidityChart(
            labels,
            humidities
        );

    }
    catch (error) {

        console.error(error);

    }
}

function updateStats(values, prefix) {

    const min =
        Math.min(...values);

    const max =
        Math.max(...values);

    const avg =
        values.reduce(
            (a, b) => a + b,
            0
        ) / values.length;

    document.getElementById(prefix + "Min")
        .innerText =
        min.toFixed(2);

    document.getElementById(prefix + "Max")
        .innerText =
        max.toFixed(2);

    document.getElementById(prefix + "Avg")
        .innerText =
        avg.toFixed(2);
}

function drawTemperatureChart(
    labels,
    values
) {

    if (tempChart) {
        tempChart.destroy();
    }

    tempChart =
        new Chart(
            document.getElementById("tempChart"),
            {
                type: "line",

                data: {
                    labels: labels,

                    datasets: [{
                        label: "Temperature (°C)",
                        data: values,
                        borderColor: "#00b894",
                        backgroundColor:
                            "rgba(0,184,148,0.2)",
                        tension: 0.3,
                        fill: true
                    }]
                }
            }
        );
}

function drawHumidityChart(
    labels,
    values
) {

    if (humChart) {
        humChart.destroy();
    }

    humChart =
        new Chart(
            document.getElementById("humChart"),
            {
                type: "line",

                data: {
                    labels: labels,

                    datasets: [{
                        label: "Humidity (%)",
                        data: values,
                        borderColor: "#0984e3",
                        backgroundColor:
                            "rgba(9,132,227,0.2)",
                        tension: 0.3,
                        fill: true
                    }]
                }
            }
        );
}
