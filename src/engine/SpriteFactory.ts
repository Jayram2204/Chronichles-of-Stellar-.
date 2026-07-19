import Phaser from 'phaser';
import type { LevelTheme } from './CanvasManager';

export function createAllSprites(scene: Phaser.Scene, theme: LevelTheme, level: number) {
  createPlayerSprite(scene, theme, level);
  createEnemySprites(scene, theme, level);
  createEffectSprites(scene, theme, level);
}

function recreate(scene: Phaser.Scene, key: string, w: number, h: number) {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  return scene.textures.createCanvas(key, w, h);
}

function createPlayerSprite(scene: Phaser.Scene, theme: LevelTheme, level: number) {
  const key = `player_texture_${level}`;
  const c = recreate(scene, key, 32, 56);
  if (!c) return;
  const ctx = c.context;

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

  c.refresh();
}

function createEnemySprites(scene: Phaser.Scene, _theme: LevelTheme, _level: number) {
  {
    const key = 'enemy_sentinel';
    const c = recreate(scene, key, 30, 50);
    if (!c) return;
    const ctx = c.context;

    ctx.fillStyle = '#000000';
    ctx.fillRect(8, 0, 14, 12);
    ctx.fillRect(6, 12, 18, 22);
    ctx.fillRect(4, 34, 10, 16);
    ctx.fillRect(16, 34, 10, 16);

    ctx.fillStyle = '#ff6a00';
    ctx.fillRect(10, 3, 4, 3);
    ctx.fillRect(16, 3, 4, 3);
    ctx.fillRect(8, 14, 14, 2);
    ctx.fillRect(5, 36, 8, 2);
    ctx.fillRect(17, 36, 8, 2);

    ctx.strokeStyle = '#ff6a00';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, 30, 50);

    c.refresh();
  }

  {
    const key = 'enemy_drone';
    const c = recreate(scene, key, 24, 24);
    if (!c) return;
    const ctx = c.context;

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(12, 12, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00ffd5';
    ctx.fillRect(8, 8, 3, 3);
    ctx.fillRect(13, 8, 3, 3);

    ctx.strokeStyle = '#00ffd5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(12, 12, 10, 0, Math.PI * 2);
    ctx.stroke();

    c.refresh();
  }

  {
    const key = 'enemy_heavy';
    const c = recreate(scene, key, 40, 60);
    if (!c) return;
    const ctx = c.context;

    ctx.fillStyle = '#000000';
    ctx.fillRect(10, 0, 20, 16);
    ctx.fillRect(6, 16, 28, 26);
    ctx.fillRect(4, 42, 14, 18);
    ctx.fillRect(22, 42, 14, 18);

    ctx.fillStyle = '#ff0055';
    ctx.fillRect(14, 4, 5, 4);
    ctx.fillRect(21, 4, 5, 4);
    ctx.fillRect(8, 18, 24, 3);
    ctx.fillRect(5, 44, 12, 3);
    ctx.fillRect(23, 44, 12, 3);

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(8, 22, 4, 14);
    ctx.fillRect(28, 22, 4, 14);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 40, 60);

    c.refresh();
  }
}

function createEffectSprites(scene: Phaser.Scene, theme: LevelTheme, _level: number) {
  {
    const key = 'hit_effect';
    const c = recreate(scene, key, 32, 32);
    if (!c) return;
    const ctx = c.context;

    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(16, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 16);
    ctx.lineTo(30, 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 6);
    ctx.lineTo(26, 26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(26, 6);
    ctx.lineTo(6, 26);
    ctx.stroke();

    c.refresh();
  }
}
