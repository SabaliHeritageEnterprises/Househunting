// Small 3D scene shown inside a property card on hover: a simplified,
// color-coded massing model of the building (the "blueprint becomes real"
// moment). Renderers are created lazily on first hover and then just
// paused/resumed, since only a couple of cards are ever hovered at once.

const CARD3D_SHAPES = {
  villa: (color) => {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.4), new THREE.MeshStandardMaterial({ color: 0xede1c9, roughness: 0.9 }));
    wall.position.y = 0.45;
    g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.7, 4), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.9 + 0.35;
    g.add(roof);
    const pool = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.7), new THREE.MeshStandardMaterial({ color: 0x2c8f89, emissive: 0x0d3d3a, emissiveIntensity: 0.4 }));
    pool.position.set(0.2, 0.03, 1.15);
    g.add(pool);
    return g;
  },
  beach_apartment: (color) => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf3ead9 : 0xe6d9bf, roughness: 0.9 }));
      floor.position.y = 0.25 + i * 0.5;
      g.add(floor);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.3), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    roof.position.y = 1.54;
    g.add(roof);
    return g;
  },
  holiday_home: (color) => {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 1.3), new THREE.MeshStandardMaterial({ color: 0xdccdae, roughness: 0.9 }));
    wall.position.y = 0.45;
    g.add(wall);
    const roofGeo = new THREE.CylinderGeometry(0, 1.4, 0.9, 4, 1);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.62);
    roof.position.y = 0.9 + 0.45;
    g.add(roof);
    return g;
  },
  guesthouse: (color) => {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 1.2), new THREE.MeshStandardMaterial({ color: 0xf1e7d1, roughness: 0.9 }));
    wall.position.y = 0.37;
    g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.55, 4), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.75 + 0.27;
    g.add(roof);
    return g;
  },
  condo: (color) => {
    const g = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.1, 1.3), new THREE.MeshStandardMaterial({ color: 0x9db3c9, roughness: 0.35, metalness: 0.2 }));
    tower.position.y = 1.05;
    g.add(tower);
    for (let i = 0; i < 5; i++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.06, 1.32), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 }));
      band.position.y = 0.3 + i * 0.4;
      g.add(band);
    }
    return g;
  },
  townhouse: (color) => {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const unit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 1.2), new THREE.MeshStandardMaterial({ color: i === 0 ? 0xf1e7d1 : 0xe3d5b8, roughness: 0.9 }));
      unit.position.set(i * 0.95, 0.55, 0);
      g.add(unit);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 4), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
      roof.rotation.y = Math.PI / 4;
      roof.position.set(i * 0.95, 1.1 + 0.25, 0);
      g.add(roof);
    }
    return g;
  },
};

function createPropertyCard3D(canvas, category) {
  if (!window.THREE) return null;
  const meta = (window.categoryMeta ? categoryMeta(category) : null) || { color: '#c98a3b' };
  const color = new THREE.Color(meta.color);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
  camera.position.set(3, 2.1, 3.4);
  camera.lookAt(0, 0.5, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 6, 3);
  scene.add(key);

  const base = new THREE.Mesh(new THREE.CircleGeometry(2.3, 32), new THREE.MeshStandardMaterial({ color: 0xd8c79c, roughness: 1 }));
  base.rotation.x = -Math.PI / 2;
  scene.add(base);

  const build = CARD3D_SHAPES[category] || CARD3D_SHAPES.villa;
  const model = build(color);
  scene.add(model);

  let running = false;
  let frameId = null;

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth || 200;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight || 150;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function animate() {
    if (!running) return;
    frameId = requestAnimationFrame(animate);
    model.rotation.y += 0.018;
    renderer.render(scene, camera);
  }

  return {
    start() {
      resize();
      if (running) return;
      running = true;
      animate();
    },
    stop() {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
    },
    resize,
  };
}

// Wires up lazy-init hover behaviour for a single card. `canvasEl` is the
// <canvas> already present in the card markup (see properties.js).
function attachCard3D(cardEl, canvasEl, category) {
  let instance = null;
  let initialized = false;

  function ensureInit() {
    if (initialized) return;
    initialized = true;
    // Give the canvas a real pixel size before creating the renderer.
    requestAnimationFrame(() => {
      instance = createPropertyCard3D(canvasEl, category);
      if (instance) instance.start();
    });
  }

  cardEl.addEventListener('mouseenter', () => {
    if (!window.THREE) return;
    ensureInit();
    if (instance) instance.start();
  });
  cardEl.addEventListener('mouseleave', () => {
    if (instance) instance.stop();
  });
}
