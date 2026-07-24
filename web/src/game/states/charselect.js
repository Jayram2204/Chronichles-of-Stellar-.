// charselect.js
// Character selection screen

import Renderer from './renderer';
import Globals from '../globals';
import Controls from '../controls';
import Audio from '../audio';

const CHAR_KEYS = ['brian', 'gloria', 'rebel', 'brawler', 'elite'];

class CharSelect extends Renderer {

  create() {
    super.create();

    const screenCenter = this.game.world.centerX;

    // Title
    const title = this.game.add.bitmapText(screenCenter, 8,
      Globals.bitmapFont, 'SELECT FIGHTER', 12);
    title.anchor.setTo(0.5);

    // Character list
    this.selectedIdx = 0;
    this.charTexts = [];
    this.statTexts = [];
    this.previewSprite = null;

    const startY = 28;
    const rowHeight = 18;
    for (let i = 0; i < CHAR_KEYS.length; i++) {
      const key = CHAR_KEYS[i];
      const char = Globals.CHARACTERS[key];

      const nameText = this.game.add.bitmapText(screenCenter - 40, startY + i * rowHeight,
        Globals.bitmapFont, char.name, 9);
      nameText.anchor.setTo(0, 0.5);
      this.charTexts.push(nameText);

      const statText = this.game.add.bitmapText(screenCenter + 40, startY + i * rowHeight,
        Globals.bitmapFont, char.role, 7);
      statText.anchor.setTo(0, 0.5);
      statText.tint = 0x888888;
      this.statTexts.push(statText);
    }

    // Stats panel
    this.statsPanel = this.game.add.bitmapText(screenCenter, 128,
      Globals.bitmapFont, '', 7);
    this.statsPanel.anchor.setTo(0.5);
    this.statsPanel.tint = 0xcccccc;

    // Preview sprite
    this.previewSprite = this.game.add.sprite(screenCenter, 88, 'atlas_sprites', 'hero_stand_01');
    this.previewSprite.anchor.setTo(0.5);
    this.previewSprite.scale.set(2);

    this.audio = new Audio(this.game);
    this.audio.stop();
    this.controls = new Controls(this.game, true);

    this._updateSelection();
  }

  _updateSelection() {
    const key = CHAR_KEYS[this.selectedIdx];
    const char = Globals.CHARACTERS[key];

    for (let i = 0; i < this.charTexts.length; i++) {
      if (i === this.selectedIdx) {
        this.charTexts[i].tint = 0x000000;
        this.statTexts[i].tint = 0xffff00;
      } else {
        this.charTexts[i].tint = 0xffffff;
        this.statTexts[i].tint = 0x888888;
      }
    }

    // Update stats display
    this.statsPanel.setText(
      'HP:' + char.hp +
      '  PWR:' + char.punchDmg +
      '  KICK:' + char.kickDmg +
      '  SPD:' + char.speed
    );

    // Tint preview sprite
    this.previewSprite.tint = char.tint;
  }

  update() {
    super.update();
    this.handleInput();
  }

  handleInput() {
    if (this.controls.up) {
      this.selectedIdx = (this.selectedIdx - 1 + CHAR_KEYS.length) % CHAR_KEYS.length;
      this.audio.play(this.audio.sfx.hero.punch, 2);
      this._updateSelection();
    }
    else if (this.controls.down) {
      this.selectedIdx = (this.selectedIdx + 1) % CHAR_KEYS.length;
      this.audio.play(this.audio.sfx.hero.punch, 1);
      this._updateSelection();
    }
    else if (this.controls.punch || this.controls.jump || this.controls.kick) {
      this._selectCharacter();
    }
  }

  _selectCharacter() {
    const key = CHAR_KEYS[this.selectedIdx];
    Globals.selectedCharacter = key;
    this.audio.play(this.audio.sfx.go);

    // Start the game with selected character
    this.state.start('loading', true, false, 'intro');
  }
}

export { CharSelect };
