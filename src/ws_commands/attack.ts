import {
  GameField,
  MAP_SIZE,
  Position,
  ShipStatus,
  WSUser,
  WsCommands,
  rooms,
} from '../model';

export const attack = (
  attackData: {
    gameId: string;
    x: number;
    y: number;
    indexPlayer: 0 | 1;
  },
  ws?: WSUser,
) => {
  const { gameId, x, y, indexPlayer } = { ...attackData };
  const field = rooms.get(gameId)?.field;
  if (!field) return;

  const { ships, killed, shots } =
    indexPlayer === 1 ? field.firstUserShipsData : field.secondUserShipsData;

  if (shots.some((shot) => shot.x === x && shot.y === y)) {
    sendTurn(field);
    return;
  } else {
    shots.push({ x, y });
    sendTurn(field);
  }

  const { killedDraft, shipsDraft, status, data } = attackShip(
    x,
    y,
    ships,
    killed,
    shots,
  );

  if (!indexPlayer) {
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

  const allShipsKilled = shipsDraft.every((ship) => ship.length === 0);
  if (allShipsKilled) {
    const id = ws!.id;
    finishGame(id, field);
  }

  sendTurn(field);
};

const attackShip = (
  x: number,
  y: number,
  ships: Position[][],
  killed: Position[][],
  shots: Position[],
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
  const shotsDraft = shots.slice();
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

const finishGame = (id: string, field: GameField) => {
  const users = [field.firstUser, field.secondUser];
  users.forEach((user) =>
    user.send(
      JSON.stringify({
        type: WsCommands.FinishGame,
        data: JSON.stringify({ winPlayer: id }),
        id: 0,
      }),
    ),
  );
};
