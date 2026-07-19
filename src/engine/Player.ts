import Phaser from 'phaser';
import { Actor } from './Actor';

export interface AttackConfig {
  name: string;
  damage: number;
  duration: number;
  cooldown: number;
  hitbox: { offsetX: number; offsetY: number; width: number; height: number };
  knockback: number;
}

const ATTACKS: Record<string, AttackConfig> = {
  punch: {
    name: 'punch',
    damage: 8,
    duration: 180,
    cooldown: 250,
    hitbox: { offsetX: 10, offsetY: -25, width: 45, height: 20 },
    knockback: 200,
  },
  kick: {
    name: 'kick',
    damage: 15,
    duration: 300,
    cooldown: 450,
    hitbox: { offsetX: 10, offsetY: -18, width: 55, height: 24 },
    knockback: 350,
  },
};

export class Player extends Actor {
  public comboCount: number = 0;
  public lastAttackTime: number = 0;
  public score: number = 0;
  public attackGraphic!: Phaser.GameObjects.Graphics;
  private comboResetTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey, { hp: 100, speed: 280 });
    this.attackGraphic = scene.add.graphics();
    this.sprite.setDepth(10);
    this.attackHitbox.setDepth(11);
  }

  public punch(): boolean {
    return this.performAttack('punch');
  }

  public kick(): boolean {
    return this.performAttack('kick');
  }

  private performAttack(type: 'punch' | 'kick'): boolean {
    const config = ATTACKS[type];
    if (!this.startAttack(config.duration, config.cooldown)) return false;

    this.activateHitbox(config.hitbox);

    const now = this.scene.time.now;
    if (now - this.lastAttackTime < 600) {
      this.comboCount = Math.min(this.comboCount + 1, 3);
    } else {
      this.comboCount = 1;
    }
    this.lastAttackTime = now;

    if (this.comboResetTimer) this.comboResetTimer.destroy();
    this.comboResetTimer = this.scene.time.delayedCall(600, () => {
      this.comboCount = 0;
    });

    this.drawAttackEffect(config);
    this.sprite.setTint(this.facingRight ? 0x88ffff : 0x88ffff);
    this.scene.time.delayedCall(80, () => {
      this.sprite.clearTint();
    });

    return true;
  }

  private drawAttackEffect(config: AttackConfig) {
    this.attackGraphic.clear();
    const dir = this.facingRight ? 1 : -1;
    const cx = this.sprite.x + dir * 30;
    const cy = this.sprite.y - 25;

    this.attackGraphic.lineStyle(3, 0x00f3ff, 0.9);

    if (config.name === 'punch') {
      this.attackGraphic.beginPath();
      this.attackGraphic.moveTo(cx - 15 * dir, cy - 5);
      this.attackGraphic.lineTo(cx + 15 * dir, cy + 5);
      this.attackGraphic.strokePath();
      this.attackGraphic.beginPath();
      this.attackGraphic.moveTo(cx - 10 * dir, cy + 8);
      this.attackGraphic.lineTo(cx + 20 * dir, cy - 2);
      this.attackGraphic.strokePath();
    } else {
      this.attackGraphic.beginPath();
      this.attackGraphic.arc(cx, cy + 10, 20, -0.6 * dir, 0.6 * dir, dir < 0);
      this.attackGraphic.strokePath();
      this.attackGraphic.beginPath();
      this.attackGraphic.moveTo(cx + 10 * dir, cy - 10);
      this.attackGraphic.lineTo(cx + 25 * dir, cy + 5);
      this.attackGraphic.strokePath();
    }

    this.scene.time.delayedCall(config.duration * 0.6, () => {
      this.attackGraphic.clear();
    });
  }

  public override takeDamage(amount: number, knockbackX: number = 0) {
    if (this.isInvulnerable || this.state === 'dead') return;

    this.isInvulnerable = true;
    super.takeDamage(amount, knockbackX);

    this.sprite.setAlpha(0.5);
    let blinkCount = 0;
    const blinkTimer = this.scene.time.addEvent({
      delay: 100,
      repeat: 7,
      callback: () => {
        blinkCount++;
        this.sprite.setAlpha(blinkCount % 2 === 0 ? 0.5 : 1);
        if (blinkCount >= 8) {
          this.sprite.setAlpha(1);
          this.isInvulnerable = false;
          blinkTimer.remove();
        }
      },
    });

    this.scene.cameras.main.shake(150, 0.008);
  }

  public heal(amount: number) {
    super.heal(amount);

    this.healthBarFill.clear();
    const barWidth = 60;
    const barHeight = 6;
    const x = 20;
    const y = 14;
    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.5 ? 0x00f3ff : ratio > 0.25 ? 0xffaa00 : 0xff0055;
    this.healthBarFill.fillStyle(color, 1);
    this.healthBarFill.fillRect(x, y, barWidth * ratio, barHeight);
  }

  public updatePlayerHUD() {
    const barWidth = 60;
    const barHeight = 6;
    const x = 20;
    const y = 14;

    this.healthBarBg.clear();
    this.healthBarBg.setScrollFactor(0);
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRect(x, y, barWidth, barHeight);
    this.healthBarBg.lineStyle(1, 0x00f3ff, 0.5);
    this.healthBarBg.strokeRect(x, y, barWidth, barHeight);

    this.healthBarFill.clear();
    this.healthBarFill.setScrollFactor(0);
    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.5 ? 0x00f3ff : ratio > 0.25 ? 0xffaa00 : 0xff0055;
    this.healthBarFill.fillStyle(color, 1);
    this.healthBarFill.fillRect(x, y, barWidth * ratio, barHeight);

    this.healthBarLabel.setScrollFactor(0);
    this.healthBarLabel.setPosition(x + barWidth / 2, y - 2);
    this.healthBarLabel.setText(`HP: ${Math.ceil(this.hp)}/${this.maxHp}`);
  }

  public override destroy() {
    super.destroy();
    this.attackGraphic.destroy();
    if (this.comboResetTimer) this.comboResetTimer.destroy();
  }
}
