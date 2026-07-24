// gameplay.js
// Common game levels routines, mechanics, entities, etc.
import Audio from '../audio';
import Globals from '../globals';
import Controls from '../controls';
import Renderer from './renderer';
import SpecialFx from '../specialfx';
import {
  Hero, Gloria, Dido,
  FoeP1, FoeK1, FoeP2, FoeK2, Arkian
} from '../entities';
import DialogBox from '../ui/containers/dialog-box';
import Hud from '../ui/containers/hud';
import { EventHub, emitGameEvent, GameEvents } from '../../events/EventHub';

const TileMapConsts = {
  TILE_SIZE: 48,
  LAYER_PARALAX: 'paralax',
  LAYER_BG: 'background',
  LAYER_BG_ITEMS: 'background-items',
  LAYER_FG: 'foreground',
  OBJECTS_COLLECT: 'collectables',
  OBJECTS_ACTORS: 'actors',
  FG_Y: 123, // y position where foreground sidewalk objects start,
  WALK_CONSTRAINT_Y: 96,
  COLLECTABLES: {
    // HP added is in %
    'food25': { frame: 'chicken_01', hp: 20, text: 'Chicken +20%' },
    'food50': { frame: 'steak_01', hp: 50, text: 'Steak +50%' },
    'food75': { frame: 'meatloaf_02', hp: 75, text: 'Ham +75%' },
    'food100': { frame: 'chicken_02', hp: 100, text: 'Roast +100%' }
  },
  // tile coordinates helpers
  pos: (x) => x * 48,
  // mapping of tiled actors to objects
  ACTORS: {
    HERO: { name: 'hero', classType: Hero, frame: 'hero_stand_01' },
    GLORIA: { name: 'gloria', classType: Gloria, frame: 'gloria_stand_01' },
    DIDO: { name: 'dido', classType: Dido, frame: 'dog_stand_01' },
    P1: { name: 'p1', classType: FoeP1, frame: 'foe_stand_01' },
    P2: { name: 'p2', classType: FoeP2, frame: 'elite1_stand_01' },
    K1: { name: 'k1', classType: FoeK1, frame: 'foe2_stand_01' },
    K2: { name: 'k2', classType: FoeK2, frame: 'elite2_stand_01' },
    ARKIAN: { name: 'arkian', classType: Arkian, frame: 'arkian_stand_01' },
  }
};

class GamePlay extends Renderer {

  create(level) {
    if (this._onEnemyDeath) {
      EventHub.off(GameEvents.ENEMY_DEATH, this._onEnemyDeath);
    }
    if (this._onTxConfirmed) {
      EventHub.off(GameEvents.TX_CONFIRMED, this._onTxConfirmed);
    }
    if (this._onPlayerDamage) {
      EventHub.off(GameEvents.PLAYER_DAMAGE, this._onPlayerDamage);
    }
    this._level = level;

    this.totalScore = 0;
    this.totalKills = 0;

    // combo system
    this.comboCount = 0;
    this.comboTimer = null;
    this.comboText = null;

    this._onEnemyDeath = (data) => {
      this.totalKills++;
      this.comboCount++;

      // combo bonus: +50 per combo level
      const comboBonus = this.comboCount > 1 ? this.comboCount * 50 : 0;
      this.totalScore += this._level * 10 + comboBonus;

      if (this.playerHud) {
        this.playerHud.updateScore(this.totalScore, this.totalKills);
      }

      // show combo text
      if (this.comboCount > 1) {
        this._showCombo();
      }

      // reset combo timer (2 seconds to chain next kill)
      if (this.comboTimer) this.comboTimer.destroy();
      this.comboTimer = this.game.time.events.add(2000, () => {
        this.comboCount = 0;
      });
    };
    EventHub.on(GameEvents.ENEMY_DEATH, this._onEnemyDeath);

    // reset combo on player hit
    this._onPlayerDamage = (data) => {
      if (this.comboCount > 0) {
        this.comboCount = 0;
        if (this.comboTimer) this.comboTimer.destroy();
      }
    };
    EventHub.on(GameEvents.PLAYER_DAMAGE, this._onPlayerDamage);

    this._onTxConfirmed = (data) => {
      if (data.action === 'unlock_keycard') {
        if (this.specialFx) {
          this.specialFx.textdraw.fadingUp(
            this.player.sprite.x, this.player.sprite.y - 48,
            'A.E.O.N. Passkey acquired!', 3000
          );
        }
      } else if (data.action === 'open_firewall') {
        if (this.specialFx) {
          this.specialFx.textdraw.fadingUp(
            this.player.sprite.x, this.player.sprite.y - 48,
            'Firewall bypassed!', 3000
          );
        }
      }
    };
    EventHub.on(GameEvents.TX_CONFIRMED, this._onTxConfirmed);

    this.game.stage.backgroundColor = Globals.palette.sky.hex;

    this.specialFx = new SpecialFx(this.game);
    this.controls = new Controls(this.game);
    this.audio = new Audio(this.game);
    // short cut to our custom audio manager
    this.game.audio = this.audio;

    // The 'behind' group is basically a layer in the level the contains sprites
    // behind the sidewalk objects layer. We need to put objects either in front
    // or behind the sidewalk layer
    this.behindGroup = this.add.group();
    // The 'middle' group IS the sidewalk layer objects. This is just a static
    // image that Tiled gives us
    this.middleGroup = this.add.group();
    // The 'front' group contains all sprites that are 'in front' of the sidewalk
    this.frontGroup = this.add.group();

    // static AABB objects loaded from the game level
    this.obstaclesGroup = this.add.group();
    this.collectables = [];

    // all level npcs
    this.actors = [];
    // enemy actors only
    this.enemies = [];

    // hotpoints - stuff happens when the player crosses them
    this.hotpoints = {};
  }

