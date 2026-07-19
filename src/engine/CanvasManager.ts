import Phaser from 'phaser';
import { ParallaxController } from './ParallaxController';
import { EventHub, GameEvents } from '../events/EventHub';

// Theme specifications for each of the 7 levels matching Shadow Fight 2 & Vector aesthetics
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
    skyStart: "#03010b", skyMid: "#12012a", skyEnd: "#00f3ff", // Deep violet to cyber cyan
    silhouetteColorL2: "#080412", silhouetteColorL3: "#100820", accentColor: "#00f3ff"
  },
  {
    name: "Sector 02: Industrial Waste",
    skyStart: "#0a0300", skyMid: "#2c0900", skyEnd: "#ff6a00", // Crimson to toxic orange
    silhouetteColorL2: "#100600", silhouetteColorL3: "#1a0b00", accentColor: "#ff6a00"
  },
  {
    name: "Sector 03: Neon Docks",
    skyStart: "#000608", skyMid: "#00282b", skyEnd: "#00ffd5", // Dark forest to bright teal
    silhouetteColorL2: "#000e12", silhouetteColorL3: "#021a20", accentColor: "#00ffd5"
  },
  {
    name: "Sector 04: The Undergrid",
    skyStart: "#020700", skyMid: "#0a2200", skyEnd: "#88ff00", // Acid green theme
    silhouetteColorL2: "#040e00", silhouetteColorL3: "#081b00", accentColor: "#88ff00"
  },
  {
    name: "Sector 05: Faction Square",
    skyStart: "#070002", skyMid: "#250009", skyEnd: "#ff0055", // Cyberpunk neon red
    silhouetteColorL2: "#0f0004", silhouetteColorL3: "#19000a", accentColor: "#ff0055"
  },
  {
    name: "Sector 06: Decentralized Skyway",
    skyStart: "#05000c", skyMid: "#190033", skyEnd: "#b700ff", // Electric purple
    silhouetteColorL2: "#0a0014", silhouetteColorL3: "#120025", accentColor: "#b700ff"
  },
  {
    name: "Sector 07: Ancient Ruins of Stellar",
    skyStart: "#0a0500", skyMid: "#2d1600", skyEnd: "#ffb700", // Golden cyber-sunset (Core MVP)
    silhouetteColorL2: "#120a00", silhouetteColorL3: "#1f1000", accentColor: "#ffb700"
  }
];

export class GameScene extends Phaser.Scene {
  private parallaxController!: ParallaxController;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private npcMerchant!: Phaser.GameObjects.Rectangle;
  private npcGuard!: Phaser.GameObjects.Rectangle;
  private firewallBarrier!: Phaser.GameObjects.Rectangle;
  private firewallCollider!: Phaser.Physics.Arcade.Collider;
  private activeNpcId: string | null = null;
  private currentLevel = 1;
  private failedKeys: Set<string> = new Set();
  private levelChangeListener?: (data: { level: number }) => void;
  private firewallOpenedListener?: () => void;

  constructor() {
    super('GameScene');
  }

  init(data: { level?: number }) {
    this.currentLevel = data.level || 1;
    this.failedKeys.clear();
  }

  preload() {
    const lvl = this.currentLevel;
    
    // Register load errors to trigger vector fallbacks
    this.load.on('loaderror', (file: any) => {
      console.warn(`[Asset Missing] ${file.key} failed to load from ${file.src}. Using procedural silhouette.`);
      this.failedKeys.add(file.key);
    });

    // Try loading custom assets from public/assets/sprites/levelX/
    this.load.image(`sky_dome_${lvl}`, `assets/sprites/level${lvl}/layer1_sky.png`);
    this.load.image(`horizon_strip_${lvl}`, `assets/sprites/level${lvl}/layer2_horizon.png`);
    this.load.image(`midground_strip_${lvl}`, `assets/sprites/level${lvl}/layer3_midground.png`);
    this.load.image(`floor_tile_${lvl}`, `assets/sprites/level${lvl}/layer4_floor.png`);
    this.load.image(`foreground_cutouts_${lvl}`, `assets/sprites/level${lvl}/layer5_foreground.png`);

    // Generate high-quality programmatic fallback textures themed to this level
    this.createProgrammaticTextures(lvl);
  }

