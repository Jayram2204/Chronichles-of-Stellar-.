// loading.js
// Loads acts' specific assets - gfx & sfx

import Audio from '../audio';
import Controls from '../controls';
import Globals from '../globals';
import Renderer from './renderer';

const LoadingConsts = {
  SPLASH_FADE: 1500, // ms
  LOAD_TIME: 5,
};

class Loading extends Renderer {

  constructor(game) {
    super(game);
  }

  init(nextState) {
    this.nextState = nextState;

    // stop all audios
    const audio = new Audio(this.game);

    //if (nextState !== 'act1') {
      audio.stop();
    //}

    // play transition tune
    if (nextState !== 'intro') {
      audio.play(audio.musics.fanfare);
    }

    this.audio = audio;
  }

  preload() {
    this.resetWorld();
    // default background color
    this.game.stage.backgroundColor = Globals.palette.menuBackground.hex;

    this.game.load.onLoadComplete.add(this.loadComplete, this);

    // add a countdown for next state
    this.timer = this.game.time.create();
    this.timer.add(Phaser.Timer.SECOND * LoadingConsts.LOAD_TIME, this.changeState, this);

    // load audios
    let nextStateText = '';
    let subtitleText = '';
    if (this.nextState == 'intro' || this.nextState == 'options-audio') {
      Audio.loadMusic(this.game, 'maintheme');
      nextStateText = 'INTRO';
      subtitleText = 'THE BEGINNING';
    }
    else if(this.nextState == 'act1') {
      Audio.loadMusic(this.game, 'maintheme');
      nextStateText = 'ACT 1';
      subtitleText = 'THE STREETS';
    }
    else if(this.nextState == 'act2') {
      Audio.loadMusic(this.game, 'act2');
      nextStateText = 'ACT 2';
      subtitleText = 'THE NETWORK';
    }
    else if(this.nextState == 'act5') {
      // XXX actually this is Act 5 - Finale
      Audio.loadMusic(this.game, 'maintheme');
      Audio.loadMusic(this.game, 'act3');
      Audio.loadMusic(this.game, 'boss');
      nextStateText = 'ACT 3';
      subtitleText = 'THE CORE';
    }

    // add text to screen
    const stateText = this.game.add.bitmapText(this.game.world.centerX,
      this.game.world.centerY - 48, Globals.bitmapFont, nextStateText, 24);
    stateText.anchor.setTo(0.5);
    stateText.scale.setTo(0);
    this.game.add.tween(stateText.scale).to({ x: 1, y: 1 }, 500, Phaser.Easing.Linear.None, true);

    // subtitle
    if (subtitleText) {
      const sub = this.game.add.bitmapText(this.game.world.centerX,
        this.game.world.centerY - 24, Globals.bitmapFont, subtitleText, 9);
      sub.anchor.setTo(0.5);
      sub.alpha = 0;
      sub.tint = 0xffff00;
      this.game.add.tween(sub).to({ alpha: 1 }, 800, Phaser.Easing.Linear.None, true, 400);
    }

    this.text = this.game.add.bitmapText(this.game.world.centerX, this.game.world.centerY + 8, Globals.bitmapFont, '', 9);
    this.text.anchor.setTo(0.5);

    this.timer.start();
  }

  update() {
    if(this.timer.running)
      this.text.text = 'LOADING... ' + (LoadingConsts.LOAD_TIME - Math.round(this.timer.ms / 1000));
    else
      this.text.text = 'LOADED!';

    if(this.controls.punch || this.controls.jump)
      this.changeState();
  }

  loadComplete() {
    const skipText = this.game.add.bitmapText(this.game.world.centerX, 
      this.game.world.height - 8, 
      Globals.bitmapFont, 'Press Punch or Kick to skip', 8);
    skipText.anchor.setTo(0.5);
    skipText.alpha = 0;

    this.game.add.tween(skipText).to({ alpha: 1 }, 1000, Phaser.Easing.Linear.None, true, 0, -1, true);

    this.controls = new Controls(this.game, true);

    if (this.nextState !== 'intro') {
      // ready to go
      this.game.time.events.add(3000, () => this.audio.play(this.audio.sfx.ready));
    }
  }

  changeState() {
    this.timer.stop();
    this.state.start(this.nextState);
  }

}

export { Loading };
