import Phaser from 'phaser';
import { Player } from './Player';
import { Enemy, type EnemyType } from './Enemy';
import { TextDraw } from './TextDraw';
import { EventHub, GameEvents } from '../events/EventHub';

export interface EnemySpawn {
  x: number;
  type: EnemyType;
}

export class CombatManager {
  private scene: Phaser.Scene;
  private player!: Player;
  private enemies: Enemy[] = [];
  private textDraw!: TextDraw;
  private floorCollider!: Phaser.Physics.Arcade.Collider;
  private enemyColliders: Phaser.Physics.Arcade.Collider[] = [];
  private totalScore: number = 0;
  private totalEnemiesKilled: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.textDraw = new TextDraw(scene);
  }

  public setup(player: Player, floor: Phaser.GameObjects.TileSprite, spawns: EnemySpawn[]) {
    this.player = player;

    this.floorCollider = this.scene.physics.add.collider(player.sprite, floor);

    for (const spawn of spawns) {
      this.spawnEnemy(spawn.x, spawn.type, floor);
    }

    this.setupHitboxOverlaps();
  }

  private spawnEnemy(x: number, type: EnemyType, floor: Phaser.GameObjects.TileSprite) {
    const floorY = (floor.body as Phaser.Physics.Arcade.StaticBody).y;
    const enemy = new Enemy(this.scene, x, floorY, `enemy_${type}`, type);

    this.scene.physics.add.collider(enemy.sprite, floor);
    this.enemyColliders.push(
      this.scene.physics.add.collider(enemy.sprite, floor)
    );

    this.enemies.push(enemy);
  }

  private setupHitboxOverlaps() {
    for (const enemy of this.enemies) {
      this.scene.physics.add.overlap(
        this.player.attackHitbox,
        enemy.sprite,
        () => {
          if (this.player.hitboxActive && enemy.state !== 'dead') {
            const damage = this.calculateDamage();
            const knockback = this.player.facingRight ? 200 : -200;
            enemy.takeDamage(damage, knockback);

            const isCrit = damage > 12;
            this.textDraw.damage(enemy.sprite.x, enemy.sprite.y, damage, isCrit);

            if (this.player.comboCount > 1) {
              this.textDraw.combo(
                this.player.sprite.x,
                this.player.sprite.y,
                this.player.comboCount
              );
            }

            this.scene.cameras.main.shake(60, 0.003);

            if (enemy.hp <= 0) {
              this.onEnemyDeath(enemy);
            }
          }
        }
      );

      this.scene.physics.add.overlap(
        enemy.attackHitbox,
        this.player.sprite,
        () => {
          if (enemy.hitboxActive && this.player.state !== 'dead') {
            const knockback = enemy.facingRight ? -150 : 150;
            this.player.takeDamage(enemy.config.damage, knockback);
            this.textDraw.damage(
              this.player.sprite.x,
              this.player.sprite.y,
              enemy.config.damage
            );

            EventHub.emit(GameEvents.PLAYER_DAMAGE, {
              hp: this.player.hp,
              maxHp: this.player.maxHp,
              damage: enemy.config.damage,
            });
          }
        }
      );
    }
  }

  private calculateDamage(): number {
    const baseDamage = 8;
    const comboBonus = (this.player.comboCount - 1) * 3;
    const variance = Math.floor(Math.random() * 4) - 1;
    return baseDamage + comboBonus + variance;
  }

  private onEnemyDeath(enemy: Enemy) {
    this.totalScore += enemy.config.type === 'heavy' ? 30 : enemy.config.type === 'drone' ? 15 : 10;
    this.totalEnemiesKilled++;

    this.textDraw.info(enemy.sprite.x, enemy.sprite.y - 20, `+${this.totalScore} PTS`);

    EventHub.emit(GameEvents.ENEMY_DEATH, {
      type: enemy.config.type,
      score: this.totalScore,
      totalKilled: this.totalEnemiesKilled,
    });

    this.scene.tweens.add({
      targets: enemy.sprite,
      alpha: 0,
      y: enemy.sprite.y + 20,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        enemy.destroy();
        this.enemies = this.enemies.filter(e => e !== enemy);
        this.checkLevelClear();
      },
    });
  }

  private checkLevelClear() {
    if (this.enemies.length === 0) {
      this.textDraw.levelUp(this.player.sprite.x, this.player.sprite.y);
      EventHub.emit(GameEvents.LEVEL_CLEARED, {
        score: this.totalScore,
        kills: this.totalEnemiesKilled,
      });
    }
  }

  public getAliveEnemies(): Enemy[] {
    return this.enemies.filter(e => e.state !== 'dead');
  }

  public update(delta: number) {
    if (this.player.state === 'dead') return;

    this.player.updateTimers(delta);
    this.player.updatePlayerHUD();

    for (const enemy of this.enemies) {
      if (enemy.state !== 'dead') {
        enemy.updateAI(delta, this.player.sprite.x, this.player.sprite.y, this.player);
      }
    }
  }

  public destroy() {
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = [];
    if (this.floorCollider) this.scene.physics.world.removeCollider(this.floorCollider);
    for (const c of this.enemyColliders) {
      this.scene.physics.world.removeCollider(c);
    }
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getScore(): number {
    return this.totalScore;
  }
}
