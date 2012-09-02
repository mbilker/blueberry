
var net = require('net'),
    events = require('events'),
    util = require('util'),
    config = require('../config');

var Connection = function(settings) {
  events.EventEmitter.call(this);
  var self = this;
  this.socket = net.createConnection(settings.port, settings.host);
  this.socket.setNoDelay(true);
  this.socket.on('connect', function() {
    //console.log('connected');
    //console.log('sending server ping');
    var b = new Buffer(1);
    b[0] = 0xFE;
    self.socket.write(b, function() {
      //console.log('flushed');
    });
  });
  this.socket.on('data', function(chunk) {
    //console.log('got data: ' + chunk);
    var buffer = chunk;

    var command = buffer.readUInt8(0);
    //console.log(command);

    if (command != 0xFF)
      return false;

    var build = {};
    var bufferIndex = 1;
    var length = buffer.readUInt16BE(bufferIndex);
    bufferIndex += 2;

    var target = 'string';
        
    var tempString = '';
    var tempPlayers = '';
    var tempMaxPlayers = '';
    for (var i = 1; i < length * 2; i += 2) {
      //console.error(buffer.toString("utf8", bufferIndex + i, bufferIndex + i + 1));
      var toContinue = false;
      if (buffer.readUInt8(bufferIndex + i) == 0xA7) {
        toContinue = true;
        switch (target) {
          case 'string':
            target = 'players';
            break;

          case 'players':
            target = 'maxPlayers';
            break;

          case 'maxPlayers':
            break;
        }
      }
      if (toContinue == true) continue;
      if (target == 'string') tempString += buffer.toString("utf8", bufferIndex + i, bufferIndex + i + 1);
      if (target == 'players') tempPlayers += buffer.toString("utf8", bufferIndex + i, bufferIndex + i + 1);
      if (target == 'maxPlayers') tempMaxPlayers += buffer.toString("utf8", bufferIndex + i, bufferIndex + i + 1);
    }

    build['string'] = tempString;
    build['players'] = tempPlayers;
    build['maxPlayers'] = tempMaxPlayers;
    bufferIndex += length;

    console.log(build);
    self.socket.end();
  });
}

util.inherits(events.EventEmitter, Connection);

var Blueberry = function() {
  this.config = config.configuration;
}

Blueberry.prototype.start = function() {
  for (i in this.config) {
    var connection = this.config[i];
    new Connection({ host: connection.host, port: connection.port });
  }
}

module.exports = Blueberry;
