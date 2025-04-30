const { app, BrowserWindow } = require("electron");

function createWindow(examUrl) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: false, // use true in production
    kiosk: false, // true in production
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(examUrl);
  win.setMenu(null);
  win.webContents.on("context-menu", (e) => e.preventDefault());
}

let deeplinkUrl = null;

// ✅ Handle protocol simulation in dev
if (process.argv.length >= 2 && process.argv[1].startsWith("examapp://")) {
  deeplinkUrl = process.argv[1];
}

app.whenReady().then(() => {
  let examUrl = "http://localhost:5173/";

  // Simulated deeplink support
  if (deeplinkUrl) {
    examUrl = deeplinkUrl.replace("examapp://", "http://localhost:5173/");
    console.log("🔗 Simulated deeplink:", examUrl);
  }

  createWindow(examUrl);
});
