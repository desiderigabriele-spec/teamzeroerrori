// Scena 3D guidata dallo scroll: lingotto d'oro + 4 anelli (le 4 conferme)
// che passano dal caos all'allineamento mentre l'utente scorre il "Protocollo".
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

// Un keyframe per sezione (stesso ordine delle <section> in pagina).
// x/y/z = posizione lingotto, s = scala, o = opacità canvas, spin = velocità rotazione.
// Il 3D si vede solo in apertura e in chiusura, così non copre mai il testo.
const KEYS = [
  { x: 2.5, y: 1.45, z: 0, s: 0.8, o: 1.0, spin: 0.35 },   // hero (sopra il terminale)
  { x: 3.2, y: 1.2, z: -3, s: 0.7, o: 0, spin: 0.3 },      // come funziona
  { x: 0, y: 0, z: -6, s: 0.7, o: 0, spin: 0.2 },          // metodo
  { x: 0, y: 0, z: -6, s: 0.7, o: 0, spin: 0.2 },          // rischio
  { x: 0, y: 0, z: -6, s: 0.7, o: 0, spin: 0.2 },          // backtest
  { x: 0, y: 0, z: -6, s: 0.7, o: 0, spin: 0.2 },          // percorsi
  { x: 0, y: 0, z: -6, s: 0.7, o: 0, spin: 0.2 },          // team
  { x: 0, y: 0, z: -5, s: 0.8, o: 0, spin: 0.2 },          // faq
  { x: 0, y: -0.2, z: -3.5, s: 1.0, o: 0.35, spin: 0.3 },  // finale (anelli allineati in oro)
];

