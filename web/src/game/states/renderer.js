import Globals from '../globals';

class Renderer {
  constructor(game) {
    this.game = game;
  }

  create() {
    this.resetWorld();
    this.game.stage.backgroundColor = Globals.palette.menuBackground.hex;
    this.showFps();
  }

  showFps() {
    if (Globals.debug || Globals.showFps) {
      this.fps = this.game.add.bitmapText(7, 5, Globals.bitmapFont, '-1', 7);
      this.fps.anchor.setTo(0.5);
      this.fps.fixedToCamera = true;
      this.game.world.bringToTop(this.fps);
    }
  }

  resetWorld() {
    this.game.world.setBounds(0, 0, this.game.width, this.game.height);
  }

  initOnce() {
    this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.game.scale.pageAlignHorizontally = true;
    this.game.scale.pageAlignVertically = true;
    this.game.scale.minWidth = 240;
    this.game.scale.minHeight = 160;

    this.game.renderer.renderSession.roundPixels = true;
    Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);

    window.addEventListener('resize', () => this.setScale());
    requestAnimationFrame(() => this.setScale());
  }

  setScale() {
    const parent = this.game.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (!width || !height) return;

    const gameAspect = this.game.width / this.game.height;
    let scale;
    if (width / height > gameAspect) {
      scale = height / this.game.height;
    } else {
      scale = width / this.game.width;
    }
    this.game.scale.setUserScale(scale, scale);
  }

  update() {
    if (this.fps) {
      this.fps.text = this.game.time.fps;
    }
  }
}

export default Renderer;
