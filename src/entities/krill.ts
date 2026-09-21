import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { TAGS } from "../config";

interface BoidMember {
  obj: GameObj;
  relPos: Vec2;
  phase: number;
  speed: number;
}

/**
 * Cria um cardume reativo de krill composto por 8 a 10 indivíduos com
 * comportamento coletivo de boids, ondulação senoidal, bioluminescência sutil
 * e dispersão assustada quando o jogador se aproxima.
 */
export function createKrill(k: KaboomCtx, position: Vec2): GameObj {
  // Entidade central com colisor para TAGS.KRILL
  const krillCluster = k.add([
    k.rect(26, 26),
    k.pos(position),
    k.opacity(0), // Invisível, o colisor central representa o núcleo do cardume
    k.area(),
    k.anchor("center"),
    TAGS.KRILL,
    "krill_swarm",
  ]);

  const boidCount = 9;
  const boids: BoidMember[] = [];

  for (let i = 0; i < boidCount; i++) {
    const angle = (i / boidCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const radius = 3 + Math.random() * 11;
    const relX = Math.cos(angle) * radius;
    const relY = Math.sin(angle) * radius;

    const boidObj = k.add([
      k.rect(3.5, 2),
      k.pos(position.x + relX, position.y + relY),
      k.rotate(0),
      k.color(
        255,
        155 + Math.floor(Math.random() * 50),
        50 + Math.floor(Math.random() * 40)
      ),
      k.opacity(0.85),
      k.anchor("center"),
      k.z(11),
    ]);

    boids.push({
      obj: boidObj,
      relPos: k.vec2(relX, relY),
      phase: Math.random() * Math.PI * 2,
      speed: 1.8 + Math.random() * 1.6,
    });
  }

  let time = Math.random() * 10;
  const baseY = position.y;

  krillCluster.onUpdate(() => {
    const dt = k.dt();
    time += dt;

    // Ondulação vertical coletiva do cardume
    const currentY = baseY + Math.sin(time * 2.2) * 5;
    krillCluster.pos.y = currentY;
    krillCluster.pos.x = position.x;

    // Detecção de proximidade com a baleia para dispersão reativa
    const player = k.get(TAGS.PLAYER)[0];
    let isScattering = false;
    let scatterDir = k.vec2(0, 0);

    if (player && player.exists()) {
      const dist = player.pos.dist(krillCluster.pos);
      if (dist < 110 && dist > 0.001) {
        isScattering = true;
        scatterDir = krillCluster.pos.sub(player.pos).unit();
      }
    }

    for (const b of boids) {
      if (!b.obj.exists()) continue;

      if (isScattering) {
        // Dispersão em leque para longe da baleia
        const targetScatter = scatterDir.scale(22 + Math.sin(b.phase + time * 3) * 8);
        b.relPos = b.relPos.lerp(targetScatter, dt * 5.5);
      } else {
        // Órbita suave e coesão em torno do centro do cardume
        const orbitAngle = time * b.speed + b.phase;
        const targetRel = k.vec2(
          Math.cos(orbitAngle) * 11,
          Math.sin(orbitAngle * 1.2) * 7
        );
        b.relPos = b.relPos.lerp(targetRel, dt * 3);
      }

      b.obj.pos = krillCluster.pos.add(b.relPos);
      b.obj.angle = Math.sin(time * 3.5 + b.phase) * 14;
      // Glimmer bioluminescente orgânico
      b.obj.opacity = 0.72 + Math.sin(time * 4.5 + b.phase) * 0.22;
    }
  });

  krillCluster.onDestroy(() => {
    // Destrói todos os boids filhos
    for (const b of boids) {
      if (b.obj.exists()) {
        k.destroy(b.obj);
      }
    }

    // Micro-partículas bioluminescentes ao ser engolido
    for (let i = 0; i < 6; i++) {
      const p = k.add([
        k.circle(1.8),
        k.pos(
          krillCluster.pos.x + (Math.random() - 0.5) * 14,
          krillCluster.pos.y + (Math.random() - 0.5) * 14
        ),
        k.color(255, 215, 120),
        k.opacity(0.85),
        k.z(12),
      ]);
      const dir = k.vec2((Math.random() - 0.5) * 70, (Math.random() - 0.5) * 70);
      p.onUpdate(() => {
        p.pos = p.pos.add(dir.scale(k.dt()));
        p.opacity -= k.dt() * 3.2;
        if (p.opacity <= 0) k.destroy(p);
      });
    }
  });

  return krillCluster;
}