const { test, expect, _electron: electron } = require("@playwright/test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
test("onboarding, first/repeated TERAZ, check-in, editing, locale and restart", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "symptopage-ui-"));
  let app;
  const launch = async () => {
    const instance = await electron.launch({
      args: [path.resolve(__dirname, "..")],
      env: { ...process.env, SYMPTOPAGE_TEST_DATA: dir },
    });
    const page = await instance.firstWindow();
    await page.getByRole("heading", { name: /Make space|Bliżej/ }).waitFor();
    return { instance, page };
  };
  try {
    let result = await launch();
    app = result.instance;
    let page = result.page;
    await page.locator("[name=specialist]").selectOption("cardiologist");
    await page.locator("[name=date]").fill("2027-11-19");
    await page.locator("[name=reason]").fill("TEST — appointment");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", { name: "Cardiologist" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "!!! Now!" }).click();
    await expect(page.locator("dialog")).toBeVisible();
    await page.getByLabel("Heart palpitations", { exact: true }).check();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "!!! Now!" }).click();
    await page.getByLabel("Heart palpitations", { exact: true }).check();
    await page
      .getByPlaceholder("Add a note (optional)")
      .fill("<script>alert(1)</script> TEST");
    await page
      .getByRole("button", { name: "Save observation", exact: true })
      .click();
    await expect(page.locator("dialog")).not.toBeVisible();
    await expect(
      page.getByText("<script>alert(1)</script> TEST", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Once", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Once", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Several", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Several", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.locator("#language").selectOption("pl");
    await expect(
      page.getByRole("button", { name: "!!! Teraz!" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Kilka", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Dziennik objawów", exact: true })
      .click();
    await page.getByRole("button", { name: "Edytuj", exact: true }).click();
    await page.locator("dialog textarea").fill("TEST updated");
    await page
      .getByRole("button", { name: "Zapisz obserwację", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Podsumowanie wizyty", exact: true })
      .click();
    await expect(page.locator(".report-preview")).toContainText("TEST updated");
    const pdf = await app.evaluate(async ({ BrowserWindow }) =>
      Array.from(
        await BrowserWindow.getAllWindows()[0].webContents.printToPDF({
          pageSize: "A4",
          printBackground: true,
        }),
      ),
    );
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    await page.screenshot({ path: path.join(dir, "report.png") });
    await app.close();
    app = null;
    const saved = JSON.parse(
      await fs.readFile(path.join(dir, "records.json"), "utf8"),
    );
    expect(saved.events).toHaveLength(1);
    expect(saved.answers).toHaveLength(1);
    expect(saved.language).toBe("pl");
    result = await launch();
    app = result.instance;
    page = result.page;
    await expect(
      page.getByRole("heading", { name: "Kardiolog", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("TEST updated", { exact: true }).first(),
    ).toBeVisible();
  } finally {
    if (app) await app.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
