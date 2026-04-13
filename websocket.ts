import RPC from "discord-rpc";
import { spawn } from "child_process";
import { readFile, unlink } from "fs/promises";
import WebSocket, { RawData, WebSocketServer } from "ws";
import { version } from "./package.json";

const CLIENT_ID = "632699411448725564";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";
const IDLE_SHUTDOWN_MS = 5000;
const DAMAGE_PROMPT = `This is a game battle screen. Each character row has 3 stats shown as icons:
- First stat (= lines icon): DAMAGE DEALT (the main damage number, usually the largest)
- Second stat (shield icon): damage received
- Third stat (snowflake/star icon): heal amount

Extract ONLY the first stat (damage dealt) for each of the 5 characters, in order from top to bottom.
Reply ONLY in this JSON format, nothing else:
{
  "damages": [1234567890, 1234567890, 1234567890, 1234567890, 1234567890],
  "total": 1234567890
}`;

const rpc = new RPC.Client({ transport: "ipc" });
const wss = new WebSocketServer({ port: 6464 });

let loginInProgress = false;
let rpcDisabled = false;
let runtimeOpenRouterApiKey = "";
let runtimeOpenRouterModel = DEFAULT_OPENROUTER_MODEL;
let shutdownTimer: NodeJS.Timeout | null = null;
let shuttingDown = false;
let f8Listener: ReturnType<typeof spawn> | null = null;
let activity = {
  details: "Idle",
  state: "Password Manager for NIKKE",
  startTimestamp: Date.now(),
  largeImageKey:
    "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_icon.png",
  largeImageText: `v${version}`,
  smallImageKey:
    "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_idle.png",
  smallImageText: "Idling",
  instance: false,
  buttons: [
    { label: "Learn More", url: "https://github.com/ScathachGrip/nikkePwned" },
  ],
};

console.log("WebSocket Server running on ws://localhost:6464");

function showNotification(message: string, title = "Screenshot"): void {
  const safeMessage = String(message).replace(/'/g, "''");
  const safeTitle = String(title).replace(/'/g, "''");
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "$notify=New-Object System.Windows.Forms.NotifyIcon",
    "$notify.Icon=[System.Drawing.SystemIcons]::Information",
    "$notify.Visible=$true",
    `$notify.BalloonTipTitle='${safeTitle}'`,
    `$notify.BalloonTipText='${safeMessage}'`,
    "$notify.ShowBalloonTip(2200)",
    "Start-Sleep -Milliseconds 2300",
    "$notify.Dispose()",
  ].join("; ");

  spawn(
    "powershell",
    [
      "-NoLogo",
      "-NoProfile",
      "-WindowStyle",
      "Hidden",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
    ],
    { windowsHide: true, stdio: "ignore" },
  );
}

type DamageResult = {
  damages: number[];
  total: number;
};

function normalizeDamageResult(raw: DamageResult): DamageResult {
  const damages = Array.isArray(raw.damages)
    ? raw.damages
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0)
    : [];
  const total = damages.reduce((sum, value) => sum + value, 0);
  return { damages, total };
}

function extractJsonObject(text: string): string {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object in model response");
  }
  return cleaned.slice(firstBrace, lastBrace + 1);
}

function formatDamageNotification(result: DamageResult, elapsedMs: number): string {
  const damages = result.damages.slice(0, 5).join(", ");
  return `DMG [${damages}] | ${elapsedMs}ms`;
}

