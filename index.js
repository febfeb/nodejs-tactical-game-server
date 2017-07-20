let SocketIO = require('./src/SocketIO');
let HttpProcessor = require('./src/HttpProcessor');

//Declare Express app
let App = require('express')();
let Http = require('http').Server(App);

new SocketIO(Http);
new HttpProcessor(App, Http);

//Handle Quit Event
process.stdin.resume();//so the program will not close instantly
const exitHandler = (options, err) => {
    //mysqlConnection.end();

    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
