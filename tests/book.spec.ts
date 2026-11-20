import { expect, test, type Page } from "@playwright/test";

/** Force a locale regardless of browser detection. */
async function asLocale(page: Page, locale: "en" | "pl") {
  await page.addInitScript((l) => localStorage.setItem("physix.locale", l), locale);
}

const widget = (page: Page) => page.locator("figure").filter({ has: page.locator("canvas") }).first();
const readout = (page: Page, label: string) =>
  widget(page).locator("dl > div", { hasText: label }).locator("dd");
const num = async (loc: ReturnType<Page["locator"]>) =>
  parseFloat((await loc.innerText()).replace(",", "."));

/** Scroll the widget fully into view so its IntersectionObserver fires. */
async function showWidget(page: Page, w = widget(page)) {
  await w.scrollIntoViewIfNeeded();
  await expect(w.locator("canvas").first()).toBeInViewport({ ratio: 0.5 });
}

test.describe("app shell & i18n", () => {
  test("root redirects to detected locale (en-US browser → /en/)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.getByRole("heading", { name: "Welcome to Physix Book" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("stored Polish preference wins over browser locale", async ({ page }) => {
    await asLocale(page, "pl");
    await page.goto("/");
    await expect(page).toHaveURL(/\/pl\/$/);
    await expect(page.getByRole("heading", { name: "Witaj w Physix Book" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  });

  test("sidebar lists all 4 chapters in order, links navigate", async ({ page }) => {
    await page.goto("/en/");
    const nav = page.locator("aside nav");
    const items = nav.locator("ol > li > a");
    await expect(items).toHaveCount(6);
    await expect(items.nth(0)).toContainText("Kinematics");
    await expect(items.nth(5)).toContainText("Gravitation");
    await items.nth(2).click();
    await expect(page).toHaveURL(/\/en\/chapter\/energy-momentum$/);
    await expect(page.getByRole("heading", { level: 1, name: "Energy & Momentum" })).toBeVisible();
  });

  test("language switch preserves chapter and translates content", async ({ page }) => {
    await page.goto("/en/chapter/oscillations");
    await expect(page.getByRole("heading", { level: 1, name: "Oscillations" })).toBeVisible();
    await page.getByLabel("Language").selectOption("pl");
    await expect(page).toHaveURL(/\/pl\/chapter\/oscillations$/);
    await expect(page.getByRole("heading", { level: 1, name: "Drgania" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    // sidebar is Polish now
    await expect(page.locator("aside nav")).toContainText("Zasady dynamiki Newtona");
  });

  test("unknown chapter shows not-found with back link", async ({ page }) => {
    await page.goto("/en/chapter/does-not-exist");
    await expect(page.getByText("Chapter not found.")).toBeVisible();
    await page.getByRole("link", { name: "Back to the table of contents" }).click();
    await expect(page).toHaveURL(/\/en\/$/);
  });

  test("prev/next navigation chains chapters", async ({ page }) => {
    await page.goto("/en/chapter/newton-laws");
    await page.getByRole("link", { name: /Next: Energy & Momentum/ }).click();
    await expect(page).toHaveURL(/\/en\/chapter\/energy-momentum$/);
    await page.getByRole("link", { name: /Previous: Newton's Laws/ }).click();
    await expect(page).toHaveURL(/\/en\/chapter\/newton-laws$/);
  });

  test("dark mode toggles and persists", async ({ page }) => {
    await page.goto("/en/");
    await page.getByLabel("Toggle dark mode").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("content rendering", () => {
  test("KaTeX renders display and inline math", async ({ page }) => {
    await page.goto("/en/chapter/kinematics");
    expect(await page.locator(".katex-display").count()).toBeGreaterThanOrEqual(3);
    expect(await page.locator(".katex").count()).toBeGreaterThan(10);
    // no raw LaTeX leaked into the page
    await expect(page.locator("article")).not.toContainText("$$");
  });

  test("section anchors from frontmatter resolve to headings", async ({ page }) => {
    await page.goto("/en/chapter/kinematics");
    await expect(page.locator("#projectile-motion")).toHaveText("Projectile motion");
    await page.goto("/pl/chapter/kinematics");
    await expect(page.locator("#rzut-ukosny")).toHaveText("Rzut ukośny");
  });
});

test.describe("simulation widget — projectile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/chapter/kinematics");
    await expect(widget(page)).toBeAttached();
    await showWidget(page);
  });

  test("renders with localized labels, sliders, presets and readouts", async ({ page }) => {
    const w = widget(page);
    await expect(w.locator("figcaption")).toContainText("Projectile motion");
    await expect(w.locator('input[type="range"]')).toHaveCount(4);
    await expect(w.getByRole("button", { name: "Moon" })).toBeVisible();
    await expect(w.locator("dl")).toContainText("Range");
    // two live plots
    await expect(w.locator("canvas")).toHaveCount(3);
    // KaTeX symbols on sliders
    expect(await w.locator(".katex").count()).toBeGreaterThanOrEqual(4);
  });

  test("play advances time, pause freezes it, reset zeroes it", async ({ page }) => {
    const time = readout(page, "Time");
    await expect(time).toHaveText(/^0\s/);
    await widget(page).getByRole("button", { name: /Play/ }).click();
    await expect
      .poll(async () => parseFloat((await time.innerText()).replace(",", ".")), { timeout: 5000 })
      .toBeGreaterThan(0.3);
    await widget(page).getByRole("button", { name: /Pause/ }).click();
    const frozen = await time.innerText();
    await page.waitForTimeout(400);
    await expect(time).toHaveText(frozen);
    await widget(page).getByRole("button", { name: /Reset/ }).first().click();
    await expect(time).toHaveText(/^0\s/);
  });

  test("flight completes: auto-pauses and reports the analytic range", async ({ page }) => {
    // defaults: v0=20, θ=45°, g=9.81 → R = 400/9.81 ≈ 40.77 m
    await widget(page).getByRole("button", { name: /Play/ }).click();
    await expect
      .poll(async () => parseFloat((await readout(page, "Range").innerText()).replace(",", ".")), {
        timeout: 15_000,
      })
      .toBeGreaterThan(40);
    const range = parseFloat((await readout(page, "Range").innerText()).replace(",", "."));
    expect(range).toBeGreaterThan(40.4);
    expect(range).toBeLessThan(41.2);
    // main button becomes Reset (done state)
    await expect(widget(page).locator("figcaption button").first()).toContainText("Reset");
  });

  test("Moon preset multiplies range by g_earth/g_moon ≈ 6", async ({ page }) => {
    await widget(page).getByRole("button", { name: "Moon" }).click(); // presets auto-play
    await expect
      .poll(async () => parseFloat((await readout(page, "Range").innerText()).replace(",", ".")), {
        timeout: 30_000,
      })
      .toBeGreaterThan(240);
    const range = parseFloat((await readout(page, "Range").innerText()).replace(",", "."));
    expect(range).toBeGreaterThan(245); // 400/1.62 ≈ 246.9
    expect(range).toBeLessThan(249);
  });

  test("step button advances exactly one tick while paused", async ({ page }) => {
    const time = readout(page, "Time");
    const step = widget(page).getByRole("button", { name: /Step/ });
    await step.click();
    const t1 = parseFloat((await time.innerText()).replace(",", "."));
    expect(t1).toBeGreaterThan(0);
    expect(t1).toBeLessThan(0.05); // one 1/120 s tick, rounded to 2 digits
    await page.waitForTimeout(300);
    await expect(time).toHaveText(await time.innerText()); // still paused
  });

  test("param↔equation highlighting works both directions", async ({ page }) => {
    const angleM = page.locator("article span.cursor-help").first();
    // hover prose symbol → slider row highlights
    await angleM.hover();
    await expect(widget(page).locator("label.bg-amber-100, label.dark\\:bg-amber-500\\/20").first()).toBeVisible();
    // hover slider row → prose symbol highlights
    const sliderRow = widget(page).locator("label", { has: page.locator('input[type="range"]') }).nth(1);
    await sliderRow.hover();
    expect(await page.locator("article span.bg-amber-200, article span.dark\\:bg-amber-500\\/40").count()).toBeGreaterThan(0);
  });

  test("Polish widget: translated labels and decimal comma", async ({ page }) => {
    await page.goto("/pl/chapter/kinematics");
    const w = widget(page);
    await expect(w.locator("figcaption")).toContainText("Rzut ukośny");
    await expect(w.getByRole("button", { name: "Księżyc" })).toBeVisible();
    await expect(w.locator("dl")).toContainText("Zasięg");
    // gravity slider value: 9,81 m/s² (Polish decimal comma; label is aria-only)
    await expect(w.getByLabel("Grawitacja").locator("..")).toContainText("9,81");
  });
});

test.describe("simulation widget — other sims", () => {
  test("incline: sticky preset holds, steep angle slides", async ({ page }) => {
    await page.goto("/en/chapter/newton-laws");
    const w = widget(page);
    await showWidget(page, w);
    await w.getByRole("button", { name: "Sticky (holds)" }).click();
    await page.waitForTimeout(600);
    const dist = parseFloat((await readout(page, "Distance").innerText()).replace(",", "."));
    expect(dist).toBe(0);
    // raise angle to 60° → slides
    await w.locator('input[type="range"]').first().fill("60");
    await expect
      .poll(async () => parseFloat((await readout(page, "Distance").innerText()).replace(",", ".")), { timeout: 5000 })
      .toBeGreaterThan(0.5);
  });

  test("collision: elastic equal masses exchange velocities; momentum conserved", async ({ page }) => {
    await page.goto("/en/chapter/energy-momentum");
    const w = widget(page);
    await showWidget(page, w);
    const p0 = await num(readout(page, "Total momentum"));
    await w.getByRole("button", { name: /Play/ }).click();
    await expect
      .poll(async () => parseInt(await readout(page, "Collisions").innerText(), 10), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1);
    const v1 = parseFloat((await readout(page, "Velocity 1").innerText()).replace(",", "."));
    const v2 = parseFloat((await readout(page, "Velocity 2").innerText()).replace(",", "."));
    expect(v1).toBeCloseTo(-1, 1);
    expect(v2).toBeCloseTo(3, 1);
    const p1 = parseFloat((await readout(page, "Total momentum").innerText()).replace(",", "."));
    expect(p1).toBeCloseTo(p0, 1);
  });

  test("pendulum: large swing shows exact period > small-angle period", async ({ page }) => {
    await page.goto("/en/chapter/oscillations");
    const w = page.locator("figure").filter({ hasText: "Pendulum" });
    await showWidget(page, w);
    await w.getByRole("button", { name: "Large swing" }).click();
    const small = parseFloat((await w.locator("dl > div", { hasText: "Period (small-angle)" }).locator("dd").innerText()).replace(",", "."));
    const exact = parseFloat((await w.locator("dl > div", { hasText: "Period (exact)" }).locator("dd").innerText()).replace(",", "."));
    expect(exact).toBeGreaterThan(small * 1.3);
  });

  test("spring: critically damped preset settles without oscillating sign flips", async ({ page }) => {
    await page.goto("/en/chapter/oscillations");
    const w = page.locator("figure").filter({ hasText: "Spring–mass oscillator" });
    await showWidget(page, w);
    await w.getByRole("button", { name: "Critically damped" }).click();
    const zeta = w.locator("dl > div", { hasText: "Damping ratio" }).locator("dd");
    await expect(zeta).toContainText("1");
    await expect
      .poll(async () => Math.abs(parseFloat((await w.locator("dl > div", { hasText: "Displacement" }).locator("dd").innerText()).replace(",", "."))), { timeout: 15_000 })
      .toBeLessThan(0.05);
  });
});

test.describe("simulation widget — waves & orbits", () => {
  test("standing wave: harmonic readouts follow λ=2L/n and f=nv/2L", async ({ page }) => {
    await page.goto("/en/chapter/waves");
    const w = page.locator("figure").filter({ hasText: "Standing wave on a string" });
    await showWidget(page, w);
    await w.getByRole("button", { name: "5th harmonic" }).click();
    const lambda = w.locator("dl > div", { hasText: "Wavelength" }).locator("dd");
    const f = w.locator("dl > div", { hasText: "Frequency" }).locator("dd");
    expect(await num(lambda)).toBeCloseTo(4, 1); // 2·10/5 = 4 m
    expect(await num(f)).toBeCloseTo(2, 1); // 5·8/20 = 2 Hz
    // fundamental: λ = 20 m, f = 0.4 Hz
    await w.getByRole("button", { name: "Fundamental (n=1)" }).click();
    expect(await num(lambda)).toBeCloseTo(20, 1);
    expect(await num(f)).toBeCloseTo(0.4, 1);
  });

  test("interference: center-line probe is always constructive; max order = floor(d/λ)", async ({ page }) => {
    await page.goto("/en/chapter/waves");
    const w = page.locator("figure").filter({ hasText: "Two-source interference" });
    await showWidget(page, w);
    const probeI = w.locator("dl > div", { hasText: "Probe intensity" }).locator("dd");
    const maxOrder = w.locator("dl > div", { hasText: "Max order" }).locator("dd");
    await expect(probeI).toHaveText("1");
    expect(await num(maxOrder)).toBe(3); // d=5, λ=1.5
    // fine preset: d=8, λ=0.7 → floor(11.43) = 11; probe still 1
    await w.getByRole("button", { name: "Fine fringes" }).click();
    expect(await num(maxOrder)).toBe(11);
    await expect(probeI).toHaveText("1");
    // canvas actually painted (field image, not blank)
    const painted = await w.locator("canvas").first().evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let distinct = new Set<number>();
      for (let i = 0; i < d.length; i += 4096) distinct.add(d[i]);
      return distinct.size;
    });
    expect(painted).toBeGreaterThan(5);
  });

  test("orbit: circular preset keeps r constant with tiny conservation drift", async ({ page }) => {
    await page.goto("/en/chapter/gravitation");
    const w = widget(page);
    await showWidget(page, w);
    await w.getByRole("button", { name: "Circular", exact: true }).click();
    const r = w.locator("dl > div", { hasText: "Distance" }).locator("dd");
    await expect.poll(async () => num(w.locator("dl > div", { hasText: "Time" }).locator("dd")), { timeout: 8000 }).toBeGreaterThan(3);
    expect(await num(r)).toBeCloseTo(12, 0);
    const eDrift = await num(w.locator("dl > div", { hasText: "Energy drift" }).locator("dd"));
    expect(Math.abs(eDrift)).toBeLessThan(0.01);
  });

  test("orbit: escape preset ends with positive energy and unbound status", async ({ page }) => {
    test.setTimeout(120_000); // ~80 s of sim time at 2× to cross r = 300 m
    await page.goto("/en/chapter/gravitation");
    const w = widget(page);
    await showWidget(page, w);
    await w.getByRole("button", { name: "Escape", exact: true }).click();
    const energy = w.locator("dl > div", { hasText: "Energy / mass" }).locator("dd");
    expect(await num(energy)).toBeGreaterThan(0);
    // speed 2× to reach the escape boundary sooner
    await w.locator("figcaption select").selectOption("2");
    await expect
      .poll(async () => num(w.locator("dl > div", { hasText: "Distance" }).locator("dd")), { timeout: 100_000 })
      .toBeGreaterThan(290);
    await expect(w.locator("figcaption button").first()).toContainText("Reset");
  });

  test("Polish waves chapter renders with translated sim titles", async ({ page }) => {
    await page.goto("/pl/chapter/waves");
    await expect(page.getByRole("heading", { level: 1, name: "Fale" })).toBeVisible();
    await expect(page.locator("figure").filter({ hasText: "Fala stojąca na strunie" })).toBeAttached();
    await expect(page.locator("figure").filter({ hasText: "Interferencja dwóch źródeł" })).toBeAttached();
  });
});

test.describe("fallback & responsive", () => {
  test("mobile: sidebar is a drawer opened by hamburger", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/chapter/kinematics");
    const aside = page.locator("aside");
    await expect(aside).not.toBeInViewport();
    await page.getByLabel("Open menu").click();
    await expect(aside).toBeInViewport();
    await aside.getByRole("link", { name: /Newton's Laws/ }).click();
    await expect(page).toHaveURL(/newton-laws$/);
    await expect(aside).not.toBeInViewport();
  });

  test("no console errors during a full read-through", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
    page.on("pageerror", (err) => errors.push(String(err)));
    for (const slug of ["kinematics", "newton-laws", "energy-momentum", "oscillations", "waves", "gravitation"]) {
      await page.goto(`/en/chapter/${slug}`);
      await expect(page.locator("article h1")).toBeVisible();
      await page.waitForTimeout(400);
    }
    expect(errors).toEqual([]);
  });
});
