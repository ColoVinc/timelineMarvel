import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Stone } from '../data/stones';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Pseudo-random deterministico da posizione + seed.
function hash(x: number, y: number, z: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 13.13) * 43758.5453;
  return s - Math.floor(s);
}

// Icosaedro con i vertici spostati → cristallo grezzo e sfaccettato.
function makeCrystal(seed: number, amp: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = hash(v.x, v.y, v.z, seed); // 0..1
    v.multiplyScalar(1 + (n - 0.5) * 2 * amp);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function Gem({ stone }: { stone: Stone }) {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => makeCrystal(stone.seed, stone.amp), [stone.seed, stone.amp]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((_, dt) => {
    if (REDUCED || !ref.current) return;
    ref.current.rotation.y += dt * 0.55;
    ref.current.rotation.x += dt * 0.22;
  });

  return (
    <group ref={ref}>
      {/* Guscio cristallino semi-trasparente */}
      <mesh geometry={geo}>
        <meshStandardMaterial
          color={stone.color}
          emissive={stone.color}
          emissiveIntensity={0.45}
          roughness={stone.roughness}
          metalness={stone.metalness}
          flatShading
          transparent
          opacity={0.82}
        />
      </mesh>
      {/* Nucleo luminoso interno che traspare dal cristallo */}
      <mesh scale={0.5} renderOrder={1}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          color={stone.core}
          toneMapped={false}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// Gemma dell'Infinito 3D in-flow (scorre con la timeline). Bagliore e
// fluttuazione sono in CSS attorno al canvas.
export function InfinityStone({ stone }: { stone: Stone }) {
  return (
    <div
      className="infinity-stone"
      style={{ ['--stone']: stone.color, ['--stone-core']: stone.core } as CSSProperties}
      title={stone.name}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.3], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[2.5, 2.5, 3]} intensity={2.2} />
        <pointLight position={[-2, -1, 1.5]} intensity={1} color={stone.color} />
        {/* Luce interna colorata: illumina le facce dall'interno */}
        <pointLight position={[0, 0, 0]} intensity={1.6} distance={3} color={stone.core} />
        <Gem stone={stone} />
      </Canvas>
    </div>
  );
}