  jukebox(music, playGo = true) {
    this.audio.stop();

    // play level music
    this.audio.play(music);

    // play ready sound
    if (playGo) {
      this.audio.play(this.audio.sfx.go);
      this.specialFx.textdraw.fadingUp(this.player.sprite.x,
        this.player.sprite.y - TileMapConsts.TILE_SIZE * 0.5, 'Go!', 4000);
    }
  }

  goLevel(act) {
    this.specialFx.screenFade(() => {
      if (sessionStorage) {
        sessionStorage.setItem('playerHealth', this.player.sprite.health);
      }

      emitGameEvent(GameEvents.LEVEL_CHANGED, { level: this._level });
      emitGameEvent(GameEvents.LEVEL_CLEARED, {
        score: this.totalScore,
        kills: this.totalKills
      });

      if (act === 'act2') {
        emitGameEvent(GameEvents.ACT_COMPLETED, { act: 1 });
      } else if (act === 'act5') {
        emitGameEvent(GameEvents.ACT_COMPLETED, { act: 2 });
      }

      this.state.start('loading', true, false, act)
    });
  }

  get level() {
    return this._level;
  }

  attachHud() {
    // The HUD group contains all hud ui
    this.playerHud = new Hud(this.game, this.player.sprite);
  }

  _showCombo() {
    if (this.comboText) this.comboText.destroy();

    const msg = this.comboCount + ' COMBO!';
    this.comboText = this.game.add.bitmapText(
      this.game.world.centerX, 50,
      Globals.bitmapFont, msg, 12
    );
    this.comboText.anchor.setTo(0.5);
    this.comboText.fixedToCamera = true;
    this.comboText.tint = this.comboCount >= 5 ? 0xffaa00 :
                          this.comboCount >= 3 ? 0x00ffff : 0xffffff;

    // pop in
    this.comboText.scale.setTo(1.5);
    this.game.add.tween(this.comboText.scale).to(
      { x: 1, y: 1 }, 200, Phaser.Easing.Back.Out, true
    );

    // fade out after 1.5s
    this.game.add.tween(this.comboText).to(
      { alpha: 0 }, 500, Phaser.Easing.Linear.None, true, 1500
    ).onComplete.add(() => {
      if (this.comboText) { this.comboText.destroy(); this.comboText = null; }
    });
  }

  /**
   * Sets health from last level
   */
  adjustPlayer() {
    if (sessionStorage && sessionStorage.getItem('playerHealth')) {
      this.player.sprite.health = sessionStorage.getItem('playerHealth');
    }
  }

