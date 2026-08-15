// 3D hero scene: a low-poly villa on a sandy point, slowly rotating, with a
// pool, palm trees, an ocean plane, and a full day/night lighting cycle that
// can be scrubbed manually with the slider in the hero, or left to play.
//
// THREE is attached to window by the module <script> block in index.html.
// This file only *uses* THREE inside functions, never at top-level, so it
// is safe to load as a plain classic script regardless of execution order.

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(hexA, hexB, t) {
  const a = new THREE.Color(hexA);
  const b = new THREE.Color(hexB);
  return a.clone().lerp(b, t);
}

// Given t in [0,1) representing a full day (0 = midnight, 0.25 = dawn,
// 0.5 = noon, 0.75 = dusk), compute all the lighting parameters.
function skyState(t) {
  // sun height follows a sine wave, peaking at noon (t=0.5)
  const angle = (t - 0.25) * Math.PI * 2; // -PI/2 at midnight-ish
  const sunHeight = Math.sin(angle); // -1..1
  const dayAmount = Math.max(0, sunHeight); // 0 at night, 1 at height of day
  const duskAmount = Math.max(0, 1 - Math.abs(sunHeight) * 2.4); // peaks near sunrise/sunset

  const nightSky = 0x0b1420;
  const duskSky = 0x8a5a45;
  const daySky = 0x8fc1de;

  let sky = lerpColor(nightSky, daySky, dayAmount);
  sky = sky.lerp(new THREE.Color(duskSky), duskAmount * 0.55);

  const ambientColor = lerpColor(0x33415a, 0xfff2df, dayAmount);
  const ambientIntensity = lerp(0.28, 0.85, dayAmount);

  const sunColor = lerpColor(0x7a8fd6, 0xfff6e0, dayAmount).lerp(new THREE.Color(0xff9d5c), duskAmount * 0.7);
  const sunIntensity = lerp(0.12, 1.35, dayAmount) + duskAmount * 0.25;

  const radius = 9;
  const sunPos = new THREE.Vector3(Math.cos(angle) * radius, Math.max(sunHeight, -0.15) * radius, 3);

  return { sky, ambientColor, ambientIntensity, sunColor, sunIntensity, sunPos, dayAmount, duskAmount };
}

function buildPalm(scale = 1) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.6, 6), trunkMat);
  trunk.position.y = 0.8;
  trunk.rotation.z = 0.08;
  g.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7d4a, roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 4, 1, true), leafMat);
    leaf.position.set(0, 1.62, 0);
    leaf.rotation.z = Math.PI / 2.3;
    leaf.rotation.y = (i / 6) * Math.PI * 2;
    leaf.scale.set(1, 1, 0.6);
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  return g;
}

function buildVilla() {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xede1c9, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xc0723a, roughness: 0.7 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x1f6f6b, roughness: 0.6 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x1b262a, emissive: 0xffdca0, emissiveIntensity: 0, roughness: 0.4,
  });

  // Main block
  const main = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.5, 3), wallMat);
  main.position.y = 0.75;
  group.add(main);

  // Side wing
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 2.2), wallMat);
  wing.position.set(-2.6, 0.55, 0.2);
  group.add(wing);

  // Roof (pyramid hip roof via a 4-sided cone rotated 45deg)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.1, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.5 + 0.55;
  group.add(roof);

  const wingRoof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.75, 4), roofMat);
  wingRoof.rotation.y = Math.PI / 4;
  wingRoof.position.set(-2.6, 1.1 + 0.37, 0.2);
  group.add(wingRoof);

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.06), doorMat);
  door.position.set(0, 0.45, 1.53);
  group.add(door);

  // Windows (store refs so we can light them up at night)
  const windows = [];
  const winPositions = [
    [-1.3, 0.9, 1.53], [1.3, 0.9, 1.53], [2.1, 0.9, -1.53], [-3.3, 0.6, 1.11],
  ];
  winPositions.forEach(([x, y, z]) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), windowMat.clone());
    win.position.set(x, y, z);
    group.add(win);
    windows.push(win);
  });

  // Pool
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x2c8f89, roughness: 0.15, metalness: 0.1, emissive: 0x0d3d3a, emissiveIntensity: 0.3 });
  const pool = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.6), poolMat);
  pool.position.set(1, 0.04, 3);
  group.add(pool);
  const poolRim = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.05, 1.9),
    new THREE.MeshStandardMaterial({ color: 0xd8cdb2, roughness: 0.9 })
  );
  poolRim.position.set(1, -0.005, 3);
  group.add(poolRim);

  // Palms
  const palmPositions = [[-4.3, 0, 2.2, 1.1], [3.2, 0, -2.4, 0.9], [-3, 0, -2, 1], [3.6, 0, 3.4, 1.15]];
  palmPositions.forEach(([x, y, z, s]) => {
    const palm = buildPalm(s);
    palm.position.set(x, y, z);
    group.add(palm);
  });

  group.userData.windows = windows;
  return group;
}

