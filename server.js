var http = require('http');
var _ = require('underscore');

var argv = require('minimist')(process.argv.slice(2));

var redis = require("redis")

var port = argv.port || 8989;
var redisHost = argv.rhost || 'localhost';
var redisPort = argv.rport || 6379;

var redisSubscriber = redis.createClient(redisPort, redisHost);
var redisPublisher = redis.createClient(redisPort, redisHost);


var CONNECTION_REGISTER = {};

redisSubscriber.psubscribe("*");
redisSubscriber.on("pmessage", function(pattern, channel, message) {
    publish(channel);
});

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
        redisPublisher.publish(channel, Date.now());
        res.end();
    }
});

var reap = function(key) {
    CONNECTION_REGISTER[key] = _.reject(CONNECTION_REGISTER[key], function(conn) {
        return conn.closed;
    });
};

var reapRegister = function() {
    _.map(_.keys(CONNECTION_REGISTER), function(key) {
        _.defer(reap, key);
    });
};
setInterval(reapRegister, 1000);
server.listen(port);