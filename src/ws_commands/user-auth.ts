
import { UserAuth, WSUser, WsCommands, users } from '../model';
import { v4 as uuidv4 } from 'uuid';
import { updateRooms, updateWinners } from './create-rooms';

export const userAuth = ({ name, password }: UserAuth, ws: WSUser) => {
  const index = uuidv4();
  ws.name = name;
  ws.id = index;
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

  updateRooms();
  updateWinners();
};