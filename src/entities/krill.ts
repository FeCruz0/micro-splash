import type { KaboomCtx, Vec2 } from "kaboom";
import { TAGS } from "../config";

export function createKrill(k: KaboomCtx, position: Vec2) {
    const krill = k.add([
        k.rect(16, 16),
        k.pos(position),
        k.color(255, 180, 50),
        k.area(),
        k.anchor("center"),
        k.opacity(1),
        TAGS.KRILL,
    ]);

    const baseY = position.y;

    // efeito ondulação
    let time = Math.random() * 10;
    k.onUpdate(() => {
        time += k.dt() * 3;
        krill.pos.y = baseY + Math.sin(time) * 5;
    });

    return krill;
}