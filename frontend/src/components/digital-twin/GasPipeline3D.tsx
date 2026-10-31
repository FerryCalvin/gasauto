import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGas } from '../../context/GasContext';
import { RotateCcw } from 'lucide-react';
import { formatVolume } from '../../utils/formatters';

/**
 * Tekstur mikro-filamen partikel gas bercahaya halus (Dieter Rams / Apple Studio)
 * Menghasilkan titik cahaya lembut tanpa artefak neon yang menusuk mata.
 */
function createMicroFilamentTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(240, 249, 255, 1.0)');   // Inti putih halus
  gradient.addColorStop(0.35, 'rgba(147, 197, 253, 0.85)'); // Pendaran biru es lembut
  gradient.addColorStop(0.7, 'rgba(96, 165, 250, 0.20)');  // Gradasi luar tipis
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');            // Transparan

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Tekstur korona api biru laminar autentik (Circumferential Flame Corona)
 * Membentuk deretan 24 jetlet api biru autentik mengelilingi perimeter burner.
 */
function createFlameCoronaTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);

  const numFlamelets = 24;
  const flameletWidth = 512 / numFlamelets;

  for (let i = 0; i < numFlamelets; i++) {
    const cx = i * flameletWidth + flameletWidth / 2;
    const grad = ctx.createLinearGradient(cx, 128, cx, 10);
    grad.addColorStop(0, 'rgba(30, 27, 75, 0.95)');       // Pangkalan indigo pekat di lubang nosel
    grad.addColorStop(0.25, 'rgba(2, 132, 199, 0.95)');   // Inti biru azure bercahaya
    grad.addColorStop(0.65, 'rgba(56, 189, 248, 0.80)');   // Pendaran biru langit
    grad.addColorStop(1, 'rgba(186, 230, 253, 0)');        // Ujung pudar transparan

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - flameletWidth * 0.45, 128);
    ctx.quadraticCurveTo(cx - flameletWidth * 0.2, 50, cx, 12);
    ctx.quadraticCurveTo(cx + flameletWidth * 0.2, 50, cx + flameletWidth * 0.45, 128);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Tekstur layar OLED monokrom terbalik (Teenage Engineering / Dieter Rams)
 * Latar belakang hitam pekat dengan tipografi tabular presisi.
 */
