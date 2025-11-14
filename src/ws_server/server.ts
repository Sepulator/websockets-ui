import { Game, MessageType, PlayerAuth, PlayerWS, Ships, WebSocketMessage } from '@/models/types';
import { WebSocketServer } from 'ws';
import { v4 as uuidV4 } from 'uuid';
import { games, players, winners } from '@/db/in-memory-db';
import { getRooms } from '@/utils/getRooms';
import { initBoard } from '@/utils/initBoard';
import { generateShips } from '@/utils/ships-utils';

const PORT = 3000;

export class WebSocketBattleship {
  private wss: WebSocketServer;
  private port: number;

  constructor(port = PORT) {
    this.wss = new WebSocketServer({ port });
    this.port = PORT;
    this.setupWSServer();
  }

  public info() {
    console.log(`Battleship server started on port ${this.port}`);
  }

  private setupWSServer() {
    this.wss.on('connection', (ws: PlayerWS) => {
      ws.on('message', (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          const payload: unknown = message.data ? JSON.parse(message.data) : '';

          console.log(message.type, message.data);
          this.handleMessage(message.type, payload, ws);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error:`, error.message);
      });

      ws.on('close', () => {
        console.log(`Client disconnected.`);
      });
    });
  }

  private handleMessage(type: MessageType, payload: unknown, ws: PlayerWS) {
    switch (type) {
      case MessageType.auth:
        this.authPlayer(payload as PlayerAuth, ws);
        break;
      case MessageType.createRoom:
        this.createRoom(ws);
        break;
      case MessageType.addToRoom:
        this.addToRoom(payload as { indexRoom: string }, ws);
        break;
      case MessageType.addShips: {
        this.addShips(payload as Ships);
        break;
      }
    }
  }

  private authPlayer({ name, password }: PlayerAuth, ws: PlayerWS) {
    const index = uuidV4();
    ws.name = name;
    ws.index = index;
    players.set(index, { index, name, password, ws });

    this.sendMessage(MessageType.auth, { name, index, error: false, errorText: '' }, ws);
    this.broadcastRooms();
    this.broadcastWinners();
  }

  private broadcast(type: MessageType, data: unknown) {
    for (const [_, player] of players) {
      this.sendMessage(type, data, player.ws);
    }
  }

  private broadcastWinners() {
    this.broadcast(MessageType.updateWinners, winners);
  }

  private broadcastRooms() {
    const rooms = getRooms();
    console.log('rooms', JSON.stringify(rooms));
    this.broadcast(MessageType.updateRoom, rooms);
  }

  private createRoom(player: PlayerWS) {
    const gameId = uuidV4();
    games.set(gameId, { ...initBoard(player.index, player) });
    this.broadcastRooms();
  }

  private addToRoom({ indexRoom }: { indexRoom: string }, ws: PlayerWS) {
    const game = games.get(indexRoom);
    if (!game || game?.activePlayer === ws.index) {
      return;
    }

    game.second.ws = ws;

    this.broadcastRooms();
    this.createGame([game.first.ws, game.second.ws], indexRoom);
  }

  private addShips({ gameId, indexPlayer, ships }: Ships) {
    const game = games.get(gameId);
    if (!game) {
      return;
    }

    if (game.first.ws.index === indexPlayer) {
      game.first = { ...generateShips(ships), ws: game.first.ws, originShips: ships };
    } else {
      game.second = { ...generateShips(ships), ws: game.second.ws, originShips: ships };
    }

    const isAllShips = game.first.ships.length > 0 && game.second.ships.length > 0;

    if (isAllShips) {
      this.startGame(game, gameId);
    } else {
      game.activePlayer = indexPlayer;
    }
  }

  // private attack(
  //   { gameId, indexPlayer, x, y }: { gameId: string; x: number; y: number; indexPlayer: string },
  //   ws: PlayerWS
  // ) {
  //   const game = games.get(gameId);
  //   if (!game) {
  //     return;
  //   }
  // }

  private startGame(game: Game, gameId: string) {
    const players = [game.first, game.second];

    for (const player of players) {
      this.sendMessage(
        MessageType.startGame,
        {
          gameId,
          ships: player.originShips,
          currentPlayerIndex: game.activePlayer,
        },
        player.ws
      );
    }

    this.turn(game, false);
  }

  private turn(game: Game, swap: boolean) {
    const isFirstActive = game.activePlayer === game.first.ws.index;
    const currentPlayer = isFirstActive ? game.first.ws.index : game.second!.ws.index;
    if (swap) {
      game.activePlayer = isFirstActive ? game.second!.ws.index : game.first.ws.index;
    }

    this.sendMessage(MessageType.turn, { currentPlayer }, game.first.ws);
    this.sendMessage(MessageType.turn, { currentPlayer }, game.second.ws);
  }

  private createGame(gameWithPlayers: PlayerWS[], idGame: string) {
    for (const player of gameWithPlayers) {
      this.sendMessage(MessageType.createGame, { idGame, idPlayer: player.index }, player);
    }
  }

  private sendMessage(type: MessageType, data: unknown, ws: PlayerWS) {
    ws.send(
      JSON.stringify({
        type,
        data: JSON.stringify(data),
        id: 0,
      })
    );
  }
}
