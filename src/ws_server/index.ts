import { UserAuth, WsCommands, WsResponse } from '../model';
import WebSocket, { RawData, WebSocketServer } from 'ws';
import { userAuth } from '../ws_commands';

const WS_PORT = 3000;

const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: RawData) => {
    const obj = JSON.parse(data.toString()) as WsResponse;
    const type = obj.type;

    switch (type) {
      case WsCommands.UserAuth:
        userAuth(obj.data as UserAuth, ws);
        break;
      default:
        console.log(`Type ${type} unknown`);
        break;
    }

    console.log(`received: %s`, data);
  });
});