  /**
   * Brings game layers to their default arrangement positions
   */
  adjustLayers() {
    this.game.world.bringToTop(this.behindGroup);
    this.game.world.bringToTop(this.middleGroup);
    this.game.world.bringToTop(this.frontGroup);

    this.game.physics.arcade.setBoundsToWorld();

    // a bit stupid to call this here, but that's the easiest way atm
    this.showFps();
  }

  createLevel(name) {
    this.map = this.game.add.tilemap(name);
    this.map.addTilesetImage('gd-tileset', 'gd-tiles');

    this.layers = {
      paralax: this.map.createLayer(TileMapConsts.LAYER_PARALAX),
      background: this.map.createLayer(TileMapConsts.LAYER_BG),
      backgroundItems: this.map.createLayer(TileMapConsts.LAYER_BG_ITEMS),
      foreground: this.map.createLayer(TileMapConsts.LAYER_FG)
    };
    // set size of world
    this.layers.background.resizeWorld();

    for (const obj of this.map.objects.obstacles) {
      const sprite = this.game.add.sprite(obj.x, obj.y, null);

      this.game.physics.arcade.enable(sprite);
      sprite.body.setSize(obj.width, obj.height);
      // this is a non-moveable sprite
      sprite.body.immovable = true;

      // add to group of non-walkable areas
      this.obstaclesGroup.add(sprite);
    }

    // map all level hotpoints
    if (this.map.objects.hotpoints) {
      for (const hot of this.map.objects.hotpoints) {
        this.hotpoints[hot.name] = hot;
      }
    }

    this._placeCollectables(this.map);
    this._placeActors(this.map);

    // sidewalk items layer needs to be either behind or in-front
    // of on-screen sprites
    this.middleGroup.add(this.layers.foreground);
  }

  _placeCollectables(map) {
    const collectablesGroup = this.add.group();

    for (const [k, v] of Object.entries(TileMapConsts.COLLECTABLES)) {
      this.map.createFromObjects(TileMapConsts.OBJECTS_COLLECT,
        k, 'atlas_sprites', v.frame, true, true, collectablesGroup,
        Phaser.Sprite, false, false);
    }

    // XXX this is a bit crappy, but there does not seem to be away
    // to put createFromObjects() sprites directly into an array instead of
    // in a group
    for (const sprite of collectablesGroup.children) {
      this.collectables.push(sprite);
    }
    for (const sprite of this.collectables) {
      this.addSpriteToLayer(sprite, true);
    }
    //collectablesGroup.removeAll();

    this.game.physics.arcade.enable(this.collectables);

    // define foods physics bodies
    for (const sprite of this.collectables) {
      if (sprite.name.indexOf('food') > -1) {
        sprite.body.setSize(sprite.width - 4, sprite.height * 0.6,
          2, sprite.height * 0.4);
      }
    }
  }

  _placeActors(map) {
    const actorsGroup = this.add.group();

    for (const [k, v] of Object.entries(TileMapConsts.ACTORS)) {
      this.map.createFromObjects(TileMapConsts.OBJECTS_ACTORS,
        v.name, 'atlas_sprites', v.frame, true, true, actorsGroup,
        Phaser.Sprite, false, false);
    }

    for (const sprite of actorsGroup.children) {
      /**
       * Correct Tiled spawn position.
       */
      sprite.x += sprite.width * 0.5;
      sprite.y += sprite.height * 0.5;

      // new enemy entity with corresponding difficulty level
      const actor = new TileMapConsts.ACTORS[sprite.name.toUpperCase()].classType(
        this.game, sprite, this.level);

      // just an ugly special case here, nothing to see folks, move on ...
      if (sprite.name === TileMapConsts.ACTORS.HERO.name) {
        this.player = actor;
      } else if (sprite.name === TileMapConsts.ACTORS.GLORIA.name) {
        this.gloria = actor;
      } else if (sprite.name === TileMapConsts.ACTORS.DIDO.name) {
        this.dido = actor;
      } else if (sprite.name === TileMapConsts.ACTORS.ARKIAN.name) {
        this.arkian = actor;
        this.enemies.push(actor);
      } else {
        this.enemies.push(actor);
      }

      this.actors.push(actor);
    }

    for (const actor of this.actors) {
      this.addSpriteToLayer(actor.sprite, true);
    }
  }

  spawnEnemy(ACTOR, x, y, level, options = {}) {
    const actor = new ACTOR.classType(this.game, this.game.add.sprite(x, y,
      'atlas_sprites', ''), level, options);
    this.actors.push(actor);
    this.enemies.push(actor);
    this.addSpriteToLayer(actor.sprite, true);
  }

