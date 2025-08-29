import 'phaser';
import * as Colyseus from 'colyseus.js';

export default class GameScene extends Phaser.Scene {
  private client: Colyseus.Client;
  private room: Colyseus.Room;

  constructor() {
    super('game');
  }

  async create() {
    this.client = new Colyseus.Client('ws://localhost:2567');

    try {
      this.room = await this.client.joinOrCreate('my_room');
      console.log('Joined successfully!', this.room);
    } catch (e) {
      console.error('JOIN ERROR', e);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: GameScene,
};

new Phaser.Game(config);