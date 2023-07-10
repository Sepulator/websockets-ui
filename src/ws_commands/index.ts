import {
  EmptyRoom,
  Room,
  User,
  UserAuth,
  WSUser,
  Winner,
  WsCommands,
} from '../model';
import { v4 as uuidv4 } from 'uuid';

const users: User[] = [];
const rooms: Map<string, Room> = new Map();
const winners: Winner[] = [];

export const userAuth = ({ name, password }: UserAuth, ws: WSUser) => {
  const index = uuidv4();
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

export const createRoom = (firstUser: WSUser) => {
  const index = uuidv4();
  rooms.set(index, { firstUser, secondUser: null, field: null });
  updateRooms();
};

export const getEmptyRooms = () => {
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

export const addUser = (indexRoom: string, secondUser: WSUser) => {
  const room = rooms.get(indexRoom);
  const notEqual = room?.firstUser && room.firstUser.id === secondUser.id;
  if (!room || room.secondUser || notEqual) return;

  room!.secondUser = secondUser;
};
