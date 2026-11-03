import { describe, it, expect, vi } from "vitest";
import { detectGpuCapabilities } from "../../src/utils/gpuDiagnostics";

describe("gpuDiagnostics — Detecção de Recursos e Aceleração de Hardware", () => {
  it("deve detectar aceleração por hardware quando renderer for GPU dedicada", () => {
    const mockGl = {
      getExtension: vi.fn().mockReturnValue({
        UNMASKED_RENDERER_WEBGL: 0x9246,
        UNMASKED_VENDOR_WEBGL: 0x9245,
      }),
      getParameter: vi.fn((param: number) => {
        if (param === 0x9246) return "ANGLE (NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)";
        if (param === 0x9245) return "Google Inc. (NVIDIA)";
        return "Unknown";
      }),
    };

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockGl),
    } as unknown as HTMLCanvasElement;

    const report = detectGpuCapabilities(mockCanvas);

    expect(report.isSoftwareRenderer).toBe(false);
    expect(report.renderer).toContain("NVIDIA GeForce RTX 4070");
    expect(report.vendor).toContain("Google Inc. (NVIDIA)");
  });

  it("deve flaggar isSoftwareRenderer como true quando renderer for SwiftShader", () => {
    const mockGl = {
      getExtension: vi.fn().mockReturnValue({
        UNMASKED_RENDERER_WEBGL: 0x9246,
        UNMASKED_VENDOR_WEBGL: 0x9245,
      }),
      getParameter: vi.fn((param: number) => {
        if (param === 0x9246) return "Google SwiftShader (Direct3D11)";
        if (param === 0x9245) return "Google Inc.";
        return "Unknown";
      }),
    };

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockGl),
    } as unknown as HTMLCanvasElement;

    const report = detectGpuCapabilities(mockCanvas);

    expect(report.isSoftwareRenderer).toBe(true);
    expect(report.renderer).toContain("SwiftShader");
  });

  it("deve flaggar isSoftwareRenderer como true quando renderer for llvmpipe ou software rasterizer", () => {
    const mockGl = {
      getExtension: vi.fn().mockReturnValue(null),
      RENDERER: 0x1f01,
      VENDOR: 0x1f00,
      getParameter: vi.fn((param: number) => {
        if (param === 0x1f01) return "llvmpipe (LLVM 12.0.0, 256 bits)";
        if (param === 0x1f00) return "Mesa/X.org";
        return "Unknown";
      }),
    };

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockGl),
    } as unknown as HTMLCanvasElement;

    const report = detectGpuCapabilities(mockCanvas);

    expect(report.isSoftwareRenderer).toBe(true);
    expect(report.renderer).toContain("llvmpipe");
  });

  it("deve retornar isSoftwareRenderer true e status seguro caso WebGL não esteja disponível", () => {
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(null),
    } as unknown as HTMLCanvasElement;

    const report = detectGpuCapabilities(mockCanvas);

    expect(report.isSoftwareRenderer).toBe(true);
    expect(report.renderer).toBe("WebGL Unavailable");
  });
});
