import {
  AttackData,
  Game,
  MessageType,
  PlayerAuth,
  PlayerWS,
  Position,
  RandomAttackData,
  Ships,
  ShotStatus,
  WebSocketMessage,
} from '@/models/types';
import { WebSocketServer } from 'ws';
import { v4 as uuidV4 } from 'uuid';
import { bot, games, players, winners } from '@/db/in-memory-db';
import { getRooms } from '@/utils/get-rooms';
import { initBoard } from '@/utils/init-board';
import { attackShip, generateShips, getRandomCell, predefinedShips } from '@/utils/ships-utils';
import { checkName } from '@/utils/check-name';

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
      case MessageType.addShips:
        this.addShips(payload as Ships);
        break;
      case MessageType.attack:
        this.attack(payload as AttackData);
        break;
      case MessageType.randomAttack:
        this.randomAttack(payload as RandomAttackData);
        break;
      case MessageType.singlePlay:
        this.singlePlay(ws);
        break;
    }
  }

  private authPlayer({ name, password }: PlayerAuth, ws: PlayerWS) {
    const index = uuidV4();
    const isNameUnique = checkName(name);

    if (isNameUnique) {
      this.sendMessage(MessageType.auth, { name, index, error: true, errorText: 'Name already exist' }, ws);
      return;
    }

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
    return gameId;
  }

  private addToRoom({ indexRoom }: { indexRoom: string }, ws: PlayerWS) {
    const game = games.get(indexRoom);
    if (!game || game.first.ws?.index === ws.index) {
      return;
    }

    game.second.ws = ws;

    this.broadcastRooms();

    this.createGame([game.first.ws!, game.second.ws], indexRoom);
  }

  private addShips({ gameId, indexPlayer, ships }: Ships) {
    const game = games.get(gameId);
    if (!game) {
      return;
    }

    if (game.first.ws?.index === indexPlayer) {
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

  private attack({ gameId, indexPlayer, x, y }: AttackData) {
    const game = games.get(gameId);
    if (!game) {
      return;
    }

    if (indexPlayer !== game.activePlayer) {
      return;
    }

    const isFirst = indexPlayer === game.first.ws?.index;
    const attackedPlayer = isFirst ? game.second : game.first;
    const { killed, shots, ships } = attackedPlayer;

    if (shots.some((shot) => shot.x === x && shot.y === y)) {
      this.turn(game, false, gameId);
      return;
    } else {
      shots.push({ x, y });
    }

    const boardSize = game.first.originShips.length;
    const attackData = attackShip({ x, y }, ships, killed, boardSize);

    if (isFirst) {
      game.second.killed = attackData.killed;
      game.second.ships = attackData.ships;
    } else {
      game.first.killed = attackData.killed;
      game.first.ships = attackData.ships;
    }

    this.sendAttack({ x, y }, game, attackData.shotStatus, indexPlayer);

    if (attackData.shotStatus === 'killed' && attackData.edgeCells && attackData.killedShip) {
      for (const cell of attackData.edgeCells) {
        this.sendAttack({ x: cell.x, y: cell.y }, game, 'miss', indexPlayer);
      }

      for (const cell of attackData.killedShip) {
        this.sendAttack({ x: cell.x, y: cell.y }, game, 'killed', indexPlayer);
      }
    }

    if (attackData.shotStatus === 'miss') {
      this.turn(game, true, gameId);
    } else {
      this.turn(game, false, gameId);
    }

    this.checkWin(game, indexPlayer);
  }

  private randomAttack({ gameId, indexPlayer }: RandomAttackData) {
    const game = games.get(gameId);
    if (!game) {
      return;
    }

    const isFirst = indexPlayer === game.first.ws?.index;
    const shots = isFirst ? game.first.shots : game.second.shots;
    const boardSize = game.first.ships.length;
    let cell = getRandomCell(boardSize);

    while (shots.some((shot) => shot.x === cell.x && shot.y === cell.y)) {
      cell = getRandomCell(boardSize);
    }

    this.attack({ gameId, indexPlayer, x: cell.x, y: cell.y });
  }

  private checkWin(game: Game, indexPlayer: string) {
    const allShipsKilled = (playerShips: Position[][]) => playerShips.every((ship) => ship.length === 0);

    if (allShipsKilled(game.first.ships) || allShipsKilled(game.second.ships)) {
      const winner = players.get(indexPlayer);
      if (winner) {
        winners.push({ name: winner.name, wins: 1 });
      }
      this.sendMessage(MessageType.finishGame, { winPlayer: indexPlayer }, game.first.ws);
      this.sendMessage(MessageType.finishGame, { winPlayer: indexPlayer }, game.second.ws);
      this.broadcastWinners();
    }
  }

  private sendAttack(position: Position, game: Game, status: ShotStatus, currentPlayer: string) {
    const players = [game.first, game.second];

    for (const player of players) {
      this.sendMessage(MessageType.attack, { position, currentPlayer, status }, player.ws);
    }
  }

  private startGame(game: Game, gameId: string) {
    const players = [game.first, game.second];

    for (const player of players) {
      this.sendMessage(
        MessageType.startGame,
        { gameId, ships: player.originShips, currentPlayerIndex: game.activePlayer },
        player.ws
      );
    }

    const swapSide = game.second.ws?.index === bot ? true : false;

    this.turn(game, swapSide, gameId);
  }

  private singlePlay(ws: PlayerWS) {
    const bot = { index: 'bot', name: 'bot' } as PlayerWS;
    const gameId = this.createRoom(ws);
    this.addToRoom({ indexRoom: gameId }, bot);
    this.addShips({ gameId, indexPlayer: bot.index, ships: predefinedShips });
  }

  private turn(game: Game, swap: boolean, gameId?: string) {
    if (swap) {
      const isFirstActive = game.activePlayer === game.first.ws?.index;
      game.activePlayer = isFirstActive ? game.second.ws!.index : game.first.ws!.index;
    }

    const currentPlayer = game.activePlayer;
    this.sendMessage(MessageType.turn, { currentPlayer }, game.first.ws);
    this.sendMessage(MessageType.turn, { currentPlayer }, game.second.ws);

    if (game.activePlayer === bot && gameId) {
      const boardSize = game.second.originShips.length;
      this.attack({ gameId, indexPlayer: bot, ...getRandomCell(boardSize) });
    }
  }

  private createGame(gameWithPlayers: PlayerWS[], idGame: string) {
    for (const player of gameWithPlayers) {
      this.sendMessage(MessageType.createGame, { idGame, idPlayer: player.index }, player);
    }
  }

  private sendMessage(type: MessageType, data: unknown, ws: PlayerWS | undefined) {
    if (!ws?.send) {
      return;
    }
    ws.send(
      JSON.stringify({
        type,
        data: JSON.stringify(data),
        id: 0,
      })
    );
  }
}
