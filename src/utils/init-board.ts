import { Game, PlayerWS } from '@/models/types';

export const initBoard = (activePlayer: string, playerWS: PlayerWS): Game => {
  return {
    activePlayer,
    first: {
      ws: playerWS,
      originShips: [],
      killed: [],
      ships: [],
      shots: [],
    },
    second: {
      ws: playerWS,
      originShips: [],
      killed: [],
      ships: [],
      shots: [],
    },
  };
};
