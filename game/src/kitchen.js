// The 3D warung kitchen: room, counters, stations, chef, and camera.
// One job: build and own every object in the scene, and keep it in sync.
import * as THREE from 'three';
import { GAME, PALETTE, STATIONS } from './config.js';
import {
  buildBoard, buildIngredientMesh, buildPantryBin, buildPlateStation,
  buildServeWindow, buildStove,
} from './ingredients.js';

export class Kitchen {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffe8c2);
    this.scene.fog = new THREE.Fog(0xffe8c2, 18, 34);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.stationMeshes = new Map();
    this.plateMeshes = [];
    this.plateGroup = null;
    this.chef = null;
    this.carriedMesh = null;
    this.workTargetMesh = null;
    this.highlightRing = null;
    this.flame = null;
    this.clock = 0;

    this.buildLights();
    this.buildRoom();
    this.buildStations();
    this.buildChef();
    this.buildPlateContents();
    this.buildHighlightRing();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(0xfff6e0, 0x8d6e63, 0.95);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
    sun.position.set(6, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    this.scene.add(sun);
    const warm = new THREE.PointLight(0xffb74d, 12, 9, 1.6);
    warm.position.set(0, 3.4, 1.5);
    this.scene.add(warm);
  }

  buildRoom() {
    const floorMat = new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(GAME.kitchenWidth + 2, GAME.kitchenDepth + 2), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    // Checker tiles for readability.
    const tileGeo = new THREE.PlaneGeometry(1, 1);
    const tileMatA = new THREE.MeshStandardMaterial({ color: PALETTE.floorAlt, roughness: 0.9 });
    for (let x = -6; x < 6; x += 2) {
      for (let z = -4; z < 4; z += 2) {
        const t = new THREE.Mesh(tileGeo, tileMatA);
        t.rotation.x = -Math.PI / 2;
        t.position.set(x + 0.5, 0.01, z + 0.5);
        t.receiveShadow = true;
        this.scene.add(t);
      }
    }
    const wallMat = new THREE.MeshStandardMaterial({ color: PALETTE.wall, roughness: 0.95 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(GAME.kitchenWidth + 2, 3.4, 0.3), wallMat);
    back.position.set(0, 1.7, -GAME.kitchenDepth / 2 - 0.6);
    back.receiveShadow = true;
    this.scene.add(back);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, GAME.kitchenDepth + 2), wallMat);
    left.position.set(-GAME.kitchenWidth / 2 - 0.6, 1.7, 0);
    this.scene.add(left);
    const right = left.clone();
    right.position.x = GAME.kitchenWidth / 2 + 0.6;
    this.scene.add(right);
    // Teal trim + striped awning over the back counter.
    const trim = new THREE.Mesh(new THREE.BoxGeometry(GAME.kitchenWidth + 2, 0.25, 0.34), new THREE.MeshStandardMaterial({ color: PALETTE.wallTrim }));
    trim.position.set(0, 2.9, -GAME.kitchenDepth / 2 - 0.58);
    this.scene.add(trim);
    for (let i = 0; i < 10; i += 1) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.08, 1.6),
        new THREE.MeshStandardMaterial({ color: i % 2 ? PALETTE.awningAlt : PALETTE.awning, roughness: 0.8 }),
      );
      stripe.position.set(-5.85 + i * 1.3, 3.15, -4.4);
      stripe.rotation.x = 0.35;
      stripe.castShadow = true;
      this.scene.add(stripe);
    }
    // Big warung sign on the back wall.
    const sign = this.makeTextSprite('WARUNG SIZZLE & SERVE', 512, 96, '#e4572e', '#fff3e0', 44);
    sign.scale.set(6.4, 1.2, 1);
    sign.position.set(0, 2.35, -4.95);
    this.scene.add(sign);
    // Potted plants in the corners.
    for (const [x, z] of [[-5.6, 3.8], [5.6, 3.8]]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.45, 12), new THREE.MeshStandardMaterial({ color: 0xb3541e }));
      pot.position.set(x, 0.22, z);
      pot.castShadow = true;
      this.scene.add(pot);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshStandardMaterial({ color: 0x43a047 }));
      bush.position.set(x, 0.7, z);
      bush.castShadow = true;
      this.scene.add(bush);
    }
  }

  makeTextSprite(text, w, h, bg, fg, fontPx) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 18);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `bold ${fontPx}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  }

  buildStations() {
    // Back counter shelf holding the pantry bins.
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(11.4, 0.7, 0.9),
      new THREE.MeshStandardMaterial({ color: PALETTE.counter, roughness: 0.8 }),
    );
    shelf.position.set(0, 0.35, -3.6);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    this.scene.add(shelf);
    const shelfTop = new THREE.Mesh(
      new THREE.BoxGeometry(11.4, 0.08, 1.0),
      new THREE.MeshStandardMaterial({ color: PALETTE.counterTop, roughness: 0.6 }),
    );
    shelfTop.position.set(0, 0.74, -3.6);
    shelfTop.receiveShadow = true;
    this.scene.add(shelfTop);

    for (const station of Object.values(STATIONS)) {
      let mesh = null;
      if (station.kind === 'pantry') mesh = buildPantryBin(station);
      else if (station.kind === 'board') mesh = buildBoard(station);
      else if (station.kind === 'stove') mesh = buildStove(station);
      else if (station.kind === 'plate') mesh = buildPlateStation(station);
      else if (station.kind === 'serve') mesh = buildServeWindow(station);
      if (mesh) {
        this.scene.add(mesh);
        this.stationMeshes.set(station.id, mesh);
        if (station.kind === 'stove') this.flame = mesh.getObjectByName('flame');
      }
    }
  }

  buildChef() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.85, 16), new THREE.MeshStandardMaterial({ color: PALETTE.chefShirt, roughness: 0.7 }));
    body.position.y = 0.85;
    body.castShadow = true;
    g.add(body);
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08), new THREE.MeshStandardMaterial({ color: 0xfff3e0 }));
    apron.position.set(0, 0.8, 0.36);
    g.add(apron);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), new THREE.MeshStandardMaterial({ color: PALETTE.skin, roughness: 0.6 }));
    head.position.y = 1.5;
    head.castShadow = true;
    g.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.3, 16), new THREE.MeshStandardMaterial({ color: PALETTE.chefHat, roughness: 0.9 }));
    hat.position.y = 1.82;
    hat.castShadow = true;
    g.add(hat);
    const hatTop = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: PALETTE.chefHat }));
    hatTop.position.y = 1.95;
    g.add(hatTop);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (const dx of [-0.11, 0.11]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat);
      eye.position.set(dx, 1.52, 0.27);
      g.add(eye);
    }
    // Arms that swing while walking.
    this.armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 10), new THREE.MeshStandardMaterial({ color: PALETTE.skin }));
    this.armL.position.set(-0.42, 1.0, 0);
    this.armL.castShadow = true;
    g.add(this.armL);
    this.armR = this.armL.clone();
    this.armR.position.x = 0.42;
    g.add(this.armR);
    // A spatula in the right hand.
    const spat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
    spat.position.set(0.42, 0.72, 0.18);
    g.add(spat);
    g.position.set(0, 0, 1.2);
    this.scene.add(g);
    this.chef = g;
  }

  buildPlateContents() {
    this.plateGroup = new THREE.Group();
    this.plateGroup.position.set(STATIONS.plate.x, 1.02, STATIONS.plate.z);
    this.scene.add(this.plateGroup);
  }

  // Show the ingredients currently on the plate as little 3D piles.
  setPlateContents(ingredientIds) {
    for (const m of this.plateMeshes) this.plateGroup.remove(m);
    this.plateMeshes = [];
    ingredientIds.forEach((id, i) => {
      const mesh = buildIngredientMesh(id, 0.8);
      mesh.position.set(-0.18 + i * 0.18, 0.02, (i % 2 ? 0.08 : -0.08));
      this.plateGroup.add(mesh);
      this.plateMeshes.push(mesh);
    });
  }

  buildHighlightRing() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.95, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.visible = false;
    this.scene.add(ring);
    this.highlightRing = ring;
  }

  highlightStation(station) {
    if (!station) { this.highlightRing.visible = false; return; }
    this.highlightRing.visible = true;
    this.highlightRing.position.x = station.x;
    this.highlightRing.position.z = station.z;
  }

  setCarried(ingredientId) {
    if (this.carriedMesh) { this.chef.remove(this.carriedMesh); this.carriedMesh = null; }
    if (!ingredientId) return;
    const mesh = buildIngredientMesh(ingredientId, 1.0);
    mesh.position.set(0, 1.95, 0.15);
    this.chef.add(mesh);
    this.carriedMesh = mesh;
  }

  // A pulsing work target (the thing being chopped / cooked) above the station.
  setWorkTarget(ingredientId, station) {
    this.clearWorkTarget();
    if (!ingredientId || !station) return;
    const mesh = buildIngredientMesh(ingredientId, 1.1);
    mesh.position.set(station.x, station.kind === 'stove' ? 1.35 : 1.3, station.z);
    this.scene.add(mesh);
    this.workTargetMesh = mesh;
  }

  clearWorkTarget() {
    if (this.workTargetMesh) { this.scene.remove(this.workTargetMesh); this.workTargetMesh = null; }
  }

  setCooking(active) {
    if (this.flame) this.flame.visible = active;
  }

  // Chef follows the player state; camera trails behind and above.
  syncPlayer(player, dt) {
    this.clock += dt;
    const g = this.chef;
    g.position.x = player.x;
    g.position.z = player.z;
    if (player.moving) {
      g.rotation.y = Math.atan2(player.vx, player.vz);
      const swing = Math.sin(this.clock * 12) * 0.5;
      this.armL.rotation.x = swing;
      this.armR.rotation.x = -swing;
      g.position.y = Math.abs(Math.sin(this.clock * 12)) * 0.05;
    } else {
      this.armL.rotation.x = 0;
      this.armR.rotation.x = 0;
      g.position.y = 0;
    }
    if (this.workTargetMesh) {
      this.workTargetMesh.rotation.y += dt * 2;
      this.workTargetMesh.position.y += Math.sin(this.clock * 6) * 0.0015;
    }
    if (this.flame && this.flame.visible) {
      this.flame.scale.y = 0.9 + Math.sin(this.clock * 18) * 0.2;
      this.flame.scale.x = 0.95 + Math.cos(this.clock * 15) * 0.08;
    }
    const target = new THREE.Vector3(player.x * 0.5, 9.4, player.z * 0.4 + 5.0);
    this.camera.position.lerp(target, 1 - Math.pow(0.001, dt));
    this.camera.lookAt(player.x * 0.55, 0, player.z * 0.5 - 0.6);
  }

  resize() {
    const w = this.container.clientWidth || 960;
    const h = this.container.clientHeight || 600;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
