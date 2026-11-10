import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// A system appearance change reaches a launcher already open (chan-mobile
// switched to dark at sunset), unless the user has a choice of their own.

type Listener = (event: MediaQueryListEvent) => void;

function systemAppearance(initialLight: boolean) {
  let light = initialLight;
  const listeners = new Set<Listener>();
  const query = {
    get matches() {
      return light;
    },
    media: "(prefers-color-scheme: light)",
    addEventListener: (_: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
  } as unknown as MediaQueryList;
  return {
    matchMedia: (q: string) =>
      q === "(prefers-color-scheme: light)" ? query : ({ matches: false } as MediaQueryList),
    set(next: boolean) {
      light = next;
      for (const fn of listeners) fn({ matches: next } as MediaQueryListEvent);
    },
    listeners,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("watchSystemTheme", () => {
  test("follows the system both ways while nothing is stored", async () => {
    const system = systemAppearance(true);
    vi.stubGlobal("matchMedia", system.matchMedia);
    const { themeState, watchSystemTheme } = await import("./theme.svelte");
    expect(themeState.theme).toBe("light");
    watchSystemTheme();
    system.set(false);
    expect(themeState.theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    system.set(true);
    expect(themeState.theme).toBe("light");
  });

  test("a choice made after it starts stops the following", async () => {
    const system = systemAppearance(false);
    vi.stubGlobal("matchMedia", system.matchMedia);
    const { themeState, toggleTheme, watchSystemTheme } = await import("./theme.svelte");
    watchSystemTheme();
    toggleTheme();
    expect(themeState.theme).toBe("light");
    system.set(false);
    expect(themeState.theme).toBe("light");
  });

  test("the returned stop removes the listener", async () => {
    const system = systemAppearance(true);
    vi.stubGlobal("matchMedia", system.matchMedia);
    const { themeState, watchSystemTheme } = await import("./theme.svelte");
    const stop = watchSystemTheme();
    stop();
    expect(system.listeners.size).toBe(0);
    system.set(false);
    expect(themeState.theme).toBe("light");
  });
});
