import Phaser from 'phaser';
import { ParallaxController } from './ParallaxController';
import { CombatManager, type EnemySpawn } from './CombatManager';
import { Player } from './Player';
import { createAllSprites } from './SpriteFactory';
import { EventHub, GameEvents } from '../events/EventHub';

export interface LevelTheme {
  name: string;
  skyStart: string;
  skyMid: string;
  skyEnd: string;
  silhouetteColorL2: string;
  silhouetteColorL3: string;
  accentColor: string;
}

export const LEVEL_THEMES: LevelTheme[] = [
  {
    name: "Sector 01: Cyber Core",
    skyStart: "#03010b", skyMid: "#12012a", skyEnd: "#00f3ff",
    silhouetteColorL2: "#080412", silhouetteColorL3: "#100820", accentColor: "#00f3ff"
  },
  {
    name: "Sector 02: Industrial Waste",
    skyStart: "#0a0300", skyMid: "#2c0900", skyEnd: "#ff6a00",
    silhouetteColorL2: "#100600", silhouetteColorL3: "#1a0b00", accentColor: "#ff6a00"
  },
  {
    name: "Sector 03: Neon Docks",
    skyStart: "#000608", skyMid: "#00282b", skyEnd: "#00ffd5",
    silhouetteColorL2: "#000e12", silhouetteColorL3: "#021a20", accentColor: "#00ffd5"
  },
  {
    name: "Sector 04: The Undergrid",
    skyStart: "#020700", skyMid: "#0a2200", skyEnd: "#88ff00",
    silhouetteColorL2: "#040e00", silhouetteColorL3: "#081b00", accentColor: "#88ff00"
  },
  {
    name: "Sector 05: Faction Square",
    skyStart: "#070002", skyMid: "#250009", skyEnd: "#ff0055",
    silhouetteColorL2: "#0f0004", silhouetteColorL3: "#19000a", accentColor: "#ff0055"
  },
  {
    name: "Sector 06: Decentralized Skyway",
    skyStart: "#05000c", skyMid: "#190033", skyEnd: "#b700ff",
    silhouetteColorL2: "#0a0014", silhouetteColorL3: "#120025", accentColor: "#b700ff"
  },
  {
    name: "Sector 07: Ancient Ruins of Stellar",
    skyStart: "#0a0500", skyMid: "#2d1600", skyEnd: "#ffb700",
    silhouetteColorL2: "#120a00", silhouetteColorL3: "#1f1000", accentColor: "#ffb700"
  }
];

const LEVEL_ENEMY_SPAWNS: Record<number, EnemySpawn[]> = {
  1: [
    { x: 500, type: 'sentinel' },
    { x: 900, type: 'sentinel' },
    { x: 1300, type: 'drone' },
  ],
  2: [
    { x: 400, type: 'sentinel' },
    { x: 700, type: 'sentinel' },
    { x: 1100, type: 'drone' },
    { x: 1500, type: 'drone' },
  ],
  3: [
    { x: 350, type: 'drone' },
    { x: 650, type: 'drone' },
    { x: 1000, type: 'sentinel' },
    { x: 1400, type: 'sentinel' },
    { x: 1800, type: 'heavy' },
  ],
  4: [
    { x: 400, type: 'sentinel' },
    { x: 600, type: 'drone' },
    { x: 900, type: 'drone' },
    { x: 1200, type: 'sentinel' },
    { x: 1600, type: 'heavy' },
  ],
  5: [
    { x: 350, type: 'heavy' },
    { x: 700, type: 'sentinel' },
    { x: 1000, type: 'drone' },
    { x: 1300, type: 'sentinel' },
    { x: 1700, type: 'heavy' },
  ],
  6: [
    { x: 300, type: 'drone' },
    { x: 550, type: 'drone' },
    { x: 800, type: 'heavy' },
    { x: 1100, type: 'sentinel' },
    { x: 1400, type: 'heavy' },
    { x: 1800, type: 'drone' },
  ],
  7: [
    { x: 400, type: 'heavy' },
    { x: 700, type: 'heavy' },
    { x: 1000, type: 'sentinel' },
    { x: 1200, type: 'drone' },
    { x: 1500, type: 'heavy' },
    { x: 1800, type: 'heavy' },
    { x: 2100, type: 'heavy' },
  ],
};

