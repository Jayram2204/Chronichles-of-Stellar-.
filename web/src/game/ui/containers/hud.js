// hud.js - Container for showing player stats

import HealthBar from '../components/health-bar';
import GoHand from '../components/go-hand';
import Globals from '../../globals';

class Hud {

  constructor(game, sprite) {
    this.game = game;

    // create health bar
    const options = {
        x: 10,
        y: 10,
        fixedToCamera: true,
        visible: true
    };
    this._healthbar = new HealthBar(game, sprite, options);

    // character name (top left, below health bar)
    const charKey = Globals.selectedCharacter || 'brian';
    const charData = Globals.CHARACTERS[charKey];
    this._charName = game.add.bitmapText(12, 22, Globals.bitmapFont,
      charData.name.toUpperCase(), 7);
    this._charName.fixedToCamera = true;
    this._charName.tint = charData.tint !== 0xffffff ? charData.tint : 0xcccccc;

    // score display (top right)
    this._scoreLabel = game.add.bitmapText(game.width - 4, 8, Globals.bitmapFont, 'SCORE', 6);
    this._scoreLabel.anchor.setTo(1, 0);
    this._scoreLabel.fixedToCamera = true;
    this._scoreLabel.tint = 0x888888;

    this._scoreText = game.add.bitmapText(game.width - 4, 16, Globals.bitmapFont, '0', 10);
    this._scoreText.anchor.setTo(1, 0);
    this._scoreText.fixedToCamera = true;
    this._scoreText.tint = 0xffff00;

    // kills display (below score)
    this._killsLabel = game.add.bitmapText(game.width - 4, 28, Globals.bitmapFont, 'KILLS', 6);
    this._killsLabel.anchor.setTo(1, 0);
    this._killsLabel.fixedToCamera = true;
    this._killsLabel.tint = 0x888888;

    this._killsText = game.add.bitmapText(game.width - 4, 36, Globals.bitmapFont, '0', 10);
    this._killsText.anchor.setTo(1, 0);
    this._killsText.fixedToCamera = true;
    this._killsText.tint = 0xff4444;
  }

  get thisWay() {
    return this.hand;
  }

  showThisWay(actor) {
    this.hand = new GoHand(this.game);
    return this.hand;
  }

  hideThisWay() {
    if (this.hand) {
      this.hand.sprite.destroy();
    }
  }

  updateScore(score, kills) {
    if (this._scoreText) {
      this._scoreText.setText(score.toString());
    }
    if (this._killsText) {
      this._killsText.setText(kills.toString());
    }
  }

  update() {
    this._healthbar.update();
  }

  showBossHealth(bossSprite, bossName) {
    if (this._bossBar) return;

    const barWidth = 100;
    const barHeight = 6;
    const x = (this.game.width - barWidth) / 2;
    const y = 6;

    // boss name
    this._bossName = this.game.add.bitmapText(this.game.width / 2, y - 2,
      Globals.bitmapFont, bossName || 'BOSS', 7);
    this._bossName.anchor.setTo(0.5, 1);
    this._bossName.fixedToCamera = true;
    this._bossName.tint = 0xff4444;

    // background
    const bg = this.game.add.graphics();
    bg.beginFill(0x1a1a1a, 1).drawRect(0, 0, barWidth + 2, barHeight + 2).endFill();
    this._bossBarBg = this.game.add.sprite(x - 1, y, bg.generateTexture());
    this._bossBarBg.fixedToCamera = true;
    bg.destroy();

    // bar
    const bar = this.game.add.graphics();
    bar.beginFill(0xff0000, 1).drawRect(0, 0, barWidth, barHeight).endFill();
    this._bossBar = this.game.add.sprite(x, y + 1, bar.generateTexture());
    this._bossBar.fixedToCamera = true;
    bar.destroy();

    this._bossBarWidth = barWidth;
    this._bossSprite = bossSprite;
  }

  updateBossHealth() {
    if (!this._bossBar || !this._bossSprite) return;

    const ratio = this._bossSprite.health / this._bossSprite.maxHealth;
    if (ratio <= 0) {
      this.hideBossHealth();
      return;
    }

    this.game.add.tween(this._bossBar.scale).to(
      { x: ratio }, 200, Phaser.Easing.Linear.None, true
    );
  }

  hideBossHealth() {
    if (this._bossName) { this._bossName.destroy(); this._bossName = null; }
    if (this._bossBarBg) { this._bossBarBg.destroy(); this._bossBarBg = null; }
    if (this._bossBar) { this._bossBar.destroy(); this._bossBar = null; }
  }

}

export default Hud;
