import { z } from "zod";
import {
  readLocalStorageWithSchema,
  writeLocalStorage,
  removeLocalStorageItem,
} from "../utils/storage";

export const TelemetryDataSchema = z.object({
  factsReadCount: z.number().int().nonnegative().default(0),
  factsReadIds: z.array(z.string()).default([]),
  quizzesAnsweredCount: z.number().int().nonnegative().default(0),
  quizzesCorrectCount: z.number().int().nonnegative().default(0),
  biomesVisited: z.array(z.string()).default([]),
  plasticTrashCleanedCount: z.number().int().nonnegative().default(0),
  expeditionsCompletedCount: z.number().int().nonnegative().default(0),
  totalPlaytimeSeconds: z.number().nonnegative().default(0),
});

export type TelemetryData = z.infer<typeof TelemetryDataSchema>;

const STORAGE_KEY = "micro_splash_educational_telemetry";

const defaultTelemetryData: TelemetryData = {
  factsReadCount: 0,
  factsReadIds: [],
  quizzesAnsweredCount: 0,
  quizzesCorrectCount: 0,
  biomesVisited: [],
  plasticTrashCleanedCount: 0,
  expeditionsCompletedCount: 0,
  totalPlaytimeSeconds: 0,
};

export class TelemetrySystem {
  private data: TelemetryData;

  constructor() {
    this.data = this.load();
  }

  private load(): TelemetryData {
    return readLocalStorageWithSchema(STORAGE_KEY, TelemetryDataSchema, defaultTelemetryData);
  }

  private save(): void {
    writeLocalStorage(STORAGE_KEY, this.data);
  }

  public recordFactRead(factId: string): void {
    if (!this.data.factsReadIds.includes(factId)) {
      this.data.factsReadIds.push(factId);
      this.data.factsReadCount = this.data.factsReadIds.length;
      this.save();
    }
  }

  public recordQuizAnswer(isCorrect: boolean): void {
    this.data.quizzesAnsweredCount += 1;
    if (isCorrect) {
      this.data.quizzesCorrectCount += 1;
    }
    this.save();
  }

  public recordBiomeVisited(biomeName: string): void {
    if (!this.data.biomesVisited.includes(biomeName)) {
      this.data.biomesVisited.push(biomeName);
      this.save();
    }
  }

  public recordPlasticTrashCleaned(amount: number = 1): void {
    this.data.plasticTrashCleanedCount += Math.max(0, amount);
    this.save();
  }

  public recordExpeditionCompleted(): void {
    this.data.expeditionsCompletedCount += 1;
    this.save();
  }

  public addPlaytime(seconds: number): void {
    if (seconds > 0) {
      this.data.totalPlaytimeSeconds += seconds;
      this.save();
    }
  }

  public getMetrics(): Readonly<TelemetryData> {
    return { ...this.data };
  }

  /**
   * Índice de Impacto de Conscientização (0 a 100+):
   * Cada fato lido confere +4 pontos, acerto em quiz +6, lixo retirado +2 e expedição +20.
   */
  public calculateEducationalImpactScore(): number {
    const factsScore = this.data.factsReadCount * 4;
    const quizScore = this.data.quizzesCorrectCount * 6;
    const trashScore = this.data.plasticTrashCleanedCount * 2;
    const expeditionScore = this.data.expeditionsCompletedCount * 20;
    return factsScore + quizScore + trashScore + expeditionScore;
  }

  public reset(): void {
    this.data = { ...defaultTelemetryData, factsReadIds: [], biomesVisited: [] };
    removeLocalStorageItem(STORAGE_KEY);
  }
}

export const telemetrySystem = new TelemetrySystem();
