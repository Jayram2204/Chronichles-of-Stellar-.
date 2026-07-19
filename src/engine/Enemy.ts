import Phaser from 'phaser';
import { Actor } from './Actor';
import type { HitboxConfig } from './Actor';

export type EnemyType = 'sentinel' | 'drone' | 'heavy';

export interface EnemyConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  engagementRange: number;
  attackRange: number;
  attackDuration: number;
  attackCooldown: number;
  hitbox: HitboxConfig;
  patrolRange: number;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  sentinel: {
    type: 'sentinel',
    hp: 40,
    speed: 80,
    damage: 10,
    engagementRange: 220,
    attackRange: 50,
    attackDuration: 350,
    attackCooldown: 800,
    hitbox: { offsetX: 8, offsetY: -22, width: 40, height: 24 },
    patrolRange: 120,
  },
  drone: {
    type: 'drone',
    hp: 20,
    speed: 140,
    damage: 6,
    engagementRange: 280,
    attackRange: 45,
    attackDuration: 200,
    attackCooldown: 500,
    hitbox: { offsetX: 6, offsetY: -18, width: 35, height: 18 },
    patrolRange: 160,
  },
  heavy: {
    type: 'heavy',
    hp: 80,
    speed: 50,
    damage: 20,
    engagementRange: 180,
    attackRange: 55,
    attackDuration: 500,
    attackCooldown: 1200,
    hitbox: { offsetX: 10, offsetY: -28, width: 50, height: 30 },
    patrolRange: 80,
  },
};

export type EnemyAIState = 'idle' | 'patrol' | 'chase' | 'attack' | 'hit' | 'dead';

export class Enemy extends Actor {
  public config: EnemyConfig;
  public aiState: EnemyAIState = 'patrol';
  public targetActor: Actor | null = null;

  private originX: number;
  private patrolDirection: number = 1;
  private idleTimer: number = 0;
  private attackGraphic!: Phaser.GameObjects.Graphics;
  private stateChangeTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, type: EnemyType) {
    super(scene, x, y, textureKey, {
      hp: ENEMY_CONFIGS[type].hp,
      speed: ENEMY_CONFIGS[type].speed,
    });
    this.config = ENEMY_CONFIGS[type];
    this.originX = x;
    this.attackGraphic = scene.add.graphics();
    this.sprite.setDepth(9);

    this.sprite.setData('enemy', this);
    this.attackHitbox.setDepth(10);
  }

  public updateAI(delta: number, playerX: number, playerY: number, playerActor: Actor) {
    if (this.state === 'dead') return;

    this.updateTimers(delta);
    this.stateChangeTimer -= delta;

    if (this.state === 'hit' && this.stateTimer <= 0) {
      this.state = 'idle';
      this.aiState = 'idle';
      this.idleTimer = 300;
    }

    const distToPlayer = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y, playerX, playerY
    );

    switch (this.aiState) {
      case 'idle':
        this.handleIdle(delta, distToPlayer, playerX);
        break;
      case 'patrol':
        this.handlePatrol(delta, distToPlayer, playerX);
        break;
      case 'chase':
        this.handleChase(delta, playerX, playerY, distToPlayer);
        break;
      case 'attack':
        this.handleAttack(delta, distToPlayer, playerActor);
        break;
    }

    this.updateHealthBar();
  }

  private handleIdle(delta: number, distToPlayer: number, playerX: number) {
    this.idleTimer -= delta;
    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(0);

    if (distToPlayer < this.config.engagementRange) {
      this.aiState = 'chase';
      return;
    }

    if (this.idleTimer <= 0) {
      this.aiState = 'patrol';
      this.patrolDirection = playerX > this.sprite.x ? 1 : -1;
    }
  }

  private handlePatrol(_delta: number, distToPlayer: number, _playerX: number) {
    if (distToPlayer < this.config.engagementRange) {
      this.aiState = 'chase';
      return;
    }

    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(
      this.speed * this.patrolDirection * 0.5
    );
    this.facingRight = this.patrolDirection > 0;
    this.sprite.setFlipX(!this.facingRight);

    if (Math.abs(this.sprite.x - this.originX) > this.config.patrolRange) {
      this.patrolDirection *= -1;
      this.facingRight = this.patrolDirection > 0;
      this.sprite.setFlipX(!this.facingRight);
      this.aiState = 'idle';
      this.idleTimer = 800 + Math.random() * 600;
    }
  }

  private handleChase(_delta: number, playerX: number, _playerY: number, distToPlayer: number) {
    if (distToPlayer > this.config.engagementRange * 1.5) {
      this.aiState = 'patrol';
      this.idleTimer = 400;
      return;
    }

    if (distToPlayer <= this.config.attackRange && this.state !== 'attack') {
      this.aiState = 'attack';
      this.state = 'attack';
      this.stateTimer = this.config.attackDuration;
      this.attackCooldown = this.config.attackCooldown;
      (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
      this.activateHitbox(this.config.hitbox);
      this.drawAttackEffect();
      return;
    }

    const dir = playerX > this.sprite.x ? 1 : -1;
    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(this.speed * dir);
    this.facingRight = dir > 0;
    this.sprite.setFlipX(!this.facingRight);
  }

  private handleAttack(_delta: number, _distToPlayer: number, _playerActor: Actor) {
    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(0);

    if (this.state !== 'attack') {
      this.aiState = 'idle';
      this.idleTimer = 200;
    }
  }

  private drawAttackEffect() {
    this.attackGraphic.clear();
    const dir = this.facingRight ? 1 : -1;
    const cx = this.sprite.x + dir * 25;
    const cy = this.sprite.y - 20;

    const color = this.config.type === 'heavy' ? 0xff0055 : 0xff6600;
    this.attackGraphic.lineStyle(3, color, 0.8);
    this.attackGraphic.beginPath();
    this.attackGraphic.moveTo(cx - 12 * dir, cy - 8);
    this.attackGraphic.lineTo(cx + 12 * dir, cy + 8);
    this.attackGraphic.strokePath();
    this.attackGraphic.beginPath();
    this.attackGraphic.moveTo(cx - 8 * dir, cy + 10);
    this.attackGraphic.lineTo(cx + 16 * dir, cy - 4);
    this.attackGraphic.strokePath();

    this.scene.time.delayedCall(this.config.attackDuration * 0.5, () => {
      this.attackGraphic.clear();
    });
  }

  public override takeDamage(amount: number, knockbackX: number = 0) {
    if (this.state === 'dead') return;
    this.state = 'hit';
    this.stateTimer = 250;
    this.aiState = 'idle';
    this.idleTimer = 100;
    this.deactivateHitbox();
    super.takeDamage(amount, knockbackX);
  }

  public override destroy() {
    super.destroy();
    this.attackGraphic.destroy();
  }
}