  isEnemiesDead() {
    return this.enemies.reduce(
      (s, o) => s += !o.dead && o.sprite.alive ? 1 : 0, 0) === 0;
  }

  addDoor(tx, ty) {
    const door = this.game.add.sprite(TileMapConsts.pos(tx),
      TileMapConsts.pos(ty), 'atlas_sprites', 'door');
    this.addSpriteToLayer(door, true);

    // play sfx
    this.audio.play(this.audio.sfx.door, true);
  }

  /**
   * Adds a sprite to the appropriate layer based on it's coordinates.
   *
   * @param {*} noParent true, if the sprite's neither in the behind
   nor in the front group.
   */
  addSpriteToLayer(sprite, noParent) {
    const isInBehind = this.behindGroup.children.indexOf(sprite) > -1;

    if (sprite.bottom > TileMapConsts.FG_Y && (isInBehind || noParent)) {
      this.behindGroup.remove(sprite);
      this.frontGroup.add(sprite);
      // console.log('move to front', sprite.name, sprite.y, sprite.bottom);
    } else if (sprite.bottom < TileMapConsts.FG_Y && (!isInBehind || noParent)) {
      this.frontGroup.remove(sprite);
      this.behindGroup.add(sprite);
      // console.log('move to back', sprite.name, sprite.y, sprite.bottom);
    }
  }

  /**
   * Checks position constraints of sprites in behind/front groups.
   * This will move moveable bodies, ergo sprites, from 'behind' to 'front'
   * and vice versa.
   */
  _updateZOrders() {
    for (const sprite of this.behindGroup.children) {
      if (!sprite.immovable) {
        this.addSpriteToLayer(sprite);
      }
    }

    for (const sprite of this.frontGroup.children) {
      if (!sprite.immovable) {
        this.addSpriteToLayer(sprite);
      }
    }

    // sort all sprites by their bottom coords
    // to make overlapping more realistic
    this.behindGroup.sort('bottom', Phaser.Group.SORT_ASCENDING);
    this.frontGroup.sort('bottom', Phaser.Group.SORT_ASCENDING);
  }

  _updateCollisions(group) {
    // show obstacles positions
    if (Globals.debugPhysics) {
      for (const obj of this.obstaclesGroup.children) {
        this.game.debug.body(obj);
      }
      for (const obj of this.collectables) {
        this.game.debug.body(obj);
      }
    }

    for (const sprite of group.children) {
      // all moveable sprites in the group should not be allowed
      // to move across obstacles
      if (sprite.body && !sprite.body.immovable) {

        // apply sidewalk constraint
        // XXX Maybe pass walk constraints as params, so that other levels
        // can specify something different
        if (sprite.bottom - 5 < TileMapConsts.WALK_CONSTRAINT_Y &&
          sprite.body.velocity.y < 0) {

          //sprite.body.velocity.x = 0;
          sprite.body.velocity.y = 0;
        }

        // check against obstacles in the loaded level 'obstacles' layer
        this.physics.arcade.collide(sprite, this.obstaclesGroup);
      }
    }
  }

  updatePlayerCollisions(sprite) {
    if (!sprite || !sprite.body || !Array.isArray(this.collectables)) return;
    this.physics.arcade.collide(sprite, this.collectables, (o1, o2) => {
      if (!o2 || !o2.alive || !this.player) return;
      const food = TileMapConsts.COLLECTABLES[o2.name];
      if (!food) return;
      if (this.specialFx && this.specialFx.textdraw) {
        this.specialFx.textdraw.fadingUp(o2.x, o2.y, food.text);
      }
      // 'eat' that food
      o2.destroy();
      this.player.heal(food.hp);
      // play sfx
      if (this.audio && this.audio.sfx) this.audio.play(this.audio.sfx.foodpickup);
    });
  }

