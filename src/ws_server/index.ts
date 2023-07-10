import { Ship, UserAuth, WSUser, WsCommands, WsResponse } from '../model';
import { RawData, WebSocketServer } from 'ws';
import { addShips, addUser, createRoom, userAuth } from '../ws_commands';

const WS_PORT = 3000;
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws: WSUser) => {
  ws.on('message', async (data: RawData) => {
    const obj = JSON.parse(data.toString()) as WsResponse;
    const type = obj.type;

    switch (type) {
      case WsCommands.UserAuth:
        const user = JSON.parse(obj.data) as UserAuth;
        userAuth(user, ws);
        break;
      case WsCommands.CreateRoom:
        createRoom(ws);
        break;
      case WsCommands.AddUser:
        const { indexRoom } = JSON.parse(obj.data) as { indexRoom: string };
        addUser(indexRoom, ws);
        break;
      case WsCommands.AddShips:
        const { gameId, ships, indexPlayer } = JSON.parse(obj.data) as {
          gameId: string;
          ships: Ship[];
          indexPlayer: number;
        };
        addShips(gameId, ships, indexPlayer);
        break;
      default:
        console.log(`Type ${type} unknown`);
        break;
    }

    console.log(`received: %s`, data);
  });
});
