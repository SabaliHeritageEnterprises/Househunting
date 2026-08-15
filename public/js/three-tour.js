// Virtual tour: an orbit-controlled 3D preview on the property detail page.
// Reuses the massing models from three-card.js at a larger scale, with a
// ground plane, some ambiance (palms for outdoor categories), and full
// drag-to-orbit / scroll-to-zoom controls so it reads as an "immersive
// preview" rather than a static render.

function initTourScene(mountEl, category) {
  if (!mountEl || !window.THREE || !window.OrbitControls) return null;

  const meta = categoryMeta(category);
  const color = new THREE.Color(meta.color);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b262a);
  scene.fog = new THREE.Fog(0x1b262a, 8, 22);

  const camera = new THREE.PerspectiveCamera(45, mountEl.clientWidth / mountEl.clientHeight || 1, 0.1, 60);
  camera.position.set(4.6, 3.1, 5.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
  mountEl.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.7, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.2;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;
  controls.update();

  scene.add(new THREE.AmbientLight(0xfff2df, 0.7));
  const sun = new THREE.DirectionalLight(0xfff6e0, 1.1);
  sun.position.set(6, 8, 4);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x8fc1de, 0x3a2f22, 0.4));

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9, 40),
    new THREE.MeshStandardMaterial({ color: 0xd8c79c, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const buildShape = CARD3D_SHAPES[category] || CARD3D_SHAPES.villa;
  const model = buildShape(color);
  model.scale.setScalar(1.6);
  scene.add(model);

  const outdoorCategories = ['villa', 'beach_apartment', 'holiday_home', 'guesthouse'];
  if (outdoorCategories.includes(category) && typeof buildPalm === 'function') {
    [[-3.4, 0, 2.2, 1], [3, 0, -1.8, 0.8], [-2.4, 0, -2.6, 0.9]].forEach(([x, y, z, s]) => {
      const palm = buildPalm(s);
      palm.position.set(x, y, z);
      scene.add(palm);
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

  let frameId;
  function animate() {
    frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return {
    destroy() {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
}