  collectEnemiesEngaging() {
    let result = [];

    let engagedCount = this.enemies.reduce(
      (s, actor) => s += actor && actor.engaged ? 1 : 0,
    0);

    for (const actor of this.enemies) {
      if (actor && actor.sprite && typeof actor.isCanEngage === 'function' &&
        typeof actor.isInEngageRange === 'function' && this.player && this.player.sprite &&
        actor.isCanEngage(engagedCount) &&
        actor.isInEngageRange(this.player.sprite.x, this.player.sprite.y)) {

        actor.engaged = true;
        result.push(actor);
        // count of enemies already attacking
        engagedCount += 1;
      }
    }

    return result;
  }

  _checkNpcProximity() {
    // NPC proximity detection handled by native DialogBox system
  }

  update() {
    // A single bad sprite or external listener must not terminate Phaser's
    // state update. Keep the remaining frame work isolated and report enough
    // context to identify the offending subsystem.
    const guard = (label, work) => {
      try {
        return work();
      } catch (error) {
        console.error(`[GamePlay.update] ${label} failed`, error);
        return undefined;
      }
    };

    guard('renderer', () => super.update());

    if(this.dialogBox) {
      guard('dialog box', () => this.dialogBox.update());
      if(this.dialogBox.active)
        return;

      this.dialogBox.destroy();
      this.dialogBox = null;
    }

    if (this.player) {
      if (this.playerHud) {
        guard('HUD', () => this.playerHud.update());

        // boss health bar
        if (this.arkian && !this.arkian.dead) {
          if (!this._bossBarShown) {
            this.playerHud.showBossHealth(this.arkian.sprite, 'ARKIAN');
            this._bossBarShown = true;
          }
          guard('boss HUD', () => this.playerHud.updateBossHealth());
        } else if (this._bossBarShown) {
          this.playerHud.hideBossHealth();
          this._bossBarShown = false;
        }
      }
      guard('player', () => this.player.update(this.enemies));
      guard('player collisions', () => this.updatePlayerCollisions(this.player.sprite));

      this._checkNpcProximity();
    }

    // update NPCs & AI
    const engaging = guard('enemy engagement', () => this.collectEnemiesEngaging()) || [];
    //console.log(engaging.length)

    for (const actor of this.enemies) {
      if (actor && typeof actor.update === 'function') {
        guard(`enemy ${actor.constructor.name}`, () => actor.update(this.player, engaging));
      }
    }

    guard('z-order', () => this._updateZOrders());
    guard('front collisions', () => this._updateCollisions(this.frontGroup));
    guard('behind collisions', () => this._updateCollisions(this.behindGroup));

    // debug keys/events
    if (Globals.debug) {
      if (this.controls.debug('warpAtEnd')) {
        // teleport player at the end of the level
        //this.player.sprite.x = this.game.world.width - TileMapConsts.TILE_SIZE * 1.5;
        this.player.sprite.x += TileMapConsts.TILE_SIZE * 2;
      } else if (this.controls.debug('killAll')) {
        // kill all existing enemies on the map
        this.enemies.forEach(o => o.kill());
      } else if (this.controls.debug('killNearby')) {
        this.enemies.forEach((actor) => {
          if (actor.isInAttackRange(this.player.sprite.x, this.player.sprite.y)) {
            actor.kill();
          }
        });
      } else if (this.controls.debug('killVisible')) {
        this.enemies.forEach((actor) => {
          if (actor.isInEngageRange(this.player.sprite.x, this.player.sprite.y)) {
            actor.kill();
          }
        });
      } else if (this.controls.debug('hurtHero')) {
        this.player.damage(25);
      } else if (this.controls.debug('healHero')) {
        this.player.heal(25);
      } else if (this.controls.debug('showDialog')) {
        const dialog = [
          {
            character_avatar: '',
            text: ['Lorem ipsum dolor sit amet.', 'Placeat ipsam ad in recusandae.', 'Soluta at eum deserunt repudiandae.']
          },
          {
            character_avatar: '',
            text: ['Tempora iste qui debitis, veniam.', 'Officia cum voluptas nesciunt quam?', 'Commodi provident, facilis numquam ipsa.']
          },
          {
            character_avatar: '',
            text: ['Provident, odio est necessitatibus vero.', 'Nesciunt dolorem hic sit consequuntur!', 'Voluptatibus neque id tenetur magnam.' ]
          },
        ];
        this.dialogBox = new DialogBox(this.game, dialog);
      } else if(this.controls.debug('makeRain')) {
        this.specialFx.weather.addRain();
      }
    }
  }

}

export { GamePlay, TileMapConsts };
