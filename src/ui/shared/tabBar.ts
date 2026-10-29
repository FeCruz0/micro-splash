/**
 * Barra de Abas Padronizada com Centralização Simétrica (Fase 64.4) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Vector2D.
 */

import { UI_COLORS, UI_RADII, UI_Z_INDEX } from "../theme";
import { audioSystem } from "../../systems/audioSystem";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import type { FocusableItem } from "../keyboardNav";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../../engine/adapters/LegacyBridge";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export interface TabBarOptions<T extends string> {
  tabs: Array<TabItem<T>>;
  activeTab: T;
  posY: number;
  containerWidth: number;
  centerX: number;
  tabGap?: number;
  tabHeight?: number;
  maxTabWidth?: number;
  zBase?: number;
  onTabChange: (tabId: T) => void;
  canInteract?: () => boolean;
}

export interface TabBarHandle<T extends string, TObj = never> {
  elements: TObj[];
  focusItems: FocusableItem[];
  setActiveTab: (tabId: T) => void;
  getActiveTab: () => T;
  destroy: () => void;
}

export interface LegacyTabBarContext {
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  scale?(scale: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  area?(): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  text(content: string, options?: unknown): unknown;
  vec2?(x: number, y: number): { x: number; y: number };
  destroy?(target: unknown): void;
}

/**
 * Cria uma barra de abas padronizada com centralização simétrica adaptativa,
 * feedback tátil e itens navegáveis via teclado (WCAG 2.1 AA).
 */
export function createTabBar<T extends string, TObj = never>(
  engineOrContext: IRenderEngine | LegacyTabBarContext,
  options: TabBarOptions<T>
): TabBarHandle<T, TObj> {
  const focusItems: FocusableItem[] = [];
  const canInteract = options.canInteract ?? (() => true);
  const zBase = options.zBase ?? UI_Z_INDEX.modalControls;

  let currentTab: T = options.activeTab;
  const count = options.tabs.length;
  const tabGap = options.tabGap ?? 20;
  const maxTabWidth = options.maxTabWidth ?? 320;
  const tabHeight = options.tabHeight ?? 42;

  const totalGaps = Math.max(0, count - 1) * tabGap;
  const tabWidth = Math.min(
    maxTabWidth,
    (options.containerWidth - 60 - totalGaps) / Math.max(1, count)
  );
  const totalTabsWidth = count * tabWidth + totalGaps;

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const elements: Array<IGraphicsNode | ITextNode> = [];

    const tabEntities: Array<{
      id: T;
      btnNode: IGraphicsNode;
      txtNode: ITextNode;
      draw: (isSelected: boolean, isHover: boolean) => void;
    }> = [];

    const updateStyles = () => {
      tabEntities.forEach(({ id, draw }) => {
        draw(currentTab === id, false);
      });
    };

    const selectTab = (tabId: T) => {
      if (!canInteract() || currentTab === tabId) return;
      audioSystem.playUiClick();
      currentTab = tabId;
      updateStyles();
      options.onTabChange(tabId);
    };

    options.tabs.forEach((tab, index) => {
      const tabX =
        options.centerX - totalTabsWidth / 2 + tabWidth / 2 + index * (tabWidth + tabGap);
      const tabY = options.posY;
      const isSelected = currentTab === tab.id;

      const btnNode: IGraphicsNode = engineOrContext.createGraphics(`tab_btn_${tab.id}`);
      const txtNode: ITextNode = engineOrContext.createText(
        tab.label,
        {
          fontFamily: "Outfit",
          fontSize: accessibilitySystem.scaleFont(15.5),
          align: "center",
        },
        `tab_text_${tab.id}`
      );

      const drawTab = (selected: boolean, isHover: boolean) => {
        const theme = selected ? UI_COLORS.button.tabActive : UI_COLORS.button.tabInactive;
        btnNode.clear();
        btnNode.drawRoundedRect(
          -tabWidth / 2,
          -tabHeight / 2,
          tabWidth,
          tabHeight,
          UI_RADII.md + 1,
          {
            fill: {
              color: isHover ? [25, 55, 95] : [theme.base[0], theme.base[1], theme.base[2]],
              alpha: 1,
            },
            stroke: {
              width: selected ? 2 : 1,
              color: [theme.outline[0], theme.outline[1], theme.outline[2]],
              alpha: 1,
            },
          }
        );
        txtNode.setColor([theme.text[0], theme.text[1], theme.text[2]]);
      };

      drawTab(isSelected, false);
      btnNode.setPosition(tabX, tabY);
      btnNode.setZIndex(zBase);
      stageRoot.addChild(btnNode);
      elements.push(btnNode);

      txtNode.setPosition(tabX, tabY);
      txtNode.setZIndex(zBase + 1);
      stageRoot.addChild(txtNode);
      elements.push(txtNode);

      const nativeNode = btnNode.getNativeNode<{
        interactive?: boolean;
        cursor?: string;
        on?: (event: string, callback: () => void) => void;
      }>();
      if (nativeNode && typeof nativeNode.on === "function") {
        nativeNode.interactive = true;
        nativeNode.cursor = "pointer";
        nativeNode.on("pointerover", () => {
          if (!canInteract() || currentTab === tab.id) return;
          drawTab(false, true);
          btnNode.setScale(1.02, 1.02);
        });
        nativeNode.on("pointerout", () => {
          btnNode.setScale(1, 1);
          drawTab(currentTab === tab.id, false);
        });
        nativeNode.on("pointertap", () => selectTab(tab.id));
      }

      tabEntities.push({
        id: tab.id,
        btnNode,
        txtNode,
        draw: drawTab,
      });

      focusItems.push({
        pos: { x: tabX, y: tabY },
        width: tabWidth,
        height: tabHeight,
        onActivate: () => selectTab(tab.id),
      });
    });

    return {
      elements: elements as unknown as TObj[],
      focusItems,
      setActiveTab: (tabId: T) => {
        currentTab = tabId;
        updateStyles();
      },
      getActiveTab: () => currentTab,
      destroy: () => {
        elements.forEach((node) => {
          try {
            stageRoot.removeChild(node);
            node.destroy();
          } catch {}
        });
      },
    };
  }

