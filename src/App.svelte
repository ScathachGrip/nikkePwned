<script lang="ts">
  import { onMount } from "svelte";
  import type {
    Account,
    HistoryLog,
    BurstBonkConfig,
    LoginResult,
  } from "./types";
  import { invoke } from "./lib/api";
  import { playAudio, redactedEmail } from "./lib/utils";

  import Header from "./lib/components/Header.svelte";
  import Toast from "./lib/components/Toast.svelte";
  import LoadingOverlay from "./lib/components/LoadingOverlay.svelte";
  import SingleAccountForm from "./lib/components/SingleAccountForm.svelte";
  import JsonAccountForm from "./lib/components/JsonAccountForm.svelte";
  import AccountPickerModal from "./lib/components/AccountPickerModal.svelte";
  import LogsModal from "./lib/components/LogsModal.svelte";
  import BurstBonkModal from "./lib/components/BurstBonkModal.svelte";
  import WortelModal from "./lib/components/WortelModal.svelte";

  // Reactive State Runes
  let isLightMode = $state(false);
  let isCapsOn = $state(false);
  let launcherPath = $state("where is nikke_launcher.exe");
  let accounts = $state<Account[]>([]);
  let selectedAccountIndex = $state<number | null>(null);
  let loggedInAccountInfo = $state<{ nickname: string; email: string; index: number } | null>(null);
  let registerMode = $state<"single" | "json">("single");

  // Single / JSON Account Form State
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
  let isBurstBonkModalOpen = $state(false);
  let isWortelModalOpen = $state(false);

  // Loading Overlay
  let isLoading = $state(false);
  let loadingImgSrc = $state("/static/loading/ext_load_1.webp");
  const loadingImgs = [
    "ext_load_1",
    "ext_load_2",
    "ext_load_3",
    "ext_load_4",
    "ext_load_5",
  ];

  // Logs & Search
  let historyLogs = $state<HistoryLog[]>([]);
  let searchQuery = $state("");

  // BurstBonk State
  let burstbonkKeys = $state<string[]>(["A", "S", "D", "F", "G"]);
  let burstbonkIntervalMs = $state<number>(3);
  let burstbonkHumanized = $state(true);
  let isBurstBonkActive = $state(false);

  // Wortel Easter Egg
  let wortelClickCount = $state(0);
  let wortelDcCount = $state(0);
  let isWortelVibrating = $state(false);
  let wortelTextareaValue = $state("");
  let isClickBoxRed = $state(false);
  let prevClickMicrotime = Date.now() / 1000;

  // Snackbar Toast
  let toastShow = $state(false);
  let toastType = $state<"success" | "fail">("success");
  let toastMessage = $state("");
  let toastProgress = $state(0);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

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
              const lastAccStr =
                loginLogs[0].account || loginLogs[0].accountWhat || "";
              const foundIdx = accounts.findIndex(
                (a) =>
                  a.nickname.toLowerCase() === lastAccStr.toLowerCase() ||
                  a.email.toLowerCase() === lastAccStr.toLowerCase(),
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
        await invoke("add_history_log", {
          account: "nikke_launcher",
          eventType: "Adjusting Path",
          isSuccess: "True",
        });
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
        newAccs.push({
          nickname: singleNickname.trim(),
          email: singleEmail.trim(),
          password: singlePassword,
        });
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

      if (isTypingAccount) {
        isTypingAccount = false;
        restoreIdleRpc();
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
      if (loggedInAccountInfo && loggedInAccountInfo.email.toLowerCase() === acc.email.toLowerCase()) {
        loggedInAccountInfo = null;
        restoreIdleRpc();
      }
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
    const randomLoader =
      loadingImgs[Math.floor(Math.random() * loadingImgs.length)];
    loadingImgSrc = `/static/loading/${randomLoader}.webp`;

    await new Promise((r) => setTimeout(r, 50));

    try {
      const res = await invoke<LoginResult>("execute_login", {
        accountIndex: selectedAccountIndex,
        switchDelay,
        loginDelay,
      });

      isLoading = false;

      if (res && res.success) {
        showAlert(`Logged in as ${acc.nickname}!`, "success");
        loggedInAccountInfo = {
          nickname: acc.nickname,
          email: acc.email,
          index: selectedAccountIndex!,
        };
        invoke("update_discord_rpc", {
          details: `Playing NIKKE ${selectedAccountIndex! + 1} / ${accounts.length} accounts`,
          state: `Logged in as ${acc.nickname}`,
          smallImageKey: "rpc_maintain",
          smallImageText: "Maintaining",
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
        "This action cannot be undone. Do you want to continue?",
    });
    if (!confirmPurge) return;

    try {
      await invoke("purge_data");
      showAlert("All stored data purged!", "success");
      accounts = [];
      selectedAccountIndex = null;
      loggedInAccountInfo = null;
      launcherPath = "where is nikke_launcher.exe";
      await loadAccounts();
      restoreIdleRpc();
    } catch (e) {
      showAlert(String(e), "fail");
    }
  }

  let isTypingAccount = false;

  function handleAccountTyping(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Validate that the element is strictly inside <div id="entryAccountPanel" class="entry-account-panel">
    const panel = document.getElementById("entryAccountPanel");
    if (!panel || !panel.contains(target)) return;

    const isInput =
      target instanceof HTMLInputElement &&
      ["nickname", "email", "password"].includes(target.placeholder.toLowerCase());

    const isTextarea =
      target instanceof HTMLTextAreaElement &&
      target.placeholder.toLowerCase().includes("nickname");

    if (!isInput && !isTextarea) return;

    if (!isTypingAccount) {
      isTypingAccount = true;
      invoke("update_discord_rpc", {
        details: "Password Manager for NIKKE",
        state: "Registering account",
        smallImageKey: "rpc_maintain",
        smallImageText: "Registering account",
      }).catch((e) => console.warn("RPC update failed:", e));
    }
  }

  function handleAccountFocusOut(event: FocusEvent): void {
    const panel = document.getElementById("entryAccountPanel");
    const related = event.relatedTarget as HTMLElement | null;
    if (panel && related && panel.contains(related)) {
      return;
    }

    if (isTypingAccount) {
      isTypingAccount = false;
      restoreIdleRpc();
    }
  }

  function restoreIdleRpc(): void {
    isTypingAccount = false;
    if (loggedInAccountInfo) {
      const currentIdx = accounts.findIndex(
        (a) =>
          a.email.toLowerCase() === loggedInAccountInfo!.email.toLowerCase(),
      );
      const displayIdx =
        currentIdx !== -1 ? currentIdx : loggedInAccountInfo.index;
      invoke("update_discord_rpc", {
        details: `Playing NIKKE ${displayIdx + 1} / ${accounts.length} accounts`,
        state: `Logged in as ${loggedInAccountInfo.nickname}`,
        smallImageKey: "rpc_maintain",
        smallImageText: "Maintaining",
      }).catch((e) => console.warn("RPC update failed:", e));
    } else {
      invoke("update_discord_rpc", {
        details: "Idle",
        state: "Password Manager for NIKKE",
        smallImageKey: "rpc_idle",
        smallImageText: "Idling",
      }).catch((e) => console.warn("RPC update failed:", e));
    }
  }

  async function handleOpenLogsModal(): Promise<void> {
    isLogsModalOpen = true;
    invoke("update_discord_rpc", {
      details: "Viewing logs",
      state: "Audit & History",
      smallImageKey: "rpc_maintain",
      smallImageText: "Logs",
    }).catch((e) => console.warn("RPC update failed:", e));
    try {
      historyLogs = await invoke<HistoryLog[]>("get_history_logs");
    } catch (e) {
      console.error("Failed to load history logs:", e);
    }
  }

  function handleCloseLogsModal(): void {
    isLogsModalOpen = false;
    restoreIdleRpc();
  }

  function handleOpenWortelModal(): void {
    isWortelModalOpen = true;
    invoke("update_discord_rpc", {
      details: "Rapidfire mouse test",
      state: "Testing Click Frequency",
      smallImageKey: "rpc_testing",
      smallImageText: "Rapidfire Mouse Test",
    }).catch((e) => console.warn("RPC update failed:", e));
  }

  function handleCloseWortelModal(): void {
    isWortelModalOpen = false;
    restoreIdleRpc();
  }

  async function handleOpenBurstBonkModal(): Promise<void> {
    isBurstBonkModalOpen = true;
    try {
      const cfg = await invoke<BurstBonkConfig>("get_burstbonk_config");
      if (cfg && cfg.keys && cfg.keys.length > 0) {
        burstbonkKeys = cfg.keys;
      }
      if (cfg && (cfg.interval_ms != null || cfg.intervalMs != null)) {
        burstbonkIntervalMs = cfg.interval_ms ?? cfg.intervalMs ?? 3;
      }
      if (cfg && cfg.humanized != null) {
        burstbonkHumanized = Boolean(cfg.humanized);
      }
      isBurstBonkActive = await invoke<boolean>("get_burstbonk_status");

      invoke("update_discord_rpc", {
        details: isBurstBonkActive ? "BurstBonk Engine (Active)" : "Configuring BurstBonk",
        state: isBurstBonkActive ? `Auto-Burst (${burstbonkIntervalMs}ms)` : "Keyboard Burst Utility",
        smallImageKey: isBurstBonkActive ? "rpc_maintain" : "rpc_llm",
        smallImageText: isBurstBonkActive ? "BurstBonk Active" : "BurstBonk Menu",
      }).catch((e) => console.warn("RPC update failed:", e));
    } catch (e) {
      console.error("Failed to load BurstBonk config:", e);
    }
  }

  function handleCloseBurstBonkModal(): void {
    isBurstBonkModalOpen = false;
    restoreIdleRpc();
  }

  async function handleSaveBurstBonkConfig(): Promise<void> {
    try {
      const validKeys = burstbonkKeys.filter((k) => k.trim() !== "");
      if (validKeys.length === 0) {
        showAlert("At least one key is required!", "fail");
        return;
      }
      await invoke("save_burstbonk_config", {
        keys: validKeys,
        interval_ms: Number(burstbonkIntervalMs) || 3,
        humanized: burstbonkHumanized,
      });
      console.log("[BurstBonk] Config saved:", {
        keys: validKeys,
        interval_ms: Number(burstbonkIntervalMs) || 3,
        humanized: burstbonkHumanized,
      });
      showAlert("BurstBonk config saved!", "success");
    } catch (e) {
      showAlert(String(e), "fail");
    }
  }

  async function handleToggleBurstBonk(): Promise<void> {
    try {
      if (isBurstBonkActive) {
        await invoke("stop_burstbonk");
        isBurstBonkActive = false;
        console.log("[BurstBonk] Stopped");
        showAlert("BurstBonk stopped", "success");
        invoke("update_discord_rpc", {
          details: "Configuring BurstBonk",
          state: "Standby",
          smallImageKey: "rpc_llm",
          smallImageText: "BurstBonk Standby",
        }).catch((e) => console.warn("RPC update failed:", e));
      } else {
        await invoke("start_burstbonk");
        isBurstBonkActive = true;
        console.log("[BurstBonk] Started with:", {
          keys: burstbonkKeys,
          interval_ms: burstbonkIntervalMs,
          humanized: burstbonkHumanized,
        });
        showAlert("BurstBonk started!", "success");
        invoke("update_discord_rpc", {
          details: "BurstBonk Engine (Active)",
          state: `Auto-Burst (${burstbonkIntervalMs}ms)`,
          smallImageKey: "rpc_maintain",
          smallImageText: "BurstBonk Active",
        }).catch((e) => console.warn("RPC update failed:", e));
      }
    } catch (e) {
      showAlert(String(e), "fail");
    }
  }

  function toggleThemeWithCircularTransition(event: MouseEvent): void {
    const nextLightMode = !isLightMode;

    const targetEl =
      (event.currentTarget as HTMLElement) || (event.target as HTMLElement);
    const rect = targetEl?.getBoundingClientRect
      ? targetEl.getBoundingClientRect()
      : null;
    const x = rect
      ? rect.left + rect.width / 2
      : (event?.clientX ?? window.innerWidth - 30);
    const y = rect
      ? rect.top + rect.height / 2
      : (event?.clientY ?? window.innerHeight - 30);

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    if (
      typeof document !== "undefined" &&
      typeof (document as any).startViewTransition === "function"
    ) {
      const transition = (document as any).startViewTransition(() => {
        isLightMode = nextLightMode;
        localStorage.setItem("theme", nextLightMode ? "light" : "dark");
        document.body.classList.toggle("light-mode", nextLightMode);
      });

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];
        document.documentElement.animate(
          { clipPath },
          {
            duration: 650,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
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
    setTimeout(() => {
      isWortelVibrating = false;
    }, 80);
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

    wortelTextareaValue =
      `${diff.toFixed(4)}\t${diff.toFixed(2)} sec.\n` + wortelTextareaValue;
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
      message: "Are you sure you want to close nikkePwned?",
    });
    if (confirmClose) {
      invoke("close_window");
    }
  }

  const filteredHistoryLogs = $derived(
    historyLogs
      .filter((l) => {
        const q = searchQuery.toLowerCase();
        const accStr = (l.account || l.accountWhat || "").toLowerCase();
        const typeStr = (
          l.eventType ||
          l.typeWhat ||
          l.is_success ||
          ""
        ).toLowerCase();
        return accStr.includes(q) || typeStr.includes(q);
      })
      .sort((a, b) => {
        const tsA = a.timestamp || a.dateWhat || 0;
        const tsB = b.timestamp || b.dateWhat || 0;
        return tsB - tsA;
      }),
  );

  function handleGlobalKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      isAccountPickerOpen = false;
      if (isLogsModalOpen) handleCloseLogsModal();
      if (isBurstBonkModalOpen) handleCloseBurstBonkModal();
      if (isWortelModalOpen) handleCloseWortelModal();
    }
  }

  onMount(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      isLightMode = true;
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("input", handleAccountTyping);

    loadAccounts();
    loadLauncherPath();
    checkCapsLock();
    const interval = setInterval(checkCapsLock, 3000);

    invoke("update_discord_rpc", {
      details: "Idle",
      state: "Password Manager for NIKKE",
      smallImageKey: "rpc_idle",
      smallImageText: "Idling",
    }).catch((e) => console.warn("Initial RPC update failed:", e));

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("input", handleAccountTyping);
    };
  });
