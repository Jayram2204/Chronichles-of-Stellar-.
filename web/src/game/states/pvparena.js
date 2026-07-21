// pvparena.js
// PvP Arena - create/accept bouts, play matches

import Renderer from './renderer';
import Globals from '../globals';
import Controls from '../controls';
import Audio from '../audio';
import { EventHub, GameEvents } from '../../events/EventHub';

const PvpArenaConsts = {
  options: [
    'CREATE BOUT',
    'JOIN BOUT',
    'BACK',
  ],
};

class PvpArena extends Renderer {

  create() {
    super.create();

    const screenCenter = this.game.world.centerX;

    // Title
    const title = this.game.add.bitmapText(screenCenter, 20,
      Globals.bitmapFont, 'PvP ARENA', 18);
    title.anchor.setTo(0.5);
    title.tint = 0xffff00;

    const subtitle = this.game.add.bitmapText(screenCenter, 40,
      Globals.bitmapFont, 'Bet XLM. Fight. Win.', 8);
    subtitle.anchor.setTo(0.5);
    subtitle.tint = 0xaaaaaa;

    // Menu options
    this.selectedOption = 0;
    this.optionTexts = [];
    let ypos = 72;
    for (const [i, option] of PvpArenaConsts.options.entries()) {
      const text = this.game.add.bitmapText(screenCenter, ypos + 20 * i, Globals.bitmapFont, option, 10);
      text.anchor.setTo(0.5);
      this.optionTexts.push(text);
    }

    // Status text
    this.statusText = this.game.add.bitmapText(screenCenter, 140,
      Globals.bitmapFont, '', 7);
    this.statusText.anchor.setTo(0.5);
    this.statusText.tint = 0x888888;

    this.audio = new Audio(this.game);
    this.audio.stop();
    this.controls = new Controls(this.game, true);
  }

  update() {
    super.update();

    for (const [i, option] of this.optionTexts.entries()) {
      if (i === this.selectedOption)
        option.tint = 0x000000;
      else
        option.tint = 0xffffff;
    }

    this.handleInput();
  }

  handleInput() {
    if (this.controls.up) {
      this.selectedOption--;
      this.audio.play(this.audio.sfx.hero.punch, 2);
    }
    else if (this.controls.down) {
      this.selectedOption++;
      this.audio.play(this.audio.sfx.hero.punch, 1);
    }
    else if (this.controls.punch || this.controls.jump || this.controls.kick)
      this.chooseOption();

    if (this.selectedOption < 0)
      this.selectedOption = 0;
    if (this.selectedOption >= PvpArenaConsts.options.length)
      this.selectedOption = PvpArenaConsts.options.length - 1;
  }

  chooseOption() {
    // Create Bout
    if (this.selectedOption === 0) {
      this.statusText.setText('Connect wallet first...');
      this.statusText.tint = 0xffaa00;

      // Emit event for React overlay to handle wallet connection
      EventHub.emit('PVP_CREATE_REQUEST', {});

      // For now, show instructions
      this.statusText.setText('Use React overlay to create bout');
    }

    // Join Bout
    if (this.selectedOption === 1) {
      this.statusText.setText('Connect wallet to join...');
      this.statusText.tint = 0xffaa00;

      EventHub.emit('PVP_JOIN_REQUEST', {});

      this.statusText.setText('Use React overlay to join bout');
    }

    // Back
    if (this.selectedOption === 2) {
      this.audio.play(this.audio.sfx.hero.punch, 2);
      this.state.start('mainmenu');
    }
  }
}

export { PvpArena };
