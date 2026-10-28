import type { GameObj, KaboomCtx } from "kaboom";
import { UI_COLORS, UI_RADII, UI_Z_INDEX } from "../theme";
import { audioSystem } from "../../systems/audioSystem";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import type { FocusableItem } from "../keyboardNav";

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

export interface TabBarHandle<T extends string> {
  elements: GameObj[];
  focusItems: FocusableItem[];
  setActiveTab: (tabId: T) => void;
  getActiveTab: () => T;
  destroy: () => void;
}

/**
 * Cria uma barra de abas padronizada com centralização simétrica adaptativa,
 * feedback tátil e itens navegáveis via teclado (WCAG 2.1 AA).
 */
export function createTabBar<T extends string>(
  k: KaboomCtx,
  options: TabBarOptions<T>
): TabBarHandle<T> {
  const elements: GameObj[] = [];
  const focusItems: FocusableItem[] = [];
  const canInteract = options.canInteract ?? (() => true);
  const zBase = options.zBase ?? UI_Z_INDEX.modalControls;

  let currentTab: T = options.activeTab;
  const N = options.tabs.length;
  const tabGap = options.tabGap ?? 20;
  const maxTabWidth = options.maxTabWidth ?? 320;
  const tabH = options.tabHeight ?? 42;

  const totalGaps = Math.max(0, N - 1) * tabGap;
  const tabW = Math.min(maxTabWidth, (options.containerWidth - 60 - totalGaps) / Math.max(1, N));
  const totalTabsW = N * tabW + totalGaps;

  const tabEntities: Array<{
    id: T;
    btn: GameObj;
    txt: GameObj;
  }> = [];

  const updateStyles = () => {
    tabEntities.forEach(({ id, btn, txt }) => {
      const isSel = currentTab === id;
      const theme = isSel ? UI_COLORS.button.tabActive : UI_COLORS.button.tabInactive;
      btn.color = k.rgb(theme.base[0], theme.base[1], theme.base[2]);
      btn.outline = {
        width: isSel ? 2 : 1,
        color: k.rgb(theme.outline[0], theme.outline[1], theme.outline[2]),
      };
      txt.color = k.rgb(theme.text[0], theme.text[1], theme.text[2]);
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
    const tX = options.centerX - totalTabsW / 2 + tabW / 2 + i * (tabW + tabGap);
    const tY = options.posY;
    const isSel = currentTab === tab.id;
    const theme = isSel ? UI_COLORS.button.tabActive : UI_COLORS.button.tabInactive;

    const btn = k.add([
      k.rect(tabW, tabH, { radius: UI_RADII.md + 1 }),
      k.pos(tX, tY),
      k.color(theme.base[0], theme.base[1], theme.base[2]),
      k.outline(isSel ? 2 : 1, k.rgb(theme.outline[0], theme.outline[1], theme.outline[2])),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(zBase),
    ]);
    elements.push(btn);

    const txt = k.add([
      k.text(tab.label, {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      k.pos(tX, tY),
      k.color(theme.text[0], theme.text[1], theme.text[2]),
      k.anchor("center"),
      k.fixed(),
      k.z(zBase + 1),
    ]);
    elements.push(txt);

    tabEntities.push({ id: tab.id, btn, txt });

    btn.onHoverUpdate(() => {
      if (!canInteract() || currentTab === tab.id) return;
      btn.color = k.rgb(25, 55, 95);
      btn.scale = k.vec2(1.02, 1.02);
    });

    btn.onHoverEnd(() => {
      btn.scale = k.vec2(1, 1);
      updateStyles();
    });

    btn.onClick(() => selectTab(tab.id));

    focusItems.push({
      pos: k.vec2(tX, tY),
      width: tabW,
      height: tabH,
      onActivate: () => selectTab(tab.id),
    });
  });

  return {
    elements,
    focusItems,
    setActiveTab: (tabId: T) => {
      currentTab = tabId;
      updateStyles();
    },
    getActiveTab: () => currentTab,
    destroy: () => {
      elements.forEach((el) => {
        try {
          if ("destroy" in el && typeof el.destroy === "function") {
            el.destroy();
          } else if (typeof k.destroy === "function") {
            k.destroy(el);
          }
        } catch {}
      });
    },
  };
}
