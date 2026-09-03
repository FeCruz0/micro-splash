import type { KaboomCtx, Vec2 } from "kaboom";
import { TAGS } from "../config";

export function createGhostNet(k: KaboomCtx, position: Vec2) {
    const net = k.add([
        k.rect(35, 50, {radius: 3 }),
        k.pos(position),
        k.color(180, 80, 220), // violeta
        k.opacity(1),
        k.area(),
        k.anchor("center"),
        TAGS.NET,
    ]);

    let time = Math.random() * 5;
    k.onUpdate(() => {
        time += k.dt();
        net.pos.y += Math.sin(time * 2) * 0.2; // balanço na correnteza

        // fade out
        if (net.opacity > 0) {
            net.opacity = Math.max(0, net.opacity - k.dt() * 0.25);
        }
    });

    return net;
}