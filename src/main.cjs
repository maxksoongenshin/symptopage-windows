"use strict";
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const { Store } = require("./store.cjs");
let win, store, loadError;
const ui = path.join(__dirname, "..", "ui", "index.html");
const uiURL = pathToFileURL(ui).href;
app.setPath(
  "userData",
  process.env.SYMPTOPAGE_TEST_DATA || path.join(app.getPath("appData"), "SymptoPage-Windows"),
);
const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(async () => {
    try {
      store = new Store(path.join(app.getPath("userData"), "records.json"));
    } catch {
      loadError = "STORE_UNREADABLE";
    }
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1160,
      height: 880,
      minWidth: 900,
      minHeight: 700,
      title: "SymptoPage",
      backgroundColor: "#e9f5f3",
      icon: path.join(__dirname, "../assets/icon.png"),
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event, url) => {
      if (url !== uiURL) event.preventDefault();
    });
    win.webContents.session.setPermissionRequestHandler(
      (_webContents, _permission, callback) => callback(false),
    );
    win.webContents.session.setPermissionCheckHandler(() => false);
    const handle = (name, fn) =>
      ipcMain.handle(name, async (event, ...args) => {
        if (
          event.sender !== win.webContents ||
          event.senderFrame !== win.webContents.mainFrame ||
          event.senderFrame.url !== uiURL
        )
          throw new Error("INVALID_SENDER");
        try {
          return { ok: true, value: await fn(...args) };
        } catch (e) {
          return {
            ok: false,
            error:
              e.message === "INVALID_DATA" ? "INVALID_DATA" : "SAVE_FAILED",
          };
        }
      });
    handle("store:read", () => {
      if (loadError) return { loadError };
      return store.read();
    });
    handle("store:change", (command, value) => {
      if (!store) throw new Error("STORE_UNREADABLE");
      return store.apply(command, value);
    });
    handle("data:show", () =>
      shell.showItemInFolder(
        path.join(app.getPath("userData"), "records.json"),
      ),
    );
    handle("report:pdf", async () => {
      if (!store?.state.visit) throw new Error("INVALID_DATA");
      const choice = await dialog.showSaveDialog(win, {
        defaultPath: "SymptoPage.pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (choice.canceled) return false;
      const data = await win.webContents.printToPDF({
        pageSize: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
      await fs.writeFile(choice.filePath, data);
      return true;
    });
    handle("report:print", async () => {
      if (!store?.state.visit) throw new Error("INVALID_DATA");
      return await new Promise((resolve, reject) =>
        win.webContents.print(
          { silent: false, printBackground: true },
          (success, reason) => {
            if (!success && reason !== "cancelled")
              reject(new Error("PRINT_FAILED"));
            else resolve(success);
          },
        ),
      );
    });
    await win.loadFile(ui);
  });
  app.on("window-all-closed", () => app.quit());
}
