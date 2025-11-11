import { games } from '@/db/in-memory-db';
import { Room } from '@/models/types';

export const getRooms = () => {
  const rooms: Room[] = [];

  for (const [roomId, game] of games) {
    if (!game.second) {
      rooms.push({ roomId, roomUsers: [{ name: game.first.name, index: game.first.index }] });
    }
  }
  return rooms;
};
