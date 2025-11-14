import { Game, Player, Winner } from '@/models/types';

export const players: Map<string, Player> = new Map();
export const winners: Winner[] = [];
export const games: Map<string, Game> = new Map();
export const bot = 'bot';
