import WebSocket from 'ws';

export interface WsResponse {
  type: WsCommands;
  data: unknown;
  id: number;
}

export enum WsCommands {
  UserAuth = 'reg',
  CreateGame = 'create_game',
  StartGame = 'start_game',
  Turn = 'turn',
  Attack = 'attack',
  FinishGame = 'finish',
  UpdateRoom = 'update_room',
  UpdateWinners = 'update_winners',
}

export interface User {
  id: string;
  name: string;
  password: string;
  ws: WebSocket;
}

export interface Room {
  indexRoom: number;
  idGame: number;
  idPLayer: number;
}

export interface UserAuth {
  name: string;
  password: string;
}
