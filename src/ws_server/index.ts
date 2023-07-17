import { Ship, UserAuth, WSUser, WsCommands, WsResponse } from '../model';
import { RawData, WebSocketServer } from 'ws';
import {
  addShips,
  addUser,
  attack,
  createRoom,
  randomAttack,
  userAuth,
} from '../ws_commands';

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
      case WsCommands.Attack:
        const attackData = JSON.parse(obj.data) as {
          gameId: string;
          x: number;
          y: number;
          indexPlayer: 0 | 1;
        };
        attack({ ...attackData }, ws);
        break;
      case WsCommands.RandomAttack:
        const randomAttackData = JSON.parse(obj.data) as {
          gameId: string;
          indexPlayer: 0 | 1;
        };
        randomAttack({ ...randomAttackData });
        break;
      default:
        console.log(`Type ${type} unknown`);
        break;
    }

    console.log(`received: %s`, data);
  });
});
