import { EmptyRoom, WSUser, WsCommands, rooms, users, winners } from '../model';
import { v4 as uuidv4 } from 'uuid';

export const createRoom = (firstUser: WSUser) => {
  const index = uuidv4();
  rooms.set(index, { firstUser, secondUser: null, field: null });
  updateRooms();
};

const getEmptyRooms = () => {
  const roomList: EmptyRoom[] = [];
  rooms.forEach((val, key) => {
    if (val.secondUser !== null) return;
    roomList.push({
      roomId: key,
      roomUsers: [{ name: val.firstUser!.name, index: val.firstUser!.id }],
    });
  });
  return roomList;
};

export const updateRooms = () => {
  const roomList = getEmptyRooms();
  users.forEach((user) =>
    user.ws.send(
      JSON.stringify({
        type: WsCommands.UpdateRoom,
        data: JSON.stringify(roomList),
        id: 0,
      }),
    ),
  );
};

export const updateWinners = () => {
  users.forEach((user) =>
    user.ws.send(
      JSON.stringify({
        type: WsCommands.UpdateWinners,
        data: JSON.stringify(winners),
        id: 0,
      }),
    ),
  );
};
