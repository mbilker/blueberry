"use strict";

const events = require('events');
const net = require('net');

const config = require('../config');

class Connection extends events.EventEmitter {
  constructor(settings) {
    super();

    this.host = settings.host;
    this.port = settings.port;

    this.socket = null;
  }

  connect() {
    this.socket = net.createConnection(this.port, this.host);
    this.socket.setNoDelay(true);

    this.socket.on('connect', () => {
      const b = Buffer.alloc(1);
      b[0] = 0xFE;
      this.socket.write(b, () => {
        //console.log('flushed');
      });
    });

    this.socket.on('data', (chunk) => {
      const command = chunk.readUInt8(0);

      if (command != 0xFF) {
        return false;
      }

      let build = {
        string: '',
        players: '',
        maxPlayers: '',
      };
      let bufferIndex = 1;

      const length = chunk.readUInt16BE(bufferIndex);
      bufferIndex += 2;

      let target = 'string';
      for (let i = 1; i < length * 2; i += 2) {
        if (chunk.readUInt8(bufferIndex + i) == 0xA7) {
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

          continue;
        }
        build[target] += chunk.toString('utf8', bufferIndex + i, bufferIndex + i + 1);
      }

      build.players = parseInt(build.players);
      build.maxPlayers = parseInt(build.maxPlayers);

      console.log(`${this.host}:${this.port}`, build);

      this.socket.end();
    });
  }
}

class Blueberry {
  constructor() {
    this.config = config.configuration;
  }

  start() {
    for (const server of this.config) {
      const connection = new Connection({ host: server.host, port: server.port });
      connection.connect();
    }
  }
}

module.exports = Blueberry;
