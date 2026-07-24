// main-menu.js
// Game main menu options screen.

import Audio from '../audio';
import Globals from '../globals';
import Controls from '../controls';

import Renderer from './renderer';

const MainMenuConsts = {
  options: [
    'PLAY',
    'PvP ARENA',
    'VS BOT',
    'CONTROLS',
    'AUDIO',
    'CREDITS',
  ],
};

class MainMenu extends Renderer {

  create() {
    super.create();

    const screenCenter = this.game.world.centerX;

    this.playIntro(screenCenter);

    this.selectedOption = 0;
    this.optionTexts = [];
    const startY = 56;
    const spacing = 18;
    for(const [i, option] of MainMenuConsts.options.entries()) {
      const text = this.game.add.bitmapText(screenCenter, startY + i * spacing, Globals.bitmapFont, option, 10);
      text.anchor.setTo(0.5);
      this.optionTexts.push(text);
    }

    // stop all sfx in menu
    this.audio = new Audio(this.game);
    this.audio.stop();

    this.controls = new Controls(this.game, true);
  }

  playIntro(screenCenter) {
    const SPEED = 2000;

    const menuTitleLeft = this.game.add.bitmapText(screenCenter, 20, 
      Globals.bitmapFont, 'CHRONICLES', 16);
    menuTitleLeft.anchor.setTo(0.5);
    menuTitleLeft.right = 0;
    this.game.add.tween(menuTitleLeft).to({ x: screenCenter - 2}, SPEED, 
      Phaser.Easing.Bounce.Out, true);

    const menuTitleRight = this.game.add.bitmapText(screenCenter, 36, 
      Globals.bitmapFont, 'OF STELLAR', 12);
    menuTitleRight.anchor.setTo(0.5);
    menuTitleRight.left = this.game.width;
    menuTitleRight.tint = 0xcccccc;
    this.game.add.tween(menuTitleRight).to({ x: screenCenter + 2}, SPEED, 
      Phaser.Easing.Bounce.Out, true);
  }

  update() {
    super.update();

    for(const [i, option] of this.optionTexts.entries()) {
      if(i == this.selectedOption)
        option.tint = 0x000000;
      else
        option.tint = 0xffffff;
    }

    this.handleInput();
  }

  handleInput() {
    if(this.controls.up) {
      this.selectedOption--;
      this.audio.play(this.audio.sfx.hero.punch, 2);
    }
    else if(this.controls.down) {
      this.selectedOption++;
      this.audio.play(this.audio.sfx.hero.punch, 1);
    }
    else if(this.controls.punch || this.controls.jump || this.controls.kick)
      this.chooseOption();

    if(this.selectedOption < 0)
      this.selectedOption = 0;
    if(this.selectedOption >= MainMenuConsts.options.length)
      this.selectedOption = MainMenuConsts.options.length - 1;
  }

  chooseOption() {
    // start play state
    if(this.selectedOption == 0) {
      this.audio.play(this.audio.sfx.go);
      this.state.start('charselect');
    }

    // start PvP arena state
    if(this.selectedOption == 1) {
      this.audio.play(this.audio.sfx.go);
      this.state.start('pvparena');
    }

    // start vs bot (practice mode)
    if(this.selectedOption == 2) {
      this.audio.play(this.audio.sfx.go);
      this.state.start('charselect');
    }

    // start option state
    if(this.selectedOption == 3) {
      this.audio.play(this.audio.sfx.hero.punch, 2);
      this.state.start('options');
    }

    // start audio controls state
    if (this.selectedOption == 4) {
      this.audio.play(this.audio.sfx.hero.punch, 2);
      this.state.start('options-audio');
    }

    // start credits state
    if(this.selectedOption == 5) {
      this.audio.play(this.audio.sfx.hero.punch, 2);
      this.state.start('credits');
    }
  }

}

export { MainMenu };
