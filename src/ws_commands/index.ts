import { kill } from 'process';
import {
  EmptyRoom,
  GameField,
  Position,
  Room,
  Ship,
  ShipStatus,
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
const MAP_SIZE = 9;

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
    firstUserShipsData: { ships: [[]], killed: [[]] },
    secondUserShipsData: { ships: [[]], killed: [[]] },
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
    const { shipsCoor, killedCoor } = initShipsCoor(ships);
    field.firstUserShipsData.ships = shipsCoor;
    field.firstUserShipsData.killed = killedCoor;
  } else {
    field.secondUserShips = ships;
    field.activePlayerId = 1;
    const { shipsCoor, killedCoor } = initShipsCoor(ships);
    field.secondUserShipsData.ships = shipsCoor;
    field.secondUserShipsData.killed = killedCoor;
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

const initShipsCoor = (ships: Ship[]) => {
  const shipsCoor: Position[][] = [];
  const killedCoor: Position[][] = [];
  ships.forEach((ship) => {
    const shipCoor: Position[] = [];
    for (let i = 0; i < ship.length; i++) {
      if (ship.direction) {
        shipCoor.push({ x: ship.position.x, y: ship.position.y + i });
      } else {
        shipCoor.push({ x: ship.position.x + i, y: ship.position.y });
      }
    }
    shipsCoor.push(shipCoor);
    killedCoor.push([]);
  });
  return { shipsCoor, killedCoor };
};

const sendTurn = (field: GameField) => {
  const users = [field.firstUser, field.secondUser];
  users.forEach((user) => {
    user.send(
      JSON.stringify({
        type: WsCommands.Turn,
        data: JSON.stringify({ currentPlayer: field.activePlayerId }),
        id: 0,
      }),
    );
  });
};

export const attack = (attackData: {
  gameId: string;
  x: number;
  y: number;
  indexPlayer: 0 | 1;
}) => {
  const { gameId, x, y, indexPlayer } = { ...attackData };
  const field = rooms.get(gameId)?.field;
  if (!field) return;

  const { ships, killed } = !indexPlayer
    ? field.secondUserShipsData
    : field.firstUserShipsData;

  const { killedDraft, shipsDraft, status, data } = attackShip(
    x,
    y,
    ships,
    killed,
  );

  if (indexPlayer) {
    field.secondUserShipsData.ships = shipsDraft;
    field.secondUserShipsData.killed = killedDraft;
  } else {
    field.firstUserShipsData.ships = shipsDraft;
    field.firstUserShipsData.killed = killedDraft;
  }
  const currentPlayer = indexPlayer;
  const position = { x, y };

  sendAttackData(gameId, position, currentPlayer, status);

  if (status === 'killed') {
    data?.filtered.forEach((coor) => {
      const position = coor;
      const status = 'miss';
      sendAttackData(gameId, position, currentPlayer, status);
    });

    data?.killed.forEach((coor) => {
      const position = coor;
      const status = 'killed';
      sendAttackData(gameId, position, currentPlayer, status);
    });
  }

  if (status === 'miss') {
    field.activePlayerId = field.activePlayerId === 0 ? 1 : 0;
  }

  sendTurn(field);
};

const attackShip = (
  x: number,
  y: number,
  ships: Position[][],
  killed: Position[][],
): {
  shipsDraft: Position[][];
  killedDraft: Position[][];
  status: ShipStatus;
  data:
    | {
        filtered: Position[];
        killed: Position[];
      }
    | undefined;
} => {
  const shipsDraft = ships.slice();
  const killedDraft = killed.slice();
  let status: ShipStatus = 'miss';
  let data:
    | {
        filtered: Position[];
        killed: Position[];
      }
    | undefined;

  ships.forEach((ship, shipIdx) => {
    if (ship.length !== 0) {
      ship.forEach((coor, coorIdx) => {
        if (coor.x === x && coor.y === y) {
          killedDraft[shipIdx]?.push({ x, y });
          shipsDraft[shipIdx]?.splice(coorIdx, 1);
          status = 'shot';
        }

        const isShipsKilled = shipsDraft[shipIdx]?.length;

        if (!isShipsKilled) {
          status = 'killed';
          data = initEdgeCoors(killedDraft[shipIdx]);
        }
      });
    }
  });

  //const allShipsKilled = shipsDraft.every((ship) => ship.length);
  return { shipsDraft, killedDraft, status, data };
};

const initEdgeCoors = (killed: Position[] | undefined) => {
  const edgeCoors: Position[] = [];
  if (!killed) return;

  killed.forEach((coor) => {
    edgeCoors.push({ x: coor.x - 1, y: coor.y });
    edgeCoors.push({ x: coor.x, y: coor.y - 1 });

    edgeCoors.push({ x: coor.x - 1, y: coor.y - 1 });
    edgeCoors.push({ x: coor.x + 1, y: coor.y + 1 });

    edgeCoors.push({ x: coor.x + 1, y: coor.y - 1 });
    edgeCoors.push({ x: coor.x - 1, y: coor.y + 1 });

    edgeCoors.push({ x: coor.x + 1, y: coor.y });
    edgeCoors.push({ x: coor.x, y: coor.y + 1 });
  });

  const filtered = edgeCoors.filter(
    (coor) =>
      coor.x >= 0 && coor.x <= MAP_SIZE && coor.y >= 0 && coor.y <= MAP_SIZE,
  );
  const data = { filtered, killed };
  return data;
};

export const randomAttack = (randomAttackData: {
  gameId: string;
  indexPlayer: 0 | 1;
}) => {
  const { gameId, indexPlayer } = { ...randomAttackData };
};

const sendAttackData = (
  id: string,
  position: {
    x: number;
    y: number;
  },
  currentPlayer: number,
  status: ShipStatus,
) => {
  const field = rooms.get(id)?.field;
  if (!field) return;

  const users = [field.firstUser, field.secondUser];

  users.forEach((user) =>
    user.send(
      JSON.stringify({
        type: WsCommands.Attack,
        data: JSON.stringify({ position, currentPlayer, status }),
        id: 0,
      }),
    ),
  );
};
