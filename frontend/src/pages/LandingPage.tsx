import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const railFillRef = useRef<HTMLElement | null>(null);
  const odoRef = useRef<HTMLElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const stopsRef = useRef<(HTMLElement | null)[]>([]);
  const legsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let bike: THREE.Group;
    let bikeParts: any = {};
    let curve: THREE.CatmullRomCurve3;
    let pins: THREE.Group[] = [];
    let dashes: THREE.Mesh[] = [];
    let blob: THREE.Mesh;
    let blobFar: THREE.Mesh;
    let clock: THREE.Clock;
    let narrow = false;
    let reqId: number;

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const damp = (a: number, b: number, l: number, dt: number) => lerp(a, b, 1 - Math.exp(-l * dt));
    const smooth = (e0: number, e1: number, x: number) => {
      const t = clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    };

    function mulberry32(a: number) {
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const C = {
      navy: 0x1a3a52,
      deep: 0x0f2433,
      mint: 0xc8ebe7,
      mintLite: 0xe3f5f2,
      teal: 0x95d4ce,
      slate: 0x57989f,
      slateMid: 0x74b3b6,
      slateSoft: 0xa9dad6,
      pale: 0xc6e6e2,
      gold: 0xf5ba31,
      goldDark: 0xe8a822,
      orange: 0xee822a,
      orangeDark: 0xd96f18,
      white: 0xffffff
    };

    const lam = (c: number, o: any = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
    const flat = (c: number, o: any = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o));
    function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      return m;
    }
    function box(w: number, h: number, d: number, mat: THREE.Material) {
      return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    }
    function rrectShape(w: number, h: number, r: number) {
      const s = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    function limb(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat);
      updateLimb(m, a, b);
      return m;
    }
    function updateLimb(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length() || 0.001;
      m.position.copy(a).addScaledVector(dir, 0.5);
      m.scale.set(1, len, 1);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
    }
    function solveKnee(hx: number, hy: number, px: number, py: number, L1: number, L2: number) {
      const dx = px - hx;
      const dy = py - hy;
      let d = Math.hypot(dx, dy);
      d = clamp(d, Math.abs(L1 - L2) + 0.02, (L1 + L2) * 0.995);
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
      const ux = dx / d;
      const uy = dy / d;
      let ox = -uy;
      let oy = ux;
      if (ox < 0) {
        ox = -ox;
        oy = -oy;
      }
      return { x: hx + ux * a + ox * h, y: hy + uy * a + oy * h };
    }

    const state = { p: 0, dist: 0, wheelSpin: 0, pedal: 0, speed: 0, camX: -13.5, lookX: -15.5, ready: false };
    const BLOB_Z = -34;
    const FAR_Z = -42;
    const TOTAL_KM = 43.0;

    const sectionCenter = [0, 0.25, 0.5, 0.75, 1];
    const SECTION_SPAN = 0.082;
    let STOP_U = [0.25, 0.5, 0.75, 1];

    /* ---------- map texture ---------- */
    const MAP_W = 30;
    const MAP_D = 19;
    const MAP_R = 2.4;
    const MAP_T = 0.62;

    function makeMapTexture() {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 636;
      const g = cv.getContext('2d');
      if (!g) return new THREE.CanvasTexture(cv);
      g.fillStyle = '#bfe3de';
      g.fillRect(0, 0, 1024, 636);
      const rnd = mulberry32(7);
      const cell = 112;
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 10; col++) {
          const w = cell - 34 - rnd() * 22;
          const h = cell - 36 - rnd() * 20;
          const x = col * cell + 24 + rnd() * 10;
          const y = row * cell + 26 + rnd() * 8;
          if (x + w > 1010 || y + h > 624) continue;
          g.fillStyle = rnd() > 0.72 ? '#f2fbf9' : '#e6f5f2';
          const r = 9;
          g.beginPath();
          g.moveTo(x + r, y);
          g.lineTo(x + w - r, y);
          g.quadraticCurveTo(x + w, y, x + w, y + r);
          g.lineTo(x + w, y + h - r);
          g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          g.lineTo(x + r, y + h);
          g.quadraticCurveTo(x, y + h, x, y + h - r);
          g.lineTo(x, y + r);
          g.quadraticCurveTo(x, y, x + r, y);
          g.closePath();
          g.fill();
        }
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    }

    /* ---------- backdrop ---------- */
    function wavyShape(baseAmp: number) {
      const s = new THREE.Shape();
      const X = 72;
      const top = 70;
      s.moveTo(-X, -22);
      for (let x = -X; x <= X; x += 4) {
        const y = -18 + baseAmp * Math.sin(x * 0.085) + baseAmp * 0.5 * Math.sin(x * 0.21 + 1.1);
        s.lineTo(x, y);
      }
      s.lineTo(X, top);
      s.lineTo(-X, top);
      s.closePath();
      return s;
    }

    function buildBackdrop() {
      blobFar = new THREE.Mesh(new THREE.ShapeGeometry(wavyShape(7.5), 12), flat(C.mint));
      blobFar.position.set(0, 0, FAR_Z);
      scene.add(blobFar);
      blob = new THREE.Mesh(new THREE.ShapeGeometry(wavyShape(6), 12), flat(C.teal));
      blob.position.set(0, 0, BLOB_Z);
      scene.add(blob);
    }

    /* ---------- skyline ---------- */
    function buildCity() {
      const rnd = mulberry32(20261001);
      const rows = [
        { z: -11.2, color: C.slate, hMin: 3.4, hMax: 6.2, step: 3.4, windows: true },
        { z: -14.8, color: C.slateMid, hMin: 2.8, hMax: 5.4, step: 3.0, windows: false },
        { z: -18.6, color: C.slateSoft, hMin: 2.2, hMax: 4.4, step: 2.7, windows: false },
        { z: -22.6, color: C.pale, hMin: 1.6, hMax: 3.4, step: 2.4, windows: false }
      ];
      rows.forEach((r, ri) => {
        const mat = lam(r.color);
        for (let x = -46; x < 46; x += r.step) {
          const w = 1.7 + rnd() * 1.7;
          const d = 1.6 + rnd() * 1.4;
          const h = r.hMin + rnd() * (r.hMax - r.hMin) * (ri === 0 ? 1.05 : 0.85);
          const b = box(w, h, d, mat);
          b.position.set(x + w / 2 + rnd() * 0.6, -0.15 + h / 2, r.z + rnd() * 0.8);
          scene.add(b);
          if (r.windows && rnd() > 0.6) {
            const st = box(w * 0.9, 0.14, d * 1.02, lam(C.mintLite));
            st.position.set(b.position.x, b.position.y + h * 0.16, b.position.z);
            scene.add(st);
          }
        }
      });
      const tower = new THREE.Group();
      const tmat = lam(C.slate);
      tower.add(mesh(new THREE.BoxGeometry(3.0, 5.4, 2.6), tmat, 0, 2.7, 0));
      tower.add(mesh(new THREE.BoxGeometry(2.1, 2.2, 2.0), tmat, 0, 6.5, 0));
      tower.add(mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), tmat, 0, 8.35, 0));
      tower.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), tmat, 0, 10.2, 0));
      tower.position.set(-4.5, 0, -17.5);
      scene.add(tower);
    }

    /* ---------- platform ---------- */
    function buildPlatform() {
      const frameGeo = new THREE.ExtrudeGeometry(rrectShape(MAP_W, MAP_D, MAP_R), {
        depth: MAP_T,
        bevelEnabled: false,
        curveSegments: 12
      });
      const frame = mesh(frameGeo, lam(C.navy));
      frame.rotation.x = -Math.PI / 2;
      frame.position.y = -MAP_T;
      scene.add(frame);

      const sw = MAP_W - 1.0;
      const sd = MAP_D - 1.0;
      const scr = new THREE.ShapeGeometry(rrectShape(sw, sd, MAP_R - 0.3), 20);
      const pos = scr.attributes.position;
      const uv = scr.attributes.uv;
      const minX = -sw / 2;
      const minY = -sd / 2;
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) - minX) / sw, (pos.getY(i) - minY) / sd);
      }
      const screen = mesh(scr, new THREE.MeshBasicMaterial({ map: makeMapTexture() }));
      screen.rotation.x = -Math.PI / 2;
      screen.position.y = 0.02;
      scene.add(screen);

      scene.add(mesh(new THREE.BoxGeometry(3.2, 0.16, 0.14), lam(C.deep), 0, MAP_T * 0.5, MAP_D / 2 + 0.02));
      [-4.2, -4.6].forEach((x) => {
        const d = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10), lam(C.deep), x, MAP_T * 0.5, MAP_D / 2 + 0.03);
        d.rotation.x = Math.PI / 2;
        scene.add(d);
      });
    }

    /* ---------- rider + bike ---------- */
    function buildBike() {
      bike = new THREE.Group();
      const navy = lam(C.navy);
      const navyD = lam(C.deep);
      const gold = lam(C.gold);
      const goldD = lam(C.goldDark);
      const orange = lam(C.orange);
      const white = lam(C.white);

      const R = 0.46;
      function wheel() {
        const g = new THREE.Group();
        g.add(mesh(new THREE.TorusGeometry(R - 0.06, 0.07, 8, 26), navyD));
        const hub = mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.12, 14), navyD);
        hub.rotation.x = Math.PI / 2;
        g.add(hub);
        const spokes = new THREE.Group();
        for (let i = 0; i < 5; i++) {
          const s = box(0.06, (R - 0.2) * 2, 0.05, navy);
          s.rotation.z = (i * Math.PI) / 5;
          spokes.add(s);
        }
        g.add(spokes);
        g.userData.spokes = spokes;
        return g;
      }
      const rear = wheel();
      rear.position.set(-0.86, R, 0);
      bike.add(rear);
      const front = wheel();
      front.position.set(0.88, R, 0);
      bike.add(front);
      bikeParts.rearWheel = rear;
      bikeParts.frontWheel = front;

      const body = box(1.5, 0.3, 0.36, gold);
      body.position.set(0, 0.76, 0);
      body.rotation.z = 0.05;
      bike.add(body);
      const fairing = box(0.62, 0.56, 0.34, gold);
      fairing.position.set(0.66, 0.9, 0);
      fairing.rotation.z = -0.3;
      bike.add(fairing);
      const tail = box(0.5, 0.26, 0.32, gold);
      tail.position.set(-0.62, 0.98, 0);
      tail.rotation.z = 0.22;
      bike.add(tail);
      const tank = box(0.62, 0.24, 0.4, goldD);
      tank.position.set(0.1, 0.99, 0);
      tank.rotation.z = -0.06;
      bike.add(tank);
      const seat = box(0.72, 0.13, 0.32, navy);
      seat.position.set(-0.24, 1.07, 0);
      seat.rotation.z = -0.03;
      bike.add(seat);
      const guard = box(0.62, 0.1, 0.32, goldD);
      guard.position.set(0.88, 0.92, 0);
      bike.add(guard);
      const nose = box(0.3, 0.34, 0.26, navyD);
      nose.position.set(0.98, 1.3, 0);
      nose.rotation.z = -0.5;
      bike.add(nose);
      const lamp = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 14), goldD, 1.02, 1.16, 0);
      lamp.rotation.z = Math.PI / 2;
      bike.add(lamp);
      const lampFace = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 14), white, 1.09, 1.16, 0);
      lampFace.rotation.z = Math.PI / 2;
      bike.add(lampFace);

      bike.add(limb(V3(0.88, R, 0.12), V3(1.0, 1.26, 0.12), 0.045, navyD));
      bike.add(limb(V3(0.88, R, -0.12), V3(1.0, 1.26, -0.12), 0.045, navyD));
      const bar = mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.72, 10), navyD, 0.94, 1.34, 0);
      bar.rotation.x = Math.PI / 2;
      bike.add(bar);
      [0.3, -0.3].forEach((z) => {
        const g = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 10), navy, 0.94, 1.34, z);
        g.rotation.x = Math.PI / 2;
        bike.add(g);
      });
      const pipe = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 10), navyD, -0.5, 0.6, 0.2);
      pipe.rotation.z = 0.12;
      bike.add(pipe);

      const torso = mesh(new THREE.CapsuleGeometry(0.235, 0.42, 6, 12), navy, 0.0, 1.55, 0);
      torso.rotation.z = -0.36;
      bike.add(torso);
      const vest = box(0.26, 0.36, 0.44, white);
      vest.position.set(0.2, 1.53, 0);
      vest.rotation.z = -0.36;
      bike.add(vest);
      const pack = mesh(new THREE.CapsuleGeometry(0.25, 0.3, 6, 14), orange, -0.36, 1.74, 0);
      pack.rotation.z = -0.5;
      pack.scale.z = 0.78;
      bike.add(pack);
      const packLid = mesh(new THREE.CapsuleGeometry(0.26, 0.1, 4, 14), lam(C.orangeDark), -0.36, 2.02, 0);
      packLid.rotation.z = -0.5;
      packLid.scale.z = 0.78;
      bike.add(packLid);
      bike.add(limb(V3(-0.04, 1.74, 0.16), V3(0.2, 1.42, -0.05), 0.032, navyD));
      bike.add(limb(V3(-0.04, 1.74, -0.16), V3(0.2, 1.42, 0.05), 0.032, navyD));

      bike.add(mesh(new THREE.SphereGeometry(0.3, 22, 16), gold, 0.34, 1.96, 0));
      const visor = mesh(new THREE.SphereGeometry(0.27, 20, 14), white, 0.47, 1.95, 0);
      visor.scale.set(0.5, 0.72, 0.95);
      bike.add(visor);
      bike.add(limb(V3(0.18, 1.78, 0), V3(0.34, 1.9, 0), 0.1, navy));

      bikeParts.armL = limb(V3(0.1, 1.72, 0.2), V3(0.94, 1.34, 0.28), 0.062, navy);
      bike.add(bikeParts.armL);
      bikeParts.armR = limb(V3(0.1, 1.72, -0.2), V3(0.94, 1.34, -0.28), 0.062, navy);
      bike.add(bikeParts.armR);

      const legsRig: any[] = [];
      [1, -1].forEach((side) => {
        const thigh = mesh(new THREE.CylinderGeometry(0.075, 0.075, 1, 10), navy);
        const shin = mesh(new THREE.CylinderGeometry(0.062, 0.062, 1, 10), navy);
        const foot = box(0.22, 0.09, 0.13, navyD);
        bike.add(thigh, shin, foot);
        legsRig.push({ side, thigh, shin, foot, phase: side > 0 ? 0 : Math.PI });
      });
      bikeParts.legs = legsRig;

      const arcMat = flat(C.white, { transparent: true, opacity: 0.85 });
      const arcGeo = new THREE.TorusGeometry(0.52, 0.022, 3, 18, Math.PI * 0.62);
      const arcR = new THREE.Mesh(arcGeo, arcMat);
      arcR.position.set(-1.02, R, 0);
      arcR.rotation.z = 1.05;
      bike.add(arcR);
      const arcF = new THREE.Mesh(arcGeo, arcMat);
      arcF.position.set(1.04, R, 0);
      arcF.rotation.z = 1.05;
      bike.add(arcF);
      bikeParts.arcs = [arcR, arcF];

      const streaks = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const s = box(0.9 - i * 0.14, 0.045, 0.045, arcMat.clone());
        s.position.set(-1.0 - i * 0.06, 1.5 - i * 0.26, 0.22);
        streaks.add(s);
      }
      bikeParts.streaks = streaks;
      bike.add(streaks);

      const sh = mesh(new THREE.CircleGeometry(1.15, 26), flat(C.navy, { transparent: true, opacity: 0.14 }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.02;
      sh.scale.set(1.5, 0.42, 1);
      bike.add(sh);

      bike.scale.setScalar(1.8);
      scene.add(bike);
    }

    /* ---------- route, pins, landmarks ---------- */
    const DEPOT = V3(-12.8, 0, 4.4);
    const VISITS = [
      { label: 'Priority order', color: C.orange, pos: V3(-6.4, 0, -4.4) },
      { label: 'Feasibility', color: C.goldDark, pos: V3(0.0, 0, 4.4) },
      { label: 'Least travel', color: C.orangeDark, pos: V3(6.4, 0, -4.4) },
      { label: 'Live re-plan', color: C.slate, pos: V3(12.8, 0, 4.4) }
    ];
    const ROUTE = [DEPOT, ...VISITS.map((v) => v.pos)];

    function uOfPoint(target: THREE.Vector3) {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i <= 600; i++) {
        const u = i / 600;
        const d = curve.getPointAt(u).distanceToSquared(target);
        if (d < bd) {
          bd = d;
          best = u;
        }
      }
      return best;
    }
    function makePin(color: number) {
      const g = new THREE.Group();
      const mat = lam(color);
      g.add(mesh(new THREE.SphereGeometry(0.4, 18, 14), mat, 0, 1.05, 0));
      const tip = mesh(new THREE.ConeGeometry(0.4, 0.78, 18), mat, 0, 0.47, 0);
      tip.rotation.z = Math.PI;
      g.add(tip);
      const ring = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 18), lam(C.white), 0, 1.06, 0.34);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      g.add(mesh(new THREE.CircleGeometry(0.155, 18), flat(C.mintLite), 0, 1.06, 0.375));
      const sh = mesh(new THREE.CircleGeometry(0.42, 20), flat(C.navy, { transparent: true, opacity: 0.16 }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.06;
      sh.scale.set(1, 0.42, 1);
      g.add(sh);
      return g;
    }
    function tree(x: number, z: number, s = 1) {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.09 * s, 0.11 * s, 0.5 * s, 8), lam(C.goldDark), 0, 0.25 * s, 0));
      g.add(mesh(new THREE.ConeGeometry(0.42 * s, 0.95 * s, 12), lam(C.teal), 0, 0.95 * s, 0));
      g.add(mesh(new THREE.ConeGeometry(0.32 * s, 0.7 * s, 12), lam(C.slateSoft), 0, 1.32 * s, 0));
      g.position.set(x, 0, z);
      return g;
    }
    function buildDepot() {
      const d = new THREE.Group();
      d.add(mesh(new THREE.BoxGeometry(3.2, 1.6, 2.2), lam(C.navy), 0, 0.8, 0));
      d.add(mesh(new THREE.BoxGeometry(3.5, 0.22, 2.5), lam(C.slate), 0, 1.71, 0));
      for (let i = 0; i < 3; i++) {
        const w = box(0.6, 0.5, 0.06, lam(C.mintLite));
        w.position.set(-0.9 + i * 0.9, 0.95, 1.13);
        d.add(w);
      }
      d.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), lam(C.slate), 1.5, 2.6, -0.7));
      const flag = box(0.7, 0.42, 0.04, lam(C.orange));
      flag.position.set(1.15, 3.16, -0.7);
      d.add(flag);
      const van = box(1.5, 0.62, 0.8, lam(C.white));
      van.position.set(-1.5, 0.62, 1.9);
      d.add(van);
      const cab = box(0.62, 0.52, 0.78, lam(C.slate));
      cab.position.set(-0.42, 0.57, 1.9);
      d.add(cab);
      [
        [-2.05, 2.4],
        [-0.95, 2.4],
        [-2.05, 1.4],
        [-0.95, 1.4]
      ].forEach(([x, z]) => {
        const w = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 12), lam(C.deep), x, 0.18, z);
        w.rotation.x = Math.PI / 2;
        d.add(w);
      });
      d.position.set(DEPOT.x, 0, DEPOT.z - 2.2);
      d.scale.setScalar(0.92);
      scene.add(d);
    }
    function siteRetail() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(2.8, 1.7, 2.0), lam(C.mintLite), 0, 0.85, 0));
      g.add(mesh(new THREE.BoxGeometry(3.0, 0.3, 2.2), lam(C.gold), 0, 1.8, 0));
      const glass = box(1.1, 0.9, 0.06, lam(C.teal));
      glass.position.set(-0.55, 0.95, 1.03);
      g.add(glass);
      const door = box(0.7, 1.2, 0.08, lam(C.navy));
      door.position.set(0.75, 0.6, 1.03);
      g.add(door);
      for (let i = 0; i < 5; i++) {
        const st = box(0.56, 0.1, 0.5, i % 2 ? lam(C.white) : lam(C.orange));
        st.position.set(-1.1 + i * 0.56, 1.6, 1.26);
        g.add(st);
      }
      const sb = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16), lam(C.goldDark), 0.2, 2.14, 0.5);
      sb.rotation.x = Math.PI / 2;
      g.add(sb);
      const cr = box(0.5, 0.4, 0.5, lam(C.slate));
      cr.position.set(1.75, 0.2, 0.95);
      g.add(cr);
      return g;
    }
    function siteWarehouse() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(3.6, 1.4, 2.2), lam(C.slateSoft), 0, 0.7, 0));
      g.add(mesh(new THREE.BoxGeometry(3.8, 0.18, 2.4), lam(C.slate), 0, 1.49, 0));
      for (let i = 0; i < 3; i++) {
        const dr = box(0.82, 0.9, 0.08, i % 2 ? lam(C.mintLite) : lam(C.navy));
        dr.position.set(-1.05 + i * 1.05, 0.5, 1.12);
        g.add(dr);
        for (let k = 0; k < 3; k++) {
          const rib = box(0.82, 0.03, 0.02, lam(C.slate));
          rib.position.set(-1.05 + i * 1.05, 0.28 + k * 0.28, 1.17);
          g.add(rib);
        }
      }
      g.add(mesh(new THREE.BoxGeometry(3.2, 0.16, 0.7), lam(C.mintLite), 0, 0.3, 1.5));
      const p1 = box(0.7, 0.5, 0.6, lam(C.goldDark));
      p1.position.set(2.25, 0.25, 1.05);
      g.add(p1);
      const p2 = box(0.66, 0.46, 0.56, lam(C.gold));
      p2.position.set(2.2, 0.72, 1.05);
      g.add(p2);
      return g;
    }
    function sitePharmacy() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(2.6, 1.5, 2.0), lam(C.mintLite), 0, 0.75, 0));
      g.add(mesh(new THREE.BoxGeometry(2.8, 0.22, 2.2), lam(C.teal), 0, 1.61, 0));
      const ent = box(0.9, 1.1, 0.08, lam(C.teal));
      ent.position.set(-0.45, 0.55, 1.03);
      g.add(ent);
      const win = box(1.0, 0.62, 0.06, lam(C.slateSoft));
      win.position.set(0.7, 0.95, 1.03);
      g.add(win);
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), lam(C.slate), 1.45, 1.9, -0.6));
      const cv1 = box(0.62, 0.2, 0.12, lam(C.teal));
      cv1.position.set(1.45, 2.48, -0.6);
      g.add(cv1);
      const cv2 = box(0.2, 0.62, 0.12, lam(C.teal));
      cv2.position.set(1.45, 2.48, -0.6);
      g.add(cv2);
      return g;
    }
    function siteGarage() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(3.0, 1.3, 2.0), lam(C.slateSoft), 0, 0.65, 0));
      g.add(mesh(new THREE.BoxGeometry(3.2, 0.2, 2.2), lam(C.gold), 0, 1.4, 0));
      const bay = box(1.6, 1.0, 0.08, lam(C.deep));
      bay.position.set(-0.6, 0.5, 1.02);
      g.add(bay);
      const win = box(0.8, 0.6, 0.08, lam(C.mintLite));
      win.position.set(0.85, 0.85, 1.02);
      g.add(win);
      const can = box(1.9, 0.1, 1.1, lam(C.orange));
      can.position.set(-0.6, 1.62, 1.6);
      g.add(can);
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), lam(C.navy), -1.4, 1.32, 2.05));
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), lam(C.navy), 0.2, 1.32, 2.05));
      const cb = box(1.0, 0.34, 0.5, lam(C.gold));
      cb.position.set(-0.6, 0.4, 1.6);
      g.add(cb);
      const cc = box(0.55, 0.26, 0.46, lam(C.navy));
      cc.position.set(-0.45, 0.62, 1.6);
      g.add(cc);
      [
        [-0.95, 1.6],
        [-0.25, 1.6]
      ].forEach(([x, z]) => {
        const w = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), lam(C.deep), x, 0.2, z);
        w.rotation.x = Math.PI / 2;
        g.add(w);
      });
      return g;
    }

    function buildLandmarks() {
      buildDepot();
      const sites = [siteRetail, siteWarehouse, sitePharmacy, siteGarage];
      VISITS.forEach((v, i) => {
        const g = sites[i]();
        g.position.set(v.pos.x, 0, v.pos.z - 1.9);
        g.scale.setScalar(0.92);
        scene.add(g);
      });
      [
        [-10.5, 6.8],
        [-2.6, -6.6],
        [3.6, 6.6],
        [9.6, -6.4],
        [13.6, -1.5]
      ].forEach(([x, z]) => scene.add(tree(x, z, 0.85)));
    }

    function buildRoute() {
      curve = new THREE.CatmullRomCurve3(ROUTE, false, 'catmullrom', 0.5);
      const len = curve.getLength();
      const n = Math.max(26, Math.round(len / 0.95));
      const pts = curve.getSpacedPoints(n);
      const geo = new THREE.BoxGeometry(0.5, 0.05, 0.24);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const tg = curve.getTangentAt(i / n);
        const d = new THREE.Mesh(geo, lam(C.orange));
        d.position.set(p.x, 0.075, p.z);
        d.rotation.y = Math.atan2(-tg.z, tg.x);
        scene.add(d);
        dashes.push(d);
      }
      STOP_U = VISITS.map((v) => uOfPoint(v.pos));
      VISITS.forEach((v, i) => {
        const p = curve.getPointAt(STOP_U[i]);
        const pin = makePin(v.color);
        pin.position.set(p.x, 0, p.z);
        scene.add(pin);
        pins.push(pin);
      });
    }

    function initRenderer() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      narrow = w / h < 0.95;
      camera.aspect = w / h;
      camera.fov = narrow ? 46 : 34;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    function build() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(C.white);
      camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 400);
      camera.position.set(-13.5, 12.6, 23.5);
      clock = new THREE.Clock();

      scene.add(new THREE.AmbientLight(0xffffff, 1.32));
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(9, 16, 12);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xbfe6e0, 0.5);
      fill.position.set(-12, 7, -9);
      scene.add(fill);

      buildBackdrop();
      buildCity();
      buildPlatform();
      buildBike();
      buildRoute();
      buildLandmarks();

      state.ready = true;
      window.addEventListener('resize', onResize);
      onResize();
    }

    let scrollP = 0;
    function readScroll() {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollP = clamp(window.scrollY / max, 0, 1);
    }

    function updateCopy(p: number) {
      stopsRef.current.forEach((el, i) => {
        if (!el) return;
        const c = sectionCenter[i];
        const s = SECTION_SPAN;
        const o = smooth(c - s * 2, c - s * 0.7, p) * (1 - smooth(c + s * 0.42, c + s, p));
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translateY(calc(-50% + ${((1 - o) * 20).toFixed(1)}px))`;
        el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      });

      if (railFillRef.current) {
        railFillRef.current.style.width = (p * 100).toFixed(1) + '%';
      }
      if (odoRef.current) {
        odoRef.current.textContent = (p * TOTAL_KM).toFixed(1);
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = String(clamp(1 - p / 0.05, 0, 1));
      }

      legsRef.current.forEach((el, i) => {
        if (!el) return;
        const u = STOP_U[i];
        if (p >= u - 0.004) {
          el.classList.add('text-[#1a3a52]');
          el.querySelector('b')?.classList.add('bg-[#e8a822]');
        } else {
          el.classList.remove('text-[#1a3a52]');
          el.querySelector('b')?.classList.remove('bg-[#e8a822]');
        }

        if (Math.abs(p - u) < 0.12) {
          el.querySelector('b')?.classList.add('bg-[#ee822a]', 'scale-125');
        } else {
          el.querySelector('b')?.classList.remove('bg-[#ee822a]', 'scale-125');
        }
      });
    }

    function updateBike(p: number, dt: number) {
      const t = clamp(p, 0, 0.9995);
      const pos = curve.getPointAt(t);
      const tg = curve.getTangentAt(t);
      const prev = curve.getPointAt(Math.max(t - 0.004, 0));
      bike.position.set(pos.x, 0, pos.z);
      const heading = Math.atan2(-tg.z, tg.x);
      let dh = heading - bike.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      bike.rotation.y = heading;
      bike.rotation.z = clamp(-dh * 2.4, -0.24, 0.24) * 0.5;

      const travel = pos.distanceTo(prev);
      state.speed = damp(state.speed, travel / Math.max(dt, 0.0001), 5, dt);
      state.dist += travel;
      state.wheelSpin -= travel / 0.44;
      state.pedal -= travel * 2.4;
      bikeParts.rearWheel.rotation.z = state.wheelSpin;
      bikeParts.frontWheel.rotation.z = state.wheelSpin;

      const cx = 0.06;
      const cy = 0.62;
      const cr = 0.26;
      bikeParts.legs.forEach((l: any) => {
        const a = state.pedal + l.phase;
        const px = cx + Math.cos(a) * cr;
        const py = cy + Math.sin(a) * cr;
        const pz = 0.22 * l.side;
        const hx = -0.16;
        const hy = 1.24;
        const hz = 0.17 * l.side;
        const knee = solveKnee(hx, hy, px, py, 0.52, 0.52);
        updateLimb(l.thigh, V3(hx, hy, hz), V3(knee.x, knee.y, pz));
        updateLimb(l.shin, V3(knee.x, knee.y, pz), V3(px, py, pz));
        l.foot.position.set(px + 0.03, py - 0.06, pz);
        l.foot.rotation.z = Math.sin(a) * 0.3;
      });

      const fast = clamp(state.speed / 6, 0, 1);
      bikeParts.arcs.forEach((a: THREE.Mesh) => {
        (a.material as THREE.Material).opacity = 0.22 + fast * 0.66;
        a.rotation.z = 1.05 + Math.sin(state.dist * 3) * 0.12;
      });
      bikeParts.streaks.children.forEach((s: THREE.Mesh, i: number) => {
        const f = (state.dist * 1.6) % 1;
        (s.material as THREE.Material).opacity = fast * 0.7;
        s.position.x = -1.05 - i * 0.1 + f * 0.5;
        s.scale.x = 0.6 + fast * 1.5;
        s.visible = fast > 0.06;
      });
    }

    function updatePins(p: number) {
      pins.forEach((pin, i) => {
        const u = STOP_U[i];
        const near = clamp(1 - Math.abs(p - u) * 7, 0, 1);
        pin.position.y = 0.12 + Math.sin(performance.now() * 0.0016 + i) * 0.07 + near * 0.18;
        pin.scale.setScalar(0.92 + near * 0.26);
      });
    }

    function updateDashes(p: number) {
      const n = Math.max(1, dashes.length - 1);
      dashes.forEach((d, i) => {
        const passed = i / n < p;
        (d.material as THREE.MeshLambertMaterial).color.setHex(passed ? C.gold : C.orange);
        d.scale.setScalar(passed ? 0.86 : 1);
      });
    }

    function updateCamera(dt: number) {
      const leadX = damp(state.camX, bike.position.x - 2.0, 2.2, dt);
      state.camX = leadX;
      state.lookX = damp(state.lookX, bike.position.x - 4.0, 2.2, dt);
      const camY = narrow ? 14.6 : 12.6;
      const camZ = narrow ? 26.5 : 23.5;
      camera.position.set(leadX, camY, camZ);
      camera.lookAt(state.lookX, narrow ? 3.4 : 1.9, 0);
      const bx = leadX;
      blob.position.x = bx;
      blobFar.position.x = bx;
    }

    function loop() {
      reqId = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      readScroll();
      state.p = damp(state.p, scrollP, 4.5, dt);
      if (Math.abs(state.p - scrollP) < 0.0004) state.p = scrollP;
      updateBike(state.p, dt);
      updatePins(state.p);
      updateDashes(state.p);
      updateCamera(dt);
      updateCopy(state.p);
      renderer.render(scene, camera);
    }

    try {
      initRenderer();
      build();
      loop();
    } catch (err) {
      console.warn('WebGL init failed:', err);
    }

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', onResize);
      if (renderer) renderer.dispose();
    };
  }, []);

  const handleGetStarted = () => {
    navigate('/get-started');
  };

  return (
    <div className="relative min-h-screen bg-white text-[#12303f] font-sans antialiased overflow-x-hidden selection:bg-[#ee822a] selection:text-white">
      {/* 3D WebGL Canvas Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Scrim Gradient for Readability */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none max-w-[65%]"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.85) 28%, rgba(255,255,255,0.25) 48%, rgba(255,255,255,0) 65%)'
        }}
      />

      {/* Header with ONLY Brand & Get Started */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 sm:px-12 py-5 bg-white/70 backdrop-blur-md border-b border-[#1a3a52]/10">
        <div className="flex items-center gap-2.5 font-bold tracking-[0.22em] text-sm text-[#1a3a52]">
          <img src="/app-icon.png" alt="RoutePilot" className="w-8 h-8 rounded-xl object-cover shadow-[0_4px_12px_rgba(238,130,42,0.35)] shrink-0" />
          ROUTEPILOT
        </div>

        <button
          onClick={handleGetStarted}
          className="inline-flex items-center gap-2 font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-full bg-[#ee822a] text-white shadow-[0_12px_24px_-10px_rgba(238,130,42,0.85)] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-8px_rgba(238,130,42,0.95)] transition duration-200 cursor-pointer"
        >
          Get Started
        </button>
      </header>

      {/* Scroll-Driven Copy Sections */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        {/* Stop 0: Hero / Daily Overview */}
        <section
          ref={(el) => (stopsRef.current[0] = el)}
          className="absolute left-6 sm:left-14 lg:left-20 top-1/2 -translate-y-1/2 w-[min(480px,88vw)] opacity-0 transition-transform duration-75"
        >
          <div className="flex flex-col items-start gap-3.5 sm:gap-4 pointer-events-auto">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.19em] uppercase text-[#57989f] bg-[#c8ebe7]/80 px-3.5 py-1.5 rounded-full shadow-sm">
              <i className="w-1.5 h-1.5 rounded-full bg-[#ee822a] block" />
              Daily Field-Visit Optimization
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1a3a52] leading-[1.05] tracking-tight">
              Every customer that matters.<br />
              <span className="text-[#ee822a]">Every mile that counts.</span>
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-[#2b4f65]">
              RoutePilot converts customer records and executive priorities into one feasible route for the day — priority-aware ordering, operating constraints respected, and the least unnecessary travel between visits.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                <b>Priority-aware</b> ordering
              </span>
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                <b>Feasible</b> by construction
              </span>
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                <b>Minimum</b> unnecessary travel
              </span>
            </div>
          </div>
        </section>

        {/* Stop 1: Characteristic 01 - Priority Decides the Order */}
        <section
          ref={(el) => (stopsRef.current[1] = el)}
          className="absolute left-6 sm:left-14 lg:left-20 top-1/2 -translate-y-1/2 w-[min(480px,88vw)] opacity-0 transition-transform duration-75"
        >
          <div className="flex flex-col items-start gap-3.5 sm:gap-4 pointer-events-auto">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.19em] uppercase text-[#57989f] bg-[#c8ebe7]/80 px-3.5 py-1.5 rounded-full shadow-sm">
              <i className="w-1.5 h-1.5 rounded-full bg-[#ee822a] block" />
              Characteristic 01 · Priority-Aware
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a3a52] leading-[1.05] tracking-tight">
              Priority decides<br />
              <span className="text-[#ee822a]">the visit order</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#2b4f65]">
              High-value and at-risk accounts are scheduled first, so the route opens where it matters most instead of wherever the map happens to start. Executive input becomes the visit order itself, not a secondary footnote.
            </p>
            <p className="pl-3.5 border-l-4 border-[#f5ba31] italic text-sm sm:text-base text-[#3c6172] my-1">
              “A priority list that cannot be driven is only a wish list.”
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                Executive data → visit order
              </span>
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                High-value accounts first
              </span>
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                Account tiering respected
              </span>
            </div>
          </div>
        </section>

        {/* Stop 2: Characteristic 02 - Feasible Before Optimal */}
        <section
          ref={(el) => (stopsRef.current[2] = el)}
          className="absolute left-6 sm:left-14 lg:left-20 top-1/2 -translate-y-1/2 w-[min(480px,88vw)] opacity-0 transition-transform duration-75"
        >
          <div className="flex flex-col items-start gap-3.5 sm:gap-4 pointer-events-auto">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.19em] uppercase text-[#57989f] bg-[#c8ebe7]/80 px-3.5 py-1.5 rounded-full shadow-sm">
              <i className="w-1.5 h-1.5 rounded-full bg-[#ee822a] block" />
              Characteristic 02 · Feasibility
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a3a52] leading-[1.05] tracking-tight">
              Feasible before<br />
              <span className="text-[#ee822a]">it is optimal</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#2b4f65]">
              Time windows, shift hours, visit duration, break time, and vehicle capacity are enforced on every plan. A route that cannot be completed inside the working day is never presented to the team.
            </p>
            <p className="pl-3.5 border-l-4 border-[#f5ba31] italic text-sm sm:text-base text-[#3c6172] my-1">
              “The shortest route on paper is worthless if the rep cannot finish it.”
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                Strict time windows
              </span>
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                Shift hours & breaks
              </span>
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                Shift capacity limits
              </span>
            </div>
          </div>
        </section>

        {/* Stop 3: Characteristic 03 - Minimum Travel */}
        <section
          ref={(el) => (stopsRef.current[3] = el)}
          className="absolute left-6 sm:left-14 lg:left-20 top-1/2 -translate-y-1/2 w-[min(480px,88vw)] opacity-0 transition-transform duration-75"
        >
          <div className="flex flex-col items-start gap-3.5 sm:gap-4 pointer-events-auto">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.19em] uppercase text-[#57989f] bg-[#c8ebe7]/80 px-3.5 py-1.5 rounded-full shadow-sm">
              <i className="w-1.5 h-1.5 rounded-full bg-[#ee822a] block" />
              Characteristic 03 · Minimum Travel
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a3a52] leading-[1.05] tracking-tight">
              Least unnecessary<br />
              <span className="text-[#ee822a]">transit overhead</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#2b4f65]">
              Visit order is dynamically sequenced with 2-Opt edge swapping to remove backtracking between stops. Every mile eliminated is time returned to customer engagement and recovery.
            </p>
            <p className="pl-3.5 border-l-4 border-[#f5ba31] italic text-sm sm:text-base text-[#3c6172] my-1">
              “Distance saved is a customer visit gained.”
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                Shorter transit legs
              </span>
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                Zero deadhead loops
              </span>
              <span className="text-xs font-semibold text-[#1a3a52] bg-white border border-[#1a3a52]/15 px-3 py-1.5 rounded-full shadow-sm">
                More visits per shift
              </span>
            </div>
          </div>
        </section>

        {/* Stop 4: Characteristic 04 - Live Re-plan & Final CTA */}
        <section
          ref={(el) => (stopsRef.current[4] = el)}
          className="absolute left-6 sm:left-14 lg:left-20 top-1/2 -translate-y-1/2 w-[min(480px,88vw)] opacity-0 transition-transform duration-75"
        >
          <div className="flex flex-col items-start gap-3.5 sm:gap-4 pointer-events-auto">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.19em] uppercase text-[#57989f] bg-[#c8ebe7]/80 px-3.5 py-1.5 rounded-full shadow-sm">
              <i className="w-1.5 h-1.5 rounded-full bg-[#ee822a] block" />
              Characteristic 04 · Adaptive Dispatch
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a3a52] leading-[1.05] tracking-tight">
              Plans that survive<br />
              <span className="text-[#ee822a]">the working day</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#2b4f65]">
              An urgent visit, a customer cancellation, or a delayed appointment: the remainder of the schedule is re-optimized in seconds with hard constraints re-enforced.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm pt-1">
              <div className="p-2.5 rounded-xl bg-white border border-[#1a3a52]/10 shadow-sm">
                <div className="text-base font-bold text-[#1a3a52]">Priority Order</div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#57989f]">High-Value First</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#1a3a52]/10 shadow-sm">
                <div className="text-base font-bold text-[#1a3a52]">Feasible</div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#57989f]">Constraints Enforced</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#1a3a52]/10 shadow-sm">
                <div className="text-base font-bold text-[#1a3a52]">Least Travel</div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#57989f]">No Wasted Detours</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#1a3a52]/10 shadow-sm">
                <div className="text-base font-bold text-[#1a3a52]">Live Re-Plan</div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#57989f]">Adaptive Routing</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 text-sm font-bold px-8 py-4 rounded-full bg-[#ee822a] text-white shadow-[0_18px_32px_-12px_rgba(238,130,42,0.95)] hover:-translate-y-0.5 transition duration-200 cursor-pointer"
              >
                Get Started
              </button>
            </div>
            <p className="text-[11px] text-[#57989f] leading-normal max-w-sm">
              Shift hours, time windows, visit duration, break time and capacity constraints are checked automatically on every plan.
            </p>
          </div>
        </section>
      </div>

      {/* Floating HUD at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none px-6 sm:px-12 pb-6 flex items-end gap-6">
        {/* Progress Rail */}
        <div className="relative flex-1 max-w-lg h-1 rounded-full bg-[#1a3a52]/15 overflow-hidden">
          <i
            ref={railFillRef}
            className="absolute left-0 top-0 bottom-0 w-0 bg-gradient-to-r from-[#f5ba31] to-[#ee822a] rounded-full transition-all duration-75"
          />
        </div>

        {/* Live Odometer */}
        <div className="flex items-baseline gap-1.5 font-bold text-[#1a3a52] text-sm bg-white/90 border border-[#1a3a52]/15 px-4 py-2 rounded-xl shadow-md">
          <span ref={odoRef} className="text-[#ee822a] text-base font-extrabold font-mono">0.0</span>
          <span className="text-xs text-[#57989f] font-normal">/ 43.0 km · sample day</span>
        </div>
      </div>

      {/* Milestone Pins Leg Label Track */}
      <div className="hidden sm:flex fixed bottom-12 left-6 sm:left-12 max-w-lg justify-between z-20 pointer-events-none text-[10px] font-bold text-[#1a3a52]/60 uppercase tracking-wider">
        <div ref={(el) => (legsRef.current[0] = el)} className="flex items-center gap-1.5">
          <b className="w-2 h-2 rounded-full bg-[#1a3a52]/20 inline-block transition-transform duration-200" />
          <span>Priority Order</span>
        </div>
        <div ref={(el) => (legsRef.current[1] = el)} className="flex items-center gap-1.5">
          <b className="w-2 h-2 rounded-full bg-[#1a3a52]/20 inline-block transition-transform duration-200" />
          <span>Feasibility</span>
        </div>
        <div ref={(el) => (legsRef.current[2] = el)} className="flex items-center gap-1.5">
          <b className="w-2 h-2 rounded-full bg-[#1a3a52]/20 inline-block transition-transform duration-200" />
          <span>Least Travel</span>
        </div>
        <div ref={(el) => (legsRef.current[3] = el)} className="flex items-center gap-1.5">
          <b className="w-2 h-2 rounded-full bg-[#1a3a52]/20 inline-block transition-transform duration-200" />
          <span>Live Re-Plan</span>
        </div>
      </div>

      {/* Scroll Hint Mouse Wheel */}
      <div
        ref={hintRef}
        className="fixed bottom-9 right-6 sm:right-12 z-20 pointer-events-none flex items-center gap-2.5 text-[11px] uppercase font-bold tracking-[0.16em] text-[#57989f] transition-opacity duration-300"
      >
        <div className="w-4 h-6 border-2 border-[#57989f] rounded-full relative">
          <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1.5 rounded-full bg-[#ee822a] animate-bounce" />
        </div>
        <span>Scroll to run the day</span>
      </div>

      {/* Spacer to create 520vh scroll length for the 3D scroll physics */}
      <div className="relative z-0 h-[520vh] pointer-events-none" />
    </div>
  );
};