const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function makeIngotGeometry() {
  // Lingotto a tronco di piramide: base larga, sommità più stretta.
  const geo = new THREE.BoxGeometry(2.6, 0.8, 1.2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      pos.setX(i, pos.getX(i) * 0.8);
      pos.setZ(i, pos.getZ(i) * 0.72);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function makeEngraving() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 424;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(120,70,0,0.9)';
  g.strokeStyle = 'rgba(120,70,0,0.9)';
  g.lineWidth = 8;
  g.strokeRect(40, 40, c.width - 80, c.height - 80);
  g.textAlign = 'center';
  g.font = 'bold 120px Menlo, Consolas, monospace';
  g.fillText('ZERO ERRORI', c.width / 2, 210);
  g.font = 'bold 56px Menlo, Consolas, monospace';
  g.fillText('TZE · XAU · 4/4', c.width / 2, 310);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function initScene(canvas, state, { reduced = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.remove();
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x020403, 8, 22);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.3, 8);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xfff0c8, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xfff3d0, 0x0a3d18, 0.9));
  const greenLight = new THREE.PointLight(0x00ff41, 18, 12);
  greenLight.position.set(-2, -2.5, 2);
  scene.add(greenLight);

  // ---- lingotto ----
  const rig = new THREE.Group();
  scene.add(rig);
  const ingot = new THREE.Group();
  rig.add(ingot);

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffcf55, metalness: 1, roughness: 0.24, envMapIntensity: 1.8 });
  const geo = makeIngotGeometry();
  const bar = new THREE.Mesh(geo, goldMat);
  ingot.add(bar);

  const engr = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6 * 0.8 * 0.92, 1.2 * 0.72 * 0.86),
    new THREE.MeshStandardMaterial({ map: makeEngraving(), transparent: true, metalness: 1, roughness: 0.4, color: 0xd9a032 })
  );
  engr.rotation.x = -Math.PI / 2;
  engr.position.y = 0.401;
  ingot.add(engr);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.5 })
  );
  edges.scale.setScalar(1.07);
  ingot.add(edges);

  // piano di scansione che attraversa il lingotto
  const scan = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.8),
    new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scan.rotation.x = -Math.PI / 2;
  ingot.add(scan);

  // ---- 4 anelli = 4 conferme ----
  const rings = [];
  const alignedQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2, 0, 0.18));
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ff41, emissive: 0x00ff41, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.3 });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.9 + i * 0.28, 0.018 + i * 0.002, 12, 160), mat);
    const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    rings.push({ mesh, mat, axis, speed: 0.4 + Math.random() * 0.8, phase: Math.random() * 6, align: 0, tmpQ: new THREE.Quaternion() });
    rig.add(mesh);
  }

  // ---- particelle ----
  const N = window.innerWidth < 700 ? 600 : 1400;
  const pGeo = new THREE.BufferGeometry();
  const pts = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 5 + Math.random() * 6;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pts[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pts[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.6;
    pts[i * 3 + 2] = r * Math.cos(ph) - 3;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x00ff41, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // ---- griglia "sala operativa" ----
  const grid = new THREE.GridHelper(60, 60, 0x00ff41, 0x0a5a1e);
  grid.material.transparent = true;
  grid.material.opacity = 0.18;
  grid.position.y = -2.4;
  scene.add(grid);

  const green = new THREE.Color(0x00ff41);
  const gold = new THREE.Color(0xffc94a);
  const red = new THREE.Color(0xff3b3b);
  const tmpC = new THREE.Color();

  const cur = { x: KEYS[0].x, y: KEYS[0].y, z: KEYS[0].z, s: 1, o: 1, spin: KEYS[0].spin };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 700 ? 55 : 40;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let flash = 0;
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.getDelta(); requestAnimationFrame(tick); }
  });

  const clock = new THREE.Clock();
  let t = 0;
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const timeScale = reduced ? 0.15 : 1;
    t += dt * timeScale;

    // interpolazione tra i keyframe delle sezioni
    const f = Math.max(0, Math.min(KEYS.length - 1, state.section));
    const i0 = Math.floor(f), i1 = Math.min(KEYS.length - 1, i0 + 1), k = f - i0;
    const a = KEYS[i0], b = KEYS[i1];
    const mobile = window.innerWidth < 900;
    const tgt = {
      x: mobile ? 0 : lerp(a.x, b.x, k),
      y: mobile ? lerp(a.y, b.y, k) * 0.3 + 2.2 : lerp(a.y, b.y, k),
      z: lerp(a.z, b.z, k) - (mobile ? 2 : 0),
      s: lerp(a.s, b.s, k),
      o: lerp(a.o, b.o, k) * (mobile ? 0.4 : 1),
      spin: lerp(a.spin, b.spin, k),
    };
    for (const p in cur) cur[p] = damp(cur[p], tgt[p], 3.2, dt);

    rig.position.set(cur.x, cur.y, cur.z);
    rig.scale.setScalar(cur.s);
    canvas.style.opacity = cur.o.toFixed(3);

    ingot.rotation.y += dt * cur.spin * timeScale;
    ingot.rotation.x = 0.38 + Math.sin(t * 0.6) * 0.08;
    ingot.position.y = Math.sin(t * 1.1) * 0.08;
    scan.position.y = Math.sin(t * 1.6) * 0.55;
    scan.material.opacity = 0.06 + Math.abs(Math.cos(t * 1.6)) * 0.08;
    edges.material.opacity = 0.25 + Math.abs(Math.sin(t * 2)) * 0.35;

    // tinta rossa nella sezione "errori"
    const errMix = clamp01(1 - Math.abs(state.section - 1));
    edges.material.color.copy(green).lerp(red, errMix * 0.9);

    // anelli: caos → allineamento, uno per conferma
    flash = Math.max(0, flash - dt * 1.5);
    rings.forEach((r, i) => {
      const target = clamp01((state.metodo - (0.2 * i - 0.05)) / 0.2);
      r.align = damp(r.align, target, 5, dt);
      r.tmpQ.setFromAxisAngle(r.axis, t * r.speed + r.phase);
      r.mesh.quaternion.copy(r.tmpQ).slerp(alignedQ, r.align);
      r.mesh.rotateZ(t * 0.25 * r.align);
      const allOn = state.metodo >= 0.95 ? 1 : 0;
      tmpC.copy(green).lerp(gold, Math.max(allOn * r.align, flash));
      r.mat.color.copy(tmpC);
      r.mat.emissive.copy(tmpC);
      r.mat.emissiveIntensity = 0.5 + r.align * 0.8 + flash;
    });

    points.rotation.y += dt * 0.02 * timeScale;
    pMat.color.copy(green).lerp(gold, flash);
    grid.position.z = (t * 0.8) % 1;

    mouse.x = damp(mouse.x, mouse.tx, 3, dt);
    mouse.y = damp(mouse.y, mouse.ty, 3, dt);
    camera.position.x = mouse.x * 0.5;
    camera.position.y = 0.3 - mouse.y * 0.3;
    camera.lookAt(0, 0, -2);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);

  return {
    signal() { flash = 1; },
  };
}
