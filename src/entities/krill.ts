import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";

interface BoidMember {
  obj: GameObj;
  relPos: Vec2;
  phase: number;
  speed: number;
  baseColor: any;
}

/**
 * Cria um cardume reativo de krill composto por 8 a 10 indivíduos com
 * comportamento coletivo de boids, ondulação senoidal, bioluminescência sutil,
 * dispersão assustada na proximidade da baleia e destaque vibrante (halo e cintilação)
 * ao ser iluminado pelo Biosonar 360°.
 */
export function createKrill(k: KaboomCtx, position: Vec2): GameObj {
  let revealTimer = 0;
  let haloCircle: GameObj | null = null;
  let haloInner: GameObj | null = null;

  // Entidade central com colisor para TAGS.KRILL
  const krillCluster = k.add([
    k.rect(26, 26),
    k.pos(position),
    k.opacity(0), // Invisível, o colisor central representa o núcleo do cardume
    k.area(),
    k.anchor("center"),
    TAGS.KRILL,
    "krill_swarm",
    {
      reveal() {
        revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
        spawnSonarAura();
      },
      isRevealed() {
        return revealTimer > 0;
      },
    },
  ]);

  const boidCount = 9;
  const boids: BoidMember[] = [];

  for (let i = 0; i < boidCount; i++) {
    const angle = (i / boidCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const radius = 3 + Math.random() * 11;
    const relX = Math.cos(angle) * radius;
    const relY = Math.sin(angle) * radius;

    const isHighContrast = accessibilitySystem.isHighContrast();
    const baseColor = isHighContrast
      ? k.rgb(255, 230, 50)
      : k.rgb(
          255,
          150 + Math.floor(Math.random() * 45),
          60 + Math.floor(Math.random() * 40)
        );

    const boidObj = k.add([
      k.rect(isHighContrast ? 4.8 : 4.2, isHighContrast ? 2.8 : 2.4, { radius: 1 }),
      k.pos(position.x + relX, position.y + relY),
      k.rotate(0),
      k.color(baseColor),
      isHighContrast ? k.outline(1, k.rgb(0, 0, 0)) : null,
      k.opacity(isHighContrast ? 1.0 : 0.85),
      k.anchor("center"),
      k.scale(1),
      k.z(11),
    ].filter(Boolean));

    boids.push({
      obj: boidObj,
      relPos: k.vec2(relX, relY),
      phase: Math.random() * Math.PI * 2,
      speed: 1.8 + Math.random() * 1.6,
      baseColor,
    });
  }

  const spawnSonarAura = () => {
    // 1. Halo externo bioluminescente
    if (!haloCircle) {
      haloCircle = k.add([
        k.circle(30),
        k.pos(krillCluster.pos),
        k.color(255, 215, 80),
        k.outline(2.5, k.rgb(100, 255, 220)),
        k.opacity(0.4),
        k.anchor("center"),
        k.z(9),
      ]);
    }

    // 2. Halo pulsante interno
    if (!haloInner) {
      haloInner = k.add([
        k.circle(18),
        k.pos(krillCluster.pos),
        k.color(255, 235, 120),
        k.opacity(0.3),
        k.anchor("center"),
        k.z(10),
      ]);
    }


    // Partículas de explosão de bioluminescência
    for (let i = 0; i < 6; i++) {
      const spark = k.add([
        k.circle(k.rand(1.5, 2.5)),
        k.pos(
          krillCluster.pos.x + k.rand(-14, 14),
          krillCluster.pos.y + k.rand(-14, 14)
        ),
        k.color(k.choose([k.rgb(255, 235, 120), k.rgb(100, 255, 220)])),
        k.opacity(0.9),
        k.z(13),
      ]);
      const dir = k.vec2(k.rand(-35, 35), k.rand(-35, 35));
      spark.onUpdate(() => {
        spark.pos = spark.pos.add(dir.scale(k.dt()));
        spark.opacity -= k.dt() * 2.2;
        if (spark.opacity <= 0) k.destroy(spark);
      });
    }
  };

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

    // Atualização dos Halos do Sonar
    if (revealTimer > 0) {
      revealTimer -= dt;
      const revealProgress = Math.min(1, revealTimer / 1.5);
      const pulseBreathe = 0.85 + Math.sin(time * 5.5) * 0.15;

      if (haloCircle) {
        haloCircle.pos = krillCluster.pos;
        haloCircle.radius = (28 + Math.sin(time * 4) * 4) * pulseBreathe;
        haloCircle.opacity = 0.45 * revealProgress * pulseBreathe;
      }
      if (haloInner) {
        haloInner.pos = krillCluster.pos;
        haloInner.radius = 16 * pulseBreathe;
        haloInner.opacity = 0.35 * revealProgress;
      }
    } else {
      if (haloCircle) { k.destroy(haloCircle); haloCircle = null; }
      if (haloInner) { k.destroy(haloInner); haloInner = null; }
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

      if (revealTimer > 0) {
        // Iluminação de alta intensidade, dourado-esmeralda com brilho cintilante
        const revealFactor = Math.min(1, revealTimer / 1.2);
        b.obj.color = b.baseColor.lerp(k.rgb(255, 240, 130), revealFactor);
        b.obj.scale = k.vec2(1.35, 1.35);
        b.obj.opacity = 0.95;

        // Micro-cintilação biológica
        if (Math.random() < 0.06) {
          const glint = k.add([
            k.circle(1.2),
            k.pos(b.obj.pos),
            k.color(255, 235, 130),
            k.opacity(0.8),
            k.z(12),
          ]);
          glint.onUpdate(() => {
            glint.opacity -= dt * 2.5;
            glint.pos.y -= dt * 12;
            if (glint.opacity <= 0) k.destroy(glint);
          });
        }
      } else {
        b.obj.color = b.baseColor;
        b.obj.scale = k.vec2(1, 1);
        // Glimmer bioluminescente orgânico suave no escuro
        b.obj.opacity = 0.72 + Math.sin(time * 4.5 + b.phase) * 0.22;
      }
    }
  });

  krillCluster.onDestroy(() => {
    if (haloCircle) { try { k.destroy(haloCircle); } catch {} }
    if (haloInner) { try { k.destroy(haloInner); } catch {} }

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