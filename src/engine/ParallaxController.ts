import Phaser from 'phaser';

export class ParallaxController {
  private scene: Phaser.Scene;
  private layers: {
    layer2?: Phaser.GameObjects.TileSprite;
    layer3?: Phaser.GameObjects.TileSprite;
    layer4?: Phaser.GameObjects.TileSprite;
    layer5?: Phaser.GameObjects.TileSprite;
  } = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public registerLayer2(sprite: Phaser.GameObjects.TileSprite) {
    this.layers.layer2 = sprite;
  }

  public registerLayer3(sprite: Phaser.GameObjects.TileSprite) {
    this.layers.layer3 = sprite;
  }

  public registerLayer4(sprite: Phaser.GameObjects.TileSprite) {
    this.layers.layer4 = sprite;
  }

  public registerLayer5(sprite: Phaser.GameObjects.TileSprite) {
    this.layers.layer5 = sprite;
  }

  /**
   * Updates all parallax offsets based on the main camera's current scrollX position.
   * This is frame-rate independent and handles both left/right movement natively.
   */
  public update() {
    const scrollX = this.scene.cameras.main.scrollX;

    // Apply coefficients to make layers look further or closer
    if (this.layers.layer2) {
      this.layers.layer2.tilePositionX = scrollX * 0.20; // Deep Sky Horizon
    }
    if (this.layers.layer3) {
      this.layers.layer3.tilePositionX = scrollX * 0.50; // Midground Industry
    }
    if (this.layers.layer4) {
      this.layers.layer4.tilePositionX = scrollX * 1.00; // Gameplay Platform Track
    }
    if (this.layers.layer5) {
      // Foreground layers scroll faster than the camera to simulate proximity
      this.layers.layer5.tilePositionX = scrollX * 1.30;
    }
  }
}
