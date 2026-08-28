// Pure TypeScript for nikkePwned UI (Tauri v2 Native Integration)
export {};

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

interface Account {
  nickname: string;
  email: string;
  password: string;
}

interface HistoryLog {
  account: string;
  eventType: string;
  isSuccess: string;
  timestamp: number;
}

interface OpenRouterConfig {
  apiKey: string;
  model: string;
}

interface LoginResult {
  success: boolean;
  message: string;
}

type RegisterMode = "single" | "multiple";
type AlertType = "success" | "fail";

document.addEventListener("DOMContentLoaded", async () => {
  const tauri = window.__TAURI__ || {};
  const invoke = tauri.core?.invoke
    ? <T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> => tauri.core!.invoke<T>(cmd, args)
    : async <T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
        console.log("Mock invoke:", cmd, args);
        return undefined as unknown as T;
      };

  // Audio assets
  const audioHaik = new Audio("/static/haikchad.wav");
  const audioIchad = new Audio("/static/ichad.wav");

  // DOM Elements
  const body = document.body;
  const appLogo = document.getElementById("appLogo") as HTMLImageElement | null;
  const themeToggle = document.getElementById("themeToggle");
  const selectedPathEl = document.getElementById("selectedPath");
  const selectPathBtn = document.getElementById("selectPathBtn");
  const selectPathIconBtn = document.getElementById("selectPathIconBtn");
  const runBtn = document.getElementById("runBtn");
  const removeBtn = document.getElementById("removeBtn");
  const registerBtn = document.getElementById("registerBtn");

  const modeSingleBtn = document.getElementById("modeSingleBtn");
  const modeMultipleBtn = document.getElementById("modeMultipleBtn");
  const singleAccountForm = document.getElementById("singleAccountForm");
  const jsonInput = document.getElementById("jsonInput") as HTMLTextAreaElement | null;

  const singleNicknameInput = document.getElementById("singleNickname") as HTMLInputElement | null;
  const singleEmailInput = document.getElementById("singleEmail") as HTMLInputElement | null;
  const singlePasswordInput = document.getElementById("singlePassword") as HTMLInputElement | null;

  const accountSelect = document.getElementById("accountSelect") as HTMLSelectElement | null;
  const accountPickerBtn = document.getElementById("accountPickerBtn");
  const accountPickerLabel = document.getElementById("accountPickerLabel");
  const accountPickerModal = document.getElementById("accountPickerModal");
  const accountPickerClose = document.getElementById("accountPickerClose");
  const accountPickerList = document.getElementById("accountPickerList");

  const delayBtn = document.getElementById("delayBtn") as HTMLInputElement | null;
  const delayBtnLogin = document.getElementById("delayBtnLogin") as HTMLInputElement | null;
  const myBtn = document.getElementById("myBtn");
  const purgeBtn = document.getElementById("purgeBtn");

  const snackbar = document.getElementById("snackbar");
  const snackbarText = document.getElementById("snackbar-text");
  const progressBar = document.querySelector(".progress-bar") as HTMLElement | null;

  const minBtn = document.getElementById("minBtn");
  const maxBtn = document.getElementById("maxBtn");
  const closeBtn = document.getElementById("closeBtn");

  const myModal = document.getElementById("myModal");
  const modalCloseLogs = myModal ? myModal.querySelector<HTMLElement>(".close") : null;
  const historyTableBody = document.querySelector<HTMLTableSectionElement>("#myModal table tbody");
  const searchInput = document.getElementById("searchInput") as HTMLInputElement | null;

  const myModalWortel = document.getElementById("myModalWortel");
  const modalCloseWortel = myModalWortel ? myModalWortel.querySelector<HTMLElement>(".close") : null;
  const myBtnWortel = document.getElementById("myBtnWortel");
  const gambarKlik = document.getElementById("gambarKlik") as HTMLImageElement | null;
  const countEl = document.getElementById("count") as HTMLInputElement | null;
  const dcCountEl = document.getElementById("dcCount") as HTMLInputElement | null;
  const resetWortelBtn = document.getElementById("reset") as HTMLButtonElement | null;
  const textareaWortel = document.getElementById("textarea") as HTMLTextAreaElement | null;

  const myModalOpenRouter = document.getElementById("myModalOpenRouter");
  const myBtnOpenRouter = document.getElementById("myBtnOpenRouter");
  const modalCloseOpenRouter = myModalOpenRouter ? myModalOpenRouter.querySelector<HTMLElement>(".close") : null;
  const openrouterApiKeyInput = document.getElementById("openrouterApiKey") as HTMLInputElement | null;
  const openrouterApiKeyToggle = document.getElementById("openrouterApiKeyToggle");
  const openrouterModelSelect = document.getElementById("openrouterModel") as HTMLSelectElement | null;
  const saveOpenrouterKeyBtn = document.getElementById("saveOpenrouterKeyBtn");

  let registerMode: RegisterMode = "single";
  let launcherPath = "";
  let accountsList: Account[] = [];
  let historyLogs: HistoryLog[] = [];

  // Window control buttons
  if (minBtn) minBtn.addEventListener("click", () => invoke("minimize_window"));
  if (maxBtn) maxBtn.addEventListener("click", () => invoke("toggle_maximize_window"));
  if (closeBtn) {
    closeBtn.addEventListener("click", async () => {
      const confirmClose = await invoke<boolean>("confirm_dialog", {
        title: "Close nikkePwned",
        message: "Are you sure you want to close nikkePwned?"
      });
      if (confirmClose) {
        invoke("close_window");
      }
    });
  }

  // Toast alert
  function showAlert(message: string, type: AlertType): void {
    if (!snackbar || !snackbarText || !progressBar) return;
    snackbar.className = `show ${type}`;
    snackbarText.textContent = type === "success" ? `✅ ${message}` : `❌ ${message}`;

    progressBar.style.width = "0%";
    progressBar.style.transition = "none";
    void progressBar.offsetWidth;
    progressBar.style.transition = "width 3s linear";
    progressBar.style.width = "100%";

    setTimeout(() => {
      snackbar.classList.remove("show", "success", "fail");
    }, 3000);
  }

  // Theme application
  function applyTheme(isLight: boolean): void {
    body.classList.toggle("light-mode", isLight);
    if (appLogo) appLogo.src = isLight ? "/icons/logo-light.png" : "/icons/logo.png";
    localStorage.setItem("theme", isLight ? "light" : "dark");
  }

  themeToggle?.addEventListener("click", () => {
    const isLight = !body.classList.contains("light-mode");
    applyTheme(isLight);
  });

  const savedTheme = localStorage.getItem("theme");
  applyTheme(savedTheme === "light");

  // Mode Toggling (Single vs Multiple JSON)
  function setRegisterMode(mode: RegisterMode): void {
    registerMode = mode;
    modeSingleBtn?.classList.toggle("is-active", mode === "single");
    modeMultipleBtn?.classList.toggle("is-active", mode === "multiple");
    if (singleAccountForm) singleAccountForm.style.display = mode === "single" ? "flex" : "none";
    if (jsonInput) jsonInput.style.display = mode === "multiple" ? "block" : "none";
  }

  modeSingleBtn?.addEventListener("click", () => setRegisterMode("single"));
  modeMultipleBtn?.addEventListener("click", () => setRegisterMode("multiple"));
  setRegisterMode("single");

  // Account Management & Picker Sync
  function redactedEmail(email: string): string {
    return email.replace(/(.{3})@/, "***@");
  }

  function syncAccountPickerUI(): void {
    if (!accountPickerList || !accountPickerLabel || !accountSelect) return;
    accountPickerList.innerHTML = "";
    if (accountsList.length === 0) {
      accountPickerLabel.textContent = "Select an Account";
      const emptyBtn = document.createElement("button");
      emptyBtn.className = "account-picker-option-empty";
      emptyBtn.disabled = true;
      emptyBtn.textContent = "No accounts available yet.";
      accountPickerList.appendChild(emptyBtn);
      return;
    }

    const selectedVal = accountSelect.value;
    const selectedAcc = accountsList[Number(selectedVal)];
    accountPickerLabel.textContent = selectedAcc
      ? `${selectedAcc.nickname} (${redactedEmail(selectedAcc.email)})`
      : "Select an Account";

    accountsList.forEach((acc, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `account-picker-option ${selectedVal === String(idx) ? "is-selected" : ""}`;
      btn.textContent = `${acc.nickname} (${redactedEmail(acc.email)})`;
      btn.addEventListener("click", () => {
        accountSelect.value = String(idx);
        syncAccountPickerUI();
        closeAccountPicker();
      });
      accountPickerList.appendChild(btn);
    });
  }

  async function loadAccounts(): Promise<void> {
    try {
      const res = await invoke<Account[]>("get_accounts");
      accountsList = res || [];
      if (accountSelect) {
        accountSelect.innerHTML = '<option value="">Select account</option>';
        accountsList.forEach((acc, idx) => {
          const opt = document.createElement("option");
          opt.value = String(idx);
          opt.textContent = `${acc.nickname} (${redactedEmail(acc.email)})`;
          accountSelect.appendChild(opt);
        });

        if (accountsList.length > 0) {
          let defaultIdx = 0;
          try {
            const logs = await invoke<HistoryLog[]>("get_history_logs");
            if (logs && logs.length > 0) {
              const loginLogs = logs
                .filter((l) => {
                  const typeStr = l.eventType || (l as unknown as Record<string, string>).typeWhat || "";
                  return typeStr.toLowerCase().includes("login");
                })
                .sort((a, b) => {
                  const tsA = a.timestamp || (a as unknown as Record<string, number>).dateWhat || 0;
                  const tsB = b.timestamp || (b as unknown as Record<string, number>).dateWhat || 0;
                  return tsB - tsA;
                });

              if (loginLogs.length > 0) {
                const lastAccStr = loginLogs[0].account || (loginLogs[0] as unknown as Record<string, string>).accountWhat || "";
                const foundIdx = accountsList.findIndex(
                  (a) => a.nickname.toLowerCase() === lastAccStr.toLowerCase() || a.email.toLowerCase() === lastAccStr.toLowerCase()
                );
                if (foundIdx !== -1) {
                  defaultIdx = foundIdx;
                }
              }
            }
          } catch (e) {
            console.warn("Smart detect last login failed:", e);
          }
          accountSelect.value = String(defaultIdx);
        }
      }
      syncAccountPickerUI();
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  }

  // Account Picker Modal Handlers
  function openAccountPicker(): void {
    if (accountPickerModal) accountPickerModal.style.display = "flex";
    checkCapsLock();
  }

  function closeAccountPicker(): void {
    if (accountPickerModal) accountPickerModal.style.display = "none";
  }

  accountPickerBtn?.addEventListener("click", openAccountPicker);
  accountPickerClose?.addEventListener("click", closeAccountPicker);

  accountPickerModal?.addEventListener("click", (e) => {
    if (e.target === accountPickerModal) closeAccountPicker();
  });

  // Launcher Path Handler
  async function loadLauncherPath(): Promise<void> {
    try {
      const path = await invoke<string>("get_launcher_path");
      if (path && selectedPathEl) {
        launcherPath = path;
        selectedPathEl.textContent = launcherPath;
      }
    } catch (e) {
      console.error("Failed to get launcher path:", e);
    }
  }

  async function handleSelectPath(): Promise<void> {
    try {
      const path = await invoke<string>("select_launcher_path");
      if (path && selectedPathEl) {
        launcherPath = path;
        selectedPathEl.textContent = launcherPath;
        showAlert("Path selected!", "success");
        await invoke("add_history_log", { account: "nikke_launcher", eventType: "Adjusting Path", isSuccess: "True" });
      }
    } catch (err) {
      showAlert(String(err), "fail");
    }
  }

  selectPathBtn?.addEventListener("click", handleSelectPath);
  selectPathIconBtn?.addEventListener("click", handleSelectPath);

  // Register Accounts
  registerBtn?.addEventListener("click", async () => {
    try {
      let newAccs: Account[] = [];
      if (registerMode === "single") {
        const nickname = singleNicknameInput?.value.trim() || "";
        const email = singleEmailInput?.value.trim() || "";
        const password = singlePasswordInput?.value || "";
        if (!nickname || !email || !password) {
          throw new Error("Please fill nickname, email, and password.");
        }
        newAccs.push({ nickname, email, password });
      } else {
        const val = jsonInput?.value.trim() || "";
        if (!val) throw new Error("JSON input is empty.");
        const parsed = JSON.parse(val);
        newAccs = Array.isArray(parsed) ? parsed : [parsed];
      }

      await invoke("register_accounts", { accounts: newAccs });
      showAlert("Accounts Registered!", "success");
      await loadAccounts();

      if (registerMode === "single") {
        if (singleNicknameInput) singleNicknameInput.value = "";
        if (singleEmailInput) singleEmailInput.value = "";
        if (singlePasswordInput) singlePasswordInput.value = "";
      } else {
        if (jsonInput) jsonInput.value = "";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showAlert(msg, "fail");
    }
  });

  // Remove Account
  removeBtn?.addEventListener("click", async () => {
    if (!accountSelect) return;
    const idx = accountSelect.value;
    if (idx === "") {
      showAlert("Please select an account to remove!", "fail");
      return;
    }
    const acc = accountsList[Number(idx)];
    if (!acc) return;

    try {
      await invoke("remove_account", { email: acc.email });
      showAlert(`Removed ${acc.nickname}!`, "success");
      accountSelect.value = "";
      await loadAccounts();
    } catch (err) {
      showAlert(String(err), "fail");
    }
  });

  const loadingImgs = ["ext_load_1", "ext_load_2", "ext_load_3", "ext_load_4", "ext_load_5"];

  function startLoading(): void {
    document.body.style.cursor = "wait";
    const img = document.getElementById("loadingImg") as HTMLImageElement | null;
    if (img) {
      const randomLoader = loadingImgs[Math.floor(Math.random() * loadingImgs.length)];
      img.src = `/static/loading/${randomLoader}.webp`;
    }
    const el = document.getElementById("loading");
    if (el) el.style.display = "flex";
  }

  function finishLoading(): void {
    document.body.style.cursor = "default";
    const el = document.getElementById("loading");
    if (el) el.style.display = "none";
  }

  // Execute Login
  runBtn?.addEventListener("click", async () => {
    if (!accountSelect) return;
    let idx = accountSelect.value;
    if (idx === "" && accountsList.length > 0) {
      accountSelect.value = "0";
      idx = "0";
      syncAccountPickerUI();
    }
    if (idx === "") {
      showAlert("Please select an account!", "fail");
      return;
    }
    const acc = accountsList[Number(idx)];
    if (!acc) return;

    if (!launcherPath || launcherPath.includes("where is nikke_launcher")) {
      showAlert("You did not edit where nikke_launcher is located!", "fail");
      return;
    }

    const switchDelay = Number(delayBtn?.value) || 3;
    const loginDelay = Number(delayBtnLogin?.value) || 3;

    startLoading();

    // Give webview time to render loading overlay on screen
    await new Promise((r) => setTimeout(r, 50));

    try {
      const res = await invoke<LoginResult>("execute_login", {
        accountIndex: parseInt(idx, 10),
        switchDelay,
        loginDelay
      });

      finishLoading();

      if (res && res.success) {
        audioHaik.currentTime = 0;
        audioHaik.play().catch(() => {});
        showAlert(`Logged in as ${acc.nickname}!`, "success");
        invoke("update_discord_rpc", {
          details: `Playing NIKKE ${Number(idx) + 1} / ${accountsList.length} accounts`,
          state: `Logged in as ${acc.nickname}`,
          smallImageKey: "rpc_maintain",
          smallImageText: "Maintaining"
        }).catch((e) => console.warn("RPC update failed:", e));
      } else {
        showAlert(res?.message || "Failed to perform login", "fail");
      }
    } catch (err) {
      finishLoading();
      showAlert(String(err), "fail");
    }
  });

  // Caps Lock Check
  async function checkCapsLock(): Promise<void> {
    try {
      const isCaps = await invoke<boolean>("check_caps_lock");
      body.classList.toggle("caps-on", !!isCaps);
    } catch (e) {
      console.warn("Caps lock check failed:", e);
    }
  }

  // Logs Modal
  myBtn?.addEventListener("click", async () => {
    if (myModal) myModal.style.display = "flex";
    try {
      historyLogs = await invoke<HistoryLog[]>("get_history_logs");
      renderHistoryLogs(historyLogs);
    } catch (e) {
      console.error(e);
    }
  });

  modalCloseLogs?.addEventListener("click", () => {
    if (myModal) myModal.style.display = "none";
  });

  function renderHistoryLogs(logs: HistoryLog[]): void {
    if (!historyTableBody) return;
    historyTableBody.innerHTML = "";
    if (!logs || logs.length === 0) {
      historyTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No Results</td></tr>';
      return;
    }
    logs.forEach((log) => {
      const accountStr = log.account || (log as unknown as Record<string, string>).accountWhat || "-";
      const typeStr = log.eventType || (log as unknown as Record<string, string>).typeWhat || (log as unknown as Record<string, string>).event_type || "-";
      const isSuccessStr = log.isSuccess || (log as unknown as Record<string, string>).is_success || "False";
      const rawTs = log.timestamp || (log as unknown as Record<string, number>).dateWhat;
      const ts = typeof rawTs === "number" ? rawTs : Number(rawTs) || Date.now();
      const dateStr = !isNaN(ts) && ts > 0 ? new Date(ts).toLocaleString() : "-";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="String">${accountStr}</td>
        <td data-label="Type">${typeStr}</td>
        <td data-label="isSuccess">${isSuccessStr}</td>
        <td data-label="Date">${dateStr}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  searchInput?.addEventListener("input", (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    const filtered = historyLogs.filter((l) =>
      l.account.toLowerCase().includes(q) || l.eventType.toLowerCase().includes(q)
    );
    renderHistoryLogs(filtered);
  });

  // Clicker Easter Egg (Wortel Modal)
  const soundIchad = new Audio("/static/ichad.wav");
  const clickBox = document.getElementById("click");
  let prevClickMicrotime = Date.now() / 1000;

  function microtime(): number {
    return Date.now() / 1000;
  }

  myBtnWortel?.addEventListener("click", () => {
    if (!myModalWortel) return;
    const isOpening = myModalWortel.style.display !== "flex";
    myModalWortel.style.display = isOpening ? "flex" : "none";
    if (isOpening) {
      showAlert("double click mouse tests", "success");
      invoke("update_discord_rpc", {
        details: "Playing NIKKE",
        state: "Rapidfire mouse tests",
        smallImageKey: "rpc_testing",
        smallImageText: "Testing"
      }).catch((e) => console.warn("RPC update failed:", e));
    }
  });

  modalCloseWortel?.addEventListener("click", () => {
    if (myModalWortel) myModalWortel.style.display = "none";
  });

  gambarKlik?.addEventListener("click", () => {
    gambarKlik.classList.remove("vibrate");
    void gambarKlik.offsetWidth;
    gambarKlik.classList.add("vibrate");

    soundIchad.currentTime = 0;
    soundIchad.play().catch(() => {});
  });

  clickBox?.addEventListener("mousedown", () => {
    const clickTime = microtime();
    const diff = clickTime - prevClickMicrotime;

    if (diff <= 0.08) {
      if (clickBox) clickBox.style.background = "red";
      if (dcCountEl) dcCountEl.value = (parseInt(dcCountEl.value || "0", 10) + 1).toString();
    }

    if (textareaWortel) {
      textareaWortel.value = `${diff}\t${diff.toFixed(2)} sec.\n` + textareaWortel.value;
    }
    prevClickMicrotime = clickTime;
    if (countEl) countEl.value = (parseInt(countEl.value || "0", 10) + 1).toString();
  });

  resetWortelBtn?.addEventListener("click", () => {
    if (countEl) countEl.value = "0";
    if (dcCountEl) dcCountEl.value = "0";
    if (textareaWortel) textareaWortel.value = "";
    if (clickBox) clickBox.style.background = "#292929";
    prevClickMicrotime = microtime();
  });

  // OpenRouter Modal
  myBtnOpenRouter?.addEventListener("click", async () => {
    if (myModalOpenRouter) myModalOpenRouter.style.display = "flex";
    try {
      const cfg = await invoke<OpenRouterConfig>("get_openrouter_config");
      if (cfg) {
        if (openrouterApiKeyInput) openrouterApiKeyInput.value = cfg.apiKey || "";
        if (openrouterModelSelect) openrouterModelSelect.value = cfg.model || "nvidia/nemotron-nano-12b-v2-vl:free";
      }
    } catch (e) {
      console.error(e);
    }
  });

  modalCloseOpenRouter?.addEventListener("click", () => {
    if (myModalOpenRouter) myModalOpenRouter.style.display = "none";
  });

  openrouterApiKeyToggle?.addEventListener("click", () => {
    if (!openrouterApiKeyInput || !openrouterApiKeyToggle) return;
    const isPass = openrouterApiKeyInput.type === "password";
    openrouterApiKeyInput.type = isPass ? "text" : "password";
    openrouterApiKeyToggle.textContent = isPass ? "Hide" : "Show";
  });

  saveOpenrouterKeyBtn?.addEventListener("click", async () => {
    try {
      await invoke("save_openrouter_config", {
        apiKey: openrouterApiKeyInput?.value.trim() || "",
        model: openrouterModelSelect?.value || "nvidia/nemotron-nano-12b-v2-vl:free"
      });
      showAlert("OpenRouter config saved!", "success");
      if (myModalOpenRouter) myModalOpenRouter.style.display = "none";
    } catch (e) {
      showAlert(String(e), "fail");
    }
  });

  // Close modals on clicking backdrop outside content
  [myModal, myModalWortel, myModalOpenRouter, accountPickerModal].forEach((m) => {
    m?.addEventListener("click", (e) => {
      if (e.target === m) {
        m.style.display = "none";
      }
    });
  });

  // Global ESC Listener to close modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAccountPicker();
      if (myModal) myModal.style.display = "none";
      if (myModalWortel) myModalWortel.style.display = "none";
      if (myModalOpenRouter) myModalOpenRouter.style.display = "none";
    }
  });

  // Purge Data
  purgeBtn?.addEventListener("click", async () => {
    const confirmPurge = await invoke<boolean>("confirm_dialog", {
      title: "Purge Data",
      message:
        "This action will permanently remove all stored data:\n\n" +
        "- STORED_ACCOUNTS\n" +
        "- STORED_HISTORY\n" +
        "- STORED_nikkeLauncherPath\n" +
        "- STORED_DELAYS\n\n" +
        "This action cannot be undone. Do you want to continue?"
    });
    if (!confirmPurge) return;

    try {
      await invoke("purge_data");
      showAlert("All stored data purged!", "success");
      accountsList = [];
      launcherPath = "";
      if (selectedPathEl) selectedPathEl.textContent = "where is nikke_launcher.exe";
      await loadAccounts();
    } catch (e) {
      showAlert(String(e), "fail");
    }
  });

  // Initial Load & DOM sync
  const appVersionEl = document.getElementById("appVersion");
  if (appVersionEl) appVersionEl.textContent = "4.2.0";

  await loadAccounts();
  await loadLauncherPath();
  checkCapsLock();
  setInterval(checkCapsLock, 3000);

  invoke("update_discord_rpc", {
    details: "Idle",
    state: "Password Manager for NIKKE",
    smallImageKey: "rpc_idle",
    smallImageText: "Idling"
  }).catch((e) => console.warn("Initial RPC update failed:", e));
});
