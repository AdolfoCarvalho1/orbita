'use strict';
const g = new Phaser.Game({
  type: Phaser.AUTO,
  width: HDATA.W,
  height: HDATA.H,
  parent: 'game-canvas',
  backgroundColor: HDATA.COLORS.bg,
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MenuScene, StageScene, ResultScene]
});
window.NAVINHA = { game: g };
