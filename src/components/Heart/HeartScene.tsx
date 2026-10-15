import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HeartModel } from './HeartModel';
import { BloodFlowSystem } from './BloodFlowParticles';
import { ANATOMICAL_STRUCTURES, AnatomicalStructure } from '../../types/cardiac';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  Layers, 
  Sparkles, 
  Camera, 
  Maximize2, 
  Minimize2,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Upload,
  ZoomIn,
  ZoomOut,
  FolderUp,
  Box
} from 'lucide-react';

interface HeartSceneProps {
  heartRate: number;
  isPlaying: boolean;
  bloodFlowVisible: boolean;
  bloodFlowSpeed: number;
  showLabels: boolean;
  viewMode: 'standard' | 'xray' | 'flowOnly';
  activeChamber: string | null;
  onTogglePlay: () => void;
  onToggleBloodFlow: () => void;
  onChangeBloodFlowSpeed: (speed: number) => void;
  onToggleLabels: () => void;
  onChangeViewMode: (mode: 'standard' | 'xray' | 'flowOnly') => void;
  onSelectChamber: (chamberId: string | null) => void;
}

export const HeartScene: React.FC<HeartSceneProps> = ({
  heartRate,
  isPlaying,
  bloodFlowVisible,
  bloodFlowSpeed,
  showLabels,
  viewMode,
  activeChamber,
  onTogglePlay,
  onToggleBloodFlow,
  onChangeBloodFlowSpeed,
  onToggleLabels,
  onChangeViewMode,
  onSelectChamber,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<'anterior' | 'lateral' | 'posterior' | 'superior' | 'apex'>('anterior');
  const [selectedStructure, setSelectedStructure] = useState<AnatomicalStructure | null>(null);
  const [glbStatus, setGlbStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [glbProgress, setGlbProgress] = useState<number>(0);
  const [glbError, setGlbError] = useState<string | null>(null);
  const [loadedModelName, setLoadedModelName] = useState<string>('Procedural 3D Heart');
  const [isCustomGlbActive, setIsCustomGlbActive] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // References to mutable Three.js objects
  const heartModelRef = useRef<HeartModel | null>(null);
  const bloodFlowRef = useRef<BloodFlowSystem | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Interaction & camera target states
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({
    radius: 4.8,
    theta: 0.15, // horizontal angle
    phi: Math.PI / 2.15,  // vertical inclination
  });
  const targetSphericalRef = useRef({
    radius: 4.8,
    theta: 0.15,
    phi: Math.PI / 2.15,
  });

  // Reusable 2D screen positions for 3D label tags
  const [labelCoords, setLabelCoords] = useState<{ id: string; x: number; y: number; visible: boolean }[]>([]);

  // Simulation phase accumulator
  const phaseRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 500;

      // 1. Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.background = new THREE.Color(0x07111f);
      scene.fog = new THREE.FogExp2(0x07111f, 0.05);

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
      cameraRef.current = camera;
      camera.position.set(0, 0.2, 4.8);

      // 3. Renderer with ACES Filmic tone mapping
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      rendererRef.current = renderer;
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Mount canvas
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // 4. Procedural Studio Reflection Map (RoomEnvironment)
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();

      // 5. Studio Lighting Rig
      const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
      keyLight.position.set(4, 5, 4);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      const fillLight = new THREE.HemisphereLight(0x89c4f4, 0x14213d, 1.2);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x37d6f5, 1.5);
      rimLight.position.set(-4, -2, -3);
      scene.add(rimLight);

      // Soft contact shadow plane beneath heart
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sCtx = shadowCanvas.getContext('2d')!;
      const sGrad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
      sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      sGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
      sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = sGrad;
      sCtx.fillRect(0, 0, 128, 128);

      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.5, 3.5),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        })
      );
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -1.55;
      scene.add(shadowPlane);

      // 6. Instantiate Modular Anatomical Heart
      const heartModel = new HeartModel();
      heartModelRef.current = heartModel;
      scene.add(heartModel.group);

      // Gracefully inspect public GLB without throwing uncaught errors
      fetch('/human-heart-cutaway.glb', { method: 'HEAD' })
        .then((res) => {
          const len = parseInt(res.headers.get('content-length') || '0', 10);
          if (len > 100) {
            setGlbStatus('loading');
            heartModel.loadGLB(
              '/human-heart-cutaway.glb',
              () => {
                setGlbStatus('loaded');
                setGlbError(null);
                setLoadedModelName('human-heart-cutaway.glb');
                setIsCustomGlbActive(true);
              },
              (percent) => {
                setGlbProgress(percent);
              },
              () => {
                // Keep procedural active cleanly
                setGlbStatus('idle');
              }
            );
          } else {
            setGlbStatus('idle');
          }
        })
        .catch(() => {
          setGlbStatus('idle');
        });

      // 7. Instantiate Blood Flow Particles System
      const bloodFlow = new BloodFlowSystem();
      bloodFlowRef.current = bloodFlow;
      scene.add(bloodFlow.group);

      // 8. Resize Observer for responsive canvas
      const resizeObserver = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0) return;
        const entry = entries[0];
        const newWidth = Math.max(entry.contentRect.width, 300);
        const newHeight = Math.max(entry.contentRect.height, 300);

        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newWidth / newHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newWidth, newHeight);
        }
      });
      resizeObserver.observe(container);

      // 9. Animation Tick Loop
      const tempVec = new THREE.Vector3();
      const tick = () => {
        const now = performance.now();
        const delta = Math.min((now - lastTimeRef.current) / 1000, 0.1);
        lastTimeRef.current = now;

        // Advance cardiac cycle phase: frequency = heartRate / 60
        if (isPlaying) {
          const cycleRate = heartRate / 60; // cycles per second
          phaseRef.current = (phaseRef.current + delta * cycleRate) % 1.0;
        }

        // Update heart biomechanics & blood flow
        if (heartModelRef.current) {
          heartModelRef.current.update(phaseRef.current, isPlaying);
        }

        if (bloodFlowRef.current) {
          bloodFlowRef.current.update(delta, bloodFlowSpeed, heartRate, isPlaying);
        }

        // Camera damping
        const cur = cameraSphericalRef.current;
        const tgt = targetSphericalRef.current;
        cur.radius = THREE.MathUtils.damp(cur.radius, tgt.radius, 8, delta);
        cur.theta = THREE.MathUtils.damp(cur.theta, tgt.theta, 8, delta);
        cur.phi = THREE.MathUtils.damp(cur.phi, tgt.phi, 8, delta);

        if (cameraRef.current) {
          cameraRef.current.position.set(
            cur.radius * Math.sin(cur.phi) * Math.sin(cur.theta),
            cur.radius * Math.cos(cur.phi),
            cur.radius * Math.sin(cur.phi) * Math.cos(cur.theta)
          );
          cameraRef.current.lookAt(0, 0.1, 0);

          // Update 2D positions of anatomical label badges
          if (showLabels && container) {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const coords = Object.entries(ANATOMICAL_STRUCTURES).map(([id, struct]) => {
              tempVec.set(struct.position[0], struct.position[1], struct.position[2]);
              tempVec.project(cameraRef.current!);
              const visible = tempVec.z < 1.0;
              const screenX = ((tempVec.x + 1) * w) / 2;
              const screenY = ((-tempVec.y + 1) * h) / 2;
              return { id, x: screenX, y: screenY, visible };
            });
            setLabelCoords(coords);
          }
        }

        renderer.render(scene, camera);
        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);

      return () => {
        resizeObserver.disconnect();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        heartModel.dispose();
        bloodFlow.dispose();
        renderer.dispose();
        container.innerHTML = '';
      };
    } catch (e) {
      console.error('Failed to initialize Three.js WebGL scene:', e);
      setWebglSupported(false);
    }
  }, []);

  // Update heart visual style on prop changes
  useEffect(() => {
    if (heartModelRef.current) {
      heartModelRef.current.setStyle({ viewMode, activeChamber });
    }
  }, [viewMode, activeChamber]);

  // Update blood flow visibility
  useEffect(() => {
    if (bloodFlowRef.current) {
      bloodFlowRef.current.setVisible(bloodFlowVisible);
    }
  }, [bloodFlowVisible]);

  // Pointer event handlers for orbiting and zooming
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    prevPointerRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - prevPointerRef.current.x;
    const dy = e.clientY - prevPointerRef.current.y;
    prevPointerRef.current = { x: e.clientX, y: e.clientY };

    const tgt = targetSphericalRef.current;
    tgt.theta -= dx * 0.007;
    tgt.phi = Math.max(0.2, Math.min(Math.PI - 0.2, tgt.phi - dy * 0.007));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const tgt = targetSphericalRef.current;
    tgt.radius = Math.max(2.4, Math.min(7.5, tgt.radius + e.deltaY * 0.0035));
  };

  // Camera presets
  const applyCameraPreset = (preset: 'anterior' | 'lateral' | 'posterior' | 'superior' | 'apex') => {
    setCameraPreset(preset);
    const tgt = targetSphericalRef.current;
    switch (preset) {
      case 'anterior':
        tgt.theta = 0.15;
        tgt.phi = Math.PI / 2.15;
        tgt.radius = 4.8;
        break;
      case 'lateral':
        tgt.theta = Math.PI / 2;
        tgt.phi = Math.PI / 2.1;
        tgt.radius = 4.6;
        break;
      case 'posterior':
        tgt.theta = Math.PI;
        tgt.phi = Math.PI / 2.15;
        tgt.radius = 4.8;
        break;
      case 'superior':
        tgt.theta = 0.1;
        tgt.phi = 0.45;
        tgt.radius = 4.5;
        break;
      case 'apex':
        tgt.theta = 0.2;
        tgt.phi = Math.PI - 0.55;
        tgt.radius = 4.5;
        break;
    }
  };

  const resetCamera = () => {
    applyCameraPreset('anterior');
  };

  const zoomIn = () => {
    targetSphericalRef.current.radius = Math.max(2.2, targetSphericalRef.current.radius - 0.6);
  };

  const zoomOut = () => {
    targetSphericalRef.current.radius = Math.min(9.5, targetSphericalRef.current.radius + 0.6);
  };

  const handleFileUpload = (file: File) => {
    if (!file || !heartModelRef.current) return;
    setGlbStatus('loading');
    setGlbError(null);
    setLoadedModelName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return;
      heartModelRef.current?.loadGLBFromBuffer(
        buffer,
        file.name,
        () => {
          setGlbStatus('loaded');
          setGlbError(null);
          setIsCustomGlbActive(true);
        },
        (pct) => setGlbProgress(pct),
        (err) => {
          setGlbStatus('error');
          setGlbError(err.message || 'Failed to parse GLB file');
          setIsCustomGlbActive(false);
        }
      );
    };
    reader.onerror = () => {
      setGlbStatus('error');
      setGlbError('Failed to read file from disk');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
        handleFileUpload(file);
      } else {
        setGlbStatus('error');
        setGlbError('Please drop a 3D model in .glb or .gltf format.');
      }
    }
  };

  const toggleModelSource = () => {
    if (!heartModelRef.current) return;
    const nextState = !isCustomGlbActive;
    setIsCustomGlbActive(nextState);
    heartModelRef.current.setModelSource(nextState ? 'glb' : 'procedural');
  };

  const handleLabelClick = (id: string) => {
    const struct = ANATOMICAL_STRUCTURES[id];
    if (struct) {
      setSelectedStructure(struct);
      onSelectChamber(id);
    }
  };

  if (!webglSupported) {
    return (
      <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center bg-[#07111F] rounded-xl border border-[#37D6F5]/20 p-8 text-center">
        <Info className="w-12 h-12 text-[#FF5C70] mb-4" />
        <h3 className="text-xl font-bold text-white mb-2 font-tech">WebGL 3D Context Unavailable</h3>
        <p className="text-sm text-slate-300 max-w-md mb-6">
          Your browser or display environment could not initialize hardware-accelerated WebGL. You can still use the 2D Hemodynamics Simulator, Live ECG Monitor, and CardioAI Assistant.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#101D2D] hover:bg-[#1B2C42] text-[#37D6F5] border border-[#37D6F5]/40 rounded-lg text-sm font-medium transition"
        >
          Reload Visualizer
        </button>
      </div>
    );
  }

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full h-full min-h-[500px] flex flex-col rounded-2xl overflow-hidden bg-[#07111F] border border-[#37D6F5]/20 shadow-2xl"
    >
      {/* Hidden file input for uploading custom GLB */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".glb,.gltf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-[#07111F]/90 backdrop-blur-sm border-2 border-dashed border-[#37D6F5] rounded-2xl flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          <FolderUp className="w-16 h-16 text-[#37D6F5] animate-bounce mb-3" />
          <h4 className="text-lg font-tech font-bold text-white mb-1">Drop 3D Heart Model Here</h4>
          <p className="text-xs text-slate-300 font-mono">Accepts .glb or .gltf files for instant 3D viewport rendering</p>
        </div>
      )}

      {/* 3D WebGL Canvas Layer */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="w-full flex-1 cursor-grab active:cursor-grabbing touch-none select-none relative"
      />

      {/* Floating 3D Interactive Anatomical Labels */}
      {showLabels && labelCoords.map((item) => {
        const struct = ANATOMICAL_STRUCTURES[item.id];
        if (!struct || !item.visible) return null;
        const isSelected = selectedStructure?.id === item.id;
        const isOxygenated = struct.oxygenation === 'oxygenated';

        return (
          <button
            key={item.id}
            onClick={() => handleLabelClick(item.id)}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute z-10 px-2.5 py-1 rounded-full text-[11px] font-mono tracking-tight transition-all duration-150 flex items-center gap-1.5 shadow-lg border backdrop-blur-none cursor-pointer ${
              isSelected
                ? 'bg-[#37D6F5] text-slate-950 font-bold border-white ring-2 ring-[#37D6F5]/50 scale-110'
                : isOxygenated
                ? 'bg-[#101D2D]/90 text-rose-200 border-[#FF5C70]/40 hover:border-[#FF5C70] hover:bg-[#1B2C42]'
                : 'bg-[#101D2D]/90 text-cyan-200 border-[#37D6F5]/40 hover:border-[#37D6F5] hover:bg-[#1B2C42]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOxygenated ? 'bg-[#FF5C70]' : 'bg-[#37D6F5]'}`} />
            {struct.name.split(' (')[0]}
          </button>
        );
      })}

      {/* Top Floating Mini-HUD: Spec Header & Interactive Tools */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="pointer-events-auto bg-[#101D2D]/90 backdrop-blur-none border border-[#37D6F5]/25 rounded-xl px-3.5 py-2 flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs font-tech font-semibold tracking-wider text-slate-200 uppercase">
              3D Cardiac Biomechanics
            </span>
          </div>
          <span className="text-slate-500 text-xs">|</span>
          <span className="text-xs font-mono text-[#37D6F5]">{heartRate} BPM</span>
          <span className="text-slate-500 text-xs">|</span>
          <span className="text-xs font-mono text-slate-300">
            {isPlaying ? 'ACTIVE SYSTOLE / DIASTOLE' : 'PAUSED'}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={zoomIn}
            title="Zoom In"
            className="p-2 bg-[#101D2D]/90 hover:bg-[#1B2C42] text-slate-300 hover:text-[#37D6F5] border border-[#37D6F5]/20 rounded-xl transition shadow-lg cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            title="Zoom Out"
            className="p-2 bg-[#101D2D]/90 hover:bg-[#1B2C42] text-slate-300 hover:text-[#37D6F5] border border-[#37D6F5]/20 rounded-xl transition shadow-lg cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Upload Custom GLB Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload custom 3D model (.glb/.gltf)"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#101D2D]/90 hover:bg-[#1B2C42] text-[#37D6F5] hover:text-white border border-[#37D6F5]/30 rounded-xl transition shadow-lg cursor-pointer text-xs font-mono"
          >
            <FolderUp className="w-4 h-4 text-[#37D6F5]" />
            <span className="hidden sm:inline">Upload GLB</span>
          </button>

          {/* Reset Camera button */}
          <button
            onClick={resetCamera}
            title="Reset Camera View"
            className="p-2 bg-[#101D2D]/90 hover:bg-[#1B2C42] text-slate-300 hover:text-[#37D6F5] border border-[#37D6F5]/20 rounded-xl transition shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Cinema mode toggle */}
          <button
            onClick={() => setIsCinemaMode(!isCinemaMode)}
            title={isCinemaMode ? 'Expand HUD' : 'Cinema Mode (Hide HUD)'}
            className="p-2 bg-[#101D2D]/90 hover:bg-[#1B2C42] text-slate-300 hover:text-[#37D6F5] border border-[#37D6F5]/20 rounded-xl transition shadow-lg cursor-pointer"
          >
            {isCinemaMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Selected Structure Inspector Drawer (Top Right Overlay) */}
      {selectedStructure && (
        <div className="absolute top-16 right-4 max-w-sm w-full bg-[#101D2D]/95 border border-[#37D6F5]/30 rounded-xl p-4 shadow-2xl z-20">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedStructure.oxygenation === 'oxygenated' ? 'bg-[#FF5C70]' : 'bg-[#37D6F5]'
                  }`}
                />
                <h4 className="text-sm font-tech font-bold text-white tracking-wide">
                  {selectedStructure.name}
                </h4>
              </div>
              <p className="text-[11px] font-mono italic text-slate-400 mt-0.5">
                {selectedStructure.latinName}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedStructure(null);
                onSelectChamber(null);
              }}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800/60"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {selectedStructure.description}
          </p>

          <div className="space-y-1.5 text-[11px] font-mono border-t border-slate-700/60 pt-2.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Pressure Profile:</span>
              <span className="text-[#37D6F5] text-right font-medium">{selectedStructure.pressureProfile}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Functional Role:</span>
              <span className="text-emerald-400 text-right">{selectedStructure.keyRole}</span>
            </div>
          </div>
        </div>
      )}

      {/* Blood Flow Legend (Top-Left under title) */}
      <div className="absolute top-16 left-4 bg-[#101D2D]/85 border border-[#37D6F5]/20 rounded-xl px-3 py-2 flex items-center gap-4 text-xs font-mono z-10 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5C70]" />
          <span className="text-slate-200">Oxygen-Rich (Arterial)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#37D6F5]" />
          <span className="text-slate-200">Oxygen-Poor (Venous)</span>
        </div>
      </div>

      {/* 3D Model Status Pill */}
      <div className="absolute top-28 left-4 z-20 flex flex-col gap-1.5 max-w-sm pointer-events-auto">
        {glbStatus === 'loading' && (
          <div className="bg-[#101D2D]/95 border border-[#37D6F5]/40 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-[#37D6F5] shadow-lg">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading 3D Model: {loadedModelName} ({glbProgress}%)</span>
          </div>
        )}

        {glbStatus === 'loaded' && (
          <div className="bg-[#101D2D]/95 border border-[#10B981]/40 rounded-xl px-3 py-1.5 flex items-center justify-between gap-3 text-xs font-mono text-[#10B981] shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Model: {loadedModelName}</span>
            </div>
            <button
              onClick={toggleModelSource}
              className="text-[10px] underline hover:text-white text-slate-300 ml-2 cursor-pointer"
            >
              {isCustomGlbActive ? 'Use Procedural' : 'Use GLB'}
            </button>
          </div>
        )}

        {glbStatus === 'error' && (
          <div className="bg-[#101D2D]/95 border border-amber-500/40 rounded-xl p-3 flex flex-col gap-1.5 text-xs font-mono shadow-2xl text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>3D Notice</span>
              </div>
              <button
                onClick={() => setGlbStatus('idle')}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {glbError}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-[#37D6F5]/20 hover:bg-[#37D6F5]/30 text-[#37D6F5] border border-[#37D6F5]/40 text-[11px] font-semibold transition cursor-pointer"
              >
                Select GLB File
              </button>
              <button
                onClick={() => setGlbStatus('idle')}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {glbStatus === 'idle' && (
          <div className="bg-[#101D2D]/85 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono text-slate-400 shadow-md">
            <Box className="w-3.5 h-3.5 text-[#37D6F5]" />
            <span>Procedural 3D Anatomy · Drag & drop or upload GLB</span>
          </div>
        )}
      </div>

      {/* Unified Bottom Control Dock (Complies with Three.js Skill layout) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl transition-all duration-300 z-30 ${
          isCinemaMode ? 'translate-y-[120%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="bg-[#101D2D]/95 border border-[#37D6F5]/25 rounded-2xl p-3 shadow-2xl backdrop-blur-none flex flex-wrap items-center justify-between gap-3">
          {/* Heartbeat Play/Pause */}
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                isPlaying
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                  : 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 hover:bg-[#10B981]/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Heartbeat' : 'Resume Heartbeat'}</span>
            </button>

            {/* Blood Flow Toggle */}
            <button
              onClick={onToggleBloodFlow}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                bloodFlowVisible
                  ? 'bg-[#37D6F5]/20 text-[#37D6F5] border-[#37D6F5]/40 hover:bg-[#37D6F5]/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Flow Particles</span>
            </button>
          </div>

          {/* Flow Speed Slider */}
          {bloodFlowVisible && (
            <div className="flex items-center gap-2 bg-[#07111F]/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400">Flow Speed:</span>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.25"
                value={bloodFlowSpeed}
                onChange={(e) => onChangeBloodFlowSpeed(parseFloat(e.target.value))}
                className="w-20 accent-[#37D6F5] cursor-pointer"
              />
              <span className="text-[11px] font-mono text-[#37D6F5] w-7">{bloodFlowSpeed.toFixed(1)}x</span>
            </div>
          )}

          {/* View Modes */}
          <div className="flex items-center gap-1 bg-[#07111F]/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => onChangeViewMode('standard')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'standard'
                  ? 'bg-[#37D6F5] text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Anatomical
            </button>
            <button
              onClick={() => onChangeViewMode('xray')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'xray'
                  ? 'bg-[#37D6F5] text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              X-Ray
            </button>
            <button
              onClick={() => onChangeViewMode('flowOnly')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'flowOnly'
                  ? 'bg-[#37D6F5] text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hemodynamics
            </button>
          </div>

          {/* Anatomical Labels Toggle */}
          <button
            onClick={onToggleLabels}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
              showLabels
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Labels</span>
          </button>

          {/* Camera Angles */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <Camera className="w-3.5 h-3.5 text-[#37D6F5]" />
            <span className="hidden sm:inline">Angle:</span>
            {(['anterior', 'lateral', 'posterior', 'superior', 'apex'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyCameraPreset(preset)}
                className={`px-2 py-0.5 rounded capitalize transition cursor-pointer ${
                  cameraPreset === preset
                    ? 'bg-[#37D6F5]/20 text-[#37D6F5] border border-[#37D6F5]/40 font-semibold'
                    : 'hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
