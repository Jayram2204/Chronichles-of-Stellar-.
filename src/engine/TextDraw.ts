import Phaser from 'phaser';

export class TextDraw {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public damage(x: number, y: number, amount: number, isCrit: boolean = false) {
    const text = this.scene.add.text(x, y - 10, `-${amount}`, {
      font: isCrit ? 'bold 16px monospace' : 'bold 12px monospace',
      color: isCrit ? '#ffaa00' : '#ff0055',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      scale: isCrit ? 1.5 : 1.0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  public heal(x: number, y: number, amount: number) {
    const text = this.scene.add.text(x, y - 10, `+${amount}`, {
      font: 'bold 12px monospace',
      color: '#00ff88',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 45,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  public info(x: number, y: number, message: string, color: string = '#00f3ff') {
    const text = this.scene.add.text(x, y - 10, message, {
      font: '10px monospace',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 35,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  public combo(x: number, y: number, count: number) {
    const label = count >= 3 ? `${count}x COMBO!` : `${count}x`;
    const color = count >= 3 ? '#ff0055' : count >= 2 ? '#ffaa00' : '#00f3ff';
    const text = this.scene.add.text(x, y - 30, label, {
      font: count >= 3 ? 'bold 16px monospace' : 'bold 12px monospace',
      color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      scale: count >= 3 ? 1.4 : 1.0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  public levelUp(x: number, y: number) {
    const text = this.scene.add.text(x, y - 40, 'LEVEL CLEAR', {
      font: 'bold 20px monospace',
      color: '#00f3ff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      scale: 1.6,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }
}
