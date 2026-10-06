'use strict';
class BootScene extends Phaser.Scene {
  constructor(){ super('Boot'); }
  create(){
    try {
      if (typeof GameArt !== 'undefined' && GameArt && typeof GameArt.build === 'function') GameArt.build(this);
    } catch (e) {
      try { if (window.__errors) window.__errors.push('art:' + e.message); } catch (_e) {}
    }
    this.scene.start('Menu');
  }
}