  create() {
    const lvl = this.currentLevel;
    const w = this.scale.width;
    const h = this.scale.height;

    this.parallaxController = new ParallaxController(this);

    // Resolve texture keys: use loaded asset if successful, otherwise fallback to procedural
    const skyKey = this.failedKeys.has(`sky_dome_${lvl}`) ? `procedural_sky_dome_${lvl}` : `sky_dome_${lvl}`;
    const horizonKey = this.failedKeys.has(`horizon_strip_${lvl}`) ? `procedural_horizon_strip_${lvl}` : `horizon_strip_${lvl}`;
    const midgroundKey = this.failedKeys.has(`midground_strip_${lvl}`) ? `procedural_midground_strip_${lvl}` : `midground_strip_${lvl}`;
    const floorKey = this.failedKeys.has(`floor_tile_${lvl}`) ? `procedural_floor_tile_${lvl}` : `floor_tile_${lvl}`;
    const fgKey = this.failedKeys.has(`foreground_cutouts_${lvl}`) ? `procedural_foreground_cutouts_${lvl}` : `foreground_cutouts_${lvl}`;

    // LAYER 1: Deep Sky (Gradient Backdrop)
    this.add.image(w / 2, h / 2, skyKey).setDisplaySize(w, h);

    // LAYER 2: Horizon Silhouettes (Parallax factor: 0.2)
    const layer2 = this.add.tileSprite(0, h - 350, w, 400, horizonKey).setOrigin(0, 0);
    this.parallaxController.registerLayer2(layer2);

    // LAYER 3: Midground Industry (Parallax factor: 0.5)
    const layer3 = this.add.tileSprite(0, h - 300, w, 400, midgroundKey).setOrigin(0, 0);
    this.parallaxController.registerLayer3(layer3);

    // LAYER 4: The Physics Track (True Speed: 1.0)
    const floorHeight = 80;
    const floorY = h - floorHeight;
    const physicsFloor = this.add.tileSprite(0, floorY, w * 5, floorHeight, floorKey).setOrigin(0, 0);
    this.physics.add.existing(physicsFloor, true); // Create static physics wall
    this.parallaxController.registerLayer4(physicsFloor);

    // Set camera and world boundaries
    this.physics.world.setBounds(0, 0, w * 5, h);
    this.cameras.main.setBounds(0, 0, w * 5, h);

    // Create Player Sprite (Using silhouette texture matching active level theme)
    this.player = this.physics.add.sprite(150, floorY - 100, `player_texture_${lvl}`) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(1200); // Snappy heavy gravity
    this.physics.add.collider(this.player, physicsFloor);

    // Follow the player with a cinematic left-offset
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(-200, 0);

    // LAYER 5: Foreground Girders (Parallax factor: 1.3)
    const layer5 = this.add.tileSprite(0, h - 450, w * 5, 450, fgKey).setOrigin(0, 0);
    layer5.setScrollFactor(1.3);
    this.parallaxController.registerLayer5(layer5);

    // Place NPCs
    this.setupNPCs(floorY);

    // Setup visual and physical firewall barrier
    const theme = LEVEL_THEMES[lvl - 1] || LEVEL_THEMES[0];
    this.firewallBarrier = this.add.rectangle(1900, floorY - h / 2, 16, h, Phaser.Display.Color.HexStringToColor(theme.accentColor).color, 0.4).setOrigin(0.5, 0.5);
    this.physics.add.existing(this.firewallBarrier, true);
    this.firewallCollider = this.physics.add.collider(this.player, this.firewallBarrier);

    const firewallText = this.add.text(1900, floorY - 220, 'SECURITY FIREWALL ACTIVE', { font: '10px monospace', color: theme.accentColor }).setOrigin(0.5);
    this.tweens.add({
      targets: firewallText,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 800
    });

    // Setup input listeners
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Clean up any existing level listeners to prevent leaks on restart
    if (this.levelChangeListener) {
      EventHub.off(GameEvents.LEVEL_CHANGED, this.levelChangeListener);
    }
    if (this.firewallOpenedListener) {
      EventHub.off('firewall_opened', this.firewallOpenedListener);
    }

    // Bind listeners
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

    const agentDecisionListener = (data: { npcId: string; decision: string }) => {
      this.handleAgentDecision(data.npcId, data.decision);
    };
    EventHub.on(GameEvents.AGENT_DECISION, agentDecisionListener);

    // Register scene shutdown cleanup hook
    this.events.once('shutdown', () => {
      if (this.levelChangeListener) {
        EventHub.off(GameEvents.LEVEL_CHANGED, this.levelChangeListener);
      }
      if (this.firewallOpenedListener) {
        EventHub.off('firewall_opened', this.firewallOpenedListener);
      }
      EventHub.off(GameEvents.AGENT_DECISION, agentDecisionListener);
    });
  }

