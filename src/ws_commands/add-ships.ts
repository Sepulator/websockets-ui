import { Position, Ship, WsCommands, rooms } from '../model';

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