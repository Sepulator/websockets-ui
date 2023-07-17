import WebSocket from 'ws';

export interface WsResponse {
  type: WsCommands;
  data: string;
  id: number;
}

export enum WsCommands {
  UserAuth = 'reg',
  CreateGame = 'create_game',
  StartGame = 'start_game',
  CreateRoom = 'create_room',
  UpdateRoom = 'update_room',
  AddUser = 'add_user_to_room',
  AddShips = 'add_ships',
  Turn = 'turn',
  Attack = 'attack',
  RandomAttack = 'randomAttack',
  FinishGame = 'finish',
  UpdateWinners = 'update_winners',
}

export interface User {
  id: string;
  name: string;
  password: string;
  ws: WSUser;
}

export interface Room {
  firstUser: WSUser | null;
  secondUser: WSUser | null;
  field: GameField | null;
}

export interface Winner {
  name: string;
  wins: number;
}

export interface EmptyRoom {
  roomId: string;
  roomUsers: { name: string; index: string }[];
}

export interface UserAuth {
  name: string;
  password: string;
}

export interface GameField {
  firstUserShips: Ship[];
  secondUserShips: Ship[];
  firstUser: WSUser;
  secondUser: WSUser;
  isPlayed: boolean;
  activePlayerId: 0 | 1;
  firstUserShipsData: {
    ships: Position[][];
    killed: Position[][];
    shots: Position[];
  };
  secondUserShipsData: {
    ships: Position[][];
    killed: Position[][];
    shots: Position[];
  };
}

export interface Ship {
  position: Position;
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export type Position = {
  x: number;
  y: number;
};

export type ShipStatus = 'miss' | 'killed' | 'shot';

export interface WSUser extends WebSocket {
  id: string;
  name: string;
}