</script>

<svelte:head>
  <title>nikkePwned</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/x-icon" href="/icons/favicon.ico" />
</svelte:head>

<div class={isLightMode ? "app-root light-mode" : "app-root"}>
  <!-- Custom Titlebar -->
  <Header onClose={handleCloseWindow} />

  <!-- Toast Snackbar -->
  <Toast
    show={toastShow}
    type={toastType}
    message={toastMessage}
    progress={toastProgress}
  />

  <!-- Loading Overlay -->
  <LoadingOverlay show={isLoading} {loadingImgSrc} />

  <!-- Main Container -->
  <main class="main-area">
    <div class="container funFadeInUp">
      <!-- Logo Container -->
      <div id="logoContainer">
        <img
          src={isLightMode ? "/icons/v5-light.png" : "/icons/v5-dark.png"}
          id="appLogo"
          alt="nikkePwned Logo"
          class="responsive-img"
        />

        {#if isCapsOn}
          <div id="capsWarning">⚠️ Caps Lock is ON</div>
        {/if}
      </div>

      <!-- Path Container -->
      <div id="pathContainer">
        <button
          id="selectPathIconBtn"
          type="button"
          title="Edit launcher path"
          aria-label="Edit launcher path"
          onclick={handleSelectPath}
        >
          <img src="/icons/nikke.png" alt="Edit path icon" />
        </button>
        <pre id="selectedPath" style="color: #298fd8ff;">{launcherPath
            ? launcherPath.replace(/\\/g, "/")
            : "where is nikke_launcher.exe"}</pre>
        <button
          id="selectPathBtn"
          style="font-weight: 900;"
          onclick={handleSelectPath}>Edit</button
        >
      </div>

      <!-- Account Entry Panel -->
      <div
        id="entryAccountPanel"
        class="entry-account-panel"
        oninput={handleAccountTyping}
        onfocusout={handleAccountFocusOut}
      >
        <div class="register-input-mode" id="registerInputMode">
          <button
            type="button"
            class={registerMode === "single"
              ? "mode-toggle-btn is-active"
              : "mode-toggle-btn"}
            onclick={() => (registerMode = "single")}>Manual Entry</button
          >
          <button
            type="button"
            class={registerMode === "json"
              ? "mode-toggle-btn is-active"
              : "mode-toggle-btn"}
            onclick={() => (registerMode = "json")}>JSON Bulk Import</button
          >
        </div>

        {#if registerMode === "single"}
          <SingleAccountForm
            bind:singleNickname
            bind:singleEmail
            bind:singlePassword
          />
        {:else}
          <JsonAccountForm bind:jsonInput />
        {/if}

        <button
          id="registerBtn"
          type="button"
          style="font-weight: 900;"
          onclick={handleRegisterAccounts}>📝Register Accounts</button
        >
      </div>

      <!-- Account Action Row -->
      <div class="account-action-row">
        <div class="account-picker-wrap">
          <button
            id="accountPickerBtn"
            type="button"
            class="account-picker-btn"
            onclick={() => (isAccountPickerOpen = true)}
          >
            <span id="accountPickerLabel" class="account-picker-label">
              {selectedAccountIndex !== null && accounts[selectedAccountIndex]
                ? `${accounts[selectedAccountIndex].nickname} (${redactedEmail(accounts[selectedAccountIndex].email)})`
                : "Select an Account"}
            </span>
            <span class="account-picker-arrow"> &gt;&gt; </span>
          </button>
        </div>

        <button
          id="runBtn"
          type="button"
          title="Proceed auto login"
          aria-label="Proceed auto login"
          onclick={handleExecuteLogin}>🚀</button
        >
        <button
          id="removeBtn"
          type="button"
          title="Remove account"
          aria-label="Remove account"
          onclick={handleRemoveAccount}>🚫</button
        >
      </div>

      <!-- Delay Settings & Footer Actions -->
      <div
        style="display: flex; align-items: center; justify-content: center; gap: 6px; height: 32px; margin-top: 14px; flex-wrap: nowrap;"
      >
        <label
          for="delayBtn"
          style="white-space: nowrap; font-size: 12px; height: 25px; display: inline-flex; align-items: center; margin: 0; line-height: 1;"
          >Delay (switch):</label
        >
        <input
          type="number"
          id="delayBtn"
          name="delayswitch"
          min="1"
          max="10"
          step="1"
          bind:value={switchDelay}
          style="font-size: 12px; width: 28px; height: 25px; text-align: center; margin: 0; padding: 0; box-sizing: border-box;"
        />
        <label
          for="delayBtnLogin"
          style="white-space: nowrap; font-size: 12px; height: 25px; display: inline-flex; align-items: center; margin: 0; line-height: 1;"
          >Delay (login):</label
        >
        <input
          type="number"
          id="delayBtnLogin"
          name="delaylogin"
          min="1"
          max="10"
          step="1"
          bind:value={loginDelay}
          style="font-size: 12px; width: 28px; height: 25px; text-align: center; margin: 0; padding: 0; box-sizing: border-box;"
        />
        <button
          id="myBtn"
          type="button"
          onclick={handleOpenLogsModal}
          style="width: auto; min-width: 50px; height: 25px; margin: 0; padding: 0 9px; font-size: 12px; display: inline-flex; align-items: center; justify-content: center;"
          >🔍Logs</button
        >
        <button
          id="purgeBtn"
          type="button"
          onclick={handlePurgeData}
          style="width: auto; min-width: 50px; height: 25px; margin: 0; padding: 0 9px; font-size: 12px; display: inline-flex; align-items: center; justify-content: center;"
          >⛔Purge Data</button
        >
      </div>
    </div>
  </main>

  <!-- Account Picker Modal -->
  <AccountPickerModal
    isOpen={isAccountPickerOpen}
    {accounts}
    {selectedAccountIndex}
    onSelect={(idx) => {
      selectedAccountIndex = idx;
      isAccountPickerOpen = false;
    }}
    onClose={() => (isAccountPickerOpen = false)}
  />

  <!-- History Logs Modal -->
  <LogsModal
    isOpen={isLogsModalOpen}
    bind:searchQuery
    filteredLogs={filteredHistoryLogs}
    onClose={handleCloseLogsModal}
  />

  <!-- BurstBonk Settings Modal -->
  <BurstBonkModal
    isOpen={isBurstBonkModalOpen}
    bind:keys={burstbonkKeys}
    bind:intervalMs={burstbonkIntervalMs}
    bind:humanized={burstbonkHumanized}
    isActive={isBurstBonkActive}
    onSave={handleSaveBurstBonkConfig}
    onToggle={handleToggleBurstBonk}
    onUpdateKeys={(newKeys: string[]) => (burstbonkKeys = newKeys)}
    onClose={handleCloseBurstBonkModal}
  />

  <!-- Wortel Easter Egg Modal -->
  <WortelModal
    isOpen={isWortelModalOpen}
    clickCount={wortelClickCount}
    dcCount={wortelDcCount}
    textareaValue={wortelTextareaValue}
    {isClickBoxRed}
    isVibrating={isWortelVibrating}
    onImageClick={handleWortelImageClick}
    onMouseDown={handleWortelMouseDown}
    onReset={handleResetWortel}
    onClose={handleCloseWortelModal}
  />

  <!-- Floating Action Buttons -->
  <button
    type="button"
    class="tia"
    id="themeToggle"
    onclick={toggleThemeWithCircularTransition}
  >
    <img
      src="/static/rpc_idle.png"
      alt="sun"
      style="width: 40px; height: 40px"
    />
  </button>
  <button
    type="button"
    class="tia"
    id="myBtnBurstBonk"
    onclick={handleOpenBurstBonkModal}
  >
    <img
      src="/static/rpc_llm.png"
      alt="burstbonk"
      style="width: 40px; height: 40px"
    />
  </button>
  <button
    type="button"
    class="berdetak"
    id="myBtnWortel"
    onclick={handleOpenWortelModal}
  >
    <img
      src="/static/rpc_testing.png"
      alt="sun"
      style="width: 30px; height: 30px"
    />
  </button>
</div>
