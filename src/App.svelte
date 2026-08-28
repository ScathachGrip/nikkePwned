<svelte:head>
  <title>nikkePwned</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/x-icon" href="/icons/favicon.ico" />
</svelte:head>

<script lang="ts">
  import { onMount } from "svelte";

  // Tauri API helper
  async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const tauri = (window as unknown as { __TAURI__?: { core?: { invoke: <R>(c: string, a?: Record<string, unknown>) => Promise<R> } } }).__TAURI__;
    if (tauri?.core?.invoke) {
      return tauri.core.invoke<T>(cmd, args);
    }
    throw new Error("Tauri API unavailable");
  }

  // Interfaces
  interface Account {
    nickname: string;
    email: string;
    password?: string;
  }

  interface HistoryLog {
    account: string;
    eventType: string;
    isSuccess: string;
    timestamp: number;
    accountWhat?: string;
    typeWhat?: string;
    is_success?: string;
    dateWhat?: number;
  }

  interface OpenRouterConfig {
    apiKey: string;
    model: string;
    api_key?: string;
  }

  interface LoginResult {
    success: boolean;
    message: string;
  }

  const OPENROUTER_MODEL_POOL = [
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "minimax/minimax-m2.5:free",
    "arcee-ai/trinity-large-preview:free",
    "liquid/lfm-2.5-1.2b-thinking:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "openai/gpt-oss-120b:free",
    "openai/gpt-oss-20b:free",
    "z-ai/glm-4.5-air:free",
    "qwen/qwen3-coder:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "google/gemma-3n-e2b-it:free",
    "google/gemma-3n-e4b-it:free",
    "google/gemma-3-4b-it:free",
    "google/gemma-3-12b-it:free",
    "google/gemma-3-27b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "nousresearch/hermes-3-llama-3.1-405b:free"
  ];

  // Svelte 5 Reactive State Runes
  let isLightMode = $state(false);
  let isCapsOn = $state(false);
  let appVersionText = $state("5.0.0");
  let launcherPath = $state("where is nikke_launcher.exe");
  let accounts = $state<Account[]>([]);
  let selectedAccountIndex = $state<number | null>(null);
  let registerMode = $state<"single" | "json">("single");

  // Single Account Form
  let singleNickname = $state("");
  let singleEmail = $state("");
  let singlePassword = $state("");
  let jsonInput = $state("");

  // Delays
  let switchDelay = $state(3);
  let loginDelay = $state(3);

  // Modals
  let isAccountPickerOpen = $state(false);
  let isLogsModalOpen = $state(false);
  let isOpenRouterModalOpen = $state(false);
  let isWortelModalOpen = $state(false);

  // Loading
  let isLoading = $state(false);
  let loadingImgSrc = $state("/static/loading/ext_load_1.webp");
  const loadingImgs = ["ext_load_1", "ext_load_2", "ext_load_3", "ext_load_4", "ext_load_5"];

  // Logs & Filter
  let historyLogs = $state<HistoryLog[]>([]);
  let searchQuery = $state("");

  // OpenRouter Form
  let openrouterApiKey = $state("");
  let openrouterModel = $state("nvidia/nemotron-nano-12b-v2-vl:free");
  let isApiKeyVisible = $state(false);

  // Wortel Clicker Easter Egg
  let wortelClickCount = $state(0);
  let wortelDcCount = $state(0);

  // Snackbar Toast
  let toastShow = $state(false);
  let toastType = $state<"success" | "fail">("success");
  let toastMessage = $state("");
  let toastProgress = $state(0);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Single Audio Instances (No stacking sound)
  let audioHaik: HTMLAudioElement | null = null;
  let audioIchad: HTMLAudioElement | null = null;

  function getAudio(soundName: "haikchad" | "ichad"): HTMLAudioElement {
    if (soundName === "haikchad") {
      if (!audioHaik) {
        audioHaik = new Audio(new URL("/static/haikchad.wav", window.location.href).href);
      }
      return audioHaik;
    } else {
      if (!audioIchad) {
        audioIchad = new Audio(new URL("/static/ichad.wav", window.location.href).href);
      }
      return audioIchad;
    }
  }

  function playAudio(soundName: "haikchad" | "ichad"): void {
    try {
      const audio = getAudio(soundName);
      audio.currentTime = 0;
      audio.volume = 1.0;
      audio.play().catch((e) => console.warn("Audio playback failed:", e));
    } catch (err) {
      console.warn("Audio error:", err);
    }
  }

  // Email Redactor
  function redactedEmail(email: string): string {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length < 2) return email;
    const name = parts[0];
    const domain = parts[1];
    const redactedName = name.length <= 4 ? name.substring(0, 2) + "***" : name.substring(0, 12) + "***";
    return `${redactedName}@${domain}`;
  }

  function showAlert(msg: string, type: "success" | "fail"): void {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage = msg;
    toastType = type;
    toastShow = true;
    toastProgress = 0;

    requestAnimationFrame(() => {
      toastProgress = 100;
    });

    toastTimer = setTimeout(() => {
      toastShow = false;
    }, 3000);
  }

  // Load Accounts & Smart Detect Last Login
  async function loadAccounts(): Promise<void> {
    try {
      const res = await invoke<Account[]>("get_accounts");
      accounts = res || [];

      if (accounts.length > 0) {
        let defaultIdx = 0;
        try {
          const logs = await invoke<HistoryLog[]>("get_history_logs");
          if (logs && logs.length > 0) {
            const loginLogs = logs
              .filter((l) => {
                const typeStr = l.eventType || l.typeWhat || "";
                return typeStr.toLowerCase().includes("login");
              })
              .sort((a, b) => {
                const tsA = a.timestamp || a.dateWhat || 0;
                const tsB = b.timestamp || b.dateWhat || 0;
                return tsB - tsA;
              });

            if (loginLogs.length > 0) {
              const lastAccStr = loginLogs[0].account || loginLogs[0].accountWhat || "";
              const foundIdx = accounts.findIndex(
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
        selectedAccountIndex = defaultIdx;
      } else {
        selectedAccountIndex = null;
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  }

  async function loadLauncherPath(): Promise<void> {
    try {
      const path = await invoke<string>("get_launcher_path");
      if (path && path.trim() !== "") {
        launcherPath = path;
      }
    } catch (e) {
      console.error("Failed to get launcher path:", e);
    }
  }

  async function checkCapsLock(): Promise<void> {
    try {
      const isCaps = await invoke<boolean>("check_caps_lock");
      isCapsOn = !!isCaps;
    } catch (e) {
      console.warn("Caps lock check failed:", e);
    }
  }

  async function handleSelectPath(): Promise<void> {
    try {
      const path = await invoke<string>("select_launcher_path");
      if (path) {
        launcherPath = path;
        showAlert("Path selected!", "success");
        await invoke("add_history_log", { account: "nikke_launcher", eventType: "Adjusting Path", isSuccess: "True" });
      }
    } catch (err) {
      showAlert(String(err), "fail");
    }
  }

  async function handleRegisterAccounts(): Promise<void> {
    try {
      let newAccs: Account[] = [];
      if (registerMode === "single") {
        if (!singleNickname.trim() || !singleEmail.trim() || !singlePassword) {
          throw new Error("Please fill nickname, email, and password.");
        }
        newAccs.push({ nickname: singleNickname.trim(), email: singleEmail.trim(), password: singlePassword });
      } else {
        const val = jsonInput.trim();
        if (!val) throw new Error("JSON input is empty.");
        const parsed = JSON.parse(val);
        newAccs = Array.isArray(parsed) ? parsed : [parsed];
      }

      await invoke("register_accounts", { accounts: newAccs });
      showAlert("Accounts Registered!", "success");
      await loadAccounts();

      if (registerMode === "single") {
        singleNickname = "";
        singleEmail = "";
        singlePassword = "";
      } else {
        jsonInput = "";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showAlert(msg, "fail");
    }
  }

  async function handleRemoveAccount(): Promise<void> {
    if (selectedAccountIndex === null || !accounts[selectedAccountIndex]) {
      showAlert("Please select an account to remove!", "fail");
      return;
    }
    const acc = accounts[selectedAccountIndex];
    try {
      await invoke("remove_account", { email: acc.email });
      showAlert(`Removed ${acc.nickname}!`, "success");
      selectedAccountIndex = null;
      await loadAccounts();
    } catch (err) {
      showAlert(String(err), "fail");
    }
  }

  async function handleExecuteLogin(): Promise<void> {
    if (selectedAccountIndex === null || !accounts[selectedAccountIndex]) {
      if (accounts.length > 0) {
        selectedAccountIndex = 0;
      } else {
        showAlert("Please select an account!", "fail");
        return;
      }
    }

    const acc = accounts[selectedAccountIndex!];
    if (!launcherPath || launcherPath.includes("where is nikke_launcher")) {
      showAlert("You did not edit where nikke_launcher is located!", "fail");
      return;
    }

    playAudio("haikchad");
    isLoading = true;
    const randomLoader = loadingImgs[Math.floor(Math.random() * loadingImgs.length)];
    loadingImgSrc = `/static/loading/${randomLoader}.webp`;

    await new Promise((r) => setTimeout(r, 50));

    try {
      const res = await invoke<LoginResult>("execute_login", {
        accountIndex: selectedAccountIndex,
        switchDelay,
        loginDelay
      });

      isLoading = false;

      if (res && res.success) {
        showAlert(`Logged in as ${acc.nickname}!`, "success");
        invoke("update_discord_rpc", {
          details: `Playing NIKKE ${selectedAccountIndex! + 1} / ${accounts.length} accounts`,
          state: `Logged in as ${acc.nickname}`,
          smallImageKey: "rpc_maintain",
          smallImageText: "Maintaining"
        }).catch((e) => console.warn("RPC update failed:", e));
      } else {
        showAlert(res?.message || "Failed to perform login", "fail");
      }
    } catch (err) {
      isLoading = false;
      showAlert(String(err), "fail");
    }
  }

  async function handlePurgeData(): Promise<void> {
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
      accounts = [];
      selectedAccountIndex = null;
      launcherPath = "where is nikke_launcher.exe";
      await loadAccounts();
    } catch (e) {
      showAlert(String(e), "fail");
    }
  }

  async function handleOpenLogsModal(): Promise<void> {
    isLogsModalOpen = true;
    try {
      historyLogs = await invoke<HistoryLog[]>("get_history_logs");
    } catch (e) {
      console.error("Failed to load history logs:", e);
    }
  }

  async function handleOpenOpenRouterModal(): Promise<void> {
    isOpenRouterModalOpen = true;
    try {
      const cfg = await invoke<OpenRouterConfig>("get_openrouter_config");
      if (cfg) {
        openrouterApiKey = cfg.apiKey || cfg.api_key || "";
        openrouterModel = cfg.model || "nvidia/nemotron-nano-12b-v2-vl:free";
      }
    } catch (e) {
      console.error("Failed to load OpenRouter config:", e);
    }
  }

  async function handleSaveOpenRouterConfig(): Promise<void> {
    try {
      await invoke("save_openrouter_config", {
        apiKey: openrouterApiKey.trim(),
        model: openrouterModel || "nvidia/nemotron-nano-12b-v2-vl:free"
      });
      showAlert("OpenRouter config saved!", "success");
      isOpenRouterModalOpen = false;
    } catch (e) {
      showAlert(String(e), "fail");
    }
  }

  let isWortelVibrating = $state(false);
  let wortelTextareaValue = $state("");
  let isClickBoxRed = $state(false);
  let prevClickMicrotime = Date.now() / 1000;

  function toggleThemeWithCircularTransition(event: MouseEvent): void {
    const nextLightMode = !isLightMode;

    const targetEl = (event.currentTarget as HTMLElement) || (event.target as HTMLElement);
    const rect = targetEl?.getBoundingClientRect ? targetEl.getBoundingClientRect() : null;
    const x = rect ? rect.left + rect.width / 2 : event?.clientX ?? window.innerWidth - 30;
    const y = rect ? rect.top + rect.height / 2 : event?.clientY ?? window.innerHeight - 30;

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      const transition = (document as any).startViewTransition(() => {
        isLightMode = nextLightMode;
        localStorage.setItem("theme", nextLightMode ? "light" : "dark");
        document.body.classList.toggle("light-mode", nextLightMode);
      });

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ];
        document.documentElement.animate(
          {
            clipPath: clipPath
          },
          {
            duration: 650,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)"
          }
        );
      });
    } else {
      isLightMode = nextLightMode;
      localStorage.setItem("theme", nextLightMode ? "light" : "dark");
      document.body.classList.toggle("light-mode", nextLightMode);
    }
  }

  $effect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("light-mode", isLightMode);
    }
  });

  function handleWortelImageClick(): void {
    isWortelVibrating = true;
    setTimeout(() => { isWortelVibrating = false; }, 80);
    playAudio("ichad");
  }

  function handleWortelMouseDown(): void {
    const clickTime = Date.now() / 1000;
    const diff = clickTime - prevClickMicrotime;

    if (diff <= 0.08) {
      isClickBoxRed = true;
      wortelDcCount++;
    } else {
      isClickBoxRed = false;
    }

    wortelTextareaValue = `${diff.toFixed(4)}\t${diff.toFixed(2)} sec.\n` + wortelTextareaValue;
    prevClickMicrotime = clickTime;
    wortelClickCount++;
  }

  function handleResetWortel(): void {
    wortelClickCount = 0;
    wortelDcCount = 0;
    wortelTextareaValue = "";
    isClickBoxRed = false;
    prevClickMicrotime = Date.now() / 1000;
  }

  async function handleCloseWindow(): Promise<void> {
    const confirmClose = await invoke<boolean>("confirm_dialog", {
      title: "Close nikkePwned",
      message: "Are you sure you want to close nikkePwned?"
    });
    if (confirmClose) {
      invoke("close_window");
    }
  }

  // Filtered History Logs
  const filteredHistoryLogs = $derived(
    historyLogs.filter((l) => {
      const q = searchQuery.toLowerCase();
      const accStr = (l.account || l.accountWhat || "").toLowerCase();
      const typeStr = (l.eventType || l.typeWhat || l.is_success || "").toLowerCase();
      return accStr.includes(q) || typeStr.includes(q);
    })
  );

  function handleGlobalKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      isAccountPickerOpen = false;
      isLogsModalOpen = false;
      isOpenRouterModalOpen = false;
      isWortelModalOpen = false;
    }
  }

  onMount(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      isLightMode = true;
    }

    window.addEventListener("keydown", handleGlobalKeyDown);

    loadAccounts();
    loadLauncherPath();
    checkCapsLock();
    const interval = setInterval(checkCapsLock, 3000);

    invoke("update_discord_rpc", {
      details: "Idle",
      state: "Password Manager for NIKKE",
      smallImageKey: "rpc_idle",
      smallImageText: "Idling"
    }).catch((e) => console.warn("Initial RPC update failed:", e));

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  });
</script>