function createMeterOledTexture(volumeStr: string, statusStr: string, flowRateStr: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Latar OLED Hitam Monokrom Pekat
  ctx.fillStyle = '#090a0f';
  ctx.fillRect(0, 0, 512, 256);

  // Border mikro presisi 1px
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 244);

  // Strip Header
  ctx.fillStyle = '#14151c';
  ctx.fillRect(8, 8, 496, 46);

  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('GASAUTO // SMART METER G1.6', 24, 38);

  // Status Badge di pojok kanan
  ctx.font = '600 16px "JetBrains Mono", monospace';
  if (statusStr === 'NORMAL' || statusStr === 'OPEN') {
    ctx.fillStyle = '#10b981';
    ctx.fillText('● AKTIF', 400, 38);
  } else if (statusStr === 'CLOSING') {
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('▲ TUTUP', 400, 38);
  } else {
    ctx.fillStyle = '#ef4444';
    ctx.fillText('■ CUTOFF', 390, 38);
  }

  // Label Metrik
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('SISA SALDO GAS (KUOTA)', 24, 88);

  // Readout Volume Utama (Tipografi Tabular Bersih)
  ctx.font = '700 64px "JetBrains Mono", monospace';
  ctx.fillStyle = '#f4f4f5';
  ctx.fillText(volumeStr, 24, 158);

  // Satuan
  ctx.font = '500 24px "JetBrains Mono", monospace';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('m³', 440, 154);

  // Garis Pembatas Bawah
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 186);
  ctx.lineTo(488, 186);
  ctx.stroke();

  // Telemetri Bawah
  ctx.font = '500 17px "JetBrains Mono", monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText(`LAJU: ${flowRateStr} LPM`, 24, 224);

  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('BAT: 98%  |  RSSI: -68 dBm', 220, 224);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const GasPipeline3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const { meter, appliances } = useGas();

  const valveStatus = meter?.valveStatus || 'CLOSED';
  const targetAngleDeg = meter?.valveAngleDeg ?? 0;
  const flowRateLpm = meter?.currentFlowRateLpm || 0;
  const remainingM3 = meter?.remainingQuotaM3 ?? 0;

  // Sinkronisasi state React dengan Three.js animation loop
  const stateRef = useRef({
    valveAngleDeg: targetAngleDeg,
    flowRateLpm: flowRateLpm,
    valveStatus: valveStatus,
    remainingM3: remainingM3,
    appliances: appliances
  });

  useEffect(() => {
    stateRef.current.valveAngleDeg = targetAngleDeg;
    stateRef.current.flowRateLpm = flowRateLpm;
    stateRef.current.valveStatus = valveStatus;
    stateRef.current.remainingM3 = remainingM3;
    stateRef.current.appliances = appliances;
  }, [targetAngleDeg, flowRateLpm, valveStatus, remainingM3, appliances]);

  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ==========================================
    // 1. SCENE, CAMERA, RENDERER & ACES TONE MAPPING
    // ==========================================
    const scene = new THREE.Scene();
    const width = container.clientWidth || 800;
    const height = 440;

    // Kamera Axonometric Isometrik 30°
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(3.6, 2.8, 4.2);
    const lookAtPoint = new THREE.Vector3(0, 0.25, 0);
    camera.lookAt(lookAtPoint);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Orbit Controls dengan pembatasan sudut rotasi yang tenang
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = Math.PI / 4;       // 45°
    controls.maxPolarAngle = Math.PI / 2.3;     // ~78°
    controls.minAzimuthAngle = -Math.PI / 4;    // -45°
    controls.maxAzimuthAngle = Math.PI / 4;     // +45°
    controls.minDistance = 3.5;
    controls.maxDistance = 8.5;
    controls.target.copy(lookAtPoint);
    controls.saveState();
    controlsRef.current = controls;

    // ==========================================
    // 2. STUDIO 3-POINT BALANCED LIGHTING (~2.0 INTENSITY)
    // ==========================================
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.35); // Soft neutral fill
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbf0, 1.25); // Neutral-warm key light
    keyLight.position.set(3.5, 5.5, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.40); // Neutral cool fill
    fillLight.position.set(-3.5, 3.5, -2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.25); // Edge kicker
    rimLight.position.set(0, 2.5, -4.0);
    scene.add(rimLight);

    // ==========================================
    // 3. INDUSTRIAL MINIMALISM MATERIAL PALETTE
    // ==========================================
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x141518,
      roughness: 0.88,
      metalness: 0.12
    });

    const satinSteelMat = new THREE.MeshStandardMaterial({
      color: 0x333842,
      roughness: 0.48,
      metalness: 0.82
    });

    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x242730,
      roughness: 0.60,
      metalness: 0.80
    });

    const quartzCellMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transmission: 0.92,
      transparent: true,
      opacity: 0.35,
      roughness: 0.08,
      metalness: 0.05,
      ior: 1.46,
      depthWrite: false
    });

    const meterCasingMat = new THREE.MeshStandardMaterial({
      color: 0x1f2229,
      roughness: 0.75,
      metalness: 0.25
    });

    const meterBezelMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      roughness: 0.85,
      metalness: 0.15
    });

    const valveZincMat = new THREE.MeshStandardMaterial({
      color: 0x262930,
      roughness: 0.65,
      metalness: 0.25
    });

    const valveBrassMat = new THREE.MeshStandardMaterial({
      color: 0x856628,
      roughness: 0.40,
      metalness: 0.75
    });

    const valveDialMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e24,
      roughness: 0.55,
      metalness: 0.30
    });

    const valveSlotMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.30,
      metalness: 0.10
    });

    const cooktopMat = new THREE.MeshStandardMaterial({
      color: 0x16181e,
      roughness: 0.35,
      metalness: 0.35
    });

    const trivetMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1f,
      roughness: 0.92,
      metalness: 0.08
    });

    const burnerCrownMat = new THREE.MeshStandardMaterial({
      color: 0x785a20,
      roughness: 0.45,
      metalness: 0.70
    });

    // ==========================================
    // 4. DIORAMA STRUCTURE & BASE PLINTH
    // ==========================================
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Landasan Plinth Dark Graphite Berundak (Tanpa Garis Cyan)
    const plinthBaseGeo = new THREE.BoxGeometry(5.8, 0.18, 2.4);
    const plinthBase = new THREE.Mesh(plinthBaseGeo, plinthMat);
    plinthBase.position.set(0, -0.09, 0);
    plinthBase.receiveShadow = true;
    mainGroup.add(plinthBase);

    // Undakan Atas Chamfer Presisi
    const plinthTopGeo = new THREE.BoxGeometry(5.72, 0.02, 2.32);
    const plinthTop = new THREE.Mesh(plinthTopGeo, plinthMat);
    plinthTop.position.set(0, 0.01, 0);
    plinthTop.receiveShadow = true;
    mainGroup.add(plinthTop);

    // Kaki Peredam Plinth (4 Sudut)
    const footMat = new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.9 });
    const createFoot = (x: number, z: number) => {
      const fGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16);
      const foot = new THREE.Mesh(fGeo, footMat);
      foot.position.set(x, -0.20, z);
      mainGroup.add(foot);
    };
    createFoot(-2.6, -0.95);
    createFoot(2.6, -0.95);
    createFoot(-2.6, 0.95);
    createFoot(2.6, 0.95);

    // Soft Contact Shadow Plane di Lantai
    const shadowPlaneGeo = new THREE.PlaneGeometry(7.0, 3.6);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -0.22, 0);
    shadowPlane.receiveShadow = true;
    mainGroup.add(shadowPlane);

    // ==========================================
    // 5. SMART GAS METER (WALL-MOUNTED ANODIZED ENCLOSURE)
    // ==========================================
    const meterGroup = new THREE.Group();
    meterGroup.position.set(-2.1, 0.72, -0.05);
    mainGroup.add(meterGroup);

    // Rel Penyangga Belakang (Rear Mounting Rail / DIN Bracket)
    const rearRailGeo = new THREE.BoxGeometry(0.12, 1.15, 0.08);
    const rearRail = new THREE.Mesh(rearRailGeo, plinthMat);
    rearRail.position.set(0, -0.15, -0.21);
    meterGroup.add(rearRail);

    // Bodi Kotak Meteran (Crisp Beveled Geometry)
    const meterBoxGeo = new THREE.BoxGeometry(0.82, 0.98, 0.34);
    const meterBox = new THREE.Mesh(meterBoxGeo, meterCasingMat);
    meterBox.castShadow = true;
    meterBox.receiveShadow = true;
    meterGroup.add(meterBox);

    // Bezel Depan Layar
    const bezelGeo = new THREE.BoxGeometry(0.74, 0.90, 0.03);
    const bezelMesh = new THREE.Mesh(bezelGeo, meterBezelMat);
    bezelMesh.position.set(0, 0, 0.175);
    meterGroup.add(bezelMesh);

    // Layar OLED Monokrom Terbalik
    const oledGeo = new THREE.PlaneGeometry(0.56, 0.30);
    let oledTexture = createMeterOledTexture(
      remainingM3.toFixed(4),
      valveStatus === 'OPEN' ? 'NORMAL' : 'CUTOFF',
      flowRateLpm.toFixed(2)
    );
    const oledMat = new THREE.MeshBasicMaterial({ map: oledTexture });
    const oledMesh = new THREE.Mesh(oledGeo, oledMat);
    oledMesh.position.set(0, 0.12, 0.192);
    meterGroup.add(oledMesh);

    // Micro-LED Flush Indikator Status
    const ledGeo = new THREE.SphereGeometry(0.018, 16, 16);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.28, 0.36, 0.192);
    meterGroup.add(ledMesh);

    // Plat Spesifikasi Teknis Cetak Laser Bawah
    const techPlateGeo = new THREE.BoxGeometry(0.48, 0.14, 0.01);
    const techPlateMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.9 });
    const techPlate = new THREE.Mesh(techPlateGeo, techPlateMat);
    techPlate.position.set(0, -0.24, 0.185);
    meterGroup.add(techPlate);

    // Kopling Pipa Keluar Meteran
    const meterCouplingGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.14, 24);
    meterCouplingGeo.rotateZ(Math.PI / 2);
    const meterCoupling = new THREE.Mesh(meterCouplingGeo, collarMat);
    meterCoupling.position.set(0.26, -0.30, 0.05);
    meterGroup.add(meterCoupling);

    // ==========================================
    // 6. MOTORIZED VALVE CWX-15Q (MATTE ZINC & FLUSH DIAL)
    // ==========================================
    const valveGroup = new THREE.Group();
    valveGroup.position.set(-0.70, 0.42, 0);
    mainGroup.add(valveGroup);

    // Rumah Katup Kuningan Industri (Brass Valve Body)
    const valveBodyGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.24, 24);
    valveBodyGeo.rotateZ(Math.PI / 2);
    const valveBody = new THREE.Mesh(valveBodyGeo, valveBrassMat);
    valveBody.castShadow = true;
    valveGroup.add(valveBody);

    // Casing Aktuator Matte Zinc (Die-Cast Enclosure)
    const actuatorGeo = new THREE.BoxGeometry(0.24, 0.26, 0.24);
    const actuator = new THREE.Mesh(actuatorGeo, valveZincMat);
    actuator.position.set(0, 0.16, 0);
    actuator.castShadow = true;
    valveGroup.add(actuator);

    // Dial Rotasi Rata (Flush Circular Rotary Dial)
    const dialGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.024, 32);
    const dialMesh = new THREE.Mesh(dialGeo, valveDialMat);
    dialMesh.position.set(0, 0.30, 0);
    valveGroup.add(dialMesh);

    // Slot Indikator Posisi Katup (Recessed Index Slot 0° - 90°)
    const dialSlotGeo = new THREE.BoxGeometry(0.12, 0.012, 0.018);
    const dialSlot = new THREE.Mesh(dialSlotGeo, valveSlotMat);
    dialSlot.position.set(0, 0.014, 0);
    dialMesh.add(dialSlot);

    // ==========================================
    // 7. PIPELINE & COMPACT QUARTZ INSPECTION CELL
    // ==========================================
    const pipeGroup = new THREE.Group();
    mainGroup.add(pipeGroup);

    // Fungsi Pembantu Flens/Collar Ring Berulir
    const createCollar = (x: number) => {
      const cGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.03, 24);
      cGeo.rotateZ(Math.PI / 2);
      const collar = new THREE.Mesh(cGeo, collarMat);
      collar.position.set(x, 0.42, 0);
      pipeGroup.add(collar);
    };

    // Segmen Pipa 1: Dari Meteran ke Katup (Satin Brushed Stainless Steel, r: 0.035)
    const pipe1Geo = new THREE.CylinderGeometry(0.035, 0.035, 0.98, 24);
    pipe1Geo.rotateZ(Math.PI / 2);
    const pipe1 = new THREE.Mesh(pipe1Geo, satinSteelMat);
    pipe1.position.set(-1.31, 0.42, 0);
    pipe1.castShadow = true;
    pipeGroup.add(pipe1);
    createCollar(-1.80);
    createCollar(-0.82);

    // Segmen Pipa 2: Dari Katup ke Sel Inspeksi Quartz
    const pipe2Geo = new THREE.CylinderGeometry(0.035, 0.035, 0.63, 24);
    pipe2Geo.rotateZ(Math.PI / 2);
    const pipe2 = new THREE.Mesh(pipe2Geo, satinSteelMat);
    pipe2.position.set(-0.265, 0.42, 0);
    pipe2.castShadow = true;
    pipeGroup.add(pipe2);
    createCollar(-0.58);
    createCollar(0.05);

    // Sel Inspeksi Quartz Kompak (Inline Sight-Glass 0.45m)
    const quartzGeo = new THREE.CylinderGeometry(0.040, 0.040, 0.45, 32);
    quartzGeo.rotateZ(Math.PI / 2);
    const quartzCell = new THREE.Mesh(quartzGeo, quartzCellMat);
    quartzCell.position.set(0.275, 0.42, 0);
    pipeGroup.add(quartzCell);
    createCollar(0.50);

    // Segmen Pipa 3 & Belokan Halus Elbow (Curved Elbow Ke Kompor)
    const elbowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.50, 0.42, 0),
      new THREE.Vector3(0.95, 0.42, 0),
      new THREE.Vector3(1.08, 0.38, 0),
      new THREE.Vector3(1.14, 0.25, 0),
      new THREE.Vector3(1.14, 0.06, 0)
    ]);
    const elbowGeo = new THREE.TubeGeometry(elbowCurve, 32, 0.035, 20, false);
    const elbowPipe = new THREE.Mesh(elbowGeo, satinSteelMat);
    elbowPipe.castShadow = true;
    pipeGroup.add(elbowPipe);

    // ==========================================
    // 8. 16 MIKRO-FILAMEN ALIRAN GAS (SUBTLE FLOW PARTICLES)
    // ==========================================
    const filamentCount = 16;
    const filamentGeo = new THREE.BufferGeometry();
    const filamentPositions = new Float32Array(filamentCount * 3);
    const filamentSpeeds = new Float32Array(filamentCount);

    const minFlowX = 0.08;
    const maxFlowX = 0.47;

    for (let i = 0; i < filamentCount; i++) {
      filamentPositions[i * 3] = minFlowX + Math.random() * (maxFlowX - minFlowX);
      filamentPositions[i * 3 + 1] = 0.42 + (Math.random() - 0.5) * 0.038;
      filamentPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.038;
      filamentSpeeds[i] = 0.012 + Math.random() * 0.012;
    }

    filamentGeo.setAttribute('position', new THREE.BufferAttribute(filamentPositions, 3));

    const filamentTexture = createMicroFilamentTexture();
    const filamentMat = new THREE.PointsMaterial({
      size: 0.035,
      map: filamentTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x93c5fd,
      opacity: 0.6
    });

    const flowFilaments = new THREE.Points(filamentGeo, filamentMat);
    pipeGroup.add(flowFilaments);

    // ==========================================
    // 9. GAS STOVE & DUAL BURNER CORONA SYSTEM
    // ==========================================
    const stoveGroup = new THREE.Group();
    stoveGroup.position.set(1.75, 0, 0);
    mainGroup.add(stoveGroup);

    // Permukaan Cooktop Kaca-Keramik Satin (Glass-Ceramic Deck)
    const cooktopGeo = new THREE.BoxGeometry(1.85, 0.05, 1.35);
    const cooktop = new THREE.Mesh(cooktopGeo, cooktopMat);
    cooktop.position.set(0, 0.025, 0);
    cooktop.castShadow = true;
    cooktop.receiveShadow = true;
    stoveGroup.add(cooktop);

    // Trim Bezel Stainless Ramping di Sekeliling Kompor
    const stoveTrimGeo = new THREE.BoxGeometry(1.87, 0.015, 1.37);
    const stoveTrimMat = new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.5, metalness: 0.7 });
    const stoveTrim = new THREE.Mesh(stoveTrimGeo, stoveTrimMat);
    stoveTrim.position.set(0, 0.007, 0);
    stoveGroup.add(stoveTrim);

    // Kenop Kontrol Minimalis Dieter Rams (Silinder Knurled Presisi)
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.4, metalness: 0.6 });
    const createKnob = (x: number) => {
      const kGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.02, 24);
      const knob = new THREE.Mesh(kGeo, knobMat);
      knob.position.set(x, 0.06, 0.52);

      // Indikator Titik Kenop
      const dotGeo = new THREE.BoxGeometry(0.006, 0.004, 0.016);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(0, 0.011, -0.014);
      knob.add(dot);

      stoveGroup.add(knob);
    };
    createKnob(-0.25);
    createKnob(0.25);

    // Generator Tungku Gas dengan Korona Api Biru Sirkumferensial
    const flameCoronaTexture = createFlameCoronaTexture();

    const createBurnerUnit = (xPos: number, zPos: number) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(xPos, 0.05, zPos);

      // Cekungan Dasar Tungku
      const baseRingGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.01, 32);
      const baseRing = new THREE.Mesh(baseRingGeo, plinthMat);
      baseRing.position.set(0, 0.005, 0);
      bGroup.add(baseRing);

      // Mahkota Burner (Burner Crown)
      const crownGeo = new THREE.CylinderGeometry(0.17, 0.19, 0.022, 32);
      const crown = new THREE.Mesh(crownGeo, burnerCrownMat);
      crown.position.set(0, 0.015, 0);
      bGroup.add(crown);

      // Tutup Tungku Matte Cast-Iron (Cap)
      const capGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.014, 32);
      const cap = new THREE.Mesh(capGeo, trivetMat);
      cap.position.set(0, 0.030, 0);
      bGroup.add(cap);

      // Jeruji Besi Matte Cast-Iron Trivet (Cincin & 4 Kaki Salib Presisi)
      const trivetRingGeo = new THREE.TorusGeometry(0.21, 0.011, 12, 32);
      trivetRingGeo.rotateX(Math.PI / 2);
      const trivetRing = new THREE.Mesh(trivetRingGeo, trivetMat);
      trivetRing.position.set(0, 0.028, 0);
      bGroup.add(trivetRing);

      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + Math.PI / 4;
        const ribGeo = new THREE.BoxGeometry(0.22, 0.016, 0.014);
        const rib = new THREE.Mesh(ribGeo, trivetMat);
        rib.position.set(Math.cos(ang) * 0.13, 0.028, Math.sin(ang) * 0.13);
        rib.rotation.y = -ang;
        bGroup.add(rib);
      }

      // Korona Api Biru Sirkumferensial (Laminar Blue Flame Corona Ring)
      const flameGroup = new THREE.Group();
      flameGroup.position.set(0, 0.028, 0);

      // Silinder Tipis Transparan Bermotif Korona Jet Api
      const coronaGeo = new THREE.CylinderGeometry(0.158, 0.178, 0.042, 36, 1, true);
      const coronaMat = new THREE.MeshBasicMaterial({
        map: flameCoronaTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
      coronaMesh.position.set(0, 0.021, 0);
      flameGroup.add(coronaMesh);

      // Cincin Inti Dalam Berwarna Azure Pekat
      const coreGeo = new THREE.CylinderGeometry(0.150, 0.165, 0.025, 36, 1, true);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.set(0, 0.012, 0);
      flameGroup.add(coreMesh);

      // Cahaya Kontak Biru Lembut (Localized Soft Point Light)
      const flameLight = new THREE.PointLight(0x38bdf8, 0, 1.4);
      flameLight.position.set(0, 0.08, 0);
      flameGroup.add(flameLight);

      // Default padam
      flameGroup.scale.set(0.0001, 0.0001, 0.0001);
      bGroup.add(flameGroup);

      stoveGroup.add(bGroup);
      return { bGroup, flameGroup, flameLight };
    };

    const burner1 = createBurnerUnit(-0.35, -0.05); // Kompor 1 (Utama)
    const burner2 = createBurnerUnit(0.35, -0.05);  // Kompor 2 (Sekunder)

    // ==========================================
    // 10. ANIMATION LOOP & SMOOTH INTERPOLATIONS
    // ==========================================
    let animationFrameId: number;
    let clock = new THREE.Clock();

    let lastOledUpdate = 0;
    let currentDialAngle = (targetAngleDeg * Math.PI) / 180;
    let currentFlame1Scale = 0.0001;
    let currentFlame2Scale = 0.0001;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const { valveStatus, valveAngleDeg, flowRateLpm, remainingM3, appliances } =
        stateRef.current;

      const isGasFlowing = valveStatus === 'OPEN' && remainingM3 > 0 && flowRateLpm > 0;

      // 1. Animasi Rotasi Halus Dial Katup (0° = Tertutup tegak lurus, 90° = Terbuka sejajar pipa)
      const targetRad = (valveAngleDeg * Math.PI) / 180;
      currentDialAngle = THREE.MathUtils.lerp(currentDialAngle, targetRad, delta * 6);
      dialMesh.rotation.y = currentDialAngle;

      // 2. Status Warna Indikator Slot Katup & LED Meteran
      if (valveStatus === 'OPEN') {
        valveSlotMat.color.setHex(0x10b981);
        ledMat.color.setHex(0x10b981);
        ledMat.emissive.setHex(0x10b981);
      } else if (valveStatus === 'CLOSING') {
        valveSlotMat.color.setHex(0xf59e0b);
        ledMat.color.setHex(0xf59e0b);
        ledMat.emissive.setHex(0xf59e0b);
      } else {
        valveSlotMat.color.setHex(0xef4444);
        ledMat.color.setHex(0xef4444);
        ledMat.emissive.setHex(0xef4444);
      }

      // 3. Update Layar OLED Meteran Monokrom Terbalik (Tiap 500ms)
      if (elapsed - lastOledUpdate > 0.5) {
        lastOledUpdate = elapsed;
        const statusText = valveStatus === 'OPEN' ? 'NORMAL' : valveStatus === 'CLOSING' ? 'CLOSING' : 'CUTOFF';
        const newTex = createMeterOledTexture(
          remainingM3.toFixed(4),
          statusText,
          flowRateLpm.toFixed(2)
        );
        oledMesh.material = new THREE.MeshBasicMaterial({ map: newTex });
      }

      // 4. Animasi Mikro-Filamen Aliran Gas di Sel Kaca Quartz
      if (isGasFlowing) {
        const positions = filamentGeo.attributes.position.array as Float32Array;
        const speedMult = 0.01 + Math.min(flowRateLpm, 3.0) * 0.008;

        for (let i = 0; i < filamentCount; i++) {
          positions[i * 3] += filamentSpeeds[i] * speedMult;
          if (positions[i * 3] > maxFlowX) {
            positions[i * 3] = minFlowX;
          }
        }
        filamentGeo.attributes.position.needsUpdate = true;
        // Pudar lembut ke opacity 0.65 saat mengalir
        filamentMat.opacity = THREE.MathUtils.lerp(filamentMat.opacity, 0.65, delta * 4);
      } else {
        // Redup lembut ke 0 tanpa hentakan tiba-tiba saat aliran diputus
        filamentMat.opacity = THREE.MathUtils.lerp(filamentMat.opacity, 0.0, delta * 3.5);
      }

      // 5. Modulasi Gelombang Mikro Organik Korona Api Biru Kompor 1
      const stove1Active = isGasFlowing && appliances.stove1 !== 'OFF';
      let targetScale1 = 0.0001;
      if (stove1Active) {
        const baseScale =
          appliances.stove1 === 'HIGH' ? 1.25 : appliances.stove1 === 'MED' ? 0.95 : 0.65;
        // Gelombang mikro laminar ganda halus
        const flameWave = 1.0 + Math.sin(elapsed * 12) * 0.03 + Math.cos(elapsed * 18) * 0.02;
        targetScale1 = baseScale * flameWave;
      }
      currentFlame1Scale = THREE.MathUtils.lerp(currentFlame1Scale, targetScale1, delta * 8);
      burner1.flameGroup.scale.set(currentFlame1Scale, currentFlame1Scale, currentFlame1Scale);
      burner1.flameLight.intensity = currentFlame1Scale > 0.05 ? currentFlame1Scale * 0.70 : 0;

      // 6. Animasi Korona Api Biru Kompor 2
      const stove2Active = isGasFlowing && appliances.stove2 === 'MED';
      let targetScale2 = 0.0001;
      if (stove2Active) {
        const flameWave2 = 1.0 + Math.sin(elapsed * 14 + 1.2) * 0.03;
        targetScale2 = 0.95 * flameWave2;
      }
      currentFlame2Scale = THREE.MathUtils.lerp(currentFlame2Scale, targetScale2, delta * 8);
      burner2.flameGroup.scale.set(currentFlame2Scale, currentFlame2Scale, currentFlame2Scale);
      burner2.flameLight.intensity = currentFlame2Scale > 0.05 ? currentFlame2Scale * 0.70 : 0;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Responsive Canvas Resize
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener('resize', handleResize);

    // Pembersihan Sumber Daya Memori Three.js
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      filamentTexture.dispose();
      flameCoronaTexture.dispose();
      oledTexture.dispose();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  const isCooking =
    valveStatus === 'OPEN' &&
    remainingM3 > 0 &&
    (appliances.stove1 !== 'OFF' || appliances.stove2 !== 'OFF');

  return (
    <div className="bg-[#0c0d12] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl relative">
      {/* 1. Bar Status Atas Minimalis 38px (Monochrome Top Bar) */}
      <div className="px-4 py-2.5 bg-[#0e0f15]/90 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] font-semibold text-zinc-300 tracking-wider uppercase">
            DIGITAL TWIN
          </span>
          <span className="text-zinc-600 font-mono text-[10px]">//</span>
          <span className="font-mono text-[11px] text-zinc-400">
            METER GAS-PLG-001
          </span>
          <span className="hidden sm:inline text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
            ISOMETRIK 30°
          </span>
        </div>

        {/* Indikator Status Kanan Tenang & Tombol Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                valveStatus === 'OPEN'
                  ? 'bg-emerald-400'
                  : valveStatus === 'CLOSING'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span>
              KATUP: {valveStatus === 'OPEN' ? 'TERBUKA (90°)' : valveStatus === 'CLOSING' ? 'MENUTUP' : 'TERTUTUP (0°)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                flowRateLpm > 0 && valveStatus === 'OPEN' ? 'bg-sky-400' : 'bg-zinc-600'
              }`}
            />
            <span className="tabular-nums">
              LAJU: {flowRateLpm.toFixed(2)} LPM
            </span>
          </div>

          <button
            onClick={resetCamera}
            className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.06] transition-colors"
            title="Kembalikan Sudut Kamera Isometrik"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. WebGL Canvas Container */}
      <div className="relative w-full h-[380px] sm:h-[440px] bg-[#090a0f]">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Petunjuk Navigasi Halus & Unobtrusive */}
        <div className="absolute top-3 left-3 bg-[#090a0f]/80 backdrop-blur-sm border border-white/[0.06] px-2.5 py-1 rounded-md text-[10px] font-mono text-zinc-400 pointer-events-none">
          Klik &amp; seret untuk rotasi &bull; Scroll untuk zoom
        </div>

        {/* 3. Pita Telemetri Bawah Tenang (Quiet Non-Animated Telemetry Ribbon) */}
        <div className="absolute inset-x-0 bottom-3 px-4 flex items-center justify-center pointer-events-none">
          <div className="bg-[#0e0f15]/85 backdrop-blur-md border border-white/[0.08] px-4 py-1.5 rounded-full shadow-lg flex items-center gap-3 sm:gap-4 text-[11px] font-mono text-zinc-300">
            <div>
              <span className="text-zinc-500 mr-1.5">1. METER:</span>
              <span className="text-zinc-200 font-semibold tabular-nums">
                {formatVolume(remainingM3)}
              </span>
            </div>

            <span className="text-zinc-600 font-sans select-none">───</span>

            <div>
              <span className="text-zinc-500 mr-1.5">2. CWX-15Q:</span>
              <span
                className={`font-semibold ${
                  valveStatus === 'OPEN'
                    ? 'text-emerald-400'
                    : valveStatus === 'CLOSING'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {valveStatus === 'OPEN' ? 'BUKA' : valveStatus === 'CLOSING' ? 'PROSES' : 'TUTUP'}
              </span>
            </div>

            <span className="text-zinc-600 font-sans select-none">───</span>

            <div>
              <span className="text-zinc-500 mr-1.5">3. KOMPOR:</span>
              <span
                className={`font-semibold ${
                  isCooking ? 'text-sky-400' : 'text-zinc-500'
                }`}
              >
                {isCooking ? 'MENYALA' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
