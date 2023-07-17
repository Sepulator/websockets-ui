import { rooms } from '../model';
import { attack } from './attack';


export const randomAttack = (randomAttackData: {
  gameId: string;
  indexPlayer: 0 | 1;
}) => {
  const { gameId, indexPlayer } = { ...randomAttackData };
  const field = rooms.get(gameId)?.field;
  if (!field) return;
  const { shots } =
    indexPlayer === 1 ? field.firstUserShipsData : field.secondUserShipsData;
  let coor = getRandomPosition();

  while (shots.some((shot) => shot.x === coor.x && shot.y === coor.y)) {
    coor = getRandomPosition();
  }
  const attackData = { gameId, x: coor.x, y: coor.y, indexPlayer };
  attack(attackData);
};

const getRandomPosition = () => {
  const x = Math.ceil(Math.random() * 10) - 1;
  const y = Math.ceil(Math.random() * 10) - 1;
  return { x, y };
};