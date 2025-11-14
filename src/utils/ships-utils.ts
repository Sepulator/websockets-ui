import { Position, Ship, ShotStatus } from '@/models/types';

export const generateShips = (ships: Ship[]): { ships: Position[][]; killed: Position[][]; shots: Position[] } => {
  const shipPositions: Position[][] = [];
  const killedPositions: Position[][] = [];

  for (const ship of ships) {
    const array: Position[] = [];

    for (let index = 0; index < ship.length; index++) {
      if (ship.direction) {
        array.push({ x: ship.position.x, y: ship.position.y + index });
      } else {
        array.push({ x: ship.position.x + index, y: ship.position.y });
      }
    }

    shipPositions.push(array);
    killedPositions.push([]);
  }

  return { ships: shipPositions, killed: killedPositions, shots: [] };
};

export const getEdgeCells = (killed: Position[], boardSize: number) => {
  const edgeCells: Position[] = [];

  for (const cell of killed) {
    edgeCells.push({ x: cell.x - 1, y: cell.y });
    edgeCells.push({ x: cell.x - 1, y: cell.y - 1 });
    edgeCells.push({ x: cell.x - 1, y: cell.y + 1 });
    edgeCells.push({ x: cell.x + 1, y: cell.y + 1 });
    edgeCells.push({ x: cell.x + 1, y: cell.y - 1 });
    edgeCells.push({ x: cell.x + 1, y: cell.y });
    edgeCells.push({ x: cell.x, y: cell.y + 1 });
    edgeCells.push({ x: cell.x, y: cell.y - 1 });
  }

  const validateEdge = (cell: Position) => cell.x >= 0 && cell.x < boardSize && cell.y >= 0 && cell.y < boardSize;

  const filteredEdgeCells = edgeCells.filter((cell) => validateEdge(cell));

  return { edgeCells: filteredEdgeCells, killedShip: killed };
};

export const attackShip = (
  shot: Position,
  shipsOrigin: Position[][],
  killedOrigin: Position[][],
  boardSize: number
): {
  ships: Position[][];
  killed: Position[][];
  edgeCells: Position[] | undefined;
  killedShip: Position[] | undefined;
  shotStatus: ShotStatus;
} => {
  const ships = shipsOrigin.slice();
  const killed = killedOrigin.slice();
  let shotStatus: ShotStatus = 'miss';
  let edgeCells: Position[] | undefined;
  let killedShip: Position[] | undefined;

  for (const [shipIndex, ship] of ships.entries()) {
    for (const [cellIndex, cell] of ship.entries()) {
      if (cell.x === shot.x && cell.y === shot.y) {
        killed[shipIndex].push({ x: shot.x, y: shot.y });
        ships[shipIndex].splice(cellIndex, 1);
        shotStatus = 'shot';

        if (ships[shipIndex].length === 0) {
          const data = getEdgeCells(killed[shipIndex], boardSize);
          edgeCells = data.edgeCells;
          killedShip = data.killedShip;
          shotStatus = 'killed';
        }
      }
    }
  }

  return { ships, killed, edgeCells, killedShip, shotStatus };
};

export const getRandomCell = (boardSize: number): Position => {
  const x = Math.ceil(Math.random() * boardSize) - 1;
  const y = Math.ceil(Math.random() * boardSize) - 1;
  return { x, y };
};
