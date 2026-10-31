import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGas } from '../../context/GasContext';
import {
  Layers,
  RotateCcw,
  Flame,
  Gauge,
  Home,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Compass
} from 'lucide-react';

type CameraPreset = 'overview' | 'valve' | 'kitchen';

/**
 * Menghasilkan tekstur partikel gas bercahaya radial lembut (soft glowing sprite)
 */
function createGasGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0, 245, 255, 1.0)');     // Inti cyan pekat
  gradient.addColorStop(0.25, 'rgba(56, 189, 248, 0.85)'); // Pendaran biru langit
  gradient.addColorStop(0.65, 'rgba(14, 165, 233, 0.35)'); // Aura luar
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');          // Transparan

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Menghasilkan dial manometer gas beresolusi tinggi dengan angka (0, 10, 20, 30 mbar) & zona warna
 */
function createManometerDialTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;
  const r = 235;

  // Background Dial Putih Bersih
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Bezel Lingkar Hitam
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 14;
  ctx.stroke();

  // Sudut dial: dari -135° (kiri bawah) ke +135° (kanan bawah) -> Total 270°
  const startAngle = Math.PI * 0.75;
  const totalAngle = Math.PI * 1.5;

  // Zona Merah (0 - 10 mbar: Tekanan Kurang / Drop)
  ctx.beginPath();
  ctx.arc(cx, cy, r - 35, startAngle, startAngle + (10 / 30) * totalAngle);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 18;
  ctx.stroke();

  // Zona Hijau (20 - 30 mbar: Tekanan Kerja Normal Jargas 28 mbar)
  ctx.beginPath();
  ctx.arc(cx, cy, r - 35, startAngle + (20 / 30) * totalAngle, startAngle + totalAngle);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 18;
  ctx.stroke();

  // Garis-Garis Indeks (Tick Marks) dan Angka
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let val = 0; val <= 30; val += 5) {
    const frac = val / 30;
    const theta = startAngle + frac * totalAngle;
    const isMajor = val % 10 === 0;

    const innerR = isMajor ? r - 60 : r - 45;
    const outerR = r - 25;
    const x1 = cx + Math.cos(theta) * innerR;
    const y1 = cy + Math.sin(theta) * innerR;
    const x2 = cx + Math.cos(theta) * outerR;
    const y2 = cy + Math.sin(theta) * outerR;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = isMajor ? 8 : 4;
    ctx.stroke();

    // Cetak Angka Besar & Tebal
    if (isMajor) {
      ctx.font = 'bold 42px monospace';
      const textR = r - 95;
      const tx = cx + Math.cos(theta) * textR;
      const ty = cy + Math.sin(theta) * textR;
      ctx.fillText(val.toString(), tx, ty);
    }
  }

  // Label Satuan mbar
  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('mbar', cx, cy + 70);

  // Label Judul Manometer
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('TEKANAN GAS', cx, cy - 65);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const GasPipeline3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { meter, appliances, setValveManual } = useGas();

  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);

  const valveStatus = meter?.valveStatus || 'CLOSED';
  const targetAngleDeg = meter?.valveAngleDeg ?? 0;
  const flowRateLpm = meter?.currentFlowRateLpm || 0;
  const remainingM3 = meter?.remainingQuotaM3 ?? 0;

  // Ref untuk sinkronisasi state ke Three.js animation loop tanpa re-mount
  const stateRef = useRef({
    valveAngleDeg: targetAngleDeg,
    flowRateLpm: flowRateLpm,
    valveStatus: valveStatus,
    remainingM3: remainingM3,
    appliances: appliances,
    cameraTarget: {
      position: new THREE.Vector3(0.4, 2.6, 6.8),
      lookAt: new THREE.Vector3(0.2, 0.6, 0)
    },
    isTransitioningCamera: false
  });

  useEffect(() => {
    stateRef.current.valveAngleDeg = targetAngleDeg;
    stateRef.current.flowRateLpm = flowRateLpm;
    stateRef.current.valveStatus = valveStatus;
    stateRef.current.remainingM3 = remainingM3;
    stateRef.current.appliances = appliances;
  }, [targetAngleDeg, flowRateLpm, valveStatus, remainingM3, appliances]);

  const switchCameraPreset = useCallback((preset: CameraPreset) => {
    setActivePreset(preset);
    stateRef.current.isTransitioningCamera = true;

    if (preset === 'overview') {
      stateRef.current.cameraTarget = {
        position: new THREE.Vector3(0.4, 2.6, 6.8),
        lookAt: new THREE.Vector3(0.2, 0.6, 0)
      };
    } else if (preset === 'valve') {
      stateRef.current.cameraTarget = {
        position: new THREE.Vector3(-1.15, 1.15, 2.4),
        lookAt: new THREE.Vector3(-1.15, 0.55, 0)
      };
    } else if (preset === 'kitchen') {
      stateRef.current.cameraTarget = {
        position: new THREE.Vector3(2.8, 1.6, 3.4),
        lookAt: new THREE.Vector3(2.8, 0.6, -0.2)
      };
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 800;
    const height = 480;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0.4, 2.6, 6.8);
    const lookAtPoint = new THREE.Vector3(0.2, 0.6, 0);
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
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.02; // Tidak tembus bawah tanah
    controls.minDistance = 2.0;
    controls.maxDistance = 14.0;
    controls.target.copy(lookAtPoint);

    // 2. Pencahayaan (Lighting)
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffedd5, 2.5);
    sunLight.position.set(5, 9, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 25;
    scene.add(sunLight);

    const outdoorRimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    outdoorRimLight.position.set(-6, 4, -4);
    scene.add(outdoorRimLight);

    // Dynamic Kitchen Blue Glow Points
    const stove1Light = new THREE.PointLight(0x00f0ff, 0, 4);
    stove1Light.position.set(2.2, 0.65, -0.2);
    scene.add(stove1Light);

    const stove2Light = new THREE.PointLight(0x00f0ff, 0, 4);
    stove2Light.position.set(3.4, 0.65, -0.2);
    scene.add(stove2Light);

    const heaterLight = new THREE.PointLight(0x00f0ff, 0, 3.5);
    heaterLight.position.set(1.8, 1.9, -0.3);
    scene.add(heaterLight);

    // 3. Materials
    const groundOutdoorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.1
    });

    const groundIndoorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.2
    });

    const wallConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.15
    });

    const counterMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.3,
      metalness: 0.4
    });

    const stainlessMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.15
    });

    const castIronMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.8,
      metalness: 0.3
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.95,
      roughness: 0.2
    });

    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.9,
      roughness: 0.25
    });

    // Pipa Gas Kuning Sight-Glass Transparan (Warna Kuning Jargas, Isi Gas Terlihat Jelas)
    const upstreamSightGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.1,
      roughness: 0.08,
      transmission: 0.85,
      opacity: 0.38,
      transparent: true,
      thickness: 0.12,
      depthWrite: false, // Memastikan partikel di dalam tidak terhalang z-buffer
      side: THREE.DoubleSide
    });

    const downstreamSightGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.1,
      roughness: 0.08,
      transmission: 0.85,
      opacity: 0.38,
      transparent: true,
      thickness: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Kaca X-Ray Khusus di Bagian Katup CWX-15Q
    const valveXRayGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transmission: 0.98,
      opacity: 0.2,
      transparent: true,
      roughness: 0.03,
      metalness: 0.05,
      thickness: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Cincin Dudukan Teflon (Virgin White PTFE) Pengedap Bola Katup
    const ptfeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.05
    });

    // Material Dial & Indikator Posisi Mekanikal CWX-15Q
    const indicatorHousingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.7
    });

    const indicatorDialMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b
    });

    const indicatorBarMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.3,
      metalness: 0.2
    });

    const metalFlangeMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.25
    });

    // 4. Struktur Arsitektural (Fondasi & Dinding Cutaway)
    const baseGroup = new THREE.Group();
    scene.add(baseGroup);

    // Lantai Luar (Halaman PGN/Meteran)
    const outdoorGroundGeo = new THREE.BoxGeometry(4.8, 0.4, 3.4);
    const outdoorGround = new THREE.Mesh(outdoorGroundGeo, groundOutdoorMat);
    outdoorGround.position.set(-2.6, -0.2, 0);
    outdoorGround.receiveShadow = true;
    baseGroup.add(outdoorGround);

    // Lantai Dalam (Dapur Rumah)
    const indoorGroundGeo = new THREE.BoxGeometry(5.2, 0.4, 3.4);
    const indoorGround = new THREE.Mesh(indoorGroundGeo, groundIndoorMat);
    indoorGround.position.set(2.4, -0.2, 0);
    indoorGround.receiveShadow = true;
    baseGroup.add(indoorGround);

    // Dinding Rumah Eksterior Cutaway
    const wallGeo = new THREE.BoxGeometry(0.35, 2.8, 3.2);
    const wallMesh = new THREE.Mesh(wallGeo, wallConcreteMat);
    wallMesh.position.set(-0.1, 1.2, 0);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    baseGroup.add(wallMesh);

    // Dinding Belakang Dapur (Backsplash)
    const backWallGeo = new THREE.BoxGeometry(4.8, 2.8, 0.2);
    const backWall = new THREE.Mesh(backWallGeo, wallConcreteMat);
    backWall.position.set(2.2, 1.2, -1.5);
    backWall.receiveShadow = true;
    baseGroup.add(backWall);

    // Meja Dapur Granit (Kitchen Counter)
    const counterGeo = new THREE.BoxGeometry(3.6, 0.65, 1.3);
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(2.8, 0.125, -0.2);
    counter.castShadow = true;
    counter.receiveShadow = true;
    baseGroup.add(counter);

    // Kompor Gas Stainless Steel (Recessed Cooktop)
    const cooktopGeo = new THREE.BoxGeometry(2.2, 0.05, 0.9);
    const cooktop = new THREE.Mesh(cooktopGeo, stainlessMat);
    cooktop.position.set(2.8, 0.46, -0.2);
    cooktop.receiveShadow = true;
    baseGroup.add(cooktop);

    // 5. Kompor Tungku 1 & 2 + 3D Gas Flames
    const burnerRadius = 0.3;

    const createBurnerAssembly = (x: number, z: number) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, 0.49, z);

      // Cincin Burner Kuningan
      const ringGeo = new THREE.CylinderGeometry(burnerRadius, burnerRadius * 1.05, 0.06, 32);
      const ringMesh = new THREE.Mesh(ringGeo, brassMat);
      bGroup.add(ringMesh);

      // Jeruji Besi Cor (Cast Iron Grate)
      const grateGeo = new THREE.TorusGeometry(burnerRadius * 1.15, 0.025, 12, 32);
      grateGeo.rotateX(Math.PI / 2);
      const grateMesh = new THREE.Mesh(grateGeo, castIronMat);
      grateMesh.position.set(0, 0.03, 0);
      bGroup.add(grateMesh);

      // 4 Kaki Jeruji
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const ribGeo = new THREE.BoxGeometry(0.38, 0.04, 0.04);
        const ribMesh = new THREE.Mesh(ribGeo, castIronMat);
        ribMesh.position.set(Math.cos(angle) * 0.22, 0.03, Math.sin(angle) * 0.22);
        ribMesh.rotation.y = -angle;
        bGroup.add(ribMesh);
      }

      // Procedural 3D Blue Flame Mesh (Multi-Tier Glow Cones)
      const flameGroup = new THREE.Group();
      flameGroup.position.set(0, 0.03, 0);

      // Inti Api Biru Elektrik (Inner Blue Core)
      const innerFlameGeo = new THREE.ConeGeometry(burnerRadius * 0.75, 0.35, 24, 1, true);
      const innerFlameMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
      innerFlame.position.set(0, 0.175, 0);
      flameGroup.add(innerFlame);

      // Selubung Api Luar (Outer Glow Flame)
      const outerFlameGeo = new THREE.ConeGeometry(burnerRadius * 0.95, 0.48, 24, 1, true);
      const outerFlameMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const outerFlame = new THREE.Mesh(outerFlameGeo, outerFlameMat);
      outerFlame.position.set(0, 0.24, 0);
      flameGroup.add(outerFlame);

      // Mahkota Api Jet (Radial Micro Flames)
      const jetCount = 12;
      for (let j = 0; j < jetCount; j++) {
        const jAngle = (j / jetCount) * Math.PI * 2;
        const jetGeo = new THREE.ConeGeometry(0.045, 0.18, 8);
        const jetMesh = new THREE.Mesh(jetGeo, innerFlameMat);
        jetMesh.position.set(
          Math.cos(jAngle) * (burnerRadius * 0.8),
          0.09,
          Math.sin(jAngle) * (burnerRadius * 0.8)
        );
        jetMesh.rotation.z = -Math.cos(jAngle) * 0.25;
        jetMesh.rotation.x = Math.sin(jAngle) * 0.25;
        flameGroup.add(jetMesh);
      }

      flameGroup.scale.set(0.001, 0.001, 0.001); // Default padam
      bGroup.add(flameGroup);

      return { bGroup, flameGroup };
    };

    const burner1 = createBurnerAssembly(2.2, -0.2);
    const burner2 = createBurnerAssembly(3.4, -0.2);
    baseGroup.add(burner1.bGroup);
    baseGroup.add(burner2.bGroup);

    // 6. Water Heater (Pemanas Air Gas Dinding)
    const heaterGroup = new THREE.Group();
    heaterGroup.position.set(1.8, 1.85, -1.35);
    baseGroup.add(heaterGroup);

    const heaterBoxGeo = new THREE.BoxGeometry(0.85, 1.1, 0.35);
    const heaterBox = new THREE.Mesh(heaterBoxGeo, stainlessMat);
    heaterBox.castShadow = true;
    heaterGroup.add(heaterBox);

    // Jendela Inspeksi Api Water Heater
    const heaterWindowGeo = new THREE.BoxGeometry(0.4, 0.25, 0.05);
    const heaterWindow = new THREE.Mesh(
      heaterWindowGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transmission: 0.9,
        transparent: true,
        opacity: 0.4
      })
    );
    heaterWindow.position.set(0, -0.15, 0.16);
    heaterGroup.add(heaterWindow);

    // Koil Pipa Tembaga Water Heater
    const coilGroup = new THREE.Group();
    coilGroup.position.set(0, 0.2, 0.05);
    for (let c = 0; c < 3; c++) {
      const cGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 24);
      const cMesh = new THREE.Mesh(cGeo, copperMat);
      cMesh.position.set(0, c * 0.09 - 0.09, 0);
      coilGroup.add(cMesh);
    }
    heaterGroup.add(coilGroup);

    // Api Pemanas Water Heater
    const heaterFlameGeo = new THREE.ConeGeometry(0.16, 0.28, 16);
    const heaterFlameMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const heaterFlame = new THREE.Mesh(heaterFlameGeo, heaterFlameMat);
    heaterFlame.position.set(0, -0.18, 0.08);
    heaterFlame.scale.set(0.001, 0.001, 0.001);
    heaterGroup.add(heaterFlame);

    // 7. Stasiun Smart Meter Outdoor & Katup Motorik CWX-15Q
    const meterStationGroup = new THREE.Group();
    meterStationGroup.position.set(-1.8, 0.45, 0);
    scene.add(meterStationGroup);

    // Braket Penyangga Dinding
    const bracketGeo = new THREE.BoxGeometry(0.1, 0.9, 0.2);
    const bracketMesh = new THREE.Mesh(bracketGeo, metalFlangeMat);
    bracketMesh.position.set(0, 0.25, -0.2);
    meterStationGroup.add(bracketMesh);

    // Kotak Smart Gas Meter (Die-Cast Housing)
    const meterBodyGeo = new THREE.BoxGeometry(0.7, 0.65, 0.45);
    const meterBodyMesh = new THREE.Mesh(meterBodyGeo, metalFlangeMat);
    meterBodyMesh.position.set(-0.6, 0.35, 0);
    meterBodyMesh.castShadow = true;
    meterStationGroup.add(meterBodyMesh);

    // Layar Indikator Meter Mini
    const screenGeo = new THREE.PlaneGeometry(0.35, 0.18);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x022c22 });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(-0.6, 0.42, 0.23);
    meterStationGroup.add(screenMesh);

    // Piringan Pulsa Berputar di dalam Ruang Ukur Transparan
    const pulseChamberGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 24);
    pulseChamberGeo.rotateZ(Math.PI / 2);
    const pulseChamber = new THREE.Mesh(pulseChamberGeo, valveXRayGlassMat);
    pulseChamber.position.set(-0.6, 0.12, 0);
    meterStationGroup.add(pulseChamber);

    const pulseDiskGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16);
    pulseDiskGeo.rotateZ(Math.PI / 2);
    const pulseDisk = new THREE.Mesh(pulseDiskGeo, brassMat);
    pulseDisk.position.set(-0.6, 0.12, 0);
    meterStationGroup.add(pulseDisk);

    // 8. Katup Motorik CWX-15Q dengan JENDELA X-RAY CUTAWAY KHUSUS KATUP
    const valveGroup = new THREE.Group();
    valveGroup.position.set(0.65, 0, 0); // Di output meter (-1.8 + 0.65 = -1.15)
    meterStationGroup.add(valveGroup);

    // Bodi Katup Flensa Samping (Logam Solid)
    const flangeL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 24), metalFlangeMat);
    flangeL.rotateZ(Math.PI / 2);
    flangeL.position.set(-0.25, 0, 0);
    valveGroup.add(flangeL);

    const flangeR = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 24), metalFlangeMat);
    flangeR.rotateZ(Math.PI / 2);
    flangeR.position.set(0.25, 0, 0);
    valveGroup.add(flangeR);

    // Baut Flensa Stainless Steel Pengencang
    for (let b = 0; b < 6; b++) {
      const bAngle = (b / 6) * Math.PI * 2;
      const bRad = 0.18;
      const boltGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.06, 12);
      boltGeo.rotateZ(Math.PI / 2);

      const boltL = new THREE.Mesh(boltGeo, stainlessMat);
      boltL.position.set(-0.25, Math.sin(bAngle) * bRad, Math.cos(bAngle) * bRad);
      valveGroup.add(boltL);

      const boltR = new THREE.Mesh(boltGeo, stainlessMat);
      boltR.position.set(0.25, Math.sin(bAngle) * bRad, Math.cos(bAngle) * bRad);
      valveGroup.add(boltR);
    }

    // Selongsong Kaca X-RAY Transparan Khusus Ruang Katup (Reveals Inner Rotating Core)
    const valveCutawayGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.42, 32);
    valveCutawayGeo.rotateZ(Math.PI / 2);
    const valveCutawayMesh = new THREE.Mesh(valveCutawayGeo, valveXRayGlassMat);
    valveGroup.add(valveCutawayMesh);

    // Cincin Dudukan Teflon (PTFE Valve Seats) Putih di Sisi Hulu & Hilir Bola
    const ptfeGeo = new THREE.TorusGeometry(0.13, 0.024, 16, 32);
    ptfeGeo.rotateY(Math.PI / 2);

    const ptfeSeatL = new THREE.Mesh(ptfeGeo, ptfeMat);
    ptfeSeatL.position.set(-0.16, 0, 0);
    valveGroup.add(ptfeSeatL);

    const ptfeSeatR = new THREE.Mesh(ptfeGeo, ptfeMat);
    ptfeSeatR.position.set(0.16, 0, 0);
    valveGroup.add(ptfeSeatR);

    // Inti Bola Kuningan Berputar (Rotating Brass Core) di Dalam X-Ray Katup
    const valveBallGroup = new THREE.Group();
    valveGroup.add(valveBallGroup);

    const ballSphereGeo = new THREE.SphereGeometry(0.21, 32, 24);
    const ballSphere = new THREE.Mesh(ballSphereGeo, brassMat);
    valveBallGroup.add(ballSphere);

    // Lubang Orifice Bola Katup (Flow Bore)
    const boreHoleGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.23, 24);
    boreHoleGeo.rotateZ(Math.PI / 2);
    const boreHole = new THREE.Mesh(
      boreHoleGeo,
      new THREE.MeshBasicMaterial({ color: 0x020617 })
    );
    valveBallGroup.add(boreHole);

    // Inti Aliran Gas Luminous di Dalam Orifice Bola (Cyan Glow Core saat Katup Terbuka)
    const boreCoreGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.235, 24);
    boreCoreGeo.rotateZ(Math.PI / 2);
    const boreCoreMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const boreCore = new THREE.Mesh(boreCoreGeo, boreCoreMat);
    valveBallGroup.add(boreCore);

    // Leher Katup (Bonnet & Stem Gland Nut)
    const bonnetGeo = new THREE.CylinderGeometry(0.075, 0.09, 0.12, 20);
    const bonnetMesh = new THREE.Mesh(bonnetGeo, brassMat);
    bonnetMesh.position.set(0, 0.23, 0);
    valveGroup.add(bonnetMesh);

    // Drive Stem (Poros Transmisi Baja Tahan Karat) yang Berputar Sinkron dengan Bola Katup
    const stemGroup = new THREE.Group();
    stemGroup.position.set(0, 0.28, 0);
    valveGroup.add(stemGroup);

    const stemShaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.16, 16);
    const stemShaft = new THREE.Mesh(stemShaftGeo, stainlessMat);
    stemGroup.add(stemShaft);

    // Pin Indikator Kunci Poros
    const stemPinGeo = new THREE.BoxGeometry(0.015, 0.045, 0.075);
    const stemPin = new THREE.Mesh(stemPinGeo, brassMat);
    stemGroup.add(stemPin);

    // Motor Aktuator Kotak CWX-15Q di Atas Katup (Casing Biru Industri)
    const actuatorBoxGeo = new THREE.BoxGeometry(0.38, 0.35, 0.35);
    const actuatorBox = new THREE.Mesh(
      actuatorBoxGeo,
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.6, roughness: 0.4 })
    );
    actuatorBox.position.set(0, 0.46, 0);
    valveGroup.add(actuatorBox);

    // Pelat Nama Label Spek Teknis CWX-15Q
    const nameplateGeo = new THREE.PlaneGeometry(0.24, 0.1);
    const nameplateMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const nameplate = new THREE.Mesh(nameplateGeo, nameplateMat);
    nameplate.position.set(0, 0.46, 0.176);
    valveGroup.add(nameplate);

    // Kubah Indikator Posisi Mekanikal di Tutup Atas Aktuator (Top Mechanical Position Indicator)
    const topIndicatorBaseGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.035, 24);
    const topIndicatorBase = new THREE.Mesh(topIndicatorBaseGeo, indicatorHousingMat);
    topIndicatorBase.position.set(0, 0.645, 0);
    valveGroup.add(topIndicatorBase);

    // Pelat Dial Jam Indikator
    const indicatorPlateGeo = new THREE.CircleGeometry(0.11, 24);
    indicatorPlateGeo.rotateX(-Math.PI / 2);
    const indicatorPlate = new THREE.Mesh(indicatorPlateGeo, indicatorDialMat);
    indicatorPlate.position.set(0, 0.664, 0);
    valveGroup.add(indicatorPlate);

    // Bilah Penunjuk Posisi Mekanikal yang Berputar Sinkron
    const topIndicatorGroup = new THREE.Group();
    topIndicatorGroup.position.set(0, 0.668, 0);
    valveGroup.add(topIndicatorGroup);

    // Bilah Penunjuk (Arrow/Bar)
    const indicatorBarGeo = new THREE.BoxGeometry(0.18, 0.018, 0.04);
    const indicatorBar = new THREE.Mesh(indicatorBarGeo, indicatorBarMat);
    topIndicatorGroup.add(indicatorBar);

    // Knop Pivot Tengah
    const indicatorKnobGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.025, 16);
    const indicatorKnob = new THREE.Mesh(indicatorKnobGeo, stainlessMat);
    topIndicatorGroup.add(indicatorKnob);

    // Kaca Dome Pelindung Transparan di Atas Indikator
    const indicatorDomeGeo = new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const indicatorDomeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05
    });
    const indicatorDome = new THREE.Mesh(indicatorDomeGeo, indicatorDomeMat);
    indicatorDome.position.set(0, 0.665, 0);
    valveGroup.add(indicatorDome);

    // LED Status Aktuator (di sudut atas kotak aktuator)
    const ledGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.13, 0.64, 0.13);
    valveGroup.add(ledMesh);

    // Manometer Tekanan Gas Downstream (DENGAN TEKSTUR ANGKA 0, 10, 20, 30 mbar)
    const gaugeGroup = new THREE.Group();
    gaugeGroup.position.set(0.38, 0.34, 0);
    valveGroup.add(gaugeGroup);

    const gaugeStemGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.2, 12);
    const gaugeStem = new THREE.Mesh(gaugeStemGeo, metalFlangeMat);
    gaugeGroup.add(gaugeStem);

    const gaugeDialRadius = 0.24; // Ditingkatkan ukurannya agar angka terlihat jelas
    const gaugeDialGeo = new THREE.CylinderGeometry(gaugeDialRadius, gaugeDialRadius, 0.07, 32);
    gaugeDialGeo.rotateX(Math.PI / 2);
    const gaugeDial = new THREE.Mesh(gaugeDialGeo, metalFlangeMat);
    gaugeDial.position.set(0, 0.2, 0);
    gaugeGroup.add(gaugeDial);

    // Pelat Dial dengan Tekstur Angka Manometer
    const dialTexture = createManometerDialTexture();
    const gaugeFaceGeo = new THREE.CircleGeometry(gaugeDialRadius * 0.95, 32);
    const gaugeFaceMat = new THREE.MeshBasicMaterial({
      map: dialTexture,
      side: THREE.FrontSide
    });
    const gaugeFace = new THREE.Mesh(gaugeFaceGeo, gaugeFaceMat);
    gaugeFace.position.set(0, 0.2, 0.038);
    gaugeGroup.add(gaugeFace);

    // Jarum Merah Manometer
    const gaugeNeedleGeo = new THREE.BoxGeometry(0.016, 0.16, 0.01);
    const needleMesh = new THREE.Mesh(
      gaugeNeedleGeo,
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    needleMesh.geometry.translate(0, 0.065, 0); // Pivot di pangkal jarum
    needleMesh.position.set(0, 0.2, 0.042);
    gaugeGroup.add(needleMesh);

    // 9. Sistem Pipa Kurva 3D (Pipa Kuning Industri Standar)
    // Kurva 1: Inlet Pipa Gas Kota -> Smart Meter -> Masuk Muka Katup CWX-15Q (Upstream PGN)
    const curve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.4, -0.3, 0),
      new THREE.Vector3(-4.4, 0.45, 0),
      new THREE.Vector3(-3.2, 0.45, 0),
      new THREE.Vector3(-1.28, 0.45, 0)
    ]);

    // Kurva 2: Keluar Katup CWX-15Q -> Penetrasi Dinding -> T-Junction Dapur (Downstream Rumah)
    const curve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.02, 0.45, 0), // Keluar dari katup bola
      new THREE.Vector3(-0.1, 0.45, 0),  // Tembus dinding beton
      new THREE.Vector3(1.1, 0.45, 0)    // T-Junction pipa dapur
    ]);

    // Kurva 3: T-Junction -> Pipa Kompor (Tungku 1 & 2)
    const curve3 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.1, 0.45, 0),
      new THREE.Vector3(1.6, 0.38, -0.2),
      new THREE.Vector3(2.2, 0.38, -0.2), // Tungku 1
      new THREE.Vector3(3.4, 0.38, -0.2)  // Tungku 2
    ]);

    // Kurva 4: T-Junction -> Pipa Water Heater Vertikal
    const curve4 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.1, 0.45, 0),
      new THREE.Vector3(1.1, 1.3, -0.5),
      new THREE.Vector3(1.8, 1.45, -1.2)  // Masuk heater
    ]);

    const downstreamInnerMeshes: THREE.Mesh[] = [];
    let upstreamInnerMesh: THREE.Mesh | null = null;
    const downstreamOuterMeshes: THREE.Mesh[] = [];

    const buildGasPipe = (curve: THREE.CatmullRomCurve3, isUpstream: boolean = false) => {
      // Selongsong luar pipa kuning sight-glass transparan
      const outerGeo = new THREE.TubeGeometry(curve, 64, 0.088, 16, false);
      const outerMesh = new THREE.Mesh(
        outerGeo,
        isUpstream ? upstreamSightGlassMat : downstreamSightGlassMat
      );
      outerMesh.renderOrder = 1;
      scene.add(outerMesh);

      // Inti cahaya gas neon di dalam pipa yang berdenyut aktif
      const innerGeo = new THREE.TubeGeometry(curve, 64, 0.038, 12, false);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.renderOrder = 2;
      scene.add(innerMesh);

      if (isUpstream) {
        upstreamInnerMesh = innerMesh;
      } else {
        downstreamOuterMeshes.push(outerMesh);
        downstreamInnerMeshes.push(innerMesh);
      }
    };

    buildGasPipe(curve1, true);  // Curve 1: Pipa Hulu (Jargas Inlet)
    buildGasPipe(curve2, false); // Curve 2: Pipa Hilir (Katup -> T-Junction Dinding)
    buildGasPipe(curve3, false); // Curve 3: Pipa Hilir (T-Junction -> Kompor Tungku 1 & 2)
    buildGasPipe(curve4, false); // Curve 4: Pipa Hilir (T-Junction -> Water Heater)

    // Flensa & Fitting Sambungan Pipa Logam
    const addFitting = (x: number, y: number, z: number) => {
      const fGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16);
      fGeo.rotateZ(Math.PI / 2);
      const fMesh = new THREE.Mesh(fGeo, metalFlangeMat);
      fMesh.position.set(x, y, z);
      scene.add(fMesh);
    };

    addFitting(-4.4, 0.45, 0);
    addFitting(-0.1, 0.45, 0); // Wall sleeve collar
    addFitting(1.1, 0.45, 0);  // T-Junction

    // 10. Sistem Partikel Aliran Gas Nyata yang SANGAT JELAS TERLIHAT
    const particleCount = 500;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    interface ParticleTracker {
      curveIndex: number; // 0=Inlet, 1=ValveToT, 2=Stove, 3=Heater
      t: number;
      speed: number;
      radiusOffset: THREE.Vector2;
    }

    const particles: ParticleTracker[] = [];

    for (let p = 0; p < particleCount; p++) {
      let cIdx = 0;
      if (p < 160) cIdx = 0; // Inlet
      else if (p < 320) cIdx = 1; // Valve to T
      else if (p < 430) cIdx = 2; // Stove
      else cIdx = 3; // Heater

      particles.push({
        curveIndex: cIdx,
        t: Math.random(),
        speed: 0.18 + Math.random() * 0.12,
        radiusOffset: new THREE.Vector2(
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05
        )
      });
    }

    particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );

    // Partikel bersprite glow radial cyan tajam dengan ukuran 0.28 (sangat mencolok & indah)
    const gasTexture = createGasGlowTexture();
    const particleMat = new THREE.PointsMaterial({
      map: gasTexture,
      color: 0x00f5ff,
      size: 0.28,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    particleSystem.renderOrder = 10; // Selalu dirender di atas pipa agar terlihat 100% jelas!
    scene.add(particleSystem);

    // 11. Animation Loop & Real-Time Telemetry Sync
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = lastTime;
    let isRunning = true;

    let currentValveAngle = targetAngleDeg;
    let currentNeedleMbar = valveStatus === 'OPEN' ? 28.0 : 0.0;
    let currentStove1Flame = 0;
    let currentStove2Flame = 0;
    let currentHeaterFlame = 0;
    let pulseRotation = 0;

    const animate = (time: number) => {
      if (!isRunning) return;

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Update FPS
      frameCount++;
      if (time - lastFpsUpdate >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastFpsUpdate = time;
      }

      const {
        valveAngleDeg: tgtAngle,
        flowRateLpm: fRate,
        valveStatus: vStat,
        appliances: appState,
        cameraTarget,
        isTransitioningCamera
      } = stateRef.current;

      // Smooth Camera Preset Transition
      if (isTransitioningCamera) {
        camera.position.lerp(cameraTarget.position, 0.06);
        controls.target.lerp(cameraTarget.lookAt, 0.06);
        if (camera.position.distanceTo(cameraTarget.position) < 0.05) {
          stateRef.current.isTransitioningCamera = false;
        }
      }

      controls.update();

      // 1. Putaran Katup Motorik CWX-15Q (0° CLOSED s/d 90° OPEN)
      // Easing motorik DC geared 12V: rotasi mantap, bertahap, dan realistis
      const angleDiff = tgtAngle - currentValveAngle;
      if (Math.abs(angleDiff) > 0.05) {
        currentValveAngle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), delta * 45 + Math.abs(angleDiff) * 0.12);
      } else {
        currentValveAngle = tgtAngle;
      }

      // Rasio bukaan katup: 0.0 = tertutup penuh (0°), 1.0 = terbuka penuh (90°)
      const openFraction = THREE.MathUtils.clamp(currentValveAngle / 90.0, 0.0, 1.0);

      // Rotasi Bola Katup, Poros Stem, & Indikator Top Dial:
      // Pada openFraction = 1 (OPEN): rotasi 0 rad (lubang orifice sejajar pipa X)
      // Pada openFraction = 0 (CLOSED): rotasi PI/2 rad (lubang berputar 90°, dinding bola kuningan menutup rapat pipa)
      const ballRotY = (1.0 - openFraction) * (Math.PI / 2);
      valveBallGroup.rotation.y = ballRotY;
      stemGroup.rotation.y = ballRotY;
      topIndicatorGroup.rotation.y = ballRotY;

      // Glow Inti Aliran di Dalam Lubang Bola Katup
      boreCoreMat.opacity = openFraction * 0.75;

      // 2. Status LED Aktuator & Bilah Indikator Mekanikal
      if (openFraction > 0.95 && vStat === 'OPEN') {
        ledMat.color.setHex(0x10b981); // Emerald Green
        indicatorBarMat.color.setHex(0x10b981);
      } else if (openFraction < 0.05 && vStat === 'CLOSED') {
        ledMat.color.setHex(0xef4444); // Crimson Red
        indicatorBarMat.color.setHex(0xef4444);
      } else {
        // Mode transisi bergerak (CLOSING atau OPENING)
        const blink = Math.sin(time * 0.016) > 0;
        ledMat.color.setHex(blink ? 0xfbbf24 : 0x78350f); // Amber kedip
        indicatorBarMat.color.setHex(0xf59e0b); // Amber
      }

      // 3. Jarum Manometer Tekanan Gas Downstream (0 - 30 mbar)
      const targetMbar = openFraction * 28.0;
      currentNeedleMbar = THREE.MathUtils.lerp(currentNeedleMbar, targetMbar, 0.06);
      needleMesh.rotation.z = -1.18 + (currentNeedleMbar / 30.0) * 2.36;

      // 4. Putaran Piringan Pulsa Meter (hanya berputar saat gas mengalir)
      if (openFraction > 0.05 && fRate > 0) {
        pulseRotation += fRate * delta * 2.5 * openFraction;
        pulseDisk.rotation.x = pulseRotation;
      }

      // Dinamika Visual Pipa Hilir saat Katup Dimatikan vs Dibuka
      if (openFraction < 0.08) {
        // Pipa hilir meredup kosong ke warna abu-abu dingin (menunjukkan pipa kosong tanpa gas)
        downstreamSightGlassMat.color.lerp(new THREE.Color(0x334155), 0.08);
        downstreamSightGlassMat.opacity = THREE.MathUtils.lerp(downstreamSightGlassMat.opacity, 0.18, 0.08);
        downstreamInnerMeshes.forEach((m) => {
          (m.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
            (m.material as THREE.MeshBasicMaterial).opacity,
            0.0,
            0.1
          );
        });
      } else {
        // Pipa hilir aktif mengalirkan gas kuning standar Jargas
        downstreamSightGlassMat.color.lerp(new THREE.Color(0xf59e0b), 0.08);
        downstreamSightGlassMat.opacity = THREE.MathUtils.lerp(downstreamSightGlassMat.opacity, 0.42 * openFraction, 0.08);
        const pulseOpacity = (0.24 + Math.sin(time * 0.008) * 0.08) * openFraction;
        downstreamInnerMeshes.forEach((m) => {
          (m.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
            (m.material as THREE.MeshBasicMaterial).opacity,
            pulseOpacity,
            0.1
          );
        });
      }

      // Pipa hulu selalu menyala (tekanan pipa kota selalu ada sebelum katup)
      if (upstreamInnerMesh) {
        const upMat = upstreamInnerMesh.material as THREE.MeshBasicMaterial;
        upMat.opacity = 0.26 + Math.sin(time * 0.006) * 0.06;
      }

      // 5. Target Api Kompor & Water Heater (Hanya menyala bila openFraction > 0.1)
      const isGasFlowing = openFraction > 0.1;
      const targetS1 = !isGasFlowing
        ? 0
        : (appState.stove1 === 'HIGH' ? 1.15 : appState.stove1 === 'MED' ? 0.7 : appState.stove1 === 'LOW' ? 0.35 : 0) * openFraction;

      const targetS2 = !isGasFlowing
        ? 0
        : (appState.stove2 === 'MED' ? 0.7 : 0) * openFraction;

      const targetWH = !isGasFlowing
        ? 0
        : (appState.waterHeater === 'ON' ? 0.85 : 0) * openFraction;

      currentStove1Flame = THREE.MathUtils.lerp(currentStove1Flame, targetS1, 0.1);
      currentStove2Flame = THREE.MathUtils.lerp(currentStove2Flame, targetS2, 0.1);
      currentHeaterFlame = THREE.MathUtils.lerp(currentHeaterFlame, targetWH, 0.1);

      // Animasi Flicker Api Prosedural
      const flicker1 = 1.0 + Math.sin(time * 0.035) * 0.08 + Math.cos(time * 0.05) * 0.05;
      const flicker2 = 1.0 + Math.sin(time * 0.04 + 1.5) * 0.08;
      const flickerWH = 1.0 + Math.sin(time * 0.03 + 2.8) * 0.06;

      if (currentStove1Flame > 0.01) {
        burner1.flameGroup.scale.set(
          currentStove1Flame * flicker1,
          currentStove1Flame * flicker1,
          currentStove1Flame * flicker1
        );
        stove1Light.intensity = currentStove1Flame * 2.4;
      } else {
        burner1.flameGroup.scale.set(0.001, 0.001, 0.001);
        stove1Light.intensity = 0;
      }

      if (currentStove2Flame > 0.01) {
        burner2.flameGroup.scale.set(
          currentStove2Flame * flicker2,
          currentStove2Flame * flicker2,
          currentStove2Flame * flicker2
        );
        stove2Light.intensity = currentStove2Flame * 2.4;
      } else {
        burner2.flameGroup.scale.set(0.001, 0.001, 0.001);
        stove2Light.intensity = 0;
      }

      if (currentHeaterFlame > 0.01) {
        heaterFlame.scale.set(
          currentHeaterFlame * flickerWH,
          currentHeaterFlame * flickerWH,
          currentHeaterFlame * flickerWH
        );
        heaterLight.intensity = currentHeaterFlame * 2.0;
      } else {
        heaterFlame.scale.set(0.001, 0.001, 0.001);
        heaterLight.intensity = 0;
      }

      // 6. Animasi Partikel Aliran Gas Mengikuti Jalur Kurva
      const curves = [curve1, curve2, curve3, curve4];
      const speedMultiplier = openFraction > 0.05 ? Math.max(0.4, (fRate / 4.0) * 2.0) * openFraction : 0;
      const isCompletelyClosed = openFraction < 0.05;

      const positions = particleGeo.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        if (p.curveIndex === 0) {
          // Pipa Hulu (Jargas -> Meter -> Bibir Muka Katup Bola)
          if (isCompletelyClosed) {
            p.t += p.speed * 0.1 * delta;
            // Jika sudah di depan katup yang tertutup rapat, partikel tertahan dan berdesakan lembut
            if (p.t > 0.96) {
              p.t = 0.94 + Math.sin(time * 0.004 + p.radiusOffset.x * 25) * 0.02;
            }
          } else {
            p.t += p.speed * Math.max(0.5, speedMultiplier) * delta;
            if (p.t >= 1.0) p.t = p.t % 1.0;
          }
        } else {
          // Pipa Hilir (Katup Keluar -> Dinding -> Kompor & Heater)
          if (isCompletelyClosed) {
            // Hilir kosong sepenuhnya saat katup tertutup
            positions[i * 3] = 999;
            positions[i * 3 + 1] = 999;
            positions[i * 3 + 2] = 999;
            continue;
          } else {
            p.t += p.speed * speedMultiplier * delta;
            if (p.t >= 1.0) p.t = p.t % 1.0;
          }
        }

        // Clamp aman dalam batas [0.001, 0.998] agar CatmullRomCurve3 tidak mengalami out-of-bounds
        const safeT = Math.min(Math.max(p.t, 0.001), 0.998);
        const activeCurve = curves[p.curveIndex];

        if (activeCurve) {
          try {
            const pt = activeCurve.getPointAt(safeT);
            if (pt && typeof pt.x === 'number') {
              positions[i * 3] = pt.x + p.radiusOffset.x;
              positions[i * 3 + 1] = pt.y + p.radiusOffset.y;
              positions[i * 3 + 2] = pt.z;
            }
          } catch {
            // Safe fallback
          }
        }
      }

      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight || 480;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, []);

  return (
    <div className="relative bg-[#070c18] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Interactive Control Bar (Bebas Tulisan Simulasi 3D) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 z-20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
            DIGITAL TWIN JARGAS &bull; DISTRIBUSI RUMAH TANGGA
          </span>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            {fps} FPS
          </span>
        </div>

        {/* Viewport Preset Buttons & Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => switchCameraPreset('overview')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activePreset === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
            title="Lihat seluruh sistem dari pipa jalan hingga dapur"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Seluruh Alur</span>
          </button>

          <button
            onClick={() => switchCameraPreset('valve')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activePreset === 'valve'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
            title="Fokus stasiun meter dan katup motorik CWX-15Q (X-Ray)"
          >
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Katup & Meter</span>
          </button>

          <button
            onClick={() => switchCameraPreset('kitchen')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activePreset === 'kitchen'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
            title="Fokus dapur, nyala api kompor, dan water heater"
          >
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Dapur & Api</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          {/* Toggle Annotations */}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showAnnotations
                ? 'bg-slate-800 text-amber-400 border-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle Label Anotasi"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Reset Orbit */}
          <button
            onClick={() => switchCameraPreset('overview')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset Sudut Kamera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-[460px] cursor-grab active:cursor-grabbing relative outline-none select-none"
      />

      {/* Overlay Anotasi Arsitektural (Jika Aktif) */}
      {showAnnotations && (
        <div className="absolute inset-0 pointer-events-none z-10 p-4 flex flex-col justify-between">
          {/* Top Spatial Badges */}
          <div className="flex justify-between items-start">
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-slate-300 flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>1. Jaringan Gas Kota (Pipa Kuning Jargas)</span>
            </div>

            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-slate-300 flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>2. Penetrasi Dinding & Kompor Dapur</span>
            </div>
          </div>

          {/* Bottom Live Telemetry Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/40">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${
                  valveStatus === 'OPEN'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : valveStatus === 'CLOSING'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {valveStatus === 'OPEN' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : valveStatus === 'CLOSING' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>KATUP CWX-15Q: {valveStatus} ({Math.round(targetAngleDeg)}°)</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300">
                Tekanan Kerja:{' '}
                <span className="text-cyan-400 font-bold">
                  {valveStatus === 'OPEN' ? '28.0' : valveStatus === 'CLOSING' ? '12.0' : '0.0'} mbar
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setValveManual(valveStatus === 'OPEN' ? 'CLOSE' : 'OPEN')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono border transition-all ${
                  valveStatus === 'OPEN'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {valveStatus === 'OPEN' ? 'Kunci Katup (Tutup)' : 'Buka Katup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orbit Tip Bottom Center */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-[10px] font-mono text-slate-500 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800/50 flex items-center gap-1">
        <Compass className="w-3 h-3 text-slate-400 animate-spin" />
        <span>Tahan klik kiri & geser untuk rotasi 3D &bull; Scroll untuk zoom in/out</span>
      </div>
    </div>
  );
};
