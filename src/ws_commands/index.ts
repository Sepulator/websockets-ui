import { User, UserAuth, WsCommands, WsResponse } from '../model';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';

const users: User[] = [];
const rooms = {};
export const userAuth = (user: UserAuth, ws: WebSocket) => {
  const index = uuidv4();
  const name = user.name;
  const password = user.password;
  users.push({ name, id: index, password, ws });
  ws.send(
    JSON.stringify({
      type: WsCommands.UserAuth,
      data: JSON.stringify({
        name: name,
        index: index,
        error: false,
        errorText: '',
      }),
      id: 0,
    }),
  );
};
