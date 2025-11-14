import { games } from '@/db/in-memory-db';
import { Room } from '@/models/types';

export const getRooms = () => {
  const rooms: Room[] = [];

  for (const [roomId, game] of games) {
    if (game.second.ws.index === game.first.ws.index) {
      rooms.push({ roomId, roomUsers: [{ name: game.first.ws!.name, index: game.first.ws!.index }] });
    }
  }
  return rooms;
};