export class GameScene extends Phaser.Scene {
  private parallaxController!: ParallaxController;
  private combatManager!: CombatManager;
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackPunch!: Phaser.Input.Keyboard.Key;
  private attackKick!: Phaser.Input.Keyboard.Key;
  private moveW!: Phaser.Input.Keyboard.Key;
  private moveA!: Phaser.Input.Keyboard.Key;
  private moveD!: Phaser.Input.Keyboard.Key;
  private npcMerchant!: Phaser.GameObjects.Rectangle;
  private npcGuard!: Phaser.GameObjects.Rectangle;
  private firewallBarrier!: Phaser.GameObjects.Rectangle;
  private firewallCollider!: Phaser.Physics.Arcade.Collider;
  private activeNpcId: string | null = null;
  private currentLevel = 1;
  private failedKeys: Set<string> = new Set();
  private levelChangeListener?: (data: { level: number }) => void;
  private firewallOpenedListener?: () => void;
  private levelClearedListener?: (data: { score: number; kills: number }) => void;
  private combatFloor!: Phaser.GameObjects.TileSprite;

  constructor() {
    super('GameScene');
  }

  init(data: { level?: number }) {
    this.currentLevel = data.level || 1;
    this.failedKeys.clear();
  }

  preload() {
    const lvl = this.currentLevel;

    this.load.on('loaderror', (file: { key: string; src: string }) => {
      console.warn(`[Asset Missing] ${file.key} failed to load from ${file.src}. Using procedural silhouette.`);
      this.failedKeys.add(file.key);
    });

    this.load.image(`sky_dome_${lvl}`, `assets/sprites/level${lvl}/layer1_sky.png`);
    this.load.image(`horizon_strip_${lvl}`, `assets/sprites/level${lvl}/layer2_horizon.png`);
    this.load.image(`midground_strip_${lvl}`, `assets/sprites/level${lvl}/layer3_midground.png`);
    this.load.image(`floor_tile_${lvl}`, `assets/sprites/level${lvl}/layer4_floor.png`);
    this.load.image(`foreground_cutouts_${lvl}`, `assets/sprites/level${lvl}/layer5_foreground.png`);

    this.createProgrammaticTextures(lvl);
  }

