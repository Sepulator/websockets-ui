import { Player, Room, Winner } from '@/models/types';

export const players: Map<string, Player> = new Map();
export const winners: Winner[] = [];
export const rooms: Room[] = [];
