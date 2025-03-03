const RPC = require("discord-rpc");
const WebSocket = require("ws");
const { version } = require("./package.json");

const CLIENT_ID = "632699411448725564";
const rpc = new RPC.Client({ transport: "ipc" });

const wss = new WebSocket.Server({ port: 6464 });

console.log("🌐 WebSocket Server running on ws://localhost:6464");

let activity = {
  details: "Idle",
  state: "Password Manager for NIKKE",
  startTimestamp: Date.now(),
  largeImageKey: "https://i.imgur.com/LIzkC9I.png",
  largeImageText: `v${version}`,
  smallImageKey: "https://i.imgur.com/7484syW.png",
  smallImageText: "Idling",
  instance: false,
  buttons: [
    { label: "Learn More", url: "https://github.com/ScathachGrip/nikkePwned" },
  ]
};

async function setActivity() {
  if (!rpc) return;
  rpc.setActivity(activity);
}

rpc.on("ready", () => {
  console.log("✅ Discord RPC Connected!");
  setActivity();
});

wss.on("connection", (ws) => {
  console.log("🔗 Neutralino Connected");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("🔄 Updating RPC:", data);
      activity = { ...activity, ...data };
      setActivity();
    } catch (error) {
      console.error("❌ Invalid JSON received:", error);
    }
  });
});

rpc.login({ clientId: CLIENT_ID }).catch(console.error);