  create() {
    const lvl = this.currentLevel;
    const w = this.scale.width;
    const h = this.scale.height;
    const theme = LEVEL_THEMES[lvl - 1] || LEVEL_THEMES[0];

    this.parallaxController = new ParallaxController(this);

    const skyKey = this.failedKeys.has(`sky_dome_${lvl}`) ? `procedural_sky_dome_${lvl}` : `sky_dome_${lvl}`;
    const horizonKey = this.failedKeys.has(`horizon_strip_${lvl}`) ? `procedural_horizon_strip_${lvl}` : `horizon_strip_${lvl}`;
    const midgroundKey = this.failedKeys.has(`midground_strip_${lvl}`) ? `procedural_midground_strip_${lvl}` : `midground_strip_${lvl}`;
    const floorKey = this.failedKeys.has(`floor_tile_${lvl}`) ? `procedural_floor_tile_${lvl}` : `floor_tile_${lvl}`;
    const fgKey = this.failedKeys.has(`foreground_cutouts_${lvl}`) ? `procedural_foreground_cutouts_${lvl}` : `foreground_cutouts_${lvl}`;

    this.add.image(w / 2, h / 2, skyKey).setDisplaySize(w, h).setDepth(0);

    const layer2 = this.add.tileSprite(0, h - 350, w, 400, horizonKey).setOrigin(0, 0).setDepth(1);
    this.parallaxController.registerLayer2(layer2);

    const layer3 = this.add.tileSprite(0, h - 300, w, 400, midgroundKey).setOrigin(0, 0).setDepth(2);
    this.parallaxController.registerLayer3(layer3);

    const floorHeight = 80;
    const floorY = h - floorHeight;
    this.combatFloor = this.add.tileSprite(0, floorY, w * 5, floorHeight, floorKey).setOrigin(0, 0).setDepth(3);
    this.physics.add.existing(this.combatFloor, true);

    this.physics.world.setBounds(0, 0, w * 5, h);
    this.cameras.main.setBounds(0, 0, w * 5, h);

    createAllSprites(this, theme, lvl);

    const floorBody = this.combatFloor.body as Phaser.Physics.Arcade.StaticBody;
    const spawnY = floorBody.y;

    this.player = new Player(this, 150, spawnY, `player_texture_${lvl}`);
    this.combatManager = new CombatManager(this);

    const spawns = LEVEL_ENEMY_SPAWNS[lvl] || LEVEL_ENEMY_SPAWNS[1];
    this.combatManager.setup(this.player, this.combatFloor, spawns);

    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(-200, 0);

    const layer5 = this.add.tileSprite(0, h - 450, w * 5, 450, fgKey).setOrigin(0, 0).setDepth(50);
    layer5.setScrollFactor(1.3);
    this.parallaxController.registerLayer5(layer5);

    this.setupNPCs(floorY);

    this.firewallBarrier = this.add.rectangle(1900, floorY - h / 2, 16, h, Phaser.Display.Color.HexStringToColor(theme.accentColor).color, 0.4).setOrigin(0.5, 0.5).setDepth(5);
    this.physics.add.existing(this.firewallBarrier, true);
    this.firewallCollider = this.physics.add.collider(this.player.sprite, this.firewallBarrier);

    const firewallText = this.add.text(1900, floorY - 220, 'SECURITY FIREWALL ACTIVE', {
      font: '10px monospace', color: theme.accentColor
    }).setOrigin(0.5).setDepth(6);
    this.tweens.add({
      targets: firewallText, alpha: 0.3, yoyo: true, repeat: -1, duration: 800
    });

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.attackPunch = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
      this.attackKick = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
      this.moveW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.moveA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.moveD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    this.cleanupListeners();

    this.levelChangeListener = (data: { level: number }) => {
      if (this.scene && this.scene.key === 'GameScene') {
        this.scene.restart({ level: data.level });
      }
    };
    EventHub.on(GameEvents.LEVEL_CHANGED, this.levelChangeListener);

    this.firewallOpenedListener = () => {
      if (this.firewallBarrier && this.firewallBarrier.active) {
        this.tweens.add({
          targets: [this.firewallBarrier, firewallText],
          alpha: 0,
          duration: 1000,
          onComplete: () => {
            this.firewallBarrier.destroy();
            firewallText.destroy();
            if (this.firewallCollider) {
              this.physics.world.removeCollider(this.firewallCollider);
            }
          }
        });
      }
    };
    EventHub.on('firewall_opened', this.firewallOpenedListener);

    this.levelClearedListener = (_data: { score: number; kills: number }) => {
      const nextLevel = this.currentLevel === 7 ? 1 : this.currentLevel + 1;
      this.time.delayedCall(2000, () => {
        EventHub.emit(GameEvents.LEVEL_CHANGED, { level: nextLevel });
      });
    };
    EventHub.on(GameEvents.LEVEL_CLEARED, this.levelClearedListener);

    const agentDecisionListener = (data: { npcId: string; decision: string }) => {
      this.handleAgentDecision(data.npcId, data.decision);
    };
    EventHub.on(GameEvents.AGENT_DECISION, agentDecisionListener);

    this.events.once('shutdown', () => {
      this.cleanupListeners();
      EventHub.off(GameEvents.AGENT_DECISION, agentDecisionListener);
    });
  }

