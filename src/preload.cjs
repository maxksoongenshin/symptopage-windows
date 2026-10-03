const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("sympto", {
  read: () => ipcRenderer.invoke("store:read"),
  change: (command, value) =>
    ipcRenderer.invoke("store:change", command, value),
  exportPDF: () => ipcRenderer.invoke("report:pdf"),
  print: () => ipcRenderer.invoke("report:print"),
  showData: () => ipcRenderer.invoke("data:show"),
});
