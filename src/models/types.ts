import WebSocket from 'ws';

export interface PlayerAuth {
  name: string;
  password: string;
}

export interface PlayerWS extends WebSocket {
  index: string;
  name: string;
}

export interface Player {
  index: string;
  name: string;
  password: string;
  ws: PlayerWS;
}

export interface Winner {
  name: string;
  wins: number;
}

export interface Game {
  first: PlayerWS;
  second: PlayerWS | null;
  gameBoard: GameBoard;
}

export interface GameBoard {
  activePlayer: 'first' | 'second';
  first: Ship[];
  second: Ship[];
}

export interface Room {
  roomId: string;
  roomUsers: { name: string; index: string }[];
}

export interface WebSocketMessage {
  type: MessageType;
  data: string;
  id: number;
}

export interface Ship {
  position: Position;
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export interface Ships {
  gameId: string;
  ships: Ship[];
  indexPlayer: string;
}

export interface Position {
  x: number;
  y: number;
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
