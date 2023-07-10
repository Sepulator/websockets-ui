import {
  EmptyRoom,
  GameField,
  Room,
  Ship,
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

const updateRooms = () => {
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

const updateWinners = () => {
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
  console.log(indexRoom);
  const room = rooms.get(indexRoom);
  const isNotEqual = room?.firstUser && room.firstUser.id === secondUser.id;
  if (!room || !room.firstUser || !secondUser || isNotEqual) return;
  console.log(indexRoom);
  room!.secondUser = secondUser;

  const gameField: GameField = {
    firstUser: room.firstUser,
    secondUser: room.secondUser,
    firstUserShips: [],
    secondUserShips: [],
    isPlayed: false,
    activePlayerId: 0,
  };

  room.field = gameField;
  const roomUsers = [room.firstUser, room.secondUser];
  updateRooms();
  roomUsers.forEach((user, index) => {
    user.send(
      JSON.stringify({
        type: WsCommands.CreateGame,
        data: JSON.stringify({
          idGame: indexRoom,
          idPlayer: index,
        }),
      }),
    );
  });
};

export const addShips = (
  gameId: string,
  ships: Ship[],
  indexPlayer: number,
) => {
  const field = rooms.get(gameId)?.field;

  if (!field) return;

  if (indexPlayer === 0) {
    field.firstUserShips = ships;
    field.activePlayerId = 0;
  } else {
    field.secondUserShips = ships;
    field.activePlayerId = 1;
  }

  const users = [field.firstUser, field.secondUser];

  if (!field.firstUserShips.length || !field.secondUserShips.length) return;

  users.forEach((user) => {
    user.send(
      JSON.stringify({
        type: WsCommands.StartGame,
        data: JSON.stringify({
          ships:
            user === field.firstUser
              ? field.firstUserShips
              : field.secondUserShips,
          currentPlayerIndex: field.activePlayerId,
        }),
        id: 0,
      }),
    );
  });
};

const sendTurn = () => {
  
};
