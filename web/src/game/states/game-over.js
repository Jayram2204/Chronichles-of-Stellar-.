// game-over.js - Player died, end game.

import Globals from '../globals';
import Controls from '../controls';
import Audio from '../audio';
import Renderer from './renderer';
import { EventHub, GameEvents } from '../../events/EventHub';

class GameOver extends Renderer {

  create() {
    EventHub.emit(GameEvents.GAME_OVER);
    super.create();

    this.controls = new Controls(this.game, true);
    this.isOverOver = false;

    // play sfx
    this.audio = new Audio(this.game);
    this.audio.stop();
    this.audio.play(this.audio.sfx.gameover);

    const screenCenter = this.game.world.centerX;
    const ANIM_SPEED = 2500;
    const FONT_SIZE = 20;

    const textLeft = this.game.add.bitmapText(screenCenter, 
      30, Globals.bitmapFont, 'GAME', FONT_SIZE);
    textLeft.anchor.setTo(0.5);
    textLeft.alpha = 0.2;

    const textRight = this.game.add.bitmapText(screenCenter,
      50, Globals.bitmapFont, 'OVER', FONT_SIZE);
    textRight.anchor.setTo(0.5);
    textRight.alpha = 0.2;

    // smash letters fx
    const tween1 = this.game.add.tween(textLeft).to({ 
      y: 30, alpha: 1 }, 1000, 
      Phaser.Easing.Linear.None, true, 0, 0, false);
    const tween2 = this.game.add.tween(textRight).to({ 
      y: 50, alpha: 1 }, 1000, 
      Phaser.Easing.Linear.None, true, 0, 0, false);

    tween2.onComplete.add(() => {
      this.isOverOver = true;

      // 'you failed' text
      const failedText = this.game.add.bitmapText(this.game.world.centerX, 
        80, Globals.bitmapFont, 'YOU FAILED', 10);
      failedText.anchor.setTo(0.5);
      failedText.alpha = 0;

      this.game.add.tween(failedText).to({ alpha: 1 }, 1000, 
        Phaser.Easing.Linear.None, true, 0, 0, false);

      // leave text
      const leaveText = this.game.add.bitmapText(this.game.world.centerX, 140, 
        Globals.bitmapFont, '(Press Punch to continue)', 8);
      leaveText.anchor.setTo(0.5);
      leaveText.alpha = 0;

      this.game.add.tween(leaveText).to({ alpha: 1 }, 1000, Phaser.Easing.Linear.None, true, 0, -1, true);
    });
  }

  update() {
    super.update();

    if ((this.controls.punch || this.controls.jump) && this.isOverOver) {
      this.state.start('mainmenu');
    }
  }

}

export { GameOver };
