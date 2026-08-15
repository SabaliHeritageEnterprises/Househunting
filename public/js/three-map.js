// 3D map view: a stylised terrain slab with glowing pins for each property,
// plus city markers with labels. Drag to orbit, scroll to zoom, hover a pin
// for a tooltip, click a pin to open that listing (via the onSelect callback).

function initMapScene(mountEl, properties, { cities = [], onSelect } = {}) {
  if (!mountEl || !window.THREE || !window.OrbitControls) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1416);
  scene.fog = new THREE.Fog(0x0e1416, 10, 30);

  const camera = new THREE.PerspectiveCamera(42, mountEl.clientWidth / mountEl.clientHeight || 1, 0.1, 60);
  camera.position.set(0, 7, 8.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
  mountEl.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 16;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.update();

  scene.add(new THREE.AmbientLight(0x9fb3c9, 0.7));
  const sun = new THREE.DirectionalLight(0xdfe9f2, 0.9);
  sun.position.set(5, 9, 3);
  scene.add(sun);

  // --- Normalise lat/lng to scene x/z --------------------------------
  // Combine properties + city coordinates for projection bounds
  const allCoords = [
    ...properties.map((p) => ({ lat: p.location.lat, lng: p.location.lng })),
    ...cities.map((c) => ({ lat: c.lat, lng: c.lng })),
  ];
  
  const lats = allCoords.map((c) => c.lat);
  const lngs = allCoords.map((c) => c.lng);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);
  const pad = 1.4;

  // Add padding for the map bounds
  const latPad = (latMax - latMin) * 0.2 || 0.5;
  const lngPad = (lngMax - lngMin) * 0.2 || 0.5;
  const latMinPadded = latMin - latPad;
  const latMaxPadded = latMax + latPad;
  const lngMinPadded = lngMin - lngPad;
  const lngMaxPadded = lngMax + lngPad;
  
  function project(lat, lng) {
    const nx = (lng - lngMin) / (lngMax - lngMin);
    const nz = (lat - latMin) / (latMax - latMin);
    const x = (nx - 0.5) * (13 - pad * 2);
    const z = (0.5 - nz) * (9 - pad * 2);
    return { x, z };
  }

  // --- Terrain slab with a real relief map of Kenya (Wikimedia) ---
  // High‑resolution, free, and reliable – no API key needed.
  const mapImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Kenya_relief_location_map.jpg/1024px-Kenya_relief_location_map.jpg';

  const textureLoader = new THREE.TextureLoader();
  
  // Placeholder material while image loads
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a3a,
    roughness: 0.9,
    metalness: 0.0,
  });
  
  const terrain = new THREE.Mesh(new THREE.BoxGeometry(13, 0.4, 9, 26, 1, 18), terrainMat);
  terrain.position.y = -0.2;
  scene.add(terrain);

  // Load and apply the map texture
  textureLoader.load(
    mapImageUrl,
    (texture) => {
      terrain.material.map = texture;
      terrain.material.color.set(0xffffff); // ensure texture shows clearly
      terrain.material.needsUpdate = true;
    },
    undefined,
    (err) => {
      console.warn('Map image failed to load – keeping solid color background.');
    }
  );

  // No grid – the map image provides geographic reference.

  const pinGroup = new THREE.Group();
  scene.add(pinGroup);
  const pins = [];

  // --- Property pins --------------------------------------------------
  properties.forEach((property) => {
    const { x, z } = project(property.location.lat, property.location.lng);
    const meta = categoryMeta(property.category);
    const color = new THREE.Color(meta.color);

    const holder = new THREE.Group();
    holder.position.set(x, 0, z);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 })
    );
    stem.position.y = 0.28;
    holder.add(stem);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.3 })
    );
    head.position.y = 0.62;
    head.userData.property = property;
    holder.add(head);

    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    holder.add(ring);

    pinGroup.add(holder);
    pins.push({ holder, head, baseY: 0.62, phase: Math.random() * Math.PI * 2, property });
  });

  // --- City markers (with labels) --------------------------------------
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  function createCityLabel(name, x, z) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 80;
    
    ctx.fillStyle = 'rgba(14, 20, 22, 0.8)';
    const radius = 20;
    const w = canvas.width - 20;
    const h = canvas.height - 10;
    ctx.beginPath();
    ctx.moveTo(10 + radius, 5);
    ctx.lineTo(10 + w - radius, 5);
    ctx.quadraticCurveTo(10 + w, 5, 10 + w, 5 + radius);
    ctx.lineTo(10 + w, 5 + h - radius);
    ctx.quadraticCurveTo(10 + w, 5 + h, 10 + w - radius, 5 + h);
    ctx.lineTo(10 + radius, 5 + h);
    ctx.quadraticCurveTo(10, 5 + h, 10, 5 + h - radius);
    ctx.lineTo(10, 5 + radius);
    ctx.quadraticCurveTo(10, 5, 10 + radius, 5);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(111, 184, 179, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f6f1e6';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2 + 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.4, 1);
    sprite.position.set(x, 0.2, z);
    return sprite;
  }

  function createCityPin(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x6fb8b3,
        emissive: 0x2c8f89,
        emissiveIntensity: 0.8,
      })
    );
    dot.position.y = 0.04;
    group.add(dot);
    
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.14, 24),
      new THREE.MeshBasicMaterial({
        color: 0x6fb8b3,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    group.add(ring);
    
    return group;
  }

  cities.forEach((city) => {
    const { x, z } = project(city.lat, city.lng);
    const pin = createCityPin(x, z);
    cityGroup.add(pin);
    const label = createCityLabel(city.name, x, z);
    cityGroup.add(label);
  });

  // --- Interaction: hover tooltip + click to select --------------------
  const tooltip = document.createElement('div');
  tooltip.className = 'map-tooltip';
  mountEl.parentElement.appendChild(tooltip);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hovered = null;

  function pointFromEvent(evt) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
    return rect;
  }

  function onMouseMove(evt) {
    const rect = pointFromEvent(evt);
    raycaster.setFromCamera(mouse, camera);
    const heads = pins.map((p) => p.head);
    const hits = raycaster.intersectObjects(heads);
    if (hits.length) {
      const property = hits[0].object.userData.property;
      hovered = property;
      renderer.domElement.style.cursor = 'pointer';
      tooltip.style.display = 'block';
      tooltip.textContent = `${property.title} · ${formatMoney(property.price)}/${property.priceUnit}`;
      tooltip.style.left = `${evt.clientX - rect.left}px`;
      tooltip.style.top = `${evt.clientY - rect.top}px`;
    } else {
      hovered = null;
      renderer.domElement.style.cursor = 'grab';
      tooltip.style.display = 'none';
    }
  }

  function onClick() {
    if (hovered && typeof onSelect === 'function') onSelect(hovered);
  }

  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

  function onResize() {
    const w = mountEl.clientWidth || 1;
    const h = mountEl.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(mountEl);

  let frameId;
  const clock = new THREE.Clock();
  function animate() {
    frameId = requestAnimationFrame(animate);
    controls.update();
    const t = clock.elapsedTime;
    pins.forEach((p) => {
      p.head.position.y = p.baseY + Math.sin(t * 1.6 + p.phase) * 0.05;
    });
    renderer.render(scene, camera);
  }
  animate();

  return {
    destroy() {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      tooltip.remove();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
}