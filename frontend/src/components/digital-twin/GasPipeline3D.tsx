import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGas } from '../../context/GasContext';
import { RotateCcw, Eye, Play, Pause, Flame, Gauge, Info } from 'lucide-react';
import { formatVolume } from '../../utils/formatters';

/**
 * Tekstur partikel gas bercahaya halus untuk visualisasi aliran
 */
function createParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(56, 189, 248, 1.0)');   // Inti cyan terang
  gradient.addColorStop(0.3, 'rgba(14, 165, 233, 0.8)'); // Biru langit
  gradient.addColorStop(0.7, 'rgba(2, 132, 199, 0.25)'); // Pendaran lembut
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');          // Transparan

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Tekstur layar LCD meteran gas digital
 */
function createMeterLcdTexture(volumeStr: string, statusStr: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Background LCD Hijau/Biru Matrix
  ctx.fillStyle = '#062822';
  ctx.fillRect(0, 0, 256, 128);

  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 248, 120);

  // Header
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#2dd4bf';
  ctx.fillText('GASAUTO SMART METER', 16, 28);

  // Volume Display
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#5eead4';
  ctx.fillText(volumeStr, 16, 74);

  // Unit & Status
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#99f6e4';
  ctx.fillText('m³  ' + statusStr, 16, 108);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const GasPipeline3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { meter, appliances } = useGas();

  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  const valveStatus = meter?.valveStatus || 'CLOSED';
  const targetAngleDeg = meter?.valveAngleDeg ?? 0;
  const flowRateLpm = meter?.currentFlowRateLpm || 0;
  const remainingM3 = meter?.remainingQuotaM3 ?? 0;

  // State sinkronisasi untuk animation loop Three.js
  const stateRef = useRef({
    valveAngleDeg: targetAngleDeg,
    flowRateLpm: flowRateLpm,
    valveStatus: valveStatus,
    remainingM3: remainingM3,
    appliances: appliances,
    autoRotate: false
  });

  useEffect(() => {
    stateRef.current.valveAngleDeg = targetAngleDeg;
    stateRef.current.flowRateLpm = flowRateLpm;
    stateRef.current.valveStatus = valveStatus;
    stateRef.current.remainingM3 = remainingM3;
    stateRef.current.appliances = appliances;
    stateRef.current.autoRotate = autoRotate;
  }, [targetAngleDeg, flowRateLpm, valveStatus, remainingM3, appliances, autoRotate]);

  const controlsRef = useRef<OrbitControls | null>(null);

  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 800;
    const height = 460;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.8);
    const lookAtPoint = new THREE.Vector3(0, 0.4, 0);
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
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Tidak tembus lantai
    controls.minDistance = 2.5;
    controls.maxDistance = 10.0;
    controls.target.copy(lookAtPoint);
    controls.saveState();
    controlsRef.current = controls;

    // 2. Pencahayaan Studio
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);

    // 3. Material Bersih
    const baseBoardMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.2
    });

    const meterBodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.6,
      roughness: 0.3
    });

    const pipeYellowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.5,
      roughness: 0.35
    });

    const pipeGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transmission: 0.9,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.1,
      depthWrite: false
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25
    });

    const stoveMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.7,
      roughness: 0.2
    });

    const burnerGrateMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      metalness: 0.4,
      roughness: 0.8
    });

    // 4. Struktur Mini Diorama
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Landasan Meja Dapur / Pedestal Elegan
    const tableGeo = new THREE.BoxGeometry(6.4, 0.25, 2.8);
    const tableMesh = new THREE.Mesh(tableGeo, baseBoardMat);
    tableMesh.position.set(0, -0.125, 0);
    tableMesh.receiveShadow = true;
    mainGroup.add(tableMesh);

    // Garis Aksen Meja
    const accentLineGeo = new THREE.BoxGeometry(6.4, 0.02, 0.04);
    const accentLineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const accentLine = new THREE.Mesh(accentLineGeo, accentLineMat);
    accentLine.position.set(0, 0.01, 1.38);
    mainGroup.add(accentLine);

    // ==========================================
    // 5. METERAN GAS PINTAR (KIRI: X = -2.2)
    // ==========================================
    const meterGroup = new THREE.Group();
    meterGroup.position.set(-2.2, 0.8, 0);
    mainGroup.add(meterGroup);

    // Tiang Penyangga Meteran
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 16);
    const poleMesh = new THREE.Mesh(poleGeo, meterBodyMat);
    poleMesh.position.set(0, -0.4, 0);
    meterGroup.add(poleMesh);

    // Bodi Kotak Meteran
    const boxGeo = new THREE.BoxGeometry(0.85, 1.05, 0.45);
    const boxMesh = new THREE.Mesh(boxGeo, meterBodyMat);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    meterGroup.add(boxMesh);

    // Bezel Depan Meteran
    const bezelGeo = new THREE.BoxGeometry(0.72, 0.45, 0.04);
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(0, 0.15, 0.23);
    meterGroup.add(bezelMesh);

    // Layar LCD Meteran
    const lcdGeo = new THREE.PlaneGeometry(0.64, 0.36);
    let lcdTexture = createMeterLcdTexture('5.0000', 'SIAP');
    const lcdMat = new THREE.MeshBasicMaterial({ map: lcdTexture });
    const lcdMesh = new THREE.Mesh(lcdGeo, lcdMat);
    lcdMesh.position.set(0, 0.15, 0.255);
    meterGroup.add(lcdMesh);

    // Lampu Indikator Status LED (Hijau = Buka/Aman, Merah = Tertutup)
    const ledGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.5,
      roughness: 0.2
    });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.28, 0.4, 0.23);
    meterGroup.add(ledMesh);

    // Label Mini Serial Number
    const labelGeo = new THREE.BoxGeometry(0.4, 0.12, 0.02);
    const labelMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.set(0, -0.25, 0.23);
    meterGroup.add(labelMesh);

    // ==========================================
    // 6. KATUP OTOMATIS CWX-15Q (TENGAH: X = -0.7)
    // ==========================================
    const valveGroup = new THREE.Group();
    valveGroup.position.set(-0.7, 0.4, 0);
    mainGroup.add(valveGroup);

    // Rumah Katup Kuningan (Valve Body)
    const valveBodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 24);
    valveBodyGeo.rotateZ(Math.PI / 2);
    const valveBody = new THREE.Mesh(valveBodyGeo, brassMat);
    valveBody.castShadow = true;
    valveGroup.add(valveBody);

    // Motor Box Aktuator Biru
    const actuatorGeo = new THREE.BoxGeometry(0.26, 0.28, 0.26);
    const actuatorMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.4,
      roughness: 0.3
    });
    const actuator = new THREE.Mesh(actuatorGeo, actuatorMat);
    actuator.position.set(0, 0.22, 0);
    actuator.castShadow = true;
    valveGroup.add(actuator);

    // Tuas / Indikator Posisi Katup (Berputar 90 Derajat)
    const handleGeo = new THREE.BoxGeometry(0.2, 0.04, 0.05);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
    const handleMesh = new THREE.Mesh(handleGeo, handleMat);
    handleMesh.position.set(0, 0.38, 0);
    valveGroup.add(handleMesh);

    // ==========================================
    // 7. PIPA GAS & JALUR ALIRAN TRANSPARAN
    // ==========================================
    const pipeGroup = new THREE.Group();
    mainGroup.add(pipeGroup);

    // Pipa dari Meteran ke Katup (Kuning)
    const p1Geo = new THREE.CylinderGeometry(0.065, 0.065, 1.2, 24);
    p1Geo.rotateZ(Math.PI / 2);
    const p1 = new THREE.Mesh(p1Geo, pipeYellowMat);
    p1.position.set(-1.45, 0.4, 0);
    p1.castShadow = true;
    pipeGroup.add(p1);

    // Pipa Sight-Glass Transparan dari Katup ke Kompor (Melihat Aliran Gas)
    const glassPipeGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.8, 24);
    glassPipeGeo.rotateZ(Math.PI / 2);
    const glassPipe = new THREE.Mesh(glassPipeGeo, pipeGlassMat);
    glassPipe.position.set(0.4, 0.4, 0);
    pipeGroup.add(glassPipe);

    // Cincin Sambungan Pipa (Flange Fittings)
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const createFlange = (x: number) => {
      const fGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16);
      fGeo.rotateZ(Math.PI / 2);
      const f = new THREE.Mesh(fGeo, flangeMat);
      f.position.set(x, 0.4, 0);
      pipeGroup.add(f);
    };
    createFlange(-2.0);
    createFlange(-0.9);
    createFlange(-0.5);
    createFlange(1.3);

    // Sistem Partikel Aliran Gas Bercahaya
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    const minX = -1.9;
    const maxX = 1.3;

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = minX + Math.random() * (maxX - minX);
      particlePositions[i * 3 + 1] = 0.4 + (Math.random() - 0.5) * 0.04;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
      particleSpeeds[i] = 0.015 + Math.random() * 0.02;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleTexture = createParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 0.16,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x38bdf8,
      opacity: 0.85
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    pipeGroup.add(particles);

    // ==========================================
    // 8. KOMPOR GAS MODERN (KANAN: X = 1.8)
    // ==========================================
    const stoveGroup = new THREE.Group();
    stoveGroup.position.set(1.8, 0, 0);
    mainGroup.add(stoveGroup);

    // Badan Kompor Stainless Hitam
    const cooktopBaseGeo = new THREE.BoxGeometry(1.9, 0.08, 1.4);
    const cooktopBase = new THREE.Mesh(cooktopBaseGeo, stoveMat);
    cooktopBase.position.set(0, 0.04, 0);
    cooktopBase.castShadow = true;
    cooktopBase.receiveShadow = true;
    stoveGroup.add(cooktopBase);

    // Pipa Masuk Kompor
    const pInGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16);
    pInGeo.rotateZ(Math.PI / 2);
    const pIn = new THREE.Mesh(pInGeo, pipeYellowMat);
    pIn.position.set(-0.7, 0.4, 0);
    stoveGroup.add(pIn);

    const pDownGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 16);
    const pDown = new THREE.Mesh(pDownGeo, pipeYellowMat);
    pDown.position.set(-0.5, 0.22, 0);
    stoveGroup.add(pDown);

    // Fungsi Pembantu Pembuat Tungku & Api
    const createBurner = (xPos: number, zPos: number) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(xPos, 0.08, zPos);

      // Dudukan Tungku
      const rimGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.03, 32);
      const rim = new THREE.Mesh(rimGeo, brassMat);
      bGroup.add(rim);

      // Jeruji Besi Kompor
      const grateGeo = new THREE.TorusGeometry(0.29, 0.02, 12, 24);
      grateGeo.rotateX(Math.PI / 2);
      const grate = new THREE.Mesh(grateGeo, burnerGrateMat);
      grate.position.set(0, 0.02, 0);
      bGroup.add(grate);

      // 4 Kaki Jeruji
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2;
        const ribGeo = new THREE.BoxGeometry(0.28, 0.03, 0.03);
        const rib = new THREE.Mesh(ribGeo, burnerGrateMat);
        rib.position.set(Math.cos(ang) * 0.16, 0.02, Math.sin(ang) * 0.16);
        rib.rotation.y = -ang;
        bGroup.add(rib);
      }

      // Api Biru Cantik (Stylized Blue Flame)
      const flameGroup = new THREE.Group();
      flameGroup.position.set(0, 0.02, 0);

      const flameGeo = new THREE.ConeGeometry(0.2, 0.35, 24, 1, true);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const flameCore = new THREE.Mesh(flameGeo, flameMat);
      flameCore.position.set(0, 0.175, 0);
      flameGroup.add(flameCore);

      const flameOuterGeo = new THREE.ConeGeometry(0.25, 0.42, 24, 1, true);
      const flameOuterMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const flameOuter = new THREE.Mesh(flameOuterGeo, flameOuterMat);
      flameOuter.position.set(0, 0.21, 0);
      flameGroup.add(flameOuter);

      // Cahaya Api Dinamis
      const flameLight = new THREE.PointLight(0x00f0ff, 0, 2.5);
      flameLight.position.set(0, 0.25, 0);
      flameGroup.add(flameLight);

      flameGroup.scale.set(0.001, 0.001, 0.001); // Default padam
      bGroup.add(flameGroup);

      stoveGroup.add(bGroup);
      return { bGroup, flameGroup, flameLight };
    };

    const burner1 = createBurner(-0.45, 0); // Kompor 1
    const burner2 = createBurner(0.45, 0);  // Kompor 2

    // ==========================================
    // 9. ANIMATION LOOP
    // ==========================================
    let animationFrameId: number;
    let clock = new THREE.Clock();

    let lastLcdUpdate = 0;
    let currentHandleAngle = targetAngleDeg * (Math.PI / 180);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const { valveStatus, valveAngleDeg, flowRateLpm, remainingM3, appliances, autoRotate } =
        stateRef.current;

      const isGasFlowing = valveStatus === 'OPEN' && remainingM3 > 0 && flowRateLpm > 0;

      // Rotasi otomatis jika diaktifkan
      if (autoRotate) {
        mainGroup.rotation.y += delta * 0.35;
      } else {
        mainGroup.rotation.y = 0;
      }

      // Animasi perputaran tuas katup (0 deg = tertutup, 90 deg = terbuka)
      const targetRad = (valveAngleDeg * Math.PI) / 180;
      currentHandleAngle = THREE.MathUtils.lerp(currentHandleAngle, targetRad, delta * 6);
      handleMesh.rotation.y = currentHandleAngle;

      // Warna tuas & LED
      if (valveStatus === 'OPEN') {
        handleMat.color.setHex(0x10b981);
        ledMat.color.setHex(0x10b981);
        ledMat.emissive.setHex(0x10b981);
      } else if (valveStatus === 'CLOSING') {
        handleMat.color.setHex(0xf59e0b);
        ledMat.color.setHex(0xf59e0b);
        ledMat.emissive.setHex(0xf59e0b);
      } else {
        handleMat.color.setHex(0xef4444);
        ledMat.color.setHex(0xef4444);
        ledMat.emissive.setHex(0xef4444);
      }

      // Update Layar LCD Meteran (tiap 500ms)
      if (elapsed - lastLcdUpdate > 0.5) {
        lastLcdUpdate = elapsed;
        const statusText = valveStatus === 'OPEN' ? 'NORMAL' : 'STOP';
        const newTex = createMeterLcdTexture(remainingM3.toFixed(4), statusText);
        lcdMesh.material = new THREE.MeshBasicMaterial({ map: newTex });
      }

      // Animasi Partikel Aliran Gas di Pipa
      if (isGasFlowing) {
        const positions = particleGeo.attributes.position.array as Float32Array;
        const speedMultiplier = Math.min(2.5, Math.max(0.6, flowRateLpm / 1.5));

        for (let i = 0; i < particleCount; i++) {
          positions[i * 3] += particleSpeeds[i] * speedMultiplier;
          if (positions[i * 3] > maxX) {
            positions[i * 3] = minX;
          }
        }
        particleGeo.attributes.position.needsUpdate = true;
        particleMat.opacity = 0.85;
      } else {
        particleMat.opacity = THREE.MathUtils.lerp(particleMat.opacity, 0.1, delta * 4);
      }

      // Animasi Api Kompor 1
      const stove1Active = isGasFlowing && appliances.stove1 !== 'OFF';
      let stove1Scale = 0.001;
      if (stove1Active) {
        const baseScale =
          appliances.stove1 === 'HIGH' ? 1.25 : appliances.stove1 === 'MED' ? 0.95 : 0.65;
        // Goyangan api alami
        const flicker = 1.0 + Math.sin(elapsed * 18) * 0.08 + Math.cos(elapsed * 25) * 0.05;
        stove1Scale = baseScale * flicker;
        burner1.flameLight.intensity = baseScale * 2.5;
      } else {
        burner1.flameLight.intensity = 0;
      }
      burner1.flameGroup.scale.set(stove1Scale, stove1Scale, stove1Scale);

      // Animasi Api Kompor 2
      const stove2Active = isGasFlowing && appliances.stove2 === 'MED';
      let stove2Scale = 0.001;
      if (stove2Active) {
        const flicker = 1.0 + Math.sin(elapsed * 16 + 1.2) * 0.08;
        stove2Scale = 0.95 * flicker;
        burner2.flameLight.intensity = 2.0;
      } else {
        burner2.flameLight.intensity = 0;
      }
      burner2.flameGroup.scale.set(stove2Scale, stove2Scale, stove2Scale);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      particleTexture.dispose();
      lcdTexture.dispose();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Simulasi Aliran Gas 3D
              <span className="text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Interaktif
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Meteran pintar menyalurkan gas melalui katup otomatis menuju kompor dapur
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              showLabels
                ? 'bg-slate-800 text-sky-400 border border-sky-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Tampilkan / Sembunyikan Label Petunjuk"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Petunjuk</span>
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              autoRotate
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Putar Otomatis"
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Putar 3D</span>
          </button>

          <button
            onClick={resetCamera}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
            title="Kembalikan Posisi Kamera Awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className="relative w-full h-[360px] sm:h-[420px] bg-gradient-to-b from-[#0b121e] to-[#070b12]">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Overlay Label Petunjuk Interaktif (Friendly Pills) */}
        {showLabels && (
          <div className="absolute inset-x-0 bottom-3 px-4 flex items-center justify-center gap-2 flex-wrap pointer-events-none">
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-slate-200">1. Meteran Gas Pintar</span>
              <span className="text-[11px] font-mono text-cyan-400">
                ({formatVolume(remainingM3)})
              </span>
            </div>

            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  valveStatus === 'OPEN' ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span className="font-semibold text-slate-200">2. Katup Otomatis</span>
              <span
                className={`text-[11px] font-bold ${
                  valveStatus === 'OPEN' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ({valveStatus === 'OPEN' ? 'TERBUKA' : 'TERTUTUP'})
              </span>
            </div>

            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
              <Flame
                className={`w-3.5 h-3.5 ${
                  flowRateLpm > 0 && valveStatus === 'OPEN'
                    ? 'text-amber-400 animate-bounce'
                    : 'text-slate-500'
                }`}
              />
              <span className="font-semibold text-slate-200">3. Kompor Dapur</span>
              <span className="text-[11px] text-slate-400">
                {appliances.stove1 !== 'OFF' || appliances.stove2 !== 'OFF'
                  ? 'Menyala'
                  : 'Mati'}
              </span>
            </div>
          </div>
        )}

        {/* Petunjuk Gesture untuk Teman */}
        <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-sm border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 pointer-events-none flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          <span>Klik & seret untuk memutar &bull; Scroll untuk zoom</span>
        </div>
      </div>
    </div>
  );
};
