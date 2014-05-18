var _ = require('underscore');
var crypto = require('crypto');
var EventSource = require('eventsource');
var request = require('request');
var http = require('http');


var argv = require('minimist')(process.argv.slice(2));

var host = argv.host || 'http://localhost:8989';
var timeout = argv.timeout || 2000;
var maxTopics = argv.topics || 10;
var maxConns = argv.conns || 10;
var rate = argv.rate || 1000;

http.globalAgent.maxSockets = maxTopics * maxConns + rate;

var keys = [];
var connectionRegister = _.reduce(_.range(maxTopics), function(memo, index) {
    var key = crypto.createHash('sha1').update(index.toString()).digest('hex');
    memo[key] = _.map(_.range(maxConns), function() {
        var subscribeUrl = host + "/subscribe/" + key;
        var es = new EventSource(subscribeUrl);
        es.onmessage = function(e) {
            console.log(e.data);
        };
        return es;
    });
    keys.push(key);
    return memo;
}, {});


var pingRandomly = function() {
    var randomKey = _.sample(keys);
    console.log("Publishing to", randomKey);
    var publishUrl = host + "/publish/" + randomKey;
    request.get(publishUrl);
};

setInterval(pingRandomly, (1000 / rate));