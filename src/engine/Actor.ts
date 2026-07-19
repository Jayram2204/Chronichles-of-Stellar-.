import Phaser from 'phaser';

export type ActorState = 'idle' | 'walk' | 'attack' | 'hit' | 'dead';

export interface HitboxConfig {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export class Actor {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public hp: number;
  public maxHp: number;
  public state: ActorState = 'idle';
  public facingRight: boolean = true;
  public isInvulnerable: boolean = false;
  public speed: number;

  protected scene: Phaser.Scene;
  protected hitboxGraphic!: Phaser.GameObjects.Graphics;
  protected healthBarBg!: Phaser.GameObjects.Graphics;
  protected healthBarFill!: Phaser.GameObjects.Graphics;
  protected healthBarLabel!: Phaser.GameObjects.Text;
  protected hitFlashTimer?: Phaser.Time.TimerEvent;
  public attackHitbox!: Phaser.GameObjects.Rectangle;
  public hitboxActive: boolean = false;
  protected attackCooldown: number = 0;
  protected attackDuration: number = 0;
  protected stateTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    config: { hp: number; speed: number }
  ) {
    this.scene = scene;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;

    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setCollideWorldBounds(true);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(1200);

    this.sprite.setData('actor', this);

    this.attackHitbox = scene.add.rectangle(x, y, 40, 30, 0xff0000, 0);
    scene.physics.add.existing(this.attackHitbox, false);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(false);

    this.createHealthBar();
  }

  protected createHealthBar() {
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarFill = this.scene.add.graphics();
    this.healthBarLabel = this.scene.add.text(0, 0, '', {
      font: '9px monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this.updateHealthBar();
  }

  public updateHealthBar() {
    const barWidth = 40;
    const barHeight = 4;
    const x = this.sprite.x - barWidth / 2;
    const y = this.sprite.y - this.sprite.height - 14;

    this.healthBarBg.clear();
    this.healthBarBg.fillStyle(0x000000, 0.6);
    this.healthBarBg.fillRect(x, y, barWidth, barHeight);

    this.healthBarFill.clear();
    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.5 ? 0x00f3ff : ratio > 0.25 ? 0xffaa00 : 0xff0055;
    this.healthBarFill.fillStyle(color, 1);
    this.healthBarFill.fillRect(x, y, barWidth * ratio, barHeight);

    this.healthBarLabel.setPosition(this.sprite.x, y - 2);
    this.healthBarLabel.setText(`${Math.ceil(this.hp)}/${this.maxHp}`);
  }

  public takeDamage(amount: number, knockbackX: number = 0) {
    if (this.isInvulnerable || this.state === 'dead') return;

    this.hp = Math.max(0, this.hp - amount);
    this.flashHit();
    this.updateHealthBar();

    if (knockbackX !== 0) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(knockbackX);
    }

    if (this.hp <= 0) {
      this.state = 'dead';
    } else {
      this.state = 'hit';
      this.stateTimer = 200;
    }
  }

  public flashHit() {
    this.sprite.setTint(0xff0000);
    if (this.hitFlashTimer) this.hitFlashTimer.destroy();
    this.hitFlashTimer = this.scene.time.delayedCall(120, () => {
      this.sprite.clearTint();
    });
  }

  public heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.updateHealthBar();
  }

  public startAttack(duration: number, cooldown: number) {
    if (this.attackCooldown > 0 || this.state === 'dead' || this.state === 'hit') return false;
    this.state = 'attack';
    this.attackDuration = duration;
    this.attackCooldown = cooldown;
    this.stateTimer = duration;
    return true;
  }

  public activateHitbox(config: HitboxConfig) {
    this.hitboxActive = true;
    const offsetX = this.facingRight ? config.offsetX : -config.offsetX - config.width;
    this.attackHitbox.setPosition(this.sprite.x + offsetX, this.sprite.y + config.offsetY);
    this.attackHitbox.setSize(config.width, config.height);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(true);
  }

  public deactivateHitbox() {
    this.hitboxActive = false;
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(false);
  }

  public updateTimers(delta: number) {
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    }
    if (this.stateTimer > 0) {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        if (this.state === 'attack') {
          this.deactivateHitbox();
          this.state = 'idle';
        } else if (this.state === 'hit') {
          this.state = 'idle';
        }
      }
    }
  }

  public destroy() {
    this.sprite.destroy();
    this.attackHitbox.destroy();
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    this.healthBarLabel.destroy();
    if (this.hitFlashTimer) this.hitFlashTimer.destroy();
  }
}