  // Fallback para contexto legado
  const legacyContext = engineOrContext as LegacyTabBarContext;
  const elements: unknown[] = [];

  const resolveRgb = (red: number, green: number, blue: number): unknown => {
    if (typeof legacyContext.rgb === "function") {
      return legacyContext.rgb(red, green, blue);
    }
    return typeof legacyContext.color === "function"
      ? legacyContext.color(red, green, blue)
      : undefined;
  };

  const createVector2 = (x: number, y: number): { x: number; y: number } => {
    return typeof legacyContext.vec2 === "function" ? legacyContext.vec2(x, y) : { x, y };
  };

  const tabEntities: Array<{
    id: T;
    btn: {
      color?: unknown;
      outline?: unknown;
      scale?: { x: number; y: number };
      onHoverUpdate?(cb: () => void): void;
      onHoverEnd?(cb: () => void): void;
      onClick?(cb: () => void): void;
    };
    txt: { color?: unknown };
  }> = [];

  const updateStyles = () => {
    tabEntities.forEach(({ id, btn, txt }) => {
      const isSel = currentTab === id;
      const theme = isSel ? UI_COLORS.button.tabActive : UI_COLORS.button.tabInactive;
      btn.color = resolveRgb(theme.base[0], theme.base[1], theme.base[2]);
      btn.outline = {
        width: isSel ? 2 : 1,
        color: resolveRgb(theme.outline[0], theme.outline[1], theme.outline[2]),
      };
      txt.color = resolveRgb(theme.text[0], theme.text[1], theme.text[2]);
    });
  };

  const selectTab = (tabId: T) => {
    if (!canInteract() || currentTab === tabId) return;
    audioSystem.playUiClick();
    currentTab = tabId;
    updateStyles();
    options.onTabChange(tabId);
  };

  options.tabs.forEach((tab, i) => {
    const tX = options.centerX - totalTabsWidth / 2 + tabWidth / 2 + i * (tabWidth + tabGap);
    const tY = options.posY;
    const isSel = currentTab === tab.id;
    const theme = isSel ? UI_COLORS.button.tabActive : UI_COLORS.button.tabInactive;

    const btn = legacyContext.add([
      typeof legacyContext.rect === "function"
        ? legacyContext.rect(tabWidth, tabHeight, { radius: UI_RADII.md + 1 })
        : undefined,
      typeof legacyContext.pos === "function" ? legacyContext.pos(tX, tY) : undefined,
      typeof legacyContext.color === "function"
        ? legacyContext.color(theme.base[0], theme.base[1], theme.base[2])
        : undefined,
      typeof legacyContext.outline === "function"
        ? legacyContext.outline(
            isSel ? 2 : 1,
            resolveRgb(theme.outline[0], theme.outline[1], theme.outline[2])
          )
        : undefined,
      typeof legacyContext.scale === "function" ? legacyContext.scale(1) : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.area === "function" ? legacyContext.area() : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(zBase) : undefined,
    ]) as {
      color?: unknown;
      outline?: unknown;
      scale?: { x: number; y: number };
      onHoverUpdate?(cb: () => void): void;
      onHoverEnd?(cb: () => void): void;
      onClick?(cb: () => void): void;
    };
    elements.push(btn);

    const txt = legacyContext.add([
      typeof legacyContext.text === "function"
        ? legacyContext.text(tab.label, {
            size: accessibilitySystem.scaleFont(15.5),
            font: "Outfit",
          })
        : undefined,
      typeof legacyContext.pos === "function" ? legacyContext.pos(tX, tY) : undefined,
      typeof legacyContext.color === "function"
        ? legacyContext.color(theme.text[0], theme.text[1], theme.text[2])
        : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(zBase + 1) : undefined,
    ]) as { color?: unknown };
    elements.push(txt);

    tabEntities.push({ id: tab.id, btn, txt });

    if (typeof btn.onHoverUpdate === "function") {
      btn.onHoverUpdate(() => {
        if (!canInteract() || currentTab === tab.id) return;
        btn.color = resolveRgb(25, 55, 95);
        btn.scale = createVector2(1.02, 1.02);
      });
    }

    if (typeof btn.onHoverEnd === "function") {
      btn.onHoverEnd(() => {
        btn.scale = createVector2(1, 1);
        updateStyles();
      });
    }

    if (typeof btn.onClick === "function") {
      btn.onClick(() => selectTab(tab.id));
    }

    focusItems.push({
      pos: createVector2(tX, tY),
      width: tabWidth,
      height: tabHeight,
      onActivate: () => selectTab(tab.id),
    });
  });

  return {
    elements: elements as TObj[],
    focusItems,
    setActiveTab: (tabId: T) => {
      currentTab = tabId;
      updateStyles();
    },
    getActiveTab: () => currentTab,
    destroy: () => {
      elements.forEach((el) => {
        try {
          if (
            el &&
            typeof el === "object" &&
            "destroy" in el &&
            typeof (el as { destroy: () => void }).destroy === "function"
          ) {
            (el as { destroy: () => void }).destroy();
          } else if (typeof legacyContext.destroy === "function") {
            legacyContext.destroy(el);
          }
        } catch {}
      });
    },
  };
}
