var http = require('http');
var _ = require('underscore');

var CONNECTION_REGISTER = {};

var ping = function(connection) {
    connection.write('id: ' + Date.now() + '\n');
    connection.write('data: ' + 'PING' + '\n\n');
};

var sendHeartbeat = function(connection) {
    connection.write('id: ' + Date.now() + '\n');
    connection.write('data: ' + 'HEARTBEAT' + '\n\n');
}

var getChannelRegister = function(channel) {
    if (CONNECTION_REGISTER[channel] === undefined) {
        CONNECTION_REGISTER[channel] = [];
    }
    return CONNECTION_REGISTER[channel];
}

var subscribe = function(connection, channel) {
    connection.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    connection.closed = false;
    connection.on('close', function() {
        connection.closed = true;
    });
    getChannelRegister(channel).push(connection);
    sendHeartbeat(connection);
};

var publish = function(channel) {
    var connections = getChannelRegister(channel);
    for (var i = connections.length - 1; i >= 0; i--) {
        console.log(connections[i].closed);
        ping(connections[i]);
    };
}

var server = http.createServer(function(req, res) {
    var urlParts = req.url.split('/');
    var action = urlParts[1];
    var channel = urlParts[2];

    if (action === 'subscribe') {
        subscribe(res, channel);
    }

    if (action === 'publish') {
        publish(channel);
        res.end();
    }
});

server.listen(8989);