  update(_time: number, delta: number) {
    this.parallaxController.update();

    if (!this.cursors || this.player.state === 'dead') return;

    const speed = 280;
    let vx = 0;

    if (this.cursors.left?.isDown || this.moveA?.isDown) {
      vx = -speed;
      this.player.facingRight = false;
      this.player.sprite.setFlipX(true);
    } else if (this.cursors.right?.isDown || this.moveD?.isDown) {
      vx = speed;
      this.player.facingRight = true;
      this.player.sprite.setFlipX(false);
    }

    (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(vx);

    if ((this.cursors.up?.isDown || this.moveW?.isDown) && this.player.sprite.body?.touching.down) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(-620);
    }

    if (this.attackPunch && Phaser.Input.Keyboard.JustDown(this.attackPunch)) {
      this.player.punch();
    }
    if (this.attackKick && Phaser.Input.Keyboard.JustDown(this.attackKick)) {
      this.player.kick();
    }

    this.combatManager.update(delta);
    this.checkNPCInteractions();

    const mapWidth = this.scale.width * 5;
    if (this.player.sprite.x >= mapWidth - 100) {
      this.player.sprite.setX(100);
      const nextLevel = this.currentLevel === 7 ? 1 : this.currentLevel + 1;
      EventHub.emit(GameEvents.LEVEL_CHANGED, { level: nextLevel });
    }
  }

  private cleanupListeners() {
    if (this.levelChangeListener) {
      EventHub.off(GameEvents.LEVEL_CHANGED, this.levelChangeListener);
    }
    if (this.firewallOpenedListener) {
      EventHub.off('firewall_opened', this.firewallOpenedListener);
    }
    if (this.levelClearedListener) {
      EventHub.off(GameEvents.LEVEL_CLEARED, this.levelClearedListener);
    }
  }

  private setupNPCs(floorY: number) {
    const theme = LEVEL_THEMES[this.currentLevel - 1] || LEVEL_THEMES[0];
    const accentHex = Phaser.Display.Color.HexStringToColor(theme.accentColor).color;

    this.npcMerchant = this.add.rectangle(800, floorY - 40, 40, 80, 0x000000).setOrigin(0.5, 0.5).setDepth(8);
    this.npcMerchant.setStrokeStyle(2, accentHex);
    this.physics.add.existing(this.npcMerchant, true);

    this.npcGuard = this.add.rectangle(1800, floorY - 40, 40, 80, 0x000000).setOrigin(0.5, 0.5).setDepth(8);
    this.npcGuard.setStrokeStyle(2, accentHex);
    this.physics.add.existing(this.npcGuard, true);

    this.add.text(800, floorY - 100, 'A.E.O.N. MERCHANT', {
      font: '10px monospace', color: theme.accentColor
    }).setOrigin(0.5).setDepth(9);

    this.add.text(1800, floorY - 100, 'GRID SENTINEL', {
      font: '10px monospace', color: theme.accentColor
    }).setOrigin(0.5).setDepth(9);
  }

  private checkNPCInteractions() {
    const merchantDist = Phaser.Math.Distance.Between(
      this.player.sprite.x, this.player.sprite.y, this.npcMerchant.x, this.npcMerchant.y
    );
    const guardDist = Phaser.Math.Distance.Between(
      this.player.sprite.x, this.player.sprite.y, this.npcGuard.x, this.npcGuard.y
    );

    const threshold = 100;

    if (merchantDist < threshold) {
      if (this.activeNpcId !== 'merchant') {
        this.activeNpcId = 'merchant';
        EventHub.emit(GameEvents.INTERACT_TRIGGER, { npcId: 'merchant', name: 'A.E.O.N. Merchant' });
      }
    } else if (guardDist < threshold) {
      if (this.activeNpcId !== 'guard') {
        this.activeNpcId = 'guard';
        EventHub.emit(GameEvents.INTERACT_TRIGGER, { npcId: 'guard', name: 'Grid Sentinel Guard 09' });
      }
    } else {
      if (this.activeNpcId !== null) {
        this.activeNpcId = null;
        EventHub.emit(GameEvents.INTERACT_TRIGGER, { npcId: null, name: null });
      }
    }
  }

