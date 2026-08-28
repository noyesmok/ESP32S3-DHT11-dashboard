const CHANNEL_ID = "3473755";
const READ_API_KEY = "ZD662I6GZEHMSGIT";

let tempGauge;
let humGauge;

let tempChart;
let humChart;

createGauges();

loadData();

setInterval(loadData, 30000);

function createGauges() {

    const tempOpts = {

        angle: -0.2,

        lineWidth: 0.25,

        radiusScale: 1,

        pointer: {
            length: 0.6,
            strokeWidth: 0.04
        },

        staticZones: [

            { strokeStyle: "#00b300", min: 0, max: 20 },

            { strokeStyle: "#66cc00", min: 20, max: 30 },

            { strokeStyle: "#ff9900", min: 30, max: 40 },

            { strokeStyle: "#ff3300", min: 40, max: 50 }
        ]
    };

    tempGauge =
        new Gauge(
            document.getElementById('tempGauge')
        );

    tempGauge.setOptions(tempOpts);

    tempGauge.maxValue = 50;

    tempGauge.setMinValue(0);

    tempGauge.set(0);

    const humOpts = {

        angle: -0.2,

        lineWidth: 0.25,

        radiusScale: 1,

        staticZones: [

            { strokeStyle: "#00aaff", min: 0, max: 100 }

        ]
    };

    humGauge =
        new Gauge(
            document.getElementById('humGauge')
        );

    humGauge.setOptions(humOpts);

    humGauge.maxValue = 100;

    humGauge.setMinValue(0);

    humGauge.set(0);
}

async function loadData() {

    const url =
        `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=40`;

    const response = await fetch(url);

    const data = await response.json();

    const feeds = data.feeds;

    const temperatures =
        feeds.map(item =>
            parseFloat(item.field1))
            .filter(v => !isNaN(v));

    const humidities =
        feeds.map(item =>
            parseFloat(item.field2))
            .filter(v => !isNaN(v));

    const timestamps =
        feeds.map(item =>
            new Date(item.created_at)
            .toLocaleTimeString());

    const latestTemp =
        temperatures[temperatures.length - 1];

    const latestHum =
        humidities[humidities.length - 1];

    document.getElementById(
        'tempValue'
    ).innerHTML =
        latestTemp.toFixed(2) + " °C";

    document.getElementById(
        'humValue'
    ).innerHTML =
        latestHum.toFixed(2) + " %";

    tempGauge.set(latestTemp);

    humGauge.set(latestHum);

    updateStatistics(
        temperatures,
        "temp"
    );

    updateStatistics(
        humidities,
        "hum"
    );

    drawTempChart(
        timestamps,
        temperatures
    );

    drawHumChart(
        timestamps,
        humidities
    );
}

function updateStatistics(values, prefix) {

    let min =
        Math.min(...values);

    let max =
        Math.max(...values);

    let avg =
        values.reduce(
            (a,b)=>a+b,0
        ) / values.length;

    document.getElementById(
        prefix + "Min"
    ).innerHTML =
        min.toFixed(2);

    document.getElementById(
        prefix + "Max"
    ).innerHTML =
        max.toFixed(2);

    document.getElementById(
        prefix + "Avg"
    ).innerHTML =
        avg.toFixed(2);
}

function drawTempChart(
    labels,
    values
){

    if(tempChart){

        
