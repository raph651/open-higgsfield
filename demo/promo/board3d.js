// three.js scene for one OpenFrame board: the captured UI layers (background, nodes, panel, add menu, chrome)
// as planes at different depths, 3D edges between the node ports, clips on canvas textures, halos.
// World units are css px of the 1440x900 board capture: x right, y up (page y flipped), z toward the camera.
import * as THREE from './vendor/three.module.js';

const FOV = 28;
const D0 = 360 / Math.tan((FOV / 2) * Math.PI / 180);   // distance at which 1 world unit = 1 stage px (stage is 1280x720)
const DSF = 3;
const Z = { bg: -90, node: [30, 30, 30, 110, 60], panel: 240, menu: 240 };
const loader = new THREE.TextureLoader();
const load = (url) => new Promise((res, rej) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; res(t); }, undefined, rej));
const clipOf = (r, m) => { const x0 = Math.max(0, r.x - m), y0 = Math.max(0, r.y - m), x1 = Math.min(1440, r.x + r.w + m), y1 = Math.min(900, r.y + r.h + m); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
const wx = (px) => px - 720, wy = (py) => -(py - 450);

export const renderer = (() => {
  const canvas = document.getElementById('gl');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  r.setPixelRatio(1.5); r.setSize(1280, 720, false); r.setClearColor(0x070a0f, 1);
  r.sortObjects = true;
  return r;
})();

function haloTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.shadowColor = 'rgba(215,255,63,.9)'; g.shadowBlur = 36; g.strokeStyle = '#d7ff3f'; g.lineWidth = 10;
  const r = 70; g.beginPath(); g.roundRect(46, 46, 420, 420, r); g.stroke();
  g.shadowBlur = 0; g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function createBoard(slug, layers, clips = {}) {
  const L = layers[slug], base = `layers/${slug}/`;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1280 / 720, 10, 8000);
  scene.add(camera);
  const tex = {};
  await Promise.all(['bg', 'chrome', 'node-sel', 'panel', 'menu', ...L.nodes.map((_, i) => `node-${i}`)].map(async (n) => { tex[n] = await load(`${base}${n}.png`); }));
  const halo = haloTexture();
  const mat = (map, extra = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, ...extra });
  const plane = (w, h, material, z, order) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.position.z = z; m.renderOrder = order; scene.add(m); return m; };
  const place = (mesh, r) => { mesh.position.x = wx(r.x + r.w / 2); mesh.position.y = wy(r.y + r.h / 2); };

  // background: a big flat field and the captured grid on top
  const field = plane(5200, 3400, new THREE.MeshBasicMaterial({ color: 0x090d12, depthTest: false, toneMapped: false }), Z.bg - 5, 0);
  const bg = plane(1440 * 1.55, 900 * 1.55, mat(tex.bg), Z.bg, 1);

  // nodes
  const nodes = L.nodes.map((n, i) => {
    const c = clipOf(n.rect, L.margin);
    const m = plane(c.w, c.h, mat(tex[`node-${i}`]), Z.node[i], 3); place(m, c);
    const h = plane(c.w + 36, c.h + 36, mat(halo, { opacity: 0 }), Z.node[i] + 2, 6); place(h, c);
    return { ...n, mesh: m, halo: h, z: Z.node[i] };
  });
  const si = L.selected.index, sc = clipOf(L.selected.rect, L.selected.clipMargin);
  const selMesh = plane(sc.w, sc.h, mat(tex['node-sel'], { opacity: 0 }), Z.node[si], 3); place(selMesh, sc);
  const selHalo = plane(L.selected.rect.w + 36, L.selected.rect.h + 36, mat(halo, { opacity: 0 }), Z.node[si] + 2, 6); place(selHalo, L.selected.rect);

  // clips on canvas textures over the media rectangles
  const overlays = {};
  for (const [name, { canvas, nodeIndex, rect }] of Object.entries(clips)) {
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    const m = plane(rect.w, rect.h, mat(t, { opacity: 0 }), Z.node[nodeIndex] + 1.5, 4); place(m, rect);
    overlays[name] = { mesh: m, texture: t };
  }

  // panel and add menu
  const pc = clipOf(L.panel, L.panel.clipMargin);
  const panel = plane(pc.w, pc.h, mat(tex.panel, { opacity: 0 }), Z.panel, 7); place(panel, pc);
  const mc = clipOf(L.menu, L.menu.clipMargin);
  const menu = plane(mc.w, mc.h, mat(tex.menu, { opacity: 0 }), Z.menu, 7); place(menu, mc);

  // chrome as a HUD child of the camera: top bar, dock, zoom, credits; it fades when the camera leaves the flat view
  const hud = new THREE.Mesh(new THREE.PlaneGeometry(1152, 720), mat(tex.chrome, { opacity: 1 }));
  hud.position.z = -D0; hud.renderOrder = 10; camera.add(hud);

  // edges: 3D beziers between ports, rebuilt each frame so they follow the selected (taller) node
  const edgeDefs = L.nodes.map((_, i) => i).filter((i) => i !== si && i !== L.nodes.length - 1).map((i) => [i, si]).concat([[si, L.nodes.length - 1]]);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x7c96ff, transparent: true, opacity: 0.85, depthTest: false, toneMapped: false });
  const edges = edgeDefs.map(([a, b]) => {
    const tube = new THREE.Mesh(new THREE.BufferGeometry(), edgeMat); tube.renderOrder = 2; scene.add(tube);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(6, 13, 12), edgeMat); cone.renderOrder = 2; scene.add(cone);
    return { a, b, tube, cone };
  });
  const port = (i, side, selected) => {
    const r = (selected && i === si) ? L.selected.rect : nodes[i].rect;
    return new THREE.Vector3(wx(side === 'out' ? r.x + r.w : r.x), wy(r.y + r.h / 2), nodes[i].z);
  };
  function updateEdges(selected) {
    for (const e of edges) {
      const p0 = port(e.a, 'out', selected), p1 = port(e.b, 'in', selected), off = Math.max(40, (p1.x - p0.x) * 0.5);
      const curve = new THREE.CubicBezierCurve3(p0, p0.clone().add(new THREE.Vector3(off, 0, 0)), p1.clone().add(new THREE.Vector3(-off, 0, 0)), p1);
      e.tube.geometry.dispose(); e.tube.geometry = new THREE.TubeGeometry(curve, 72, 1.5, 6, false);
      e.cone.position.copy(p1).add(new THREE.Vector3(-3, 0, 0));
      const tan = curve.getTangent(1).normalize(); e.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    }
  }

  // ---- per-frame state ----
  // s: { cam: {cx, cy, s, yaw, pitch, fx, fy}, selected: 0..1, panel: 0..1, menu: 0..1, chrome: 0..1, halos: {nodeIndex: 0..1}, overlays: {name: 0..1} }
  function update(s) {
    const c = s.cam, yaw = (c.yaw * Math.PI) / 180, pitch = (c.pitch * Math.PI) / 180, d = D0 / c.s;
    const target = new THREE.Vector3(wx(c.cx), wy(c.cy), 60);
    // shift the look point so the target lands at stage (fx, fy)
    const dx = (c.fx ?? 640) - 640, dy = (c.fy ?? 360) - 360;
    const look = target.clone().add(new THREE.Vector3(-dx / c.s, dy / c.s, 0));
    camera.position.set(look.x + d * Math.sin(yaw) * Math.cos(pitch), look.y + d * Math.sin(pitch), look.z + d * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(look);
    camera.updateMatrixWorld();

    const sel = s.selected;
    nodes[si].mesh.material.opacity = sel < 0.5 ? 1 : 0;
    selMesh.material.opacity = sel < 0.5 ? 0 : 1;
    panel.material.opacity = s.panel; panel.position.x = wx(pc.x + pc.w / 2) + (1 - s.panel) * 90; panel.position.z = Z.panel - (1 - s.panel) * 60;
    menu.material.opacity = s.menu; menu.position.z = Z.menu - (1 - s.menu) * 60;
    hud.material.opacity = s.chrome;
    nodes.forEach((n, i) => { n.halo.material.opacity = i === si && sel >= 0.5 ? 0 : (s.halos[i] || 0); });
    selHalo.material.opacity = sel >= 0.5 ? (s.halos[si] || 0) : 0;
    for (const [name, o] of Object.entries(overlays)) o.mesh.material.opacity = s.overlays[name] || 0;
    updateEdges(sel >= 0.5);
    renderer.render(scene, camera);
  }
  // project a board point (page px) at a given depth to stage pixels
  function project(px, py, z = 60) {
    const v = new THREE.Vector3(wx(px), wy(py), z).project(camera);
    return { x: (v.x + 1) / 2 * 1280, y: (1 - v.y) / 2 * 720 };
  }
  return { update, project, overlays, nodes, selectedIndex: si };
}
