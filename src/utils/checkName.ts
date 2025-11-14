import { players } from '@/db/in-memory-db';

export const isUniqueName = (name: string) => {
  for (const [_, player] of players.entries()) {
    if (player.name.trim() === name.trim()) {
      return true;
    }
  }

  return false;
};