<div class={isLightMode ? "app-root light-mode" : "app-root"}>
  <!-- Custom Titlebar -->
  <div class="titlebar">
    <div class="title-left">
      <div class="app-icon" aria-hidden="true"></div>
      <span class="app-title">nikkePwned</span>
    </div>
    <div class="window-controls">
      <button id="minBtn" class="ctl" title="Minimize" aria-label="Minimize" onclick={() => invoke("minimize_window")}>
        <span class="dot dot-min"></span>
      </button>
      <button id="maxBtn" class="ctl" title="Maximize" aria-label="Maximize" onclick={() => invoke("toggle_maximize_window")}>
        <span class="dot dot-max"></span>
      </button>
      <button id="closeBtn" class="ctl ctl-close" title="Close" aria-label="Close" onclick={handleCloseWindow}>
        <span class="dot dot-close"></span>
      </button>
    </div>
  </div>

  <!-- Toast Snackbar -->
  <div id="snackbar" class={toastShow ? `show ${toastType}` : ""}>
    <div id="snackbar-text">
      {toastType === "success" ? "✅ " : "❌ "}{toastMessage}
    </div>
    <div class="progress">
      <div class="progress-bar" style="width: {toastProgress}%; transition: {toastShow ? 'width 3s linear' : 'none'};"></div>
    </div>
  </div>

  <!-- Loading Overlay -->
  {#if isLoading}
    <div id="loading" class="loading-overlay">
      <img id="loadingImg" src={loadingImgSrc} alt="Loading loader..." />
    </div>
  {/if}

  <!-- Main Container -->
  <main class="main-area">
    <div class="container funFadeInUp">
      <!-- Logo Container -->
      <div id="logoContainer">
        <img src={isLightMode ? "/icons/logo-light.png" : "/icons/logo.png"} id="appLogo" alt="nikkePwned Logo" class="responsive-img" />
        {#if isCapsOn}
          <div id="capsWarning">⚠️ Caps Lock is ON</div>
        {/if}
      </div>

      <!-- Path Container -->
      <div id="pathContainer">
        <button id="selectPathIconBtn" type="button" title="Edit launcher path" aria-label="Edit launcher path" onclick={handleSelectPath}>
          <img src="/icons/nikke.png" alt="Edit path icon" />
        </button>
        <pre id="selectedPath" style="color: #298fd8ff;">{launcherPath ? launcherPath.replace(/\\/g, "/") : "where is nikke_launcher.exe"}</pre>
        <button id="selectPathBtn" style="font-weight: 900;" onclick={handleSelectPath}>Edit</button>
      </div>

      <!-- Account Entry Panel -->
      <div id="entryAccountPanel" class="entry-account-panel">
        <div class="register-input-mode" id="registerInputMode">
          <button type="button" class={registerMode === "single" ? "mode-toggle-btn is-active" : "mode-toggle-btn"} onclick={() => registerMode = "single"}>Manual Entry</button>
          <button type="button" class={registerMode === "json" ? "mode-toggle-btn is-active" : "mode-toggle-btn"} onclick={() => registerMode = "json"}>JSON Bulk Import</button>
        </div>

        {#if registerMode === "single"}
          <div id="singleAccountForm" class="single-account-form" style="display: flex;">
            <input type="text" bind:value={singleNickname} placeholder="Nickname" />
            <input type="email" bind:value={singleEmail} placeholder="Email" />
            <input type="password" bind:value={singlePassword} placeholder="Password" />
          </div>
        {:else}
          <textarea bind:value={jsonInput} placeholder={`[{"nickname": "Acc1", "email": "user1@mail.com", "password": "123"}]`}></textarea>
        {/if}

        <button id="registerBtn" type="button" style="font-weight: 900;" onclick={handleRegisterAccounts}>📝Register Accounts</button>
      </div>

      <!-- Account Action Row -->
      <div class="account-action-row">
        <div class="account-picker-wrap">
          <button id="accountPickerBtn" type="button" class="account-picker-btn" onclick={() => isAccountPickerOpen = true}>
            <span id="accountPickerLabel" class="account-picker-label">
              {selectedAccountIndex !== null && accounts[selectedAccountIndex]
                ? `${accounts[selectedAccountIndex].nickname} (${redactedEmail(accounts[selectedAccountIndex].email)})`
                : "Select an Account"}
            </span>
            <span class="account-picker-arrow"> &gt;&gt; </span>
          </button>
        </div>

        <button id="runBtn" type="button" title="Proceed auto login" aria-label="Proceed auto login" onclick={handleExecuteLogin}>🚀</button>
        <button id="removeBtn" type="button" title="Remove account" aria-label="Remove account" onclick={handleRemoveAccount}>🚫</button>
      </div>

      <!-- Delay Settings & Footer Actions -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; height: 32px; margin-top: 14px; flex-wrap: nowrap;">
        <label for="delayBtn" style="white-space: nowrap; font-size: 12px; height: 25px; display: inline-flex; align-items: center; margin: 0; line-height: 1;">Delay (switch):</label>
        <input type="number" id="delayBtn" name="delayswitch" min="1" max="10" step="1" bind:value={switchDelay} style="font-size: 12px; width: 28px; height: 25px; text-align: center; margin: 0; padding: 0; box-sizing: border-box;" />
        <label for="delayBtnLogin" style="white-space: nowrap; font-size: 12px; height: 25px; display: inline-flex; align-items: center; margin: 0; line-height: 1;">Delay (login):</label>
        <input type="number" id="delayBtnLogin" name="delaylogin" min="1" max="10" step="1" bind:value={loginDelay} style="font-size: 12px; width: 28px; height: 25px; text-align: center; margin: 0; padding: 0; box-sizing: border-box;" />
        <button id="myBtn" type="button" onclick={handleOpenLogsModal} style="width: auto; min-width: 50px; height: 25px; margin: 0; padding: 0 9px; font-size: 12px; display: inline-flex; align-items: center; justify-content: center;">🔍Logs</button>
        <button id="purgeBtn" type="button" onclick={handlePurgeData} style="width: auto; min-width: 50px; height: 25px; margin: 0; padding: 0 9px; font-size: 12px; display: inline-flex; align-items: center; justify-content: center;">⛔Purge Data</button>
      </div>
    </div>
  </main>

  <!-- Loading Overlay -->
  {#if isLoading}
    <div id="loading" class="loading-overlay">
      <img id="loadingImg" src={loadingImgSrc} alt="Loading loader..." />
    </div>
  {/if}

  <!-- Account Picker Modal -->
  {#if isAccountPickerOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div id="accountPickerModal" class="account-picker-modal" style="display: flex;" onclick={(e) => { if (e.target === e.currentTarget) isAccountPickerOpen = false; }}>
      <div class="account-picker-modal-card">
        <div class="account-picker-head">
          <span>Select Account</span>
          <button type="button" class="account-picker-close" onclick={() => isAccountPickerOpen = false}>&times;</button>
        </div>
        <div class="account-picker-list">
          {#if accounts.length === 0}
            <button type="button" class="account-picker-option-empty" disabled>No accounts available yet.</button>
          {:else}
            {#each accounts as acc, idx}
              <button
                type="button"
                class={selectedAccountIndex === idx ? "account-picker-option is-selected" : "account-picker-option"}
                onclick={() => { selectedAccountIndex = idx; isAccountPickerOpen = false; }}
              >
                {acc.nickname} ({redactedEmail(acc.email)})
              </button>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- History Logs Modal -->
  {#if isLogsModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div id="myModal" class="modal" style="display: flex;" onclick={(e) => { if (e.target === e.currentTarget) isLogsModalOpen = false; }}>
      <div class="modal-content">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <input type="text" id="searchInput" bind:value={searchQuery} placeholder="search string" style="width: 80%; padding: 8px; font-weight: bold;" />
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <span class="close" onclick={() => isLogsModalOpen = false}>&times;</span>
        </div>
        <br />
        <div style="max-height: 400px; overflow-y: auto;">
          <table style="width:100%; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="font-weight: 900; background-color: #0d0d0d; border-bottom: 2px solid #555;">
                <th style="padding: 8px;">STRING</th>
                <th style="padding: 8px;">TYPE</th>
                <th style="padding: 8px;">ISSUCCESS</th>
                <th style="padding: 8px;">DATE</th>
              </tr>
            </thead>
            <tbody>
              {#if filteredHistoryLogs.length === 0}
                <tr><td colspan="4" style="text-align:center; padding: 12px;">No Results</td></tr>
              {:else}
                {#each filteredHistoryLogs as log}
                  {@const accountStr = log.account || log.accountWhat || "-"}
                  {@const typeStr = log.eventType || log.typeWhat || log.is_success || "-"}
                  {@const isSuccessStr = log.isSuccess || log.is_success || "False"}
                  {@const rawTs = log.timestamp || log.dateWhat}
                  {@const ts = typeof rawTs === "number" ? rawTs : Number(rawTs) || Date.now()}
                  {@const dateStr = !isNaN(ts) && ts > 0 ? new Date(ts).toLocaleString() : "-"}
                  <tr style="border-bottom: 1px solid #333;">
                    <td style="padding: 8px;">{accountStr}</td>
                    <td style="padding: 8px;">{typeStr}</td>
                    <td style="padding: 8px;">{isSuccessStr}</td>
                    <td style="padding: 8px;">{dateStr}</td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}

  <!-- OpenRouter Settings Modal -->
  {#if isOpenRouterModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div id="myModalOpenRouter" class="modal" style="display: flex;" onclick={(e) => { if (e.target === e.currentTarget) isOpenRouterModalOpen = false; }}>
      <div class="modal-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px;">OpenRouter Configuration</h3>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <span class="close" onclick={() => isOpenRouterModalOpen = false}>&times;</span>
        </div>
        <div class="openrouter-panel">
          <strong>Vision LLM Setup:</strong> Enter your OpenRouter API key to enable automated battlefield damage extraction.
        </div>
        <div class="openrouter-key-row">
          <input
            type={isApiKeyVisible ? "text" : "password"}
            bind:value={openrouterApiKey}
            placeholder="sk-or-v1-..."
            class="openrouter-field"
          />
          <button type="button" class="openrouter-visibility-btn" onclick={() => isApiKeyVisible = !isApiKeyVisible}>
            {isApiKeyVisible ? "Hide" : "Show"}
          </button>
        </div>
        <label for="openrouterModel" class="openrouter-label">Model Selection:</label>
        <select bind:value={openrouterModel} id="openrouterModel" class="openrouter-field">
          {#each OPENROUTER_MODEL_POOL as m}
            <option value={m}>{m}</option>
          {/each}
        </select>
        <button type="button" class="openrouter-save-btn" onclick={handleSaveOpenRouterConfig}>Save Configuration</button>
      </div>
    </div>
  {/if}

  <!-- Wortel Easter Egg Modal -->
  {#if isWortelModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div id="myModalWortel" class="modal" style="display: flex;" onclick={(e) => { if (e.target === e.currentTarget) isWortelModalOpen = false; }}>
      <div class="modal-content">
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <span class="close" onclick={() => isWortelModalOpen = false}>&times;</span>
        <div class="asuwh">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div id="click" class="click" style="padding: 1rem; margin-bottom: 1rem; background: {isClickBoxRed ? 'red' : '#292929'}; cursor: pointer;" onmousedown={handleWortelMouseDown}>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <img src="/static/my.png" id="gambarKlik" class={isWortelVibrating ? "gambarklik vibrate" : "gambarklik"} alt="Click me!" onclick={handleWortelImageClick} />
          </div>
          Clicks: <input id="count" type="text" value={wortelClickCount} size="4" readonly style="width: 60px; text-align: center;" />
          <button id="reset" type="button" onclick={handleResetWortel}>Reset</button>
          <br /> Fast double click count:
          <input id="dcCount" type="text" value={wortelDcCount} size="4" readonly style="width: 60px; text-align: center; margin-top: 6px;" />
          <br />
          <textarea id="textarea" rows="10" cols="50" value={wortelTextareaValue} readonly style="margin-top: 8px; font-family: monospace;"></textarea>
        </div>
      </div>
    </div>
  {/if}

  <!-- Floating Action Buttons -->
  <span class="tia" id="themeToggle" role="button" tabindex="0" onclick={toggleThemeWithCircularTransition}>
    <img src="/static/rpc_idle.png" alt="sun" style="width: 40px; height: 40px" />
  </span>
  <span class="tia" id="myBtnOpenRouter" role="button" tabindex="0" onclick={handleOpenOpenRouterModal}>
    <img src="/static/rpc_llm.png" alt="key" style="width: 40px; height: 40px" />
  </span>
  <span class="berdetak" id="myBtnWortel" role="button" tabindex="0" onclick={() => isWortelModalOpen = true}>
    <img src="/static/rpc_testing.png" alt="sun" style="width: 30px; height: 30px" />
  </span>
</div>

<style>

    :global(:root) {
      --bg: #0f0f0fff;
      --titlebar-bg: #0f0f0fff;
      --accent: #e05bc4ff;
      --muted: #bdbdbd;
      --text: #eee;
      transition: background-color 0.4s ease, color 0.4s ease;
    }

    :global(.light-mode) {
      --bg: #ffffff;
      --titlebar-bg: #ffffff;
      --accent: #ff6f61;
      --muted: #666;
      --text: #111;
    }

    :global(.funFadeInUp) {
      opacity: 0;
      transform: translateY(40px) rotate(-8deg) scale(0.85);
      animation: funFadeInUp 1s cubic-bezier(0.42, 0, 0.58, 1) forwards;
      animation-delay: 0.5s;
    }

    @keyframes -global-funFadeInUp {
      0% {
        opacity: 0;
        transform: translateY(40px) rotate(-8deg) scale(0.85);
      }

      25% {
        opacity: 1;
        transform: translateY(-10px) rotate(4deg) scale(1.05);
      }

      45% {
        transform: translateY(5px) rotate(-2deg) scale(0.98);
      }

      60% {
        transform: translateY(-3px) rotate(1deg) scale(1.02);
      }

      75% {
        transform: translateY(1px) rotate(-0.5deg) scale(1.01);
      }

      100% {
        opacity: 1;
        transform: translateY(0) rotate(0deg) scale(1);
      }
    }

    :global(*) {
      box-sizing: border-box
    }

    html,
    :global(body),
    :global(.app-root) {
      height: 100vh;
      display: flex;
      margin: 0;
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
      transition: background 0.45s cubic-bezier(0.4, 0, 0.2, 1), color 0.45s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      position: relative;
    }

    html,
    body,
    button,
    input,
    select,
    textarea,
    :global(option) {
      font-family: 'DM Sans', sans-serif !important;
      -webkit-font-smoothing: antialiased;
    }

    :global(.titlebar) {
      -webkit-app-region: drag;
      height: 36px;
      background: var(--titlebar-bg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px;
      transition: background 0.45s cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(.theme-switch) {
      position: relative;
      width: 50px;
      height: 24px;
      background: var(--muted);
      border-radius: 24px;
      cursor: pointer;
      transition: background 0.45s cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(.theme-switch::before) {
      content: "";
      position: absolute;
      top: 2px;
      left: 3px;
      width: 20px;
      height: 20px;
      background: var(--accent);
      border-radius: 50%;
      transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    :global(.light-mode .theme-switch::before) {
      transform: translateX(26px);
    }

    :global(.main-area) {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    :global(.title-left) {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    :global(.app-icon) {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      background-color: #141414;
      background-image: url('/icons/appIcon.png');
      background-repeat: no-repeat;
      background-position: center;
      background-size: cover;
      border: 1px solid rgba(255, 255, 255, 0.04);
      box-shadow: 0 0 0 2px rgba(255, 138, 0, 0.04) inset;
    }

    :global(.app-title) {
      font-size: 13px;
      color: var(--muted);
      letter-spacing: 0.2px;
    }

    :global(.window-controls) {
      display: flex;
      gap: 8px;
      align-items: center;
      -webkit-app-region: no-drag;
    }

    :global(.window-controls button) {
      -webkit-app-region: no-drag;
      cursor: pointer;
    }

    :global(.ctl) {
      width: 24px;
      height: 24px;
      border: 1px solid #666;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      cursor: pointer;
      padding: 0;
      margin-top: -1px;
    }

    :global(.ctl svg) {
      fill: none;
      stroke: currentColor;
      color: var(--accent);
    }

    :global(.ctl:hover) {
      background: rgba(255, 138, 0, 0.06);
      transform: translateY(-1px);
    }

    :global(.ctl:active) {
      transform: translateY(0);
    }

    :global(.ctl-close) {
      border-color: rgba(255, 138, 0, 0.9);
      background: rgba(255, 138, 0, 0.04);
      color: var(--accent);
    }

    :global(.ctl-close:hover) {
      background: rgba(255, 138, 0, 0.14);
    }

    :global(.container) {
      width: 90% !important;
      max-width: 450px !important;
      background: #24242bff !important;
      padding: 20px !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
      margin: auto !important;
    }

    :global(.light-mode .container) {
      background: #ffffff !important;
      color: #000000 !important;
    }

    :global(textarea) {
      width: 100%;
      height: 100px;
      background: #333344;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 5px;
      resize: none;
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: #c0392b #333344;
    }

    :global(.light-mode textarea) {
      background: #f0f0f0;
      color: #000000;
      scrollbar-color: #007bff #f0f0f0;
      scrollbar-width: thin;
    }

    :global(.register-input-mode) {
      display: flex;
      gap: 6px;
      margin-top: 4px;
      margin-bottom: 4px;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
    }

    :global(.entry-account-panel) {
      display: block;
      margin-top: 4px;
      margin-bottom: 0;
    }

    :global(.mode-toggle-btn) {
      flex: 0 0 auto;
      width: auto;
      margin-top: 0;
      min-width: 0;
      height: 28px;
      padding: 0 8px;
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
      border-radius: 14px;
      border: 1px solid #4f4f60;
      background: #1d1d25ff;
      color: #f2f2f2;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    :global(.mode-toggle-btn.is-active) {
      border-color: #28a745;
      background: #24432cff;
      color: #d8ffe3;
    }

    :global(.light-mode .mode-toggle-btn) {
      border-color: #c8c8c8;
      background: #f0f0f0;
      color: #222;
    }

    :global(.light-mode .mode-toggle-btn.is-active) {
      border-color: #1f5fb0;
      background: #dfeaf8;
      color: #153f77;
    }

    :global(.single-account-form) {
      display: none;
      margin-top: 8px;
      gap: 6px;
      flex-direction: column;
    }

    :global(#jsonInput) {
      margin-top: 8px;
    }

    :global(.single-account-form input) {
      width: 100%;
      background: #333344;
      color: white;
      border: 1px solid #3b3b46;
      padding: 8px 10px;
      border-radius: 5px;
      box-sizing: border-box;
      font-size: 13px;
      line-height: 1.2;
    }

    :global(.light-mode .single-account-form input) {
      background: #f0f0f0;
      color: #000000;
      border: 1px solid #d4d4d4;
      line-height: 1.2;
    }

    select,
    :global(button) {
      width: 100%;
      padding: 10px;
      margin-top: 10px;
      font-size: 16px;
      border: none;
      border-radius: 5px;
    }

    :global(select) {
      background: #1d1d25ff;
      color: white;
    }

    :global(select::-webkit-scrollbar) {
      width: 5px;
    }

    :global(select::-webkit-scrollbar-track) {
      background-color: #1d1d25ff;
    }

    :global(select::-webkit-scrollbar-thumb) {
      background-color: red;
      border-radius: 5px;
    }

    :global(select::-webkit-scrollbar-thumb:hover) {
      background-color: gold;
    }

    :global(.light-mode select) {
      background: #f0f0f0;
      color: #000000;
    }

    :global(.light-mode select::-webkit-scrollbar-track) {
      background-color: #f0f0f0;
    }

    :global(.account-action-row) {
      display: flex;
      align-items: stretch;
      gap: 6px;
      margin-top: 12px;
    }

    :global(.account-picker-wrap) {
      position: relative;
      margin-top: 10px;
    }

    :global(.account-action-row .account-picker-wrap) {
      flex: 1;
      margin-top: 0;
      min-width: 0;
    }

    :global(#accountSelect) {
      position: absolute;
      pointer-events: none;
      opacity: 0;
      width: 1px;
      height: 1px;
      margin: 0;
      padding: 0;
      border: 0;
      overflow: hidden;
    }

    :global(.account-picker-btn) {
      width: 100%;
      margin-top: 0;
      padding: 7px 12px;
      border: none;
      border-radius: 7px;
      background: #1d1d25ff;
      color: #f2f2f2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 700;
      font-size: 14px;
      line-height: 1.1;
      min-height: 34px;
      cursor: pointer;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }

    :global(.account-picker-btn:hover) {
      transform: translateY(-1px);
    }

    :global(.account-picker-btn:active) {
      transform: translateY(0);
    }

    :global(.account-picker-label) {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
      padding-right: 10px;
    }

    :global(.account-picker-arrow) {
      font-size: 13px;
      opacity: 0.88;
    }

    :global(.account-picker-modal) {
      position: fixed;
      inset: 0;
      z-index: 1100;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.62);
      padding: 16px;
    }

    :global(.account-picker-modal-card) {
      width: min(520px, 100%);
      border-radius: 10px;
      border: 1px solid #4f4f5c;
      background: #272730;
      overflow: hidden;
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
      animation: pickerPop 0.18s ease-out;
    }

    @keyframes -global-pickerPop {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    :global(.account-picker-head) {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      background: #e2e2e2;
      color: #121212;
      font-weight: 800;
      font-size: 16px;
    }

    :global(.account-picker-close) {
      border: none;
      margin: 0;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      padding: 0;
      background: transparent;
      color: #1f1f1f;
      cursor: pointer;
      font-size: 22px;
      line-height: 1;
    }

    :global(.account-picker-close:hover) {
      background: rgba(0, 0, 0, 0.08);
    }

    :global(.account-picker-list) {
      max-height: 260px;
      overflow-y: auto;
      background: #d7d7d7;
      padding: 4px 0;
      scrollbar-width: thin;
      scrollbar-color: red #f0f0f0;
    }

    :global(.account-picker-list::-webkit-scrollbar) {
      width: 5px;
    }

    :global(.account-picker-list::-webkit-scrollbar-track) {
      background-color: #f0f0f0;
    }

    :global(.account-picker-list::-webkit-scrollbar-thumb) {
      background-color: red;
      border-radius: 5px;
    }

    :global(.account-picker-list::-webkit-scrollbar-thumb:hover) {
      background-color: gold;
    }

    :global(.account-picker-option) {
      width: 100%;
      margin: 0;
      border-radius: 0;
      border: none;
      text-align: left;
      padding: 9px 14px;
      background: transparent;
      color: #111;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    :global(.account-picker-option:hover) {
      background: #c5c5c5;
    }

    :global(.account-picker-option.is-selected) {
      background: #bbbbbb;
      font-weight: 800;
    }

    :global(.account-picker-option-empty) {
      width: 100%;
      margin: 0;
      border: none;
      border-radius: 0;
      text-align: left;
      padding: 10px 14px;
      background: transparent;
      color: #4d4d4d;
      font-size: 14px;
      cursor: default;
    }

    :global(.light-mode .account-picker-btn) {
      background: #f0f0f0;
      color: #222;
      border: none;
    }

    :global(.light-mode .account-picker-modal-card) {
      border-color: #c8c8c8;
      background: #f9f9f9;
    }

    :global(.light-mode .account-picker-head) {
      background: #e2e2e2;
      color: #121212;
    }

    :global(.light-mode .account-picker-close) {
      color: #1f1f1f;
    }

    :global(.light-mode .account-picker-close:hover) {
      background: rgba(0, 0, 0, 0.08);
    }

    :global(.light-mode .account-picker-list) {
      background: #efefef;
      scrollbar-color: #007bff #f0f0f0;
    }

    :global(.light-mode .account-picker-list::-webkit-scrollbar-track) {
      background-color: #f0f0f0;
    }

    :global(.light-mode .account-picker-option) {
      color: #111;
    }

    :global(.light-mode .account-picker-option:hover) {
      background: #e3e3e3;
    }

    :global(.light-mode .account-picker-option.is-selected) {
      background: #d6d6d6;
    }

    :global(#registerBtn) {
      border-radius: 20px;
      background: #007bff;
      color: white;
    }

    :global(#registerBtn:hover) {
      background: #529be8;
    }

    :global(.light-mode #registerBtn) {
      background: #222;
      color: white;
    }

    :global(.light-mode #registerBtn:hover) {
      background: #555;
    }

    :global(#runBtn) {
      width: 36px;
      height: 36px;
      min-width: 36px;
      margin-top: 0;
      padding: 0;
      border-radius: 50%;
      background: #25a142;
      color: white;
      font-size: 18px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :global(#runBtn:hover) {
      background: #68e986;
    }

    :global(#removeBtn) {
      width: 36px;
      height: 36px;
      min-width: 36px;
      margin-top: 0;
      padding: 0;
      border-radius: 50%;
      background: #a20a0a;
      color: white;
      font-size: 18px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :global(#removeBtn:hover) {
      background: #d74141;
    }

    :global(.agold) {
      color: #FFD700;
      text-decoration: none;
    }

    :global(.agold:hover) {
      color: rgb(156, 135, 15);
    }

    :global(.responsive-img) {
      width: 100%;
      height: auto;
      max-width: 400px;
      display: block;
      margin: 0 auto;
    }

    :global(#logoContainer) {
      position: relative;
      display: block !important;
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
    }

    :global(#appLogo) {
      width: 100%;
      max-width: 400px;
      height: auto;
      display: block;
    }

    :global(.responsive-img-small) {
      width: 100%;
      height: auto;
      max-width: 320px;
      display: block;
      margin: 0 auto;
    }

    :global(#selectPathBtn) {
      margin-left: 3px;
      margin-top: 0;
      background-color: #b91515ff;
      color: white;
      font-size: 12px;
      border: none;
      padding: 3px 9px;
      cursor: pointer;
      border-radius: 10px;
      width: auto;
      min-width: 50px;
    }

    :global(#selectPathBtn:hover) {
      background-color: #e03030ff;
    }

    :global(.light-mode #selectPathBtn) {
      background-color: #007bff;
    }

    :global(.light-mode #selectPathBtn:hover) {
      background-color: #529be8;
    }

    :global(#selectPathIconBtn) {
      width: 28px;
      height: 28px;
      min-width: 28px;
      flex: 0 0 auto;
      border: none;
      border-radius: 50%;
      padding: 0;
      margin-top: 0;
      background: rgb(0, 0, 0);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    :global(#selectPathIconBtn:hover) {
      background: #e03030ff;
    }

    :global(#selectPathIconBtn img) {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      pointer-events: none;
    }

    :global(.light-mode #selectPathIconBtn) {
      background-color: #000000;
      color: #fff;
    }

    :global(.light-mode #selectPathIconBtn:hover) {
      background-color: #529be8;
    }

    :global(#pathContainer) {
      display: flex;
      align-items: center;
      gap: 5px;
      width: 100%;
      margin: 2px 0 4px 0;
      padding: 0;
      min-height: 28px;
    }

    :global(#pathContainer button) {
      width: auto;
      margin-top: 0;
      flex: 0 0 auto;
    }

    :global(#pathContainer > *) {
      margin-top: 0;
      margin-bottom: 0;
    }

    :global(#selectedPath) {
      font-family: inherit;
      margin: 0;
      flex: 1 1 auto;
      min-width: 0;
      height: 28px;
      display: flex;
      align-items: center;
      padding: 0;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :global(#snackbar) {
      visibility: hidden;
      max-width: 420px;
      color: #fff;
      text-align: left;
      border-radius: 8px;
      padding: 14px 16px;
      position: fixed;
      z-index: 1000;
      top: 40px;
      right: 20px;
      font-size: 14px;
      box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 8px;
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.3s, transform 0.3s;
    }

    :global(.light-mode #snackbar) {
      color: #000;
    }

    :global(#snackbar.success) {
      background-color: #222;
    }

    :global(.light-mode #snackbar.success) {
      background-color: #f0f5f2ff;
    }

    :global(#snackbar.fail) {
      background-color: rgb(133, 12, 12);
    }

    :global(#snackbar.show) {
      visibility: visible;
      opacity: 1;
      transform: translateY(0);
    }

    :global(#snackbar-text) {
      flex: 1;
      word-wrap: break-word;
    }

    :global(.progress) {
      height: 4px;
      width: 100%;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    :global(.progress-bar) {
      height: 100%;
      width: 0%;
      position: absolute;
      left: 0;
      top: 0;
    }

    :global(#snackbar.success .progress-bar) {
      background-color: rgb(145, 255, 0);
    }

    :global(.light-mode #snackbar.success .progress-bar) {
      background-color: rgb(0, 145, 0);
    }

    :global(#snackbar.fail .progress-bar) {
      background-color: rgb(166, 255, 0);
    }

    :global(.light-mode #snackbar.fail .progress-bar) {
      background-color: rgb(255, 0, 0);
    }

    @media (max-width: 600px) {
      :global(#snackbar) {
        max-width: 90%;
        right: 5%;
        left: auto;
        font-size: 13px;
        padding: 12px;
      }
    }

    :global(.modal) {
      border: none !important;
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.68);
      align-items: center;
      justify-content: center;
      overflow: hidden;
      -webkit-animation-name: animatebottom;
      -webkit-animation-duration: 0.4s;
      animation-name: animatebottom;
      animation-duration: 0.4s;
    }

    :global(::-webkit-scrollbar) {
      width: 8px;
      height: 8px;
    }

    :global(::-webkit-scrollbar-track) {
      background: #222;
      border-radius: 10px;
    }

    :global(::-webkit-scrollbar-thumb) {
      background: #555;
      border-radius: 10px;
    }

    :global(::-webkit-scrollbar-thumb:hover) {
      background: #777;
    }

    :global(.modal-content) {
      border: none !important;
      background-color: rgb(23, 22, 22);
      color: white;
      padding: 20px;
      border-radius: 10px;
      width: 90%;
      max-width: 480px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      scrollbar-color: #555 #222;
      scrollbar-width: thin;
    }

    :global(.light-mode .modal-content) {
      background-color: #ffffff;
      color: #000000;
      scrollbar-color: #777 #ddd;
      scrollbar-width: thin;
    }

    :global(.modal-content::-webkit-scrollbar) {
      width: 8px;
    }

    :global(.modal-content::-webkit-scrollbar-track) {
      background: #222;
      border-radius: 10px;
    }

    :global(.light-mode .modal-content::-webkit-scrollbar-track) {
      background: #ddd;
      border-radius: 10px;
    }

    :global(.modal-content::-webkit-scrollbar-thumb) {
      background: #555;
      border-radius: 10px;
    }

    :global(.light-mode .modal-content::-webkit-scrollbar-thumb) {
      background: #777;
      border-radius: 10px;
    }

    :global(.modal-content::-webkit-scrollbar-thumb:hover) {
      background: #777;
    }

    :global(.light-mode .modal-content::-webkit-scrollbar-thumb:hover) {
      background: #999;
    }

    :global(.openrouter-panel) {
      margin: 0 0 12px 0;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #3a3a4d;
      background: #1f2129;
      font-size: 12px;
      line-height: 1.45;
      color: #c7cad1;
    }

    :global(.openrouter-panel strong) {
      color: #f2f4f7;
      font-weight: 700;
    }

    :global(.openrouter-label) {
      margin: 0 0 6px 0;
      font-size: 14px;
      font-weight: 700;
    }

    :global(.openrouter-key-row) {
      position: relative;
      margin-bottom: 10px;
    }

    :global(.openrouter-field) {
      width: 100%;
      background: #1d1d25ff !important;
      color: #ffffff !important;
      border: 1px solid #3a3a4d;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12px;
      margin-bottom: 10px;
      box-sizing: border-box;
    }

    :global(.openrouter-key-row .openrouter-field) {
      display: block;
      margin-bottom: 0;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      padding-right: 78px;
    }

    :global(.openrouter-visibility-btn) {
      position: absolute;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
      width: auto;
      margin: 0;
      border: 1px solid #4a4f5f;
      border-radius: 5px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      background: #2a2f3a;
      color: #e6e9ef;
      cursor: pointer;
    }

    :global(.openrouter-visibility-btn:hover) {
      background: #343b4a;
    }

    :global(.light-mode .openrouter-field) {
      background: #f5f5f5 !important;
      color: #000000 !important;
      border: 1px solid #c8c8c8;
    }

    :global(.light-mode .openrouter-helper) {
      color: #2d2d2d;
    }

    :global(.light-mode .openrouter-panel) {
      background: #f2f4f7;
      color: #333;
      border: 1px solid #d5d9df;
    }

    :global(.light-mode .openrouter-panel strong) {
      color: #101828;
    }

    :global(.light-mode .openrouter-visibility-btn) {
      border-color: #c8ccd5;
      background: #e8ebf2;
      color: #1a1f2b;
    }

    :global(.light-mode .openrouter-visibility-btn:hover) {
      background: #dde3ef;
    }

    :global(.openrouter-save-btn) {
      width: 100%;
      background: #af4337;
      color: white;
      border-radius: 6px;
      padding: 10px;
      border: none;
      cursor: pointer;
      font-weight: 700;
    }

    :global(.light-mode .openrouter-save-btn) {
      background: #1f5fb0;
      color: white;
    }

    :global(.close) {
      color: #aaaaaa;
      align-self: flex-end;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
    }

    :global(.light-mode .close) {
      color: #555555;
    }

    :global(.close:hover) {
      color: #ffffff;
    }

    :global(.light-mode .close:hover) {
      color: #000000;
    }

    :global(#myBtn) {
      background-color: rgb(20, 21, 22);
      color: white;
      font-size: 12px;
      border: none;
      padding: 3px 9px;
      cursor: pointer;
      border-radius: 3px;
      width: auto;
      min-width: 50px;
    }

    :global(#myBtn:hover) {
      background-color: rgb(71, 73, 74);
    }

    :global(#purgeBtn) {
      background-color: rgb(105, 5, 5);
      color: white;
      font-size: 12px;
      border: none;
      padding: 3px 9px;
      cursor: pointer;
      border-radius: 3px;
      width: auto;
      min-width: 50px;
    }

    :global(#purgeBtn:hover) {
      background-color: rgb(196, 15, 15);
    }

    :global(#delayBtn) {
      background-color: rgb(20, 21, 22);
      color: white;
      font-size: 12px;
      border: 1px solid rgb(71, 73, 74);
      padding: 3px 6px;
      border-radius: 3px;
      width: 25px;
      height: 25px;
      text-align: center;
      vertical-align: middle;
    }

    #delayBtn,
    :global(label[for="delayBtn"]) {
      margin-top: 8px;
    }

    :global(#delayBtn:focus) {
      outline: none;
      border-color: rgb(100, 100, 100);
    }

    :global(#delayBtnLogin) {
      background-color: rgb(20, 21, 22);
      color: white;
      font-size: 10px;
      border: 1px solid rgb(71, 73, 74);
      padding: 3px 6px;
      border-radius: 3px;
      width: 25px;
      height: 25px;
      text-align: center;
      vertical-align: middle;
    }

    #delayBtnLogin,
    :global(label[for="delayBtnLogin"]) {
      margin-top: 8px;
    }

    :global(#delayBtnLogin:focus) {
      outline: none;
      border-color: rgb(100, 100, 100);
    }

    table,
    th,
    td,
    :global(tr) {
      border-radius: 10px;
      background-color: rgb(16, 16, 16) !important;
      color: white !important;
      border: none !important;
    }

    .light-mode table,
    .light-mode th,
    .light-mode td,
    :global(.light-mode tr) {
      background-color: rgb(240, 240, 240) !important;
      color: black !important;
    }

    :global(table) {
      border-collapse: collapse;
      margin: 0;
      padding: 0;
      width: 100%;
      table-layout: fixed;
    }

    :global(table caption) {
      font-size: 1.5em;
      margin: .5em 0 .75em;
    }

    :global(table tr) {
      background-color: rgb(5, 5, 5);
      border: 1px solid #ddd;
      padding: .35em;
    }

    table th,
    :global(table td) {
      padding: .625em;
      text-align: center;
    }

    :global(table th) {
      font-size: .85em;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    @keyframes -global-animatebottom {
      from {
        bottom: -300px;
        opacity: 0
      }
      to {
        bottom: 0;
        opacity: 1
      }
    }

    @media screen and (max-width: 600px) {
      :global(table caption) {
        font-size: 1.3em;
      }

      :global(table thead) {
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      :global(table tr) {
        display: block;
        margin-bottom: .625em;
      }

      :global(table td) {
        display: block;
        font-size: .8em;
        text-align: right;
      }

      :global(table td::before) {
        content: attr(data-label);
        float: left;
        font-weight: bold;
        text-transform: uppercase;
      }

      :global(table td:last-child) {
        border-bottom: 0;
      }
    }

    input[type="number"]::-webkit-inner-spin-button,
    :global(input[type="number"]::-webkit-outer-spin-button) {
      -webkit-appearance: none;
      margin: 0;
    }

    :global(input[type="number"]) {
      appearance: textfield;
      -moz-appearance: textfield;
    }

    :global(#logoContainer) {
      position: relative;
    }

    :global(#capsWarning) {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      margin: 2px auto;
      padding: 2px 8px;
      color: red;
      width: fit-content;
      font-size: 0.8rem;
      font-weight: 900;
      display: none;
      white-space: nowrap;
      z-index: 10;
    }

    :global(.caps-on #capsWarning) {
      display: block;
    }

    :global(.search-box) {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    :global(.search-box .search-icon) {
      width: 30px;
      height: 30px;
    }

    :global(#searchInput) {
      flex: 1;
      max-width: 300px;
      padding: 6px 10px;
      font-size: 14px;
      color: #eee;
      background-color: #111;
      border: 1px solid rgb(0, 0, 0);
      border-radius: 4px;
      transition: border-color 0.2s, background-color 0.2s;
    }

    :global(.light-mode #searchInput) {
      color: #000;
      background-color: #eee;
      border: 1px solid #ccc;
    }

    :global(#searchInput:focus) {
      outline: none;
      border-color: rgb(41, 39, 39);
      background-color: #111;
    }

    :global(.light-mode #searchInput:focus) {
      border-color: #888;
      background-color: #eee;
    }

    @keyframes -global-berdetak {
      0%,
      100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    @keyframes -global-spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    :global(.berdetak) {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #5c0939ff;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: berdetak 1s ease-in-out infinite;
      z-index: 9999;
      cursor: pointer;
    }

    :global(.light-mode .berdetak) {
      background-color: #fa95d8ff;
    }

    :global(.berdetak:hover) {
      animation: spin 2s linear infinite;
    }

    :global(.berdetak img) {
      width: 50px;
      height: 50px;
      pointer-events: none;
    }

    :global(.tia) {
      position: fixed;
      bottom: 80px;
      right: 20px;
      background-color: #3b3838ff;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      cursor: pointer;
    }

    :global(.light-mode .tia) {
      background-color: #c4babaff;
    }

    :global(#themeToggle) {
      bottom: 140px;
      animation: spin 2s linear infinite;
    }

    :global(.tia:hover) {
      animation: spin 2s linear infinite;
    }

    :global(.tiaa img) {
      width: 50px;
      height: 50px;
      pointer-events: none;
    }

    :global(#click) {
      background-color: #292929;
      color: #eee;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      border: 1px solid #444;
      font-size: 0.95rem;
    }

    :global(.light-mode #click) {
      background-color: #f9f9f9;
      color: #000;
      border: 1px solid #ccc;
    }

    :global(#myModalWortel input[type="text"]) {
      background-color: #222;
      color: #eee;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 8px;
      margin-bottom: 0.5rem;
      width: 60px;
      font-size: 0.9rem;
      vertical-align: middle;
    }

    :global(.light-mode #myModalWortel input[type="text"]) {
      background-color: #f0f0f0;
      color: #000;
      border: 1px solid #ccc;
    }

    :global(button#reset) {
      background-color: #a80a24;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 0.85rem;
      height: 28px;
      margin-left: 6px;
      cursor: pointer;
      transform: translateY(-5px);
    }

    :global(button#reset:hover) {
      background-color: #c41630;
    }

    :global(#dcCount) {
      background-color: #222;
      color: #eee;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 8px;
      margin-bottom: 0.5rem;
      width: 60px;
      font-size: 0.9rem;
    }

    :global(.light-mode #dcCount) {
      background-color: #f0f0f0;
      color: #000;
      border: 1px solid #ccc;
    }

    :global(#textarea) {
      background-color: #111;
      color: #eee;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 6px;
      width: 100%;
      margin-top: 0.5rem;
      resize: vertical;
      font-family: monospace;
      font-size: 0.85rem;
    }

    :global(.light-mode #textarea) {
      background-color: #f9f9f9;
      color: #000;
      border: 1px solid #ccc;
    }

    :global(.gambarklik) {
      width: 100%;
      height: auto;
      cursor: pointer;
    }

    @keyframes -global-vibrate {
      0%, 100% { transform: translate(0, 0); }
      20% { transform: translate(-15px, 15px); }
      40% { transform: translate(15px, -15px); }
      60% { transform: translate(-15px, -15px); }
      80% { transform: translate(15px, 15px); }
    }

    :global(.vibrate) {
      animation: vibrate 0.08s linear;
    }

    :global(.smol) {
      margin: 0;
      padding: 0;
      height: 7px;
      color: red;
      font-size: 12px;
      visibility: hidden;
    }

    :global(.window-controls) {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    :global(.ctl) {
      width: 22px;
      height: 22px;
      background: transparent;
      border: none;
      outline: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    :global(.dot) {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: block;
      transition: transform 0.15s ease, filter 0.15s ease;
    }

    :global(.dot-close) {
      background-color: #a01b14ff;
    }

    :global(.dot-min) {
      background-color: #febc2e;
    }

    :global(.dot-max) {
      background-color: #4b37b9ff;
    }

    :global(.ctl:hover .dot) {
      transform: scale(1.1);
      filter: brightness(1.15);
    }

    :global(#accountSelect) {
      transition: all 0.3s ease;
    }

    :global(#loading) {
      position: fixed;
      inset: 0;
      background: var(--bg);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    :global(#loadingImg),
    :global(#loading img) {
      width: 130px !important;
      height: 130px !important;
      animation: bounceLoader 0.6s infinite alternate ease-out !important;
      display: block !important;
    }

    @keyframes -global-bounceLoader {
      0% { transform: translateY(0) scale(1); }
      100% { transform: translateY(-40px) scale(1.1); }
    }

    :global(::view-transition-old(root)),
    :global(::view-transition-new(root)) {
      animation: none;
      mix-blend-mode: normal;
    }

    :global(::view-transition-old(root)) {
      z-index: 1;
    }

    :global(::view-transition-new(root)) {
      z-index: 9999;
    }
  </style>
