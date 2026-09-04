import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { createKrill } from "../entities/krill";

export function setupUpwellingSystem(k: KaboomCtx, playerController: any) {
    let upwellingTimer = 0;
    let isUpwellingActive = false;
    let upwellingEventTimer = 0;

    k.onUpdate(() => {
        // só produz ressurgencia se baleia não estiver desmaiando
        if (playerController.isFainting()) return;

        upwellingTimer += k.dt();

        // ativa ressurgencia a cada 18 segundos
        if (upwellingTimer >= GAME_CONFIG.UPWELLING_INTERVAL && !isUpwellingActive) {
            isUpwellingActive = true;
            upwellingEventTimer = GAME_CONFIG.UPWELLING_DURATION;
            upwellingTimer = 0;
            k.shake(2); // leve tremida na tela
        }

        // ativa ressurgencia (4 segundos)
        if (isUpwellingActive) {
            upwellingEventTimer -= k.dt();

            // fluxo de agua ascendente na diagonal para direita
            if (Math.random() < 0.4) {
                const playerXPosition = playerController.gameObj.pos.x;
                const spawnXPosition = playerXPosition + (Math.random() * 400 - 100);
                const spawnYPosition = k.height() - 40;

                const upwellingStream = k.add([
                    k.rect(30, 80, { radius: 10 }),
                    k.pos(spawnXPosition, spawnYPosition),
                    k.color(0, 220, 255),
                    k.opacity(0.4),
                    k.rotate(-25), // 25º de inclinação
                    k.area(),
                    k.anchor("center"),
                    k.z(-1),
                    TAGS.UPWELLING_STREAM,
                ]);

                let streamTime = 0;
                upwellingStream.onUpdate(() => {
                    streamTime += k.dt();
                    // move jato diagonalmente para direita e para cima
                    upwellingStream.pos.x += k.dt() * GAME_CONFIG.UPWELLING_PUSH_X;
                    upwellingStream.pos.y += k.dt() * GAME_CONFIG.UPWELLING_PUSH_Y;
                    upwellingStream.pos.x += Math.sin(streamTime * 4) * 0.8 // oscilação

                    upwellingStream.opacity -= k.dt() * 0.2;
                    if (upwellingStream.pos.y <= 40 || upwellingStream.opacity <= 0) {
                        k.destroy(upwellingStream);
                    }
                });
            }

            // gera cardume de krill na area
            if (Math.random() < 0.05) {
                const playerXPosition = playerController.gameObj.pos.x;
                const krillXPosition = playerXPosition + 300 + Math.random() * 200;
                const krillYPosition = k.height() - 100 - Math.random() * 200;
                createKrill(k, k.vec2(krillXPosition, krillYPosition));
            }

            if (upwellingEventTimer <=0) {
                isUpwellingActive = false;
            }
        }
    });

    // física: ressurgencia empurra baleia
    k.onCollideUpdate(TAGS.PLAYER, TAGS.UPWELLING_STREAM, (_player, _upwellingStream) => {
        const currentVelocity = playerController.getSpeed();
        playerController.setSpeed(
            k.vec2(
                currentVelocity.x + GAME_CONFIG.UPWELLING_PUSH_X * k.dt() * 0.8,
                currentVelocity.y + GAME_CONFIG.UPWELLING_PUSH_Y * k.dt() * 0.8
            )
        );
    });
}