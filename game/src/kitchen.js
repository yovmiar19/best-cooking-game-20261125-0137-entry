// The 3D warung kitchen: room, counters, stations, chef, and camera.
// One job: build and own every object in the scene, and keep it in sync.
import * as THREE from 'three';
import { GAME, INGREDIENTS, PALETTE, STATIONS } from './config.js';
import {
  buildBoard, buildIngredientMesh, buildPantryBin, buildPlateStation,
  buildServeWindow, buildStove,
} from './ingredients.js';

export class Kitchen {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    // Night-market dusk: deep warm purple-brown sky, fog to match.
    this.scene.background = new THREE.Color(0x2e2233);
    this.scene.fog = new THREE.Fog(0x2e2233, 16, 32);
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
    // Polish state: title-screen wave, shot-mode freeze, particles, shutter.
    this.waving = false;
    this.shotMode = false;
    this.steamSprites = [];
    this.emberSprites = [];
    this.chipMeshes = [];
    this.chipBurstT = -1;
    this.sparkleSprites = [];
    this.sparkleT = -1;
    this.stoveLight = null;
    this.shutter = null;
    this.bubble = null;
    this.bubbleCanvas = null;
    this.bubbleCtx = null;
    this.bubbleTex = null;

    this.buildLights();
    this.buildRoom();
    this.buildStations();
    this.buildChef();
    this.buildPlateContents();
    this.buildHighlightRing();
    this.buildParticles();
    this.buildShutter();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  buildLights() {
    // Dusk: dim cool sky light, low warm sun, strong warm bulbs.
    const hemi = new THREE.HemisphereLight(0x8f7fb8, 0x4a3428, 0.5);
    this.scene.add(hemi);
    const dusk = new THREE.DirectionalLight(0x9db4e8, 0.55);
    dusk.position.set(6, 10, 4);
    dusk.castShadow = true;
    dusk.shadow.mapSize.set(2048, 2048);
    dusk.shadow.camera.left = -9;
    dusk.shadow.camera.right = 9;
    dusk.shadow.camera.top = 9;
    dusk.shadow.camera.bottom = -9;
    this.scene.add(dusk);
    const warm = new THREE.PointLight(0xffb74d, 16, 11, 1.5);
    warm.position.set(0, 3.4, 1.5);
    this.scene.add(warm);
    // Orange glow from the stove, always lit at the warung.
    const stoveLight = new THREE.PointLight(0xff7a1a, 7, 6, 1.6);
    stoveLight.position.set(-4.6, 1.6, 2.6);
    this.scene.add(stoveLight);
    this.stoveLight = stoveLight;
    // Warm glow over the serve window.
    const serveLight = new THREE.PointLight(0xffc46b, 6, 6, 1.6);
    serveLight.position.set(4.6, 2.2, 2.6);
    this.scene.add(serveLight);
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
    // Teal trim + a wide striped tarp roof over the back counter, two rows
    // deep so it reads as a night-market canopy, not a flat awning.
    const trim = new THREE.Mesh(new THREE.BoxGeometry(GAME.kitchenWidth + 2, 0.25, 0.34), new THREE.MeshStandardMaterial({ color: PALETTE.wallTrim }));
    trim.position.set(0, 2.9, -GAME.kitchenDepth / 2 - 0.58);
    this.scene.add(trim);
    for (let row = 0; row < 2; row += 1) {
      for (let i = 0; i < 10; i += 1) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 0.07, 1.7),
          new THREE.MeshStandardMaterial({ color: (i + row) % 2 ? PALETTE.awningAlt : PALETTE.awning, roughness: 0.8 }),
        );
        stripe.position.set(-5.85 + i * 1.3, 3.15 + row * 0.55, -4.4 + row * 1.1);
        stripe.rotation.x = 0.32 + row * 0.1;
        stripe.castShadow = true;
        this.scene.add(stripe);
      }
    }
    // String of warm bulbs under the canopy, drooping gently.
    this.buildBulbString();
    // Hand-painted warung sign, hung from the tarp roof over the back
    // counter so it reads in every shot. (On the back wall it sat above
    // the camera's view of the wall and vanished.) Two strings hold it.
    const sign = this.makePaintedSign();
    sign.scale.set(4.2, 1.0, 1);
    sign.position.set(0, 1.9, -3.2);
    this.scene.add(sign);
    const stringMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 1 });
    for (const sx of [-1.9, 1.9]) {
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 6), stringMat);
      string.position.set(sx, 3.05, -3.2);
      this.scene.add(string);
    }
    // Night-market props on the back counter: kerupuk tin + sambal jars.
    this.buildCounterProps();
    // Plastic stools at the front corners, out of the walkways.
    this.buildStools();
    // Dim street behind the warung: dark ground, building slabs, parked
    // motorbike silhouettes peeking over the back wall.
    this.buildStreetBackdrop();
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

  // Hand-painted shop sign: terracotta board, cream double border, three lines.
  makePaintedSign() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#bf360c';
    ctx.beginPath();
    ctx.roundRect(0, 0, 640, 150, 14);
    ctx.fill();
    ctx.strokeStyle = '#ffe8c2';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 620, 130);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 600, 110);
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ WARUNG ★', 320, 42);
    ctx.fillStyle = '#fff3e0';
    ctx.font = '900 52px sans-serif';
    ctx.fillText('SIZZLE & SERVE', 320, 92);
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('• NASI • MIE • SATE •', 320, 126);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  }

  // A drooping wire of warm glowing bulbs under the canopy.
  buildBulbString() {
    const wireMat = new THREE.LineBasicMaterial({ color: 0x1a1210 });
    const pts = [];
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24;
      const x = -5.5 + t * 11;
      const y = 3.05 - Math.sin(t * Math.PI) * 0.35;
      pts.push(new THREE.Vector3(x, y, -4.15));
    }
    const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat);
    this.scene.add(wire);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
    const bulbGlow = new THREE.MeshBasicMaterial({ color: 0xffb74d, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8;
      const x = -5.5 + t * 11;
      const y = 3.05 - Math.sin(t * Math.PI) * 0.35;
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bulbGlow);
      glow.position.set(x, y - 0.08, -4.15);
      this.scene.add(glow);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), bulbMat);
      bulb.position.set(x, y - 0.08, -4.15);
      this.scene.add(bulb);
    }
  }

  // Kerupuk tin + sambal jars on the back counter, between the pantry bins.
  buildCounterProps() {
    const tin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0xe4572e, roughness: 0.5 }),
    );
    tin.position.set(5.15, 1.05, -3.6);
    tin.castShadow = true;
    this.scene.add(tin);
    const tinLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.4 }),
    );
    tinLid.position.set(5.15, 1.35, -3.6);
    this.scene.add(tinLid);
    const jarColors = [0xc62828, 0xef6c00, 0x7cb342];
    jarColors.forEach((color, i) => {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.3, 12),
        new THREE.MeshStandardMaterial({ color, roughness: 0.3 }),
      );
      jar.position.set(-5.15 + i * 0.35, 0.92, -3.95);
      jar.castShadow = true;
      this.scene.add(jar);
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12),
        new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.5 }),
      );
      lid.position.set(-5.15 + i * 0.35, 1.09, -3.95);
      this.scene.add(lid);
    });
  }

  // Two plastic stools at the front corners, clear of the walkways.
  buildStools() {
    for (const [x, z, color] of [[5.3, 3.9, 0x2e7d6b], [-5.3, 3.9, 0xe4572e]]) {
      const seat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.3, 0.12, 14),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
      );
      seat.position.set(x, 0.42, z);
      seat.castShadow = true;
      this.scene.add(seat);
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8),
          new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
        );
        leg.position.set(x + Math.cos(a) * 0.22, 0.2, z + Math.sin(a) * 0.22);
        this.scene.add(leg);
      }
    }
  }

  // Dim street behind the back wall: asphalt strip, dark building slabs and
  // two parked motorbike silhouettes rising above the wall top.
  buildStreetBackdrop() {
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 8),
      new THREE.MeshStandardMaterial({ color: 0x241d33, roughness: 1 }),
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(0, -0.02, -9.5);
    this.scene.add(asphalt);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x1c1626, roughness: 1 });
    for (const [x, w, h] of [[-7.5, 4, 5.2], [-2.5, 3, 4.2], [3, 4.5, 5.8], [8, 3.5, 4.5]]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), slabMat);
      slab.position.set(x, h / 2 - 0.2, -11);
      this.scene.add(slab);
    }
    // Lit windows: tiny warm dots on the slabs.
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffca7a });
    for (let i = 0; i < 14; i += 1) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.36), winMat);
      const bx = [-7.5, -2.5, 3, 8][i % 4];
      win.position.set(bx + ((i * 37) % 3 - 1) * 0.9, 1.2 + Math.floor(i / 4) * 1.1, -10.68);
      this.scene.add(win);
    }
    // Motorbike silhouettes: two dark wheels + low body, parked at the
    // sides of the warung (the ones behind the back wall were invisible).
    const bikeMat = new THREE.MeshStandardMaterial({ color: 0x120e1a, roughness: 1 });
    for (const [bx, bz] of [[-5.6, -1.8], [5.6, -2.2]]) {
      const g = new THREE.Group();
      for (const wx of [-0.55, 0.55]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 8, 18), bikeMat);
        wheel.position.set(wx, 0.26, 0);
        g.add(wheel);
      }
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.12), bikeMat);
      body.position.set(0, 0.5, 0);
      g.add(body);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.12), bikeMat);
      seat.position.set(-0.1, 0.62, 0);
      g.add(seat);
      g.position.set(bx, 0, bz);
      this.scene.add(g);
    }
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
    // Pilot flame on the second burner: the stove is always lit at the warung.
    const pilot = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.3, 10),
      new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.85 }),
    );
    pilot.position.set(-4.6 + 0.35, 1.08, 2.6);
    this.scene.add(pilot);
    this.pilotFlame = pilot;
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
    // Speech bubble above the chef's head: shows what is being carried.
    const bubbleCanvas = document.createElement('canvas');
    bubbleCanvas.width = 256;
    bubbleCanvas.height = 96;
    const bubbleTex = new THREE.CanvasTexture(bubbleCanvas);
    bubbleTex.colorSpace = THREE.SRGBColorSpace;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthTest: false }));
    bubble.scale.set(1.7, 0.64, 1);
    bubble.position.set(0, 2.55, 0);
    bubble.visible = false;
    g.add(bubble);
    this.bubble = bubble;
    this.bubbleCanvas = bubbleCanvas;
    this.bubbleCtx = bubbleCanvas.getContext('2d');
    this.bubbleTex = bubbleTex;
    g.position.set(0, 0, 1.2);
    this.scene.add(g);
    this.chef = g;
  }

  // Draw (or hide) the carried-item speech bubble.
  setBubble(text) {
    if (!this.bubble) return;
    if (!text) { this.bubble.visible = false; return; }
    const ctx = this.bubbleCtx;
    ctx.clearRect(0, 0, 256, 96);
    ctx.fillStyle = 'rgba(255,243,224,0.97)';
    ctx.beginPath();
    ctx.roundRect(6, 4, 244, 62, 16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(118, 66);
    ctx.lineTo(138, 66);
    ctx.lineTo(128, 88);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3e2723';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 36);
    this.bubbleTex.needsUpdate = true;
    this.bubble.visible = true;
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

  // Soft round dot texture shared by steam, embers and sparkles.
  softDotTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Deterministic pseudo-random from an index — no Math.random anywhere.
  hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // Steam over the wok, embers over the flame, chop chips and serve sparkles.
  buildParticles() {
    const dot = this.softDotTexture();
    // Steam: 18 puffs rising from the wok, always drifting (warung ambiance).
    for (let i = 0; i < 18; i += 1) {
      const mat = new THREE.SpriteMaterial({ map: dot, color: 0xf5efe2, transparent: true, opacity: 0.4, depthWrite: false });
      const s = new THREE.Sprite(mat);
      s.userData = { phase: i / 18, speed: 0.22 + this.hash(i) * 0.12, drift: this.hash(i + 50) * 2 - 1 };
      this.scene.add(s);
      this.steamSprites.push(s);
    }
    // Embers: 6 orange sparks over the flame, only while cooking.
    for (let i = 0; i < 6; i += 1) {
      const mat = new THREE.SpriteMaterial({ map: dot, color: 0xff8c1a, transparent: true, opacity: 0.85, depthWrite: false });
      const s = new THREE.Sprite(mat);
      s.scale.set(0.14, 0.14, 1);
      s.userData = { phase: i / 6, speed: 0.5 + this.hash(i + 20) * 0.3 };
      s.visible = false;
      this.scene.add(s);
      this.emberSprites.push(s);
    }
    // Chop chips: little veg/board bits that burst while chopping.
    const chipMat = new THREE.MeshBasicMaterial({ color: 0x8bc34a });
    const chipMat2 = new THREE.MeshBasicMaterial({ color: 0xd7a86e });
    for (let i = 0; i < 8; i += 1) {
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.09), i % 2 ? chipMat : chipMat2);
      chip.visible = false;
      this.scene.add(chip);
      this.chipMeshes.push(chip);
    }
    // Serve sparkles: gold stars that burst from the serve window on a serve.
    for (let i = 0; i < 10; i += 1) {
      const mat = new THREE.SpriteMaterial({ map: dot, color: 0xffd54f, transparent: true, opacity: 0.95, depthWrite: false });
      const s = new THREE.Sprite(mat);
      s.scale.set(0.2, 0.2, 1);
      s.visible = false;
      this.scene.add(s);
      this.sparkleSprites.push(s);
    }
  }

  // Roller shutter for the serve window, lowered at game over.
  buildShutter() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < 128; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? '#bf360c' : '#ffe8c2';
      ctx.fillRect(0, y, 128, 16);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const shutter = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.0, 0.06),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
    );
    shutter.position.set(4.6, 1.85, 2.92);
    shutter.visible = false;
    shutter.castShadow = true;
    this.scene.add(shutter);
    this.shutter = shutter;
  }

  setShutter(down) {
    if (this.shutter) this.shutter.visible = !!down;
  }

  // Project a world point to CSS pixels on the screen (for the coin flight).
  worldToScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    const w = this.renderer.domElement.clientWidth || 1280;
    const h = this.renderer.domElement.clientHeight || 720;
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
  }

  // Start a chop-chip burst over the talenan.
  burstChop() {
    this.chipBurstT = 0;
    this.chipMeshes.forEach((chip) => { chip.visible = true; });
  }

  // Start a gold sparkle burst at the serve window; frozen mid-burst in shot mode.
  burstServe() {
    this.sparkleT = this.shotMode ? 0.45 : 0;
    this.sparkleSprites.forEach((s) => { s.visible = true; });
  }

  updateParticles(dt) {
    // Steam always rises from the wok (deterministic: clock + index phases).
    for (let i = 0; i < this.steamSprites.length; i += 1) {
      const s = this.steamSprites[i];
      const u = s.userData;
      const p = (this.clock * u.speed + u.phase) % 1;
      s.position.set(
        -4.9 + Math.sin(this.clock * 0.7 + i * 2.1) * 0.18 + u.drift * 0.12,
        1.25 + p * 1.5,
        2.6 + Math.cos(this.clock * 0.6 + i * 1.7) * 0.12,
      );
      const sc = 0.3 + p * 0.45;
      s.scale.set(sc, sc, 1);
      s.material.opacity = 0.42 * (1 - p) * (0.6 + 0.4 * Math.sin(p * Math.PI));
    }
    // Embers rise fast from the flame while cooking.
    for (let i = 0; i < this.emberSprites.length; i += 1) {
      const s = this.emberSprites[i];
      const u = s.userData;
      const p = (this.clock * u.speed + u.phase) % 1;
      s.position.set(
        -4.9 + Math.sin(this.clock * 2 + i * 2.4) * 0.12,
        0.95 + p * 0.9,
        2.6 + Math.cos(this.clock * 1.8 + i) * 0.08,
      );
      s.material.opacity = 0.9 * (1 - p);
    }
    // Chop chips arc out and fall.
    if (this.chipBurstT >= 0) {
      if (!this.shotMode) this.chipBurstT += dt;
      const t = Math.min(this.chipBurstT, 0.6);
      this.chipMeshes.forEach((chip, i) => {
        const a = (i / this.chipMeshes.length) * Math.PI * 2 + 0.6;
        chip.position.set(
          -4.6 + Math.cos(a) * t * 1.1,
          1.05 + t * 1.1 - t * t * 1.6,
          0.2 + Math.sin(a) * t * 0.9,
        );
        chip.rotation.y = t * 9 + i;
        chip.visible = t < 0.6;
      });
      if (this.chipBurstT >= 0.6) this.chipBurstT = -1;
    }
    // Serve sparkles radiate from the serve window, then fade.
    if (this.sparkleT >= 0) {
      if (!this.shotMode) this.sparkleT += dt * 1.4;
      const t = Math.min(this.sparkleT, 1);
      this.sparkleSprites.forEach((s, i) => {
        const a = (i / this.sparkleSprites.length) * Math.PI * 2;
        s.position.set(4.6 + Math.cos(a) * t * 1.2, 1.35 + t * 0.9, 2.9 + Math.sin(a) * t * 0.7);
        s.material.opacity = 0.95 * (1 - t);
        s.visible = t < 1;
      });
      if (this.sparkleT >= 1) this.sparkleT = -1;
    }
  }

  highlightStation(station) {
    if (!station) { this.highlightRing.visible = false; return; }
    this.highlightRing.visible = true;
    this.highlightRing.position.x = station.x;
    this.highlightRing.position.z = station.z;
  }

  setCarried(ingredientId) {
    if (this.carriedMesh) { this.chef.remove(this.carriedMesh); this.carriedMesh = null; }
    if (!ingredientId) { this.setBubble(null); return; }
    const mesh = buildIngredientMesh(ingredientId, 1.0);
    mesh.position.set(0, 1.95, 0.15);
    this.chef.add(mesh);
    this.carriedMesh = mesh;
    const emoji = { rice: '🍚', egg: '🥚', kecap: '🍶', noodles: '🍜', veg: '🥬', chicken: '🍗', skewer: '🍢', peanut: '🥜' }[ingredientId] || '';
    this.setBubble(`${emoji} ${INGREDIENTS[ingredientId].name}`.trim());
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
    for (const s of this.emberSprites) s.visible = active;
    if (this.stoveLight) this.stoveLight.intensity = active ? 12 : 7;
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
      this.armL.rotation.z = 0;
      this.armR.rotation.z = 0;
      g.position.y = Math.abs(Math.sin(this.clock * 12)) * 0.05;
    } else if (this.waving) {
      // Title screen: the chef waves at the camera with the right arm.
      this.armL.rotation.x = 0;
      this.armR.rotation.x = 0;
      this.armL.rotation.z = 0;
      this.armR.rotation.z = -2.4 + Math.sin(this.clock * 5) * 0.35;
      g.position.y = 0;
    } else {
      this.armL.rotation.x = 0;
      this.armR.rotation.x = 0;
      this.armL.rotation.z = 0;
      this.armR.rotation.z = 0;
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
    if (this.pilotFlame) {
      this.pilotFlame.scale.y = 0.9 + Math.sin(this.clock * 11) * 0.18;
      this.pilotFlame.scale.x = 0.95 + Math.cos(this.clock * 9) * 0.08;
    }
    this.updateParticles(dt);
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
