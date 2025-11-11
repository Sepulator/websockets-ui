import WebSocket from 'ws';

export interface PlayerAuth {
  name: string;
  password: string;
}

export interface PlayerWS extends WebSocket {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  password: string;
  ws: PlayerWS;
}

export interface Winner {
  name: string;
  wins: number;
}

export interface Room {
  roomId: number;
  roomUsers: { name: string; index: string }[];
}

export interface WebSocketMessage {
  type: MessageType;
  data: string;
  id: number;
}

export enum MessageType {
  auth = 'reg',
  createGame = 'create_game',
  startGame = 'start_game',
  updateRoom = 'update_room',
  createRoom = 'create_room',
  updateWinners = 'update_winners',
  finishGame = 'finish',
  addToRoom = 'add_user_to_room',
  addShips = 'add_ships',
  attack = 'attack',
  turn = 'turn',
  randomAttack = 'randomAttack',
}
