/*
 * This script obtains data from FlightRadar24 in a latitude, longitude and radious defined and sends the
    information obtained through Apache Kakfa
    @author: Cristian Martin, ERTIS Research Group, University of Malaga.
 */

// Import to obtain data from FlightRadar24
var radar = require('flightradar24-client/lib/radar');

// Configuration vars
var LAT = parseFloat(process.env.LAT) || 36.7201600;
var LON = parseFloat(process.env.LON) || -4.4203400;
var KAFKA_TOPIC= process.env.TOPIC || 'ertisdemo';
var BROKER_LIST=process.env.BROKER_LIST || 'localhost:9092';
var CONNECTION_TIMEOUT = parseInt(process.env.CONNECTION_TIMEOUT) || 100000;
var RADIUS= parseInt(process.env.RADIUS) || 1;
var REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL) || 1000;

// Kafka library
var kafka = require('kafka-node'),
    HighLevelProducer = kafka.HighLevelProducer,
    client = new kafka.KafkaClient({kafkaHost: BROKER_LIST, connectTimeout: CONNECTION_TIMEOUT}),
    producer = new HighLevelProducer(client);

// Wait until producer is ready
producer.on("ready", function () {
    // Message to be sent thorough Kafka
    var msg = {};
    payloads = [
        { topic: KAFKA_TOPIC, messages: ''}
    ];
    // Set the 
    setInterval(function () {
        // GET the flights in the location, latitude and radius defined
        radar(parseInt(LAT) + RADIUS, LON - RADIUS, LAT - RADIUS, LON + RADIUS).
            then(function (data) {
            data.forEach(function (flight) {
                
                msg = flight;
                msg.lat = flight.latitude;
                msg.lon = flight.longitude;
                msg.name = flight.flight || flight.registration || flight.modeSCode;
                msg.latitude = undefined;
                msg.longitude = undefined;
                msg.icon = "plane";
                msg.iconColor = "red";
                payloads[0].messages=JSON.stringify(msg);
                let push_status = producer.send(payloads, (err, data) => {
                    if (err) {
                        console.log('[kafka-producer -> ' + err + ']: broker update failed');
                    } else {
                        console.log('[kafka-producer -> ' + JSON.stringify(payloads) + ']: data sent correctly');
                    }
                });
            });
        }).catch(function (error) {
            console.log(error);
        });
    }, REFRESH_INTERVAL);
});

// In the case the producer fails
producer.on('error', function(err) {
     console.log('[kafka-producer -> '+err+']: connection errored');
     throw err;
});