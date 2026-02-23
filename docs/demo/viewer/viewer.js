import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ── i18n ─────────────────────────────────────────────────────────────────────
const LANG_KEY = 'preferred-language';
const DEFAULT_LANG = 'zh-CN';
const SUPPORTED_LANGS = {
  'zh-CN': '中文', 'en': 'English', 'ja': '日本語', 'fr': 'Français', 'de': 'Deutsch'
};

let translations = {};
let currentLang = DEFAULT_LANG;

function getNestedValue(obj, path) {
  return path.split('.').reduce((cur, k) => (cur && cur[k] !== undefined ? cur[k] : null), obj);
}

function t(key) {
  return getNestedValue(translations, key) ?? key;
}

async function loadTranslations(lang) {
  try {
    const res = await fetch(`../locales/${lang}.json`);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    if (lang !== DEFAULT_LANG) return loadTranslations(DEFAULT_LANG);
    return {};
  }
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.getAttribute('data-i18n'));
    if (val) el.textContent = val;
  });
  document.documentElement.lang = currentLang;
  document.title = t('viewer.pageTitle');

  // Rebuild select options with translated labels
  rebuildPartSelect();

  // Update active state in lang dropdown
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.lang === currentLang);
  });
  const label = document.getElementById('current-lang-label');
  if (label) label.textContent = SUPPORTED_LANGS[currentLang] ?? currentLang;
}

async function setLanguage(lang) {
  if (!SUPPORTED_LANGS[lang]) return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  translations = await loadTranslations(lang);

  // Update URL param without reload
  const url = new URL(window.location);
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url);

  applyTranslations();

  // Re-render current part info with new language
  const idx = Number(partSelect.value) || 0;
  updateInfo(idx);
}

function getPreferredLang() {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (SUPPORTED_LANGS[urlLang]) return urlLang;
  const saved = localStorage.getItem(LANG_KEY);
  if (SUPPORTED_LANGS[saved]) return saved;
  const browser = navigator.language || '';
  if (SUPPORTED_LANGS[browser]) return browser;
  const prefix = browser.split('-')[0];
  return Object.keys(SUPPORTED_LANGS).find(l => l === prefix || l.startsWith(prefix + '-')) ?? DEFAULT_LANG;
}

// ── Part catalogue (IDs only; labels/info come from locale) ──────────────────
const PART_IDS = ['cnc-shaft', 'stamping', 'turning', 'bracket'];

function getPartFile(id) {
  return `../models/part-${id}.glb`;
}

// ── DOM refs ─────────────────────────────────────────────────────────────────
const canvas       = document.getElementById('viewer-canvas');
const loadingEl    = document.getElementById('loading-overlay');
const progressBar  = document.getElementById('progress-bar');
const loadingText  = document.getElementById('loading-text');
const partSelect   = document.getElementById('part-select');
const toggleRotate = document.getElementById('toggle-autorotate');
const toggleWire   = document.getElementById('toggle-wireframe');
const resetBtn     = document.getElementById('reset-btn');
const themeToggle  = document.getElementById('theme-toggle');
const iconSun      = document.getElementById('icon-sun');
const iconMoon     = document.getElementById('icon-moon');
const langSelector = document.getElementById('lang-selector');
const langBtn      = document.getElementById('lang-btn');
const langDropdown = document.getElementById('lang-dropdown');

// ── Three.js setup ────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
camera.position.set(0, 1.5, 4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 0.5;
controls.maxDistance = 20;

// ── Lighting ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8ecae6, 0.6);
fillLight.position.set(-5, 2, -3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
rimLight.position.set(0, -3, -5);
scene.add(rimLight);

// ── Grid ──────────────────────────────────────────────────────────────────────
const grid = new THREE.GridHelper(6, 12, 0x334155, 0x1e293b);
grid.material.opacity = 0.4;
grid.material.transparent = true;
scene.add(grid);

// ── Loaders ───────────────────────────────────────────────────────────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/libs/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// ── State ─────────────────────────────────────────────────────────────────────
let currentModel = null;
let wireframeMode = false;

// ── Part select ───────────────────────────────────────────────────────────────
function rebuildPartSelect() {
  const prev = partSelect.value;
  partSelect.innerHTML = '';
  PART_IDS.forEach((id, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = t(`viewer.parts.${id}.label`);
    partSelect.appendChild(opt);
  });
  // Restore selection
  if (prev !== '') partSelect.value = prev;
}

// ── Load model ────────────────────────────────────────────────────────────────
function loadPart(index) {
  const id = PART_IDS[index];

  loadingEl.classList.remove('hidden');
  progressBar.style.width = '0%';
  loadingText.textContent = t('viewer.loading');

  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        [obj.material].flat().forEach(m => m.dispose());
      }
    });
    currentModel = null;
  }

  gltfLoader.load(
    getPartFile(id),
    (gltf) => {
      const model = gltf.scene;
      fitModel(model);
      applyWireframe(model, wireframeMode);
      model.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
      scene.add(model);
      currentModel = model;
      resetCamera();
      updateInfo(index);
      progressBar.style.width = '100%';
      setTimeout(() => loadingEl.classList.add('hidden'), 300);
    },
    (xhr) => {
      if (xhr.total) progressBar.style.width = `${(xhr.loaded / xhr.total) * 100}%`;
    },
    (err) => {
      console.warn('GLB load failed, using placeholder:', err);
      loadPlaceholder(index);
    }
  );
}

function fitModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 2 / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
  const box2 = new THREE.Box3().setFromObject(model);
  model.position.y -= box2.min.y;
}

function loadPlaceholder(index) {
  if (currentModel) { scene.remove(currentModel); currentModel = null; }

  const geos = [
    () => new THREE.CylinderGeometry(0.15, 0.15, 2, 32),
    () => new THREE.BoxGeometry(1.6, 0.12, 1),
    () => new THREE.CylinderGeometry(0.4, 0.3, 0.8, 32),
    () => new THREE.BoxGeometry(1.2, 0.8, 0.15),
  ];
  const geo = (geos[index] ?? geos[0])();
  const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3, wireframe: wireframeMode });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const box = new THREE.Box3().setFromObject(mesh);
  mesh.position.y -= box.min.y;

  const group = new THREE.Group();
  group.add(mesh);
  scene.add(group);
  currentModel = group;

  resetCamera();
  updateInfo(index);
  progressBar.style.width = '100%';
  loadingText.textContent = t('viewer.placeholder');
  setTimeout(() => loadingEl.classList.add('hidden'), 400);
}

function resetCamera() {
  controls.reset();
  camera.position.set(0, 1.5, 4);
  controls.target.set(0, 0.5, 0);
  controls.update();
}

// ── Wireframe ─────────────────────────────────────────────────────────────────
function applyWireframe(obj, enabled) {
  obj.traverse(child => {
    if (child.isMesh) [child.material].flat().forEach(m => { m.wireframe = enabled; });
  });
}

// ── Info panel ────────────────────────────────────────────────────────────────
function updateInfo(index) {
  const id = PART_IDS[index];
  document.getElementById('info-name').textContent      = t(`viewer.parts.${id}.name`);
  document.getElementById('info-material').textContent  = t(`viewer.parts.${id}.material`);
  document.getElementById('info-process').textContent   = t(`viewer.parts.${id}.process`);
  document.getElementById('info-tolerance').textContent = t(`viewer.parts.${id}.tolerance`);
}

// ── Resize ────────────────────────────────────────────────────────────────────
function onResize() {
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// ── Render loop ───────────────────────────────────────────────────────────────
(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  scene.background = new THREE.Color(dark ? 0x030712 : 0xf8fafc);
  iconSun.style.display  = dark ? 'none' : '';
  iconMoon.style.display = dark ? '' : 'none';
  localStorage.setItem('viewer-theme', dark ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem('viewer-theme') ??
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme === 'dark');

themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
});

// ── Language selector ─────────────────────────────────────────────────────────
langBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  langSelector.classList.toggle('open');
});

langDropdown.querySelectorAll('.lang-option').forEach(opt => {
  opt.addEventListener('click', (e) => {
    e.stopPropagation();
    setLanguage(opt.dataset.lang);
    langSelector.classList.remove('open');
  });
});

document.addEventListener('click', () => langSelector.classList.remove('open'));

// ── Part / display controls ───────────────────────────────────────────────────
partSelect.addEventListener('change', () => loadPart(Number(partSelect.value)));

toggleRotate.addEventListener('change', () => {
  controls.autoRotate = toggleRotate.checked;
  controls.autoRotateSpeed = 1.5;
});

toggleWire.addEventListener('change', () => {
  wireframeMode = toggleWire.checked;
  if (currentModel) applyWireframe(currentModel, wireframeMode);
});

resetBtn.addEventListener('click', () => {
  resetCamera();
  toggleRotate.checked = false;
  controls.autoRotate = false;
});

// ── Init ──────────────────────────────────────────────────────────────────────
currentLang = getPreferredLang();
translations = await loadTranslations(currentLang);
applyTranslations();
loadPart(0);