  update() {
    this.parallaxController.update();

    if (!this.cursors) return;

    const speed = 280;

    // Snappy Lateral Kinematics: speed snaps instantly to 0 upon release (Vector/Shadow Fight vibe)
    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0); // instant friction snap
    }

    // Precise Heavy Jump
    if (this.cursors.up?.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-620);
    }

    // Scan for NPC interaction zones
    this.checkNPCInteractions();

    // Check for level exit boundary
    const mapWidth = this.scale.width * 5;
    if (this.player.x >= mapWidth - 100) {
      this.player.setX(100); // prevent multi-trigger
      const nextLevel = this.currentLevel === 7 ? 1 : this.currentLevel + 1;
      EventHub.emit(GameEvents.LEVEL_CHANGED, { level: nextLevel });
    }
  }

  private setupNPCs(floorY: number) {
    const theme = LEVEL_THEMES[this.currentLevel - 1] || LEVEL_THEMES[0];

    // Solid black rectangles with glowing accent headers
    this.npcMerchant = this.add.rectangle(800, floorY - 40, 40, 80, 0x000000).setOrigin(0.5, 0.5);
    this.npcMerchant.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(theme.accentColor).color);
    this.physics.add.existing(this.npcMerchant, true);
    
    this.npcGuard = this.add.rectangle(1800, floorY - 40, 40, 80, 0x000000).setOrigin(0.5, 0.5);
    this.npcGuard.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(theme.accentColor).color);
    this.physics.add.existing(this.npcGuard, true);

    this.add.text(800, floorY - 100, 'A.E.O.N. MERCHANT', { font: '10px monospace', color: theme.accentColor }).setOrigin(0.5);
    this.add.text(1800, floorY - 100, 'GRID SENTINEL', { font: '10px monospace', color: theme.accentColor }).setOrigin(0.5);
  }

  private checkNPCInteractions() {
    const merchantDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcMerchant.x, this.npcMerchant.y);
    const guardDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcGuard.x, this.npcGuard.y);

    const interactThreshold = 100;

    if (merchantDist < interactThreshold) {
      if (this.activeNpcId !== 'merchant') {
        this.activeNpcId = 'merchant';
        EventHub.emit(GameEvents.INTERACT_TRIGGER, { npcId: 'merchant', name: 'A.E.O.N. Merchant' });
      }
    } else if (guardDist < interactThreshold) {
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
      font: '12px monospace',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);
    popup.setStroke(theme.accentColor, 1);

    this.tweens.add({
      targets: popup,
      y: y - 130,
      alpha: 0,
      duration: 3000,
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

    // 1. Sky Dome (Neon gradient backdrop matching Shadow Fight 2 sunset/cyber gradients)
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

    // 2. Horizon Silhouettes (Parallax 0.2 skyline)
    const horizonCanvas = recreateCanvas(`procedural_horizon_strip_${level}`, 1024, 400);
    if (horizonCanvas) {
      const ctx = horizonCanvas.context;
      ctx.fillStyle = theme.silhouetteColorL2;
      for (let i = 0; i < 16; i++) {
        const w = 40 + Math.random() * 80;
        const h = 80 + Math.random() * 160;
        const x = i * 65;
        const y = 400 - h;
        ctx.fillRect(x, y, w, h);
      }
      horizonCanvas.refresh();
    }

    // 3. Midground Industry (Parallax 0.5 scaffolds and frames)
    const midgroundCanvas = recreateCanvas(`procedural_midground_strip_${level}`, 1024, 400);
    if (midgroundCanvas) {
      const ctx = midgroundCanvas.context;
      ctx.fillStyle = theme.silhouetteColorL3;
      for (let i = 0; i < 10; i++) {
        const w = 60 + Math.random() * 90;
        const h = 140 + Math.random() * 120;
        const x = i * 110;
        const y = 400 - h;
        ctx.fillRect(x, y, w, h);
        
        // Glow windows reflecting the level's accent color
        ctx.fillStyle = theme.accentColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x + w / 3, y + 30, 6, 20);
        ctx.fillRect(x + (2 * w) / 3, y + 70, 6, 30);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = theme.silhouetteColorL3; // reset
      }
      midgroundCanvas.refresh();
    }

    // 4. Floor Tile (Solid black platform with neon accent top bezel)
    const floorCanvas = recreateCanvas(`procedural_floor_tile_${level}`, 1024, 80);
    if (floorCanvas) {
      const ctx = floorCanvas.context;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1024, 80);
      
      // Neon accent border
      ctx.fillStyle = theme.accentColor;
      ctx.fillRect(0, 0, 1024, 4);
      floorCanvas.refresh();
    }

    // 5. Foreground Cutouts (Parallax 1.3 - Close pipes/columns framing the screen)
    const fgCanvas = recreateCanvas(`procedural_foreground_cutouts_${level}`, 1024, 450);
    if (fgCanvas) {
      const ctx = fgCanvas.context;
      ctx.fillStyle = '#000000'; // Pure black in Shadow Fight 2
      ctx.fillRect(50, 0, 45, 450); // Left pillar
      ctx.fillRect(750, 0, 65, 450); // Right pillar
      ctx.fillRect(0, 0, 1024, 25); // Top overhead pipe
      fgCanvas.refresh();
    }

    // 6. Player Silhouette (Solid black courier outline glowing in level accent color)
    const playerCanvas = recreateCanvas(`player_texture_${level}`, 32, 64);
    if (playerCanvas) {
      const ctx = playerCanvas.context;
      
      // Solid black silhouette body
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 32, 64);
      
      // Neon accent glow outline
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(1, 1, 30, 62);
      
      // Glowing helmet visor
      ctx.fillStyle = theme.accentColor;
      ctx.fillRect(16, 10, 14, 8);
      
      playerCanvas.refresh();
    }
  }

  shutdown() {
    if (this.levelChangeListener) {
      EventHub.off(GameEvents.LEVEL_CHANGED, this.levelChangeListener);
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