  private handleAgentDecision(npcId: string, decision: string) {
    const x = npcId === 'merchant' ? this.npcMerchant.x : this.npcGuard.x;
    const y = npcId === 'merchant' ? this.npcMerchant.y : this.npcGuard.y;
    const theme = LEVEL_THEMES[this.currentLevel - 1] || LEVEL_THEMES[0];

    const popup = this.add.text(x, y - 80, decision.toUpperCase(), {
      font: '12px monospace', color: '#ffffff', backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(20);
    popup.setStroke(theme.accentColor, 1);

    this.tweens.add({
      targets: popup, y: y - 130, alpha: 0, duration: 3000,
      onComplete: () => popup.destroy()
    });
  }

  private createProgrammaticTextures(level: number) {
    const theme = LEVEL_THEMES[level - 1] || LEVEL_THEMES[0];

    const recreateCanvas = (key: string, w: number, h: number) => {
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
      return this.textures.createCanvas(key, w, h);
    };

    const skyCanvas = recreateCanvas(`procedural_sky_dome_${level}`, 800, 600);
    if (skyCanvas) {
      const ctx = skyCanvas.context;
      const grad = ctx.createLinearGradient(0, 0, 0, 600);
      grad.addColorStop(0, theme.skyStart);
      grad.addColorStop(0.5, theme.skyMid);
      grad.addColorStop(1, theme.skyEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 600);
      skyCanvas.refresh();
    }

    const horizonCanvas = recreateCanvas(`procedural_horizon_strip_${level}`, 1024, 400);
    if (horizonCanvas) {
      const ctx = horizonCanvas.context;
      ctx.fillStyle = theme.silhouetteColorL2;
      for (let i = 0; i < 16; i++) {
        const bw = 40 + Math.random() * 80;
        const bh = 80 + Math.random() * 160;
        const bx = i * 65;
        const by = 400 - bh;
        ctx.fillRect(bx, by, bw, bh);
      }
      horizonCanvas.refresh();
    }

    const midgroundCanvas = recreateCanvas(`procedural_midground_strip_${level}`, 1024, 400);
    if (midgroundCanvas) {
      const ctx = midgroundCanvas.context;
      ctx.fillStyle = theme.silhouetteColorL3;
      for (let i = 0; i < 10; i++) {
        const bw = 60 + Math.random() * 90;
        const bh = 140 + Math.random() * 120;
        const bx = i * 110;
        const by = 400 - bh;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = theme.accentColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(bx + bw / 3, by + 30, 6, 20);
        ctx.fillRect(bx + (2 * bw) / 3, by + 70, 6, 30);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = theme.silhouetteColorL3;
      }
      midgroundCanvas.refresh();
    }

    const floorCanvas = recreateCanvas(`procedural_floor_tile_${level}`, 1024, 80);
    if (floorCanvas) {
      const ctx = floorCanvas.context;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1024, 80);
      ctx.fillStyle = theme.accentColor;
      ctx.fillRect(0, 0, 1024, 4);
      floorCanvas.refresh();
    }

    const fgCanvas = recreateCanvas(`procedural_foreground_cutouts_${level}`, 1024, 450);
    if (fgCanvas) {
      const ctx = fgCanvas.context;
      ctx.fillStyle = '#000000';
      ctx.fillRect(50, 0, 45, 450);
      ctx.fillRect(750, 0, 65, 450);
      ctx.fillRect(0, 0, 1024, 25);
      fgCanvas.refresh();
    }

    const playerCanvas = recreateCanvas(`player_texture_${level}`, 32, 56);
    if (playerCanvas) {
      const ctx = playerCanvas.context;
      ctx.fillStyle = '#000000';
      ctx.fillRect(10, 0, 12, 14);
      ctx.fillRect(8, 14, 16, 24);
      ctx.fillRect(6, 38, 8, 18);
      ctx.fillRect(18, 38, 8, 18);
      ctx.fillStyle = theme.accentColor;
      ctx.fillRect(11, 4, 10, 4);
      ctx.fillRect(9, 16, 14, 2);
      ctx.fillRect(7, 40, 6, 2);
      ctx.fillRect(19, 40, 6, 2);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = theme.accentColor;
      ctx.fillRect(9, 20, 2, 8);
      ctx.fillRect(21, 20, 2, 8);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, 0, 32, 56);
      playerCanvas.refresh();
    }
  }

  shutdown() {
    this.cleanupListeners();
    if (this.combatManager) {
      this.combatManager.destroy();
    }
  }
}

export function initGame(containerId: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 480,
    parent: containerId,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scene: [GameScene]
  };

  return new Phaser.Game(config);
}
