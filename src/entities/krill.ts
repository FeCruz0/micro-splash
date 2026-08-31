import type { KaboomCtx, Vec2 } from "kaboom";
import { TAGS } from "../config";

export function createKrill(k: KaboomCtx, position: Vec2) {
    const krill = k.add([
        k.rect(16, 16),
        k.pos(position),
        k.color(255, 180, 50),
        k.area(),
        k.anchor("center"),
        TAGS.KRILL,
    ]);

    // efeito ondulação
    let time =  Math.random() * 10;
    k.onUpdate(() => {
        time += k.dt() *4;
        krill.pos.y += Math.sin(time) * 0.4;
    });

    return krill;
}