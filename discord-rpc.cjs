const RPC = require("discord-rpc");
const WebSocket = require("ws");

const CLIENT_ID = "632699411448725564";
const rpc = new RPC.Client({ transport: "ipc" });

const wss = new WebSocket.Server({ port: 6464 });

console.log("🌐 WebSocket Server running on ws://localhost:6464");

let activity = {
  details: "Idle",
  state: "Password Manager for NIKKE",
  startTimestamp: Date.now(),
  largeImageKey: "logo",
  largeImageText: "NIKKEPwned",
  instance: false,
  type: 0, // 0 = Playing
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

      // Update only changed fields
      activity = { ...activity, ...data };
      setActivity();
    } catch (error) {
      console.error("❌ Invalid JSON received:", error);
    }
  });
});

rpc.login({ clientId: CLIENT_ID }).catch(console.error);