import { GameField, WSUser, WsCommands, rooms } from '../model';
import { updateRooms } from './create-rooms';


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
    firstUserShipsData: { ships: [[]], killed: [[]], shots: [] },
    secondUserShipsData: { ships: [[]], killed: [[]], shots: [] },
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