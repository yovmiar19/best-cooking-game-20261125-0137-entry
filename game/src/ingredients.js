// 3D ingredient models and station props, all built from Three.js primitives.
// One job: make every ingredient and station readable at a glance.
import * as THREE from 'three';
import { INGREDIENTS, STATIONS } from './config.js';

function mat(color, rough = 0.7) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 });
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sph(r, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// A small floating model of one ingredient, for the counter, the hand, and the plate.
export function buildIngredientMesh(ingredientId, scale = 1) {
  const g = new THREE.Group();
  const c = INGREDIENTS[ingredientId].color;
  switch (ingredientId) {
    case 'rice': {
      g.add(cyl(0.22, 0.16, 0.12, 0xffffff, 0, 0.06, 0));
      g.add(sph(0.2, 0xfff6d8, 0, 0.16, 0));
      g.children[1].scale.y = 0.45;
      break;
    }
    case 'egg': {
      const egg = sph(0.16, 0xffe9a8, 0, 0.14, 0);
      egg.scale.set(1, 1.35, 1);
      g.add(egg);
      break;
    }
    case 'kecap': {
      g.add(cyl(0.09, 0.11, 0.34, 0x2a1608, 0, 0.17, 0));
      g.add(cyl(0.05, 0.07, 0.08, 0x3a1f0d, 0, 0.38, 0));
      break;
    }
    case 'noodles': {
      const torus = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.07, 10, 20), mat(0xf2c14e));
      torus.rotation.x = Math.PI / 2;
      torus.position.y = 0.1;
      torus.castShadow = true;
      g.add(torus);
      break;
    }
    case 'veg': {
      g.add(sph(0.15, 0x2e7d32, 0, 0.13, 0));
      g.add(sph(0.1, 0x66bb6a, -0.12, 0.1, 0.06));
      g.add(sph(0.1, 0x81c784, 0.13, 0.1, -0.05));
      break;
    }
    case 'chicken': {
      const drum = sph(0.17, 0xe8a87c, 0, 0.15, 0);
      drum.scale.set(1.2, 0.9, 1);
      g.add(drum);
      g.add(cyl(0.035, 0.035, 0.22, 0xf5e6c8, 0.2, 0.12, 0));
      g.children[1].rotation.z = Math.PI / 2.5;
      break;
    }
    case 'skewer': {
      g.add(cyl(0.015, 0.015, 0.55, 0xc89b6a, 0, 0.1, 0));
      g.children[0].rotation.z = Math.PI / 2;
      for (let i = -1; i <= 1; i += 1) g.add(sph(0.07, 0xd98a5f, i * 0.12, 0.1, 0));
      break;
    }
    case 'peanut': {
      g.add(cyl(0.16, 0.12, 0.14, 0x8d5a2b, 0, 0.07, 0));
      g.add(sph(0.14, 0xa9743f, 0, 0.16, 0));
      g.children[1].scale.y = 0.4;
      break;
    }
    default:
      g.add(box(0.25, 0.25, 0.25, c, 0, 0.13, 0));
  }
  g.scale.setScalar(scale);
  return g;
}

// A pantry bin: open crate with the ingredient on show and a floating label sprite.
export function buildPantryBin(station) {
  const g = new THREE.Group();
  const ing = INGREDIENTS[station.ingredient];
  g.add(box(1.1, 0.35, 0.7, 0x6d4c41, 0, 0.18, 0));
  g.add(box(1.0, 0.06, 0.6, 0x8d6e63, 0, 0.38, 0));
  const item = buildIngredientMesh(station.ingredient, 1.15);
  item.position.y = 0.42;
  g.add(item);
  g.add(makeLabelSprite(station.label, ing.color));
  g.position.set(station.x, 0.72, station.z);
  g.userData.stationId = station.id;
  return g;
}

// A cutting board with a knife; a chopping target appears on it while working.
export function buildBoard(station) {
  const g = new THREE.Group();
  g.add(box(1.3, 0.9, 0.9, 0x8d5a2b, 0, 0.45, 0));
  g.add(box(1.2, 0.06, 0.8, 0xf5e6c8, 0, 0.93, 0));
  const board = box(0.9, 0.05, 0.55, 0xd7a86e, 0, 0.99, 0);
  g.add(board);
  const knife = box(0.45, 0.03, 0.08, 0xcfd8dc, 0.25, 1.02, 0.15);
  knife.rotation.y = 0.5;
  g.add(knife);
  g.add(makeLabelSprite('🔪 TALENAN', 0xd7a86e));
  g.position.set(station.x, 0, station.z);
  g.userData.stationId = station.id;
  return g;
}

// A stove with two burners, a wok, and a flame cone that lights while cooking.
export function buildStove(station) {
  const g = new THREE.Group();
  g.add(box(1.4, 0.9, 0.9, 0x37474f, 0, 0.45, 0));
  g.add(box(1.3, 0.05, 0.8, 0x263238, 0, 0.92, 0));
  g.add(cyl(0.3, 0.3, 0.04, 0x111111, -0.3, 0.96, 0));
  g.add(cyl(0.3, 0.3, 0.04, 0x111111, 0.35, 0.96, 0));
  const wok = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(0x4e342e, 0.4),
  );
  wok.rotation.x = Math.PI;
  wok.position.set(-0.3, 1.12, 0);
  wok.castShadow = true;
  g.add(wok);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.5, 12),
    new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.9 }),
  );
  flame.position.set(-0.3, 0.75, 0);
  flame.visible = false;
  flame.name = 'flame';
  g.add(flame);
  g.add(makeLabelSprite('🔥 KOMPOR', 0xff8c1a));
  g.position.set(station.x, 0, station.z);
  g.userData.stationId = station.id;
  return g;
}

// The plating counter with an empty white plate waiting.
export function buildPlateStation(station) {
  const g = new THREE.Group();
  g.add(box(1.4, 0.9, 0.9, 0x8d5a2b, 0, 0.45, 0));
  g.add(box(1.3, 0.06, 0.8, 0xf5e6c8, 0, 0.93, 0));
  const plate = cyl(0.42, 0.34, 0.06, 0xffffff, 0, 0.99, 0, 28);
  g.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 28), mat(0xe0e0e0));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.02;
  g.add(rim);
  g.add(makeLabelSprite('🍽️ PIRING', 0xffffff));
  g.position.set(station.x, 0, station.z);
  g.userData.stationId = station.id;
  return g;
}

// The serving window: a hatch with a bell and a warm glow.
export function buildServeWindow(station) {
  const g = new THREE.Group();
  g.add(box(1.6, 2.2, 0.25, 0x2e7d6b, 0, 1.1, 0));
  g.add(box(1.2, 0.9, 0.1, 0xffe8c2, 0, 1.35, 0.14));
  g.add(box(1.4, 0.9, 0.9, 0x8d5a2b, 0, 0.45, 0.1));
  g.add(box(1.3, 0.06, 0.8, 0xf5e6c8, 0, 0.93, 0.1));
  const bell = sph(0.12, 0xffd54f, 0.45, 1.05, 0.2);
  g.add(bell);
  g.add(makeLabelSprite('🔔 SAJIKAN', 0xffd54f));
  g.position.set(station.x, 0, station.z);
  g.userData.stationId = station.id;
  return g;
}

// Canvas-texture label sprite floating above a station.
export function makeLabelSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(20,16,12,0.82)';
  ctx.beginPath();
  ctx.roundRect(4, 6, 248, 52, 12);
  ctx.fill();
  ctx.fillStyle = '#fff3e0';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(1.5, 0.38, 1);
  sprite.position.y = 1.55;
  return sprite;
}

export { STATIONS };
