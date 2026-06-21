import { useMemo, useRef } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { EventRequest, Space } from '@/domain/types';
import { spaceStatusAt, statusColor } from '@/domain/status';

// ── 3D digital twin ──────────────────────────────────────────────────
// Loads the Pyramid GLB. Each node whose name matches a space id becomes a
// live, selectable, drifting room (coloured by status); everything else
// (shell, "unselectable" tiers, stray geometry) renders dimmed and inert.

const MODEL = '/pyramid.glb';
const ACCENT = '#8b5cc4';

interface Props {
  spaces: Space[];
  events: EventRequest[];
  scrubHour: number;
  conflictSpaceIds: Set<string>;
  selectedSpaceId: string | null;
  onSelect: (id: string) => void;
}

interface Room {
  node: THREE.Object3D;
  id: string;
  meshes: THREE.Mesh[];
  base: THREE.Vector3;
  phase: number;
}

// three's GLTFLoader sanitizes node names (strips '.', spaces). Match ids the
// same way so 'floor-1box1.1' (node → 'floor-1box11') still resolves.
const norm = (s: string) => s.replace(/[\s.]+/g, '');

const matsOf = (m: THREE.Mesh): THREE.MeshStandardMaterial[] =>
  (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];

function findRoomId(obj: THREE.Object3D | null): string | null {
  let n = obj;
  while (n) {
    if (n.userData?.roomId) return n.userData.roomId as string;
    n = n.parent;
  }
  return null;
}

function Model({ spaces, events, scrubHour, conflictSpaceIds, selectedSpaceId, onSelect }: Props) {
  const { scene } = useGLTF(MODEL);
  const idByNode = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of spaces) m.set(norm(s.id), s.id);
    return m;
  }, [spaces]);

  const { root, rooms, amp } = useMemo(() => {
    const root = scene.clone(true);

    // Collect the named room nodes (sanitized node name → space id).
    const roomNodes = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      const id = o.name ? idByNode.get(norm(o.name)) : undefined;
      if (id && !roomNodes.has(id)) roomNodes.set(id, o);
    });

    const rooms: Room[] = [];
    const roomMeshes = new Set<THREE.Mesh>();
    roomNodes.forEach((node, id) => {
      const meshes: THREE.Mesh[] = [];
      node.traverse((m) => {
        if ((m as THREE.Mesh).isMesh) {
          const mesh = m as THREE.Mesh;
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((x) => x.clone())
            : mesh.material.clone();
          mesh.userData.roomId = id;
          meshes.push(mesh);
          roomMeshes.add(mesh);
        }
      });
      rooms.push({ node, id, meshes, base: node.position.clone(), phase: Math.random() * Math.PI * 2 });
    });

    // Everything else → dimmed, inert scenery.
    root.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh || roomMeshes.has(mesh)) return;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((x) => x.clone())
        : mesh.material.clone();
      for (const mat of matsOf(mesh)) {
        mat.color?.set('#d8d1c2');
        mat.emissive?.set('#000000');
        mat.roughness = 1;
        mat.metalness = 0;
        mat.transparent = true;
        mat.opacity = 0.35;
      }
      mesh.userData.dim = true;
    });

    // Frame on the rooms only — ignore the huge shell / stray geometry so the
    // rooms fill the view. Recenter + scale the whole model to a unit-ish size.
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    rooms.forEach((r) => box.expandByObject(r.node));
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const k = 1.5 / (sphere.radius || 1);
    root.scale.setScalar(k);
    root.position.copy(sphere.center).multiplyScalar(-k);
    const localSize = box.getSize(new THREE.Vector3());
    return { root, rooms, amp: localSize.length() * 0.004 };
  }, [scene, idByNode]);

  const hovered = useRef<string | null>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (const r of rooms) {
      // gentle anchored drift
      r.node.position.set(
        r.base.x + Math.sin(t * 0.6 + r.phase) * amp,
        r.base.y + Math.sin(t * 0.9 + r.phase) * amp * 1.5,
        r.base.z + Math.cos(t * 0.5 + r.phase) * amp,
      );
      r.node.rotation.z = Math.sin(t * 0.4 + r.phase) * 0.012;

      const space = spaces.find((s) => s.id === r.id);
      const status = space ? spaceStatusAt(space, events, scrubHour, conflictSpaceIds) : 'free';
      const selected = r.id === selectedSpaceId;
      const hot = selected || hovered.current === r.id;
      const col = statusColor(status);
      for (const m of r.meshes) {
        for (const mat of matsOf(m)) {
          mat.color?.set(col);
          if (mat.emissive) {
            // rooms self-glow their status colour so they read on black
            mat.emissive.set(selected ? ACCENT : col);
            mat.emissiveIntensity = selected ? 0.95 : hot ? 0.7 : 0.4;
          }
        }
      }
      r.node.scale.setScalar(selected ? 1.05 : 1);
    }
  });

  return (
    <primitive
      object={root}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const id = findRoomId(e.object);
        if (id) {
          e.stopPropagation();
          onSelect(id);
        }
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        const id = findRoomId(e.object);
        hovered.current = id;
        document.body.style.cursor = id ? 'pointer' : 'auto';
      }}
      onPointerOut={() => {
        hovered.current = null;
        document.body.style.cursor = 'auto';
      }}
    />
  );
}

export default function Pyramid3D(props: Props) {
  return (
    <div className="h-[340px] w-full overflow-hidden rounded-lg border-2 border-ink" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #fff4e6 0%, #fbf7ef 55%, #efe9dd 100%)' }}>
      <Canvas camera={{ position: [0, 1.6, 4.6], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.9} />
        <hemisphereLight args={['#ffffff', '#1a1a22', 0.7]} />
        <directionalLight position={[6, 9, 5]} intensity={1.2} />
        <directionalLight position={[-6, -2, -5]} intensity={0.4} />
        <Model {...props} />
        <OrbitControls makeDefault enablePan={false} target={[0, 0, 0]} minDistance={1.5} maxDistance={12} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL);