async function analyzeScreenshotDamage(imagePath: string): Promise<{ result: DamageResult; elapsedMs: number }> {
  if (!runtimeOpenRouterApiKey) {
    throw new Error("OpenRouter API key is empty");
  }

  const imageBuffer = await readFile(imagePath);
  const base64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  const start = Date.now();

  // console.log("check api key:", runtimeOpenRouterApiKey);

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${runtimeOpenRouterApiKey}`,
    },
    body: JSON.stringify({
      model: runtimeOpenRouterModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: base64 },
            },
            {
              type: "text",
              text: DAMAGE_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenRouter response has no message content");
  }

  const parsed = JSON.parse(extractJsonObject(raw)) as DamageResult;
  if (!Array.isArray(parsed.damages)) {
    throw new Error("Model JSON format is invalid");
  }

  return { result: normalizeDamageResult(parsed), elapsedMs: Date.now() - start };
}

async function handleScreenshotSaved(fileName: string, filePath: string): Promise<void> {
  showNotification(
    fileName ? `Saved: ${fileName}` : "Saved",
    `Assigned ${runtimeOpenRouterModel}`,
  );

  try {
    const { result, elapsedMs } = await analyzeScreenshotDamage(filePath);
    const titleTotal = Number.isFinite(result.total) ? result.total.toLocaleString() : "N/A";
    showNotification(formatDamageNotification(result, elapsedMs), `Damage: ${titleTotal}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotification(`Analyze failed: ${message}`, "Damage Result");
  } finally {
    try {
      await unlink(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to delete screenshot (${filePath}):`, message);
    }
  }
}

function buildF8ListenerScript(parentPid: number): string {
  return [
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public static class KeyboardState { [DllImport(\"user32.dll\")] public static extern short GetAsyncKeyState(int vKey); }'",
    "$mutexName='Global\\NikkePwnedF8ScreenshotListener'",
    "$createdNew=$false",
    "$mutex=New-Object System.Threading.Mutex($false,$mutexName,[ref]$createdNew)",
    "if(-not $createdNew){exit}",
    "try{",
    `$parentPid=${parentPid}`,
    "$picturesPath=[Environment]::GetFolderPath('MyPictures')",
    "$vkF8=0x77",
    "$wasDown=$false",
    "while($true){",
    "if($parentPid -gt 0 -and -not (Get-Process -Id $parentPid -ErrorAction SilentlyContinue)){break}",
    "$isDown=([KeyboardState]::GetAsyncKeyState($vkF8) -band 0x8000) -ne 0",
    "if($isDown -and -not $wasDown){",
    "try{",
    "$timestamp=Get-Date -Format 'yyyyMMdd_HHmmss_fff'",
    "$filePath=Join-Path $picturesPath (\"nikkepwned_{0}.png\" -f $timestamp)",
    "$bounds=[System.Windows.Forms.SystemInformation]::VirtualScreen",
    "$bmp=New-Object System.Drawing.Bitmap $bounds.Width,$bounds.Height",
    "$g=[System.Drawing.Graphics]::FromImage($bmp)",
    "$g.CopyFromScreen($bounds.Left,$bounds.Top,0,0,$bmp.Size)",
    "$bmp.Save($filePath,[System.Drawing.Imaging.ImageFormat]::Png)",
    "$g.Dispose()",
    "$bmp.Dispose()",
    "$fileName=[System.IO.Path]::GetFileName($filePath)",
    "Write-Output (\"SCREENSHOT_SAVED|{0}|{1}\" -f $fileName,$filePath)",
    "}catch{",
    "Write-Output 'SCREENSHOT_FAILED'",
    "}",
    "Start-Sleep -Milliseconds 220",
    "}",
    "$wasDown=$isDown",
    "Start-Sleep -Milliseconds 60",
    "}",
    "}finally{",
    "$mutex.ReleaseMutex()",
    "$mutex.Dispose()",
    "}",
  ].join("; ");
}

function clearShutdownTimer(): void {
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }
}

async function shutdownBridge(reason: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  clearShutdownTimer();
  console.log(`Shutting down bridge: ${reason}`);

  if (f8Listener && !f8Listener.killed) {
    try {
      f8Listener.kill();
    } catch {
      // no-op
    }
  }

  try {
    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });
  } catch {
    // no-op
  }

  try {
    rpc.destroy();
  } catch {
    // no-op
  }

  process.exit(0);
}

function scheduleShutdownIfIdle(): void {
  if (shuttingDown) return;
  if (wss.clients.size > 0) {
    clearShutdownTimer();
    return;
  }

  clearShutdownTimer();
  shutdownTimer = setTimeout(() => {
    if (wss.clients.size === 0) {
      void shutdownBridge("No active app websocket clients");
    }
  }, IDLE_SHUTDOWN_MS);
}

function startGlobalF8ScreenshotListener(): void {
  const script = buildF8ListenerScript(process.pid);
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const listener = spawn(
    "powershell",
    [
      "-NoLogo",
      "-NoProfile",
      "-WindowStyle",
      "Hidden",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      encoded,
    ],
    {
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  f8Listener = listener;

  let stdoutBuffer = "";
  listener.stdout.setEncoding("utf8");
  listener.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith("SCREENSHOT_SAVED|")) {
        const payload = line.substring("SCREENSHOT_SAVED|".length).trim();
        const [fileName = "", filePath = ""] = payload.split("|");
        if (!filePath) {
          showNotification(fileName ? `Saved: ${fileName}` : "Saved");
          showNotification("Analyze failed: missing image path", "Damage Result");
          continue;
        }
        void handleScreenshotSaved(fileName.trim(), filePath.trim());
        continue;
      }

      if (line === "SCREENSHOT_FAILED") {
        showNotification("Failed");
      }
    }
  });

  listener.on("error", (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("F8 listener failed:", message);
  });
}

async function setActivity(): Promise<void> {
  try {
    await rpc.setActivity(activity);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("setActivity skipped:", message);
  }
}

async function loginToDiscord(): Promise<void> {
  if (loginInProgress || rpcDisabled) return;
  loginInProgress = true;
  try {
    await rpc.login({ clientId: CLIENT_ID });
  } catch {
    rpcDisabled = true;
    console.warn("Discord RPC unavailable. Running without Discord connection.");
  } finally {
    loginInProgress = false;
  }
}

rpc.on("ready", () => {
  console.log("Discord RPC connected.");
  void setActivity();
});

rpc.on("error", (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.warn("Discord RPC error:", message);
});

rpc.on("disconnected", () => {
  rpcDisabled = true;
  console.warn("Discord RPC disconnected.");
});

wss.on("connection", (ws: WebSocket) => {
  console.log("Neutralino connected.");
  clearShutdownTimer();

  ws.on("message", (message: RawData) => {
    try {
      const data = JSON.parse(message.toString()) as
        | (Partial<typeof activity> & { event?: string; apiKey?: string; model?: string })
        | undefined;

      if (data?.event === "set_openrouter_key") {
        const incomingKey = typeof data.apiKey === "string" ? data.apiKey.trim() : "";
        const incomingModel = typeof data.model === "string" ? data.model.trim() : "";
        runtimeOpenRouterApiKey = incomingKey;
        runtimeOpenRouterModel = incomingModel || DEFAULT_OPENROUTER_MODEL;
        return;
      }

      if (!data) return;
      activity = { ...activity, ...data };
      void setActivity();
    } catch (error) {
      console.error("Invalid JSON received:", error);
    }
  });

  ws.on("close", () => {
    scheduleShutdownIfIdle();
  });

  ws.on("error", () => {
    scheduleShutdownIfIdle();
  });
});

wss.on("close", () => {
  if (!shuttingDown) {
    void shutdownBridge("WebSocket server closed");
  }
});

process.on("SIGINT", () => {
  void shutdownBridge("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdownBridge("SIGTERM");
});

process.on("SIGBREAK", () => {
  void shutdownBridge("SIGBREAK");
});

startGlobalF8ScreenshotListener();
void loginToDiscord();
scheduleShutdownIfIdle();
