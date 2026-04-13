import RPC from "discord-rpc";
import { spawn } from "child_process";
import { readFile, unlink } from "fs/promises";
import { request as httpsRequest } from "https";
import WebSocket, { RawData, WebSocketServer } from "ws";
import { version } from "./package.json";

const CLIENT_ID = "632699411448725564";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL_ID = "nvidia/nemotron-nano-12b-v2-vl:free";
const IDLE_SHUTDOWN_MS = 5000;

const imageToValueReasoningPrompt = `This is a game battle screen. Each character row has 3 stats shown as icons:
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
let runtimeOpenRouterModel = DEFAULT_MODEL_ID;
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

/**
 * Sends a system notification payload to all connected Neutralino app clients.
 * This keeps notification identity tied to the app window instead of the bridge process.
 *
 * @param {string} message - The notification message body.
 * @param {string} [title="Screenshot"] - The notification title.
 * @param {"INFO" | "WARNING" | "ERROR" | "QUESTION"} [icon="INFO"] - The notification icon type.
 *
 * @returns {void} No return value; sends WebSocket messages as side effects.
 */
function showNotification(
  message: string,
  title: string = "Screenshot",
  icon: "INFO" | "WARNING" | "ERROR" | "QUESTION" = "INFO",
): void {
  const payload = JSON.stringify({
    event: "system_notification",
    title,
    message,
    icon,
  });

  let hasClient = false;
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(payload);
    hasClient = true;
  }

  if (!hasClient) {
    console.warn(`[Notification queued without client] ${title}: ${message}`);
  }
}

type DamageResult = {
  damages: number[];
  total: number;
};

/**
 * Normalizes model damage output by coercing values to non-negative finite numbers
 * and recalculating the total from the normalized damage list.
 *
 * @param {DamageResult} raw - The raw damage payload from model output.
 *
 * @returns {DamageResult} A sanitized damage object with normalized values.
 */
function normalizeDamageResult(raw: DamageResult): DamageResult {
  const damages = Array.isArray(raw.damages)
    ? raw.damages
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0)
    : [];
  const total = damages.reduce((sum, value) => sum + value, 0);
  return { damages, total };
}

/**
 * Extracts the first valid JSON object block from model text output.
 * Supports responses wrapped with Markdown code fences.
 *
 * @param {string} text - Raw model response text.
 *
 * @returns {string} A string containing a single JSON object.
 * @throws {Error} If no JSON object boundaries are detected.
 */
function extractJsonObject(text: string): string {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object in model response");
  }
  return cleaned.slice(firstBrace, lastBrace + 1);
}

/**
 * Formats the final screenshot analysis result into a compact notification string.
 *
 * @param {DamageResult} result - Parsed and normalized damage result.
 * @param {number} elapsedMs - Analysis duration in milliseconds.
 *
 * @returns {string} A human-readable single-line damage summary.
 */
function formatDamageNotification(result: DamageResult, elapsedMs: number): string {
  const damages = result.damages.slice(0, 5).join(", ");
  return `DMG [${damages}] | ${elapsedMs}ms`;
}

/**
 * Sends screenshot data to OpenRouter vision model and parses damage output.
 *
 * @param {string} imagePath - Absolute path to the screenshot PNG file.
 *
 * @returns {Promise<{ result: DamageResult; elapsedMs: number }>} Parsed damage result and processing time.
 * @throws {Error} If API key is missing, request fails, or response format is invalid.
 */
async function analyzeScreenshotDamage(imagePath: string): Promise<{ result: DamageResult; elapsedMs: number }> {
  if (!runtimeOpenRouterApiKey) {
    throw new Error("OpenRouter API key is empty");
  }

  const imageBuffer = await readFile(imagePath);
  const base64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  const start = Date.now();

  console.log("check api key:", runtimeOpenRouterApiKey);

  const requestBody = JSON.stringify({
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
            text: imageToValueReasoningPrompt,
          },
        ],
      },
    ],
  });

  const endpoint = new URL(OPENROUTER_ENDPOINT);
  const data = await new Promise<{ choices?: Array<{ message?: { content?: string } }> }>(
    (resolve, reject) => {
      const req = httpsRequest(
        {
          protocol: endpoint.protocol,
          hostname: endpoint.hostname,
          port: endpoint.port || 443,
          path: `${endpoint.pathname}${endpoint.search}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${runtimeOpenRouterApiKey}`,
            "Content-Length": Buffer.byteLength(requestBody),
          },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            const status = res.statusCode || 0;
            if (status < 200 || status >= 300) {
              reject(new Error(`OpenRouter ${status}: ${body}`));
              return;
            }

            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error("OpenRouter response is not valid JSON"));
            }
          });
        },
      );

      req.on("error", (error) => {
        reject(error);
      });
      req.write(requestBody);
      req.end();
    },
  );

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

/**
 * Handles screenshot post-save flow: notify saved state, analyze damage, notify result,
 * then delete the temporary screenshot file.
 *
 * @param {string} fileName - Screenshot file name for UI display.
 * @param {string} filePath - Full screenshot path used for analysis.
 *
 * @returns {Promise<void>} Resolves after notification flow and cleanup complete.
 */
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

/**
 * Builds the encoded PowerShell script used to listen globally for F8 presses,
 * capture a screenshot, and emit stdout markers consumed by the bridge.
 *
 * @param {number} parentPid - Current bridge process PID for lifecycle binding.
 *
 * @returns {string} A single-line PowerShell script.
 */
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

/**
 * Clears pending idle-shutdown timer when bridge activity resumes.
 *
 * @returns {void} No return value; mutates timer state.
 */
function clearShutdownTimer(): void {
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }
}

/**
 * Gracefully shuts down bridge resources: F8 listener, websocket server, RPC client,
 * then exits the process.
 *
 * @param {string} reason - Human-readable reason used for logging.
 *
 * @returns {Promise<void>} Resolves right before process termination.
 */
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

/**
 * Starts an idle shutdown countdown when no websocket clients remain connected.
 * Clears countdown immediately if at least one client is active.
 *
 * @returns {void} No return value; schedules or clears internal timer.
 */
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

/**
 * Launches the hidden PowerShell global F8 listener process and streams stdout events
 * back into screenshot notification and analysis handlers.
 *
 * @returns {void} No return value; spawns background listener process.
 */
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

/**
 * Updates Discord Rich Presence with the current in-memory activity payload.
 * Failures are treated as non-fatal and logged for diagnostics.
 *
 * @returns {Promise<void>} Resolves when activity update attempt completes.
 */
async function setActivity(): Promise<void> {
  try {
    await rpc.setActivity(activity);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("setActivity skipped:", message);
  }
}

/**
 * Performs a guarded Discord RPC login attempt and disables retry loop when
 * Discord is unavailable in the current environment.
 *
 * @returns {Promise<void>} Resolves after login attempt finishes.
 */
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
        runtimeOpenRouterModel = incomingModel || DEFAULT_MODEL_ID;
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
