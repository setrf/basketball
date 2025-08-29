import { Server } from 'colyseus';
import { createServer } from 'http';
import { WebSocketTransport } from '@colyseus/ws-transport';

class MyRoom extends Room {
  onCreate(options) {
    console.log('MyRoom created!', options);
  }

  onJoin(client, options) {
    console.log(client.sessionId, 'joined!');
  }

  onLeave(client, consented) {
    console.log(client.sessionId, 'left!');
  }

  onDispose() {
    console.log('Dispose MyRoom');
  }
}

const server = new Server({
  transport: new WebSocketTransport({
    server: createServer(),
  }),
});

server.define('my_room', MyRoom);

server.listen(2567);
console.log('Listening on ws://localhost:2567');