function initHeroScene(mountEl, sliderEl) {
  if (!mountEl || !window.THREE) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, mountEl.clientWidth / mountEl.clientHeight || 1, 0.1, 100);
  camera.position.set(9.5, 4.4, 10);
  camera.lookAt(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
  mountEl.appendChild(renderer.domElement);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(20, 48),
    new THREE.MeshStandardMaterial({ color: 0xd8c79c, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Ocean
  const oceanGeo = new THREE.PlaneGeometry(60, 30, 40, 20);
  const oceanMat = new THREE.MeshStandardMaterial({ color: 0x1b5f78, roughness: 0.35, metalness: 0.15, transparent: true, opacity: 0.92 });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.05, -14);
  scene.add(ocean);
  const oceanPos = oceanGeo.attributes.position;
  const oceanBase = Float32Array.from(oceanPos.array);

  const villa = buildVilla();
  villa.position.y = 0;
  scene.add(villa);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(6, 8, 4);
  scene.add(sun);
  const fill = new THREE.HemisphereLight(0x8fc1de, 0x3a2f22, 0.35);
  scene.add(fill);

  let t = 0.42; // start mid-morning
  let dragging = false;
  let resumeTimer = null;

  function applySky(state) {
    scene.background = state.sky;
    scene.fog = new THREE.Fog(state.sky.getHex(), 14, 46);
    ambient.color = state.ambientColor;
    ambient.intensity = state.ambientIntensity;
    sun.color = state.sunColor;
    sun.intensity = state.sunIntensity;
    sun.position.copy(state.sunPos);
    const windowGlow = 1 - state.dayAmount;
    villa.userData.windows.forEach((w) => { w.material.emissiveIntensity = windowGlow * 0.9; });
    oceanMat.color = lerpColor(0x0d2c3d, 0x2f8fb0, state.dayAmount);
  }

  applySky(skyState(t));

  if (sliderEl) {
    sliderEl.value = Math.round(t * 100);
    sliderEl.addEventListener('input', () => {
      dragging = true;
      t = Number(sliderEl.value) / 100;
      applySky(skyState(t));
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { dragging = false; }, 5000);
    });
  }

  function onResize() {
    const w = mountEl.clientWidth || 1;
    const h = mountEl.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(mountEl);

  const clock = new THREE.Clock();
  let frameId;
  function animate() {
    frameId = requestAnimationFrame(animate);
    // Skip the (relatively expensive) render work while the hero is
    // scrolled off / hidden behind another route, but keep the rAF loop
    // alive so it resumes instantly when the hero becomes visible again.
    if (mountEl.offsetParent === null) { clock.getDelta(); return; }

    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;

    villa.rotation.y += delta * 0.06;

    if (!dragging) {
      t = (t + delta * 0.012) % 1;
      applySky(skyState(t));
      if (sliderEl) sliderEl.value = Math.round(t * 100);
    }

    // cheap animated waves
    for (let i = 0; i < oceanPos.count; i++) {
      const ix = i * 3;
      const x = oceanBase[ix];
      const y = oceanBase[ix + 1];
      oceanPos.array[ix + 2] = Math.sin(x * 0.25 + elapsed * 0.9) * 0.12 + Math.cos(y * 0.3 + elapsed * 0.6) * 0.08;
    }
    oceanPos.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();

  return {
    destroy() {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
}
