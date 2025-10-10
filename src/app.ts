const staging = true;
let ws: WebSocket | null = null;
let globalUser: string;

type PwnedType =
  | "Account Login"
  | "Account Added"
  | "Account Removed"
  | "Adjusting Delay"
  | "Adjusting Path";
type SuccessType = "True" | "False";
type DcStateType = "Idling" | "Maintaining" | "Registering" | "Testing";
type AlertType = "success" | "fail";

interface Account {
  email: string;
  password: string;
  nickname: string;
}

enum ActivityStates {
  Idle = "Idle",
  Maintaining = "Maintaining",
  Registering = "Registering",
  Testing = "Testing",
}

enum ActivityAssets {
  Logo = "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_icon.png",
  Idle = "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_idle.png",
  Maintaining = "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_maintain.png",
  Registering = "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_register.png",
  Testing = "https://raw.githubusercontent.com/ScathachGrip/nikkePwned/refs/heads/master/resources/static/rpc_testing.png",
}

enum SystemInfoPrefix {
  CPU = "\"Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name\"",
  GPU = "\"Get-CimInstance Win32_Processor | Select-Object -ExpandProperty Name\"",
  MOBO = "\"(Get-CimInstance Win32_BaseBoard | Select-Object -ExpandProperty Manufacturer) + ' (' + (Get-CimInstance Win32_BaseBoard | Select-Object -ExpandProperty Product) + ')'\"",
  MOUSE = "\"Get-CimInstance Win32_PointingDevice | Select-Object -ExpandProperty Name\""
}

/**
 * Checks if the current user is running the application as an administrator.
 * Uses PowerShell to verify if the user belongs to the Administrators group.
 *
 * @returns {Promise<boolean>} - Resolves to `true` if the user has admin privileges, otherwise `false`.
 */
async function checkPermissionApp(): Promise<boolean> {
  try {
    const result = await Neutralino.os.execCommand(
      "powershell -Command \"[Security.Principal.WindowsIdentity]::GetCurrent().Groups -contains (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')).Value\"",
    );
    return result.stdOut.trim() === "True";
  } catch (error) {
    console.error("Failed to check admin privileges:", error);
    return false;
  }
}

/**
 * Retrieves the motherboard manufacturer and product name using PowerShell.
 * This command fetches data from the Win32_BaseBoard class via Get-CimInstance.
 *
 * @returns {Promise<string>} - Resolves to a string containing the motherboard information, or a fallback message.
 */
async function getUser(): Promise<string> {
  try {
    const result = await Neutralino.os.execCommand(
      "powershell -Command \"(Get-CimInstance Win32_BaseBoard | Select-Object -ExpandProperty Manufacturer) + ' (' + (Get-CimInstance Win32_BaseBoard | Select-Object -ExpandProperty Product) + ')'\"",
    );
    return result.stdOut.trim() || "Unknown User";
  } catch (error) {
    console.error("Failed to get motherboard info:", error);
    return "Error: Unknown User";
  }
}

/**
 * Attempts to close the "nikke_launcher.exe" process if it is running.
 * Uses the `tasklist` command to check if the process exists, then forcefully terminates it using `taskkill`.
 *
 * @returns {Promise<void>} - Resolves once the process check and termination (if needed) are completed.
 */
async function closeNikkeLauncher(): Promise<void> {
  try {
    const result = await Neutralino.os.execCommand("tasklist");
    const isRunning = result.stdOut.includes("nikke_launcher.exe");

    if (isRunning) {
      await Neutralino.os.execCommand("taskkill /F /IM nikke_launcher.exe");
      console.warn("Nikke Launcher intentionally closed.");
    } else {
      console.log("Nikke Launcher should not running.");
    }
  } catch (error) {
    console.error("Failed to close Nikke Launcher:", error);
  }
}

/**
 * Checks if nikkepwned is running with administrator privileges.
 * If not, displays an error message and prevents further execution.
 * If running as admin, retrieves the motherboard information and shows success.
 *
 * @returns {Promise<void>} - Resolves once the privilege check and corresponding actions are completed.
 */
async function enforceAdminPrivileges(): Promise<void> {
  const isAdmin = await checkPermissionApp();
  console.log(
    isAdmin ? "User is an administrator." : "User is NOT an administrator.",
  );
  if (!isAdmin) {
    const mainContainer = document.querySelector(".main-area");
    if (mainContainer) mainContainer.remove();

    const berdetak = document.getElementById("myBtnWortel");
    if (berdetak) berdetak.remove();

    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) themeToggle.remove();

    const snackbarHTML = `
      <div id="snackbar">
          <span id="snackbar-text"></span>
          <div class="progress"><div class="progress-bar"></div></div>
      </div>
      <img id="closeAppButton" src="/icons/no.jpg" class="responsive-img-small funFadeInUp" style="cursor: pointer;">
  `;
    document.body.insertAdjacentHTML("beforeend", snackbarHTML);
    accountManager.showAlert("Error: Missing Permissions", "fail");
  }
  else {
    globalUser = await getUser();
    accountManager.showAlert(`${globalUser}`, "success");
  }
}

enforceAdminPrivileges();

/**
 * Fetch CPU, GPU, Motherboard, and Mouse info in parallel.
 * @returns {Promise<void>}
 */
async function getSystemInfo(): Promise<void> {
  try {
    const [resultGpu, resultCpu, resultMobo, resultMouse] = await Promise.all([
      Neutralino.os.execCommand(
        `powershell -Command ${SystemInfoPrefix.CPU}`
      ),
      Neutralino.os.execCommand(
        `powershell -Command ${SystemInfoPrefix.GPU}`
      ),
      Neutralino.os.execCommand(
        `powershell -Command ${SystemInfoPrefix.MOBO}`
      ),
      Neutralino.os.execCommand(
        `powershell -Command ${SystemInfoPrefix.MOUSE}`
      )
    ]);

    const applyItem = {
      cpu: resultCpu.stdOut.trim(),
      gpu: resultGpu.stdOut.trim(),
      mobo: resultMobo.stdOut.trim(),
      mouse: resultMouse.stdOut.trim()
    };

    console.log("✅ Fetched info:", applyItem);
  } catch (err) {
    console.error("⚠️ Failed to fetch system info:", err);
  }
}

if (!staging) getSystemInfo();

/**
 * Checks if `discord-rpc.exe` is currently running.
 * This function executes the `tasklist` command and searches for the process name.
 * @returns {Promise<boolean>} - Returns `true` if the process is found, otherwise `false`.
 */
async function isRPCRunning(): Promise<boolean> {
  const result = await Neutralino.os.execCommand("tasklist");
  const isRunning = result.stdOut.includes("discord-rpc.exe");
  console.log("RPC Running:", isRunning);
  return isRunning;
}

/**
 * Checks if `nikke_launcher.exe` is currently running.
 * This function executes the `tasklist` command and searches for the process name.
 * @returns {Promise<boolean>} - Returns `true` if the process is found, otherwise `false`.
 */
async function isLauncherRunning(): Promise<boolean> {
  const result = await Neutralino.os.execCommand("tasklist");
  const isRunning = result.stdOut.includes("nikke_launcher.exe");
  console.log("nikke_launcher Running:", isRunning);
  return isRunning;
}

/**
 * Checks if Caps Lock is currently ON using PowerShell.
 * This function executes a PowerShell command to determine the Caps Lock state.
 * 
 * @returns {Promise<boolean>} - Returns `true` if Caps Lock is ON, otherwise `false`.
 */
async function checkCapsLock(): Promise<boolean> {
  try {
    const result = await Neutralino.os.execCommand("powershell -Command \"[console]::CapsLock\"");
    return result.stdOut.trim() === "True";
  } catch (error) {
    console.error("Gagal mendeteksi Caps Lock:", error);
    return false;
  }
}

/**
 * Updates the visibility of the Caps Lock warning element.
 * This function checks the current Caps Lock state and updates the UI accordingly.
 * 
 * @returns {Promise<void>} - No return value; only updates the UI.
 */
async function updateCapsLock(): Promise<void> {
  const capsWarning = document.getElementById("capsWarning") as HTMLElement;
  if (!capsWarning) return;

  const isCapsOn = await checkCapsLock();
  capsWarning.style.display = isCapsOn ? "block" : "none";
  capsWarning.style.marginTop = isCapsOn ? "-15px" : "2px";
  console.log("Caps Lock State:", isCapsOn);
}


/**
 * Checks if the Discord Rich Presence (RPC) WebSocket is running.
 * If the RPC process is running, attempts to connect to the WebSocket server.
 */
isRPCRunning().then((running) => {
  if (running) {
    ws = new WebSocket("ws://localhost:6464");
    ws.onopen = () => console.log("🟢 Connected to RPC WebSocket");
    ws.onerror = (err) => console.warn("⚠️ WebSocket error:", err);
  }
});

isLauncherRunning();

/**
 * Manages account selection and data retrieval from storage.
 *
 * This class handles loading accounts, redacting email addresses,
 * and updating the account selection dropdown.
 */
class PwnedManager {
  /**
   * The dropdown element for selecting an account.
   * @type {HTMLSelectElement}
   */
  private select: HTMLSelectElement;

  /**
   * Initializes the PwnedManager and selects the account dropdown element.
   */
  constructor() {
    this.select = document.getElementById("accountSelect") as HTMLSelectElement;
  }

  /**
   * Loads accounts from Neutralino storage and populates the select menu.
   *
   * Retrieves stored accounts from `Neutralino.storage.getData("accounts")`, parses the data,
   * and updates the select menu with available accounts.
   *
   * @returns {Promise<void>} Resolves when accounts are loaded and displayed.
   * @throws {Error} If there is an issue retrieving or parsing the accounts data.
   */
  async loadAccounts(): Promise<void> {
    try {
      const data = await Neutralino.storage.getData("accounts");
      if (!data) return;

      const accounts: Account[] = JSON.parse(data);
      this.select.innerHTML = "<option value=\"\">👉Select an Account</option>";

      accounts.forEach((acc: Account, index: number) => {
        const option = document.createElement("option");
        option.value = index.toString();
        option.textContent = `${acc.nickname} (${this.redactedEmails(acc.email)})`;
        this.select.appendChild(option);
      });

      console.log(`✅ Loaded ${accounts.length} accounts.`);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  }

  /**
   * Logs a successful login into Neutralino.storage.
   * @param {string} account - The account nickname.
   * @param {PwnedType} typeWhat - The type of login event.
   * @param {SuccessType} isSuccessWhat - The success status of the login.
   * @param {number} dateWhat - The timestamp of the login event.
   *
   * @returns {Promise<void>} Resolves when the log entry is created and stored.
   */
  async createLog(
    account: string,
    typeWhat: PwnedType,
    isSuccessWhat: SuccessType,
    dateWhat: number,
  ): Promise<void> {
    let history = [];

    try {
      const result = await Neutralino.storage.getData("history");
      history = JSON.parse(result);
    } catch {
      console.warn("⚠️ No existing logins found, creating new one.");
    }

    const logEntry = {
      accountWhat: account,
      typeWhat: typeWhat,
      isSuccess: isSuccessWhat,
      dateWhat: dateWhat,
    };

    history.push(logEntry);
    await Neutralino.storage.setData("history", JSON.stringify(history));
  }

  /**
   * Redacts part of an email address for privacy.
   *
   * @param {string} email - The email address to redact.
   * @returns {string} The redacted email address.
   */
  private redactedEmails(email: string): string {
    return email.replace(/(.{3})@/, "***@");
  }

  /**
   * Escapes special characters for use in SendKeys.
   *
   * Certain characters in SendKeys have special meanings and need to be enclosed
   * in `{}` to be interpreted correctly. This function ensures that those characters
   * are properly escaped to prevent unintended behavior.
   *
   * Special characters escaped:
   * `{`, `}`, `+`, `~`, `^`, `%`, `&`, `(`, `)`, `[`, `]`, `\`, `/`, `"`, `'`
   *
   * @param {string} input - The string to escape.
   * @returns {string} The escaped string, safe for SendKeys.
   */
  public escapeSendKeys(input: string): string {
    const specialChars: Record<string, string> = {
      "{": "{{}",
      "}": "{}}",
      "+": "{+}",
      "~": "{~}",
      "^": "{^}",
      "%": "{%}",
      "&": "{&}",
      "(": "{(}",
      ")": "{)}",
      "[": "{[}",
      "]": "{]}",
      "\\": "{\\}",
      "/": "{/}",
      "\"": "{'}",
      "'": "{'}",
    };

    return input.replace(
      /[{+~^%&()[\]\\/"'}]/g,
      (match) => specialChars[match],
    );
  }

  /**
   * Updates the Discord Rich Presence (RPC) with new details.
   * This function sends updated information to `discord-rpc.exe` through WebSocket.
   * @param {string} details - The main text displayed in the Discord activity.
   * @param {string} state - The secondary text displayed below `details`.
   * @param {string} [smallImageKey] - The key for a small image asset.
   * @param {string} [smallImageText] - The tooltip text for the small image.
   *
   * @returns {void} State sent to the WebSocket server.
   */
  public updateDiscordRPC(
    details: string,
    state: string,
    smallImageKey?: string,
    smallImageText?: DcStateType,
  ): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({
        details,
        state,
        smallImageKey,
        smallImageText,
      });

      ws.send(payload);
      console.log("📤 Sent RPC Update:", {
        details,
        state,
        smallImageKey,
        smallImageText,
      });
    } else {
      console.warn("⚠️ WebSocket not ready.");
    }
  }

  /**
   * Displays vanilla toast with a success or fail message.
   * This function updates the snackbar text, applies the correct styling,
   * and animates a progress bar that disappears after 3 seconds.
   *
   * @param {string} message - The message to display inside the snackbar.
   * @param {AlertType} type - The type of alert to display (success or fail).
   *
   * @returns {void} This function does not return a value.
   */
  public showAlert(message: string, type: AlertType, forceFront = false): void {
    const snackbar = document.getElementById("snackbar");
    const textElement = document.getElementById("snackbar-text");
    const progressBar = document.querySelector(".progress-bar") as HTMLElement;

    if (!snackbar || !textElement || !progressBar) {
      console.error("Snackbar elements not found.");
      return;
    }

    snackbar.className = `show ${type}`;

    if (type === "success") {
      textElement.textContent = `✅ ${message}`;
    } else {
      textElement.textContent = `❌ ${message}`;
    }

    // 🔸 Set z-index higher *only if* requested
    snackbar.style.zIndex = forceFront ? "9999" : "";

    progressBar.style.width = "0%";
    progressBar.style.transition = "none";
    void progressBar.offsetWidth;
    progressBar.style.transition = "width 3s linear";
    progressBar.style.width = "100%";

    setTimeout(() => {
      snackbar.classList.remove("show", "success", "fail");
      snackbar.style.zIndex = ""; // reset to default after done
    }, 3000);
  }


  /**
   * Converts a timestamp to a readable date and "time ago" format.
   * @param {number} timestamp - The timestamp stored with Date.now().
   * @returns {string} - Formatted date and time ago string.
   */
  public formattedDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);

    const formattedDate = date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "");

    let timeAgo;
    if (diffInSeconds < 60) {
      timeAgo = `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      timeAgo = `${Math.floor(diffInSeconds / 60)} minutes ago`;
    } else if (diffInSeconds < 86400) {
      timeAgo = `${Math.floor(diffInSeconds / 3600)} hours ago`;
    } else {
      timeAgo = `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
    return `${formattedDate} (${timeAgo})`;
  }

  /**
   * Extracts nicknames from an account or an array of accounts.
   * @param {Array<{nickname: string}> | {nickname: string}} accounts - A single account object or an array of accounts.
   * @returns {string} - A comma-separated string of nicknames.
   */
  public extractNicknames(
    accounts: { nickname: string } | { nickname: string }[],
  ): string {
    if (Array.isArray(accounts)) {
      return accounts.map((account) => account.nickname).join(", ");
    }
    return accounts.nickname;
  }

  /**
   * Populates the history table with log entries from Neutralino storage.
   *
   * Retrieves the history data from `Neutralino.storage.getData("history")`,
   * parses the JSON data, and populates the table with log entries.
   *
   * @returns {Promise<void>} Resolves when the table is populated with log entries.
   * @throws {Error} If there is an issue retrieving or parsing the history data.
   */
  public async populateTable(query?: string): Promise<void> {
    try {
      const tbody = document.querySelector("table tbody") as HTMLTableSectionElement;
      const result = await Neutralino.storage.getData("history");
      const logs = JSON.parse(result).reverse() as Array<{
        accountWhat: string;
        typeWhat: string;
        isSuccess: string;
        dateWhat: number;
      }>;

      tbody.innerHTML = "";

      const filteredLogs = query
        ? logs.filter(log => log.accountWhat.toLowerCase().includes(query.toLowerCase()))
        : logs;

      filteredLogs.forEach((log) => {
        const row = document.createElement("tr");
        row.innerHTML = `
        <td data-label="String">${log.accountWhat}</td>
        <td data-label="Type">${log.typeWhat}</td>
        <td data-label="isSuccess">${log.isSuccess}</td>
        <td data-label="Date">${accountManager.formattedDate(log.dateWhat)}</td>
      `;
        tbody.appendChild(row);
      });

      if (filteredLogs.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = "<td colspan=\"4\" style=\"text-align:center;\">No Results</td>";
        tbody.appendChild(emptyRow);
      }
    } catch (e) {
      console.warn("⚠️ Failed to load history:", e);
    }
  }

}

const accountManager = new PwnedManager();
accountManager.loadAccounts();

let launcherPath: string = "";
Neutralino.init();

// events: ready
Neutralino.events.on("ready", async () => {
  console.log("🟢 Neutralino App Ready");

  
  const config = await Neutralino.app.getConfig();
  (document.getElementById("appVersion") as HTMLElement).innerText =
    config.version || "Unknown";

  await accountManager.loadAccounts();

  const pathDisplay = document.getElementById("selectedPath") as HTMLElement;
  const runBtn = document.getElementById("runBtn") as HTMLButtonElement;

  const storedPath = await Neutralino.storage
    .getData("nikkeLauncherPath")
    .catch(() => null);
  if (storedPath) {
    launcherPath = storedPath;
    pathDisplay.textContent = launcherPath;
    runBtn.disabled = false;
  }

  const body = document.body;
  const themeToggle = document.getElementById("themeToggle") as HTMLElement | null;
  const appLogo = document.getElementById("appLogo") as HTMLImageElement | null;

  if (!themeToggle) {
    console.error("Theme toggle element not found");
    return;
  }

  /**
   * Apply the theme and update the logo.
   * @param {boolean} isLight
   */
  const applyTheme = async (isLight: boolean): Promise<void> => {
    body.classList.toggle("light-mode", isLight);
    if (appLogo) appLogo.src = isLight ? "/icons/logo-light.png" : "/icons/logo.png";
    await Neutralino.storage.setData("theme", isLight ? "light" : "dark");
  };

  // Load saved theme from Neutralino storage (persistent between sessions)
  try {
    const savedTheme = await Neutralino.storage.getData("theme");
    applyTheme(savedTheme === "light");
  } catch {
    // First run: default to dark
    await Neutralino.storage.setData("theme", "dark");
    applyTheme(false);
  }

  // Toggle theme on click
  themeToggle.addEventListener("click", async (): Promise<void> => {
    const isLight = !body.classList.contains("light-mode");
    await applyTheme(isLight);
  });

  /**
   * Handles the "Select Path" button click event to choose the game executable.
   *
   * - Opens a file selection dialog, allowing the user to select an `.exe` file.
   * - Stores the selected file path in a global variable (`launcherPath`).
   * - Saves the path to Neutralino storage for persistence.
   * - Updates the UI with the selected path.
   * - Enables the "Run" button after selection.
   * - Displays an error notification if the file selection fails.
   *
   * @returns {Promise<void>} Resolves when the file is selected and stored or an error occurs.
   * @throws {Error} If there is an issue selecting the file or storing the path.
   */
  (
    document.getElementById("selectPathBtn") as HTMLButtonElement
  ).addEventListener("click", async () => {
    try {
      const file = await Neutralino.os.showOpenDialog("Open a nikke", {
        filters: [{ name: "Executables", extensions: ["exe"] }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as any);

      if (!file || file.length === 0) {
        console.warn("⚠️ No file selected.");
        return;
      }
      if (!file[0].includes("nikke_launcher.exe")) {
        await Neutralino.os.showNotification(
          "Oops :/",
          "Please select nikke_launcher.exe",
          "ERROR",
        );
        accountManager.showAlert("Please select nikke_launcher.exe", "fail");
        return;
      }
      if (file && file.length > 0) {
        launcherPath = file[0]; // Store selected path in global variable
        await Neutralino.storage.setData("nikkeLauncherPath", launcherPath);
        pathDisplay.textContent = launcherPath;
        runBtn.disabled = false;
        accountManager.showAlert("Path selected!", "success");
        await accountManager.createLog(
          "nikke_launcher",
          "Adjusting Path",
          "True",
          Date.now(),
        );
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      await Neutralino.os.showNotification(
        "Oops :/",
        "Failed to select file.",
        "ERROR",
      );
      accountManager.showAlert("Failed to select file.", "fail");
    }
  });

  /**
   * Handles the "Register" button click event to register new accounts from JSON input.
   *
   * - Parses user-provided JSON input to extract account data.
   * - Ensures the data is properly structured (each account must have `nickname`, `email`, and `password`).
   * - Retrieves existing accounts from Neutralino storage.
   * - Merges new accounts with existing ones, avoiding duplicate emails.
   * - Saves the updated account list back to storage.
   * - Refreshes the account dropdown and displays a success notification.
   * - Shows an error notification if the JSON format is invalid.
   *
   * @returns {Promise<void>} Resolves when accounts are successfully registered or an error occurs.
   * @throws {Error} If there is an issue JSON input or saving the accounts.
   */
  (
    document.getElementById("registerBtn") as HTMLButtonElement
  ).addEventListener("click", async () => {
    const input = (document.getElementById("jsonInput") as HTMLTextAreaElement)
      .value;

    console.log("Input received:", JSON.stringify(input));

    try {
      const parsedData = JSON.parse(input);
      const newAccounts = Array.isArray(parsedData) ? parsedData : [parsedData];

      let existingAccounts: Account[] = [];
      try {
        const existingData = await Neutralino.storage.getData("accounts");
        existingAccounts = JSON.parse(existingData);
      } catch {
        existingAccounts = [];
      }

      const accountMap = new Map<string, Account>();
      existingAccounts.forEach((acc: Account) =>
        accountMap.set(acc.email, acc),
      );

      newAccounts.forEach((acc: Account) => {
        if (!acc.email || !acc.password || !acc.nickname) {
          throw new Error(
            "Each account must have nickname, email, and password",
          );
        }
        accountMap.set(acc.email, acc);
      });

      const updatedAccounts = Array.from(accountMap.values());
      await Neutralino.storage.setData(
        "accounts",
        JSON.stringify(updatedAccounts),
      );
      accountManager.showAlert("Accounts Registered!", "success");
      await accountManager.loadAccounts();
      await accountManager.createLog(
        accountManager.extractNicknames(JSON.parse(input)),
        "Account Added",
        "True",
        Date.now(),
      );
    } catch (e) {
      let message = "Unknown error";

      if (e instanceof Error) {
        message = e.message;
      }

      console.error(`Error: ${message}`);
      await Neutralino.os.showNotification(
        "Oops :/",
        "Invalid JSON format! Please correct it.",
        "ERROR",
      );
      accountManager.showAlert(
        "Invalid JSON format! Please correct it.",
        "fail",
      );
    }
  });

  /**
   * Handles the "Run" button click event to launch the game and perform auto-login.
   *
   * - Retrieves the selected account from the dropdown.
   * - If no account is selected, displays an error notification.
   * - Loads stored accounts from storage.
   * - Launches the game using PowerShell with elevated permissions.
   * - Waits for a few seconds, then sends login credentials using simulated keystrokes.
   * - Displays a notification upon successful login.
   *
   * @returns {Promise<void>} Resolves when the login process is completed or an error occurs.
   * @throws {Error} If there is an issue retrieving accounts, launching the game, or sending keystrokes.
   */
  (document.getElementById("runBtn") as HTMLButtonElement).addEventListener(
    "click",
    async () => {
      const getDelay =
        (await Neutralino.storage.getData("delay_switch")) || "3";
      const getDelayLogin =
        (await Neutralino.storage.getData("delay_login")) || "3";

      const select = document.getElementById(
        "accountSelect",
      ) as HTMLSelectElement;
      const selectedIndex = select.value;
      const currentArray = Number(selectedIndex) + 1;

      if (selectedIndex === "") {
        await Neutralino.os.showNotification(
          ">:(",
          "Please select an account!",
          "ERROR",
        );
        accountManager.showAlert("Please select an account!", "fail");
        return;
      }

      try {
        const data = await Neutralino.storage.getData("accounts");
        if (!data) {
          accountManager.showAlert(
            "No accounts found! Register first.",
            "fail",
          );
          return;
        }

        const accounts = JSON.parse(data);
        const account = accounts[selectedIndex];

        const emailFixed = accountManager.escapeSendKeys(account.email);
        const passwordFixed = accountManager.escapeSendKeys(account.password);

        if (!launcherPath) {
          accountManager.showAlert(
            "You did not edit where nikke_launcher is located!",
            "fail",
          );
          return;
        }

        console.log(`Opening NIKKE Launcher... (${launcherPath})`);
        await Neutralino.os.execCommand(
          `powershell -ExecutionPolicy Bypass -Command "Start-Process '${launcherPath}' -Verb RunAs"`,
        );
        await new Promise((resolve) => setTimeout(resolve, Number(getDelay)));
        await Neutralino.os.execCommand(
          `powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Seconds ${Number(getDelayLogin)}; [System.Windows.Forms.SendKeys]::SendWait(\\"{TAB}${emailFixed}{TAB}${passwordFixed}{ENTER}\\")"`,
        );

        if (await isLauncherRunning()) {
          haik.currentTime = 0;
          haik.play();
          await Neutralino.os.showNotification(
            `${account.nickname} `,
            "Successfully logged in!",
          );
          accountManager.showAlert(
            `Logged in as ${account.nickname}!`,
            "success",
          );
          accountManager.updateDiscordRPC(
            `Playing NIKKE ${currentArray} / ${accounts.length} accounts`,
            `Logged in as ${account.nickname}`,
            ActivityAssets.Maintaining,
            ActivityStates.Maintaining,
          );
          console.log(`✅ Logged in as ${account.nickname}!`);
          await accountManager.createLog(
            account.nickname,
            "Account Login",
            "True",
            Date.now(),
          );
        } else {
          await Neutralino.os.showNotification(
            "Oops :/",
            "ERROR: Window focus is not nikke_launcher.exe",
            "ERROR",
          );
          accountManager.showAlert(
            "ERROR: Window focus is not nikke_launcher.exe",
            "fail",
          );
          await accountManager.createLog(
            account.nickname,
            "Account Login",
            "False",
            Date.now(),
          );
        }

        console.log("Login flow was completed.");
      } catch (error) {
        console.error("Execution failed:", error);
      }
    },
  );

  /**
   * Handles the "Remove" button click event to delete a selected account.
   *
   * - Retrieves the selected account email from the dropdown.
   * - If no account is selected, displays an alert.
   * - Loads stored accounts from Neutralino storage.
   * - Filters out the selected account from the list.
   * - Updates the storage with the new account list.
   * - Displays an alert confirming the removal.
   * - Refreshes the account list in the UI.
   *
   * @returns {Promise<void>} Resolves when the account is successfully removed.
   * @throws {Error} If there is an issue retrieving or updating the account list.
   */
  (document.getElementById("removeBtn") as HTMLButtonElement).addEventListener(
    "click",
    async () => {
      const accountSelect = document.getElementById(
        "accountSelect",
      ) as HTMLSelectElement;
      const selectedIndex = parseInt(accountSelect.value, 10); // Convert to number

      if (isNaN(selectedIndex)) {
        accountManager.showAlert("Please select a valid account!", "fail");
        return;
      }

      const storedData = await Neutralino.storage
        .getData("accounts")
        .catch(() => "[]");
      const accounts: Account[] = JSON.parse(storedData);

      console.log("Before deletion:", accounts);
      console.log("Selected index:", selectedIndex);

      if (selectedIndex < 0 || selectedIndex >= accounts.length) {
        console.error("Index out of range!");
        accountManager.showAlert("Invalid account index!", "fail");
        return;
      }

      const deletedNickname = accounts[selectedIndex].nickname;

      accounts.splice(selectedIndex, 1);
      console.log("After deletion:", accounts);
      await Neutralino.storage.setData("accounts", JSON.stringify(accounts));

      accountManager.showAlert(
        `${deletedNickname} deleted successfully!`,
        "success",
      );
      accountSelect.innerHTML = "<option value=''>Select account</option>";
      accounts.forEach((acc, index) => {
        const option = document.createElement("option");
        option.value = index.toString();
        option.textContent = acc.email;
        accountSelect.appendChild(option);
      });

      await accountManager.loadAccounts();
      await accountManager.createLog(
        deletedNickname,
        "Account Removed",
        "True",
        Date.now(),
      );
    },
  );

  /**
   * Handles the "Purge Data" button click event to permanently delete all stored data.
   *
   * - Displays a confirmation dialog warning the user about data removal.
   * - If the user confirms, proceeds with the deletion.
   * - Clears stored data for:
   *   - STORED_ACCOUNTS (Saved user accounts)
   *   - STORED_HISTORY (Login history)
   *   - STORED_nikkeLauncherPath (Path to NIKKE Launcher)
   *   - STORED_DELAYS_SWITCH (Delay settings for switch)
   *   - STORED_DELAYS_LOGIN (Delay settings for login)
   * - Logs the action to the console for debugging.
   * - If any storage operation fails, the error is logged but does not interrupt the process.
   * - Displays a success message upon completion.
   *
   * @returns {Promise<void>} Resolves when data is successfully purged.
   * @throws {Error} If an issue occurs while deleting stored data.
   */
  (document.getElementById("purgeBtn") as HTMLButtonElement).addEventListener(
    "click",
    async () => {
      const button = await Neutralino.os.showMessageBox(
        "Purge Data",
        "This action will permanently remove the following stored data:\n\n" +
        "- STORED_ACCOUNTS\n" +
        "- STORED_HISTORY\n" +
        "- STORED_nikkeLauncherPath\n" +
        "- STORED_DELAYS_SWITCH\n" +
        "- STORED_DELAYS_LOGIN\n\n" +
        "This action cannot be undone. Do you want to continue?",
        "YES_NO",
        "QUESTION",
      );

      if (button === "YES") {
        console.log("Purging data...");
        await Promise.all([
          Neutralino.storage.setData("accounts", "").catch(console.error),
          Neutralino.storage.setData("history", "").catch(console.error),
          Neutralino.storage
            .setData("nikkeLauncherPath", "")
            .catch(console.error),
          Neutralino.storage.setData("delay_switch", "").catch(console.error),
          Neutralino.storage.setData("delay_login", "").catch(console.error),
        ]).then(() => console.log("Data purged successfully."));
        await Neutralino.os.showMessageBox(
          "Deleted",
          "Data has been purged successfully.",
          "OK",
          "INFO",
        );
      }
    },
  );
});

// Browser.events: DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  // Handling account selection
  const accountSelect = document.getElementById("accountSelect");
  if (accountSelect) {
    accountSelect.addEventListener("mousedown", closeNikkeLauncher);
  }

  // Handling exit onlick closeAppButton
  document.body.addEventListener("click", ({ target }) => {
    if ((target as HTMLElement).id === "closeAppButton") Neutralino.app.exit();
  });

  // Modal-related elements
  const modal = document.getElementById("myModal") as HTMLElement | null;
  const btn = document.getElementById("myBtn") as HTMLButtonElement | null;
  const span = document.querySelector(".close") as HTMLElement | null;
  const tbody = document.querySelector(
    "table tbody",
  ) as HTMLTableSectionElement | null;

  const myModalWortel = document.getElementById("myModalWortel") as HTMLElement;
  const btnWortel = document.getElementById("myBtnWortel") as HTMLButtonElement;
  const spanWortel = myModalWortel.querySelector(".close") as HTMLElement;


  if (!modal || !btn || !span || !tbody || !myModalWortel || !btnWortel || !spanWortel) {
    console.error("❌ Modal elements not found.");
    return;
  }

  // Show modal and populate table
  btn.addEventListener("click", async () => {
    modal.style.display = "flex";
    await accountManager.populateTable();
  });

  // Close modal when clicking the close button
  span.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Close modal when clicking outside the modal
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  btnWortel.addEventListener("click", () => {
    const isOpening = myModalWortel.style.display !== "flex";

    myModalWortel.style.display = isOpening ? "flex" : "none";
    if (isOpening) {
      accountManager.showAlert("double click mouse tests", "success", true);
      accountManager.updateDiscordRPC(
        "Playing NIKKE",
        "Rapidfire mouse tests",
        ActivityAssets.Testing,
        ActivityStates.Testing,
      );
    }
  });

  spanWortel.addEventListener("click", () => {
    myModalWortel.style.display = "none";
  });

  myModalWortel.addEventListener("click", (event) => {
    if (event.target === myModalWortel) {
      myModalWortel.style.display = "none";
    }
  });

  // Handling delay SWITCH input field
  const delayInput = document.getElementById("delayBtn") as HTMLInputElement;
  if (!delayInput) {
    console.error("❌ Delay switch input field not found.");
    return;
  }

  try {
    let storedDelay: string | null = null;

    try {
      storedDelay = await Neutralino.storage.getData("delay_switch");
    } catch (error) {
      if ((error as { code: string }).code === "NE_ST_NOSTKEX") {
        await Neutralino.storage.setData("delay_switch", "3");
        console.warn("⚠️ No existing delay switch found, setting default (3).");
      } else {
        throw error;
      }
    }

    let delayValue = storedDelay ? Number(storedDelay) : 3;
    if (isNaN(delayValue) || delayValue < 1 || delayValue > 5) {
      delayValue = 3;
      await Neutralino.storage.setData("delay_switch", String(delayValue));
    }
    delayInput.value = String(delayValue);
    console.log(`🕒 Current delay switch loaded: ${delayValue}`);
  } catch (error) {
    console.error("❌ Failed to retrieve delay switch:", error);
  }

  // Listen for value changes
  delayInput.addEventListener("input", async () => {
    const newDelay = Number(delayInput.value);

    if (!isNaN(newDelay) && newDelay >= 1 && newDelay <= 8) {
      await Neutralino.storage.setData("delay_switch", String(newDelay));
      console.log(`✅ New delay switch saved: ${newDelay}`);
      accountManager.showAlert(
        `Delay switch set to ${newDelay} seconds.`,
        "success",
      );
      await accountManager.createLog(
        `Delay (switch): ${newDelay}`,
        "Adjusting Delay",
        "True",
        Date.now(),
      );
    } else {
      await Neutralino.storage.setData("delay_switch", "3");
      console.warn("⚠️ Delay value switch out of range (1-8).");
      accountManager.showAlert(
        "Delay value switch out of range: Expected (1-8) seconds.",
        "fail",
      );
    }
  });

  // Handling delay LOGIN input field
  const delayInputLogin = document.getElementById(
    "delayBtnLogin",
  ) as HTMLInputElement;
  if (!delayInputLogin) {
    console.error("❌ Delay input login field not found.");
    return;
  }

  try {
    let storedDelay: string | null = null;

    try {
      storedDelay = await Neutralino.storage.getData("delay_login");
    } catch (error) {
      if ((error as { code: string }).code === "NE_ST_NOSTKEX") {
        await Neutralino.storage.setData("delay_login", "3");
        console.warn("⚠️ No existing delay login found, setting default (3).");
      } else {
        throw error;
      }
    }

    let delayValue = storedDelay ? Number(storedDelay) : 3;
    if (isNaN(delayValue) || delayValue < 1 || delayValue > 5) {
      delayValue = 3;
      await Neutralino.storage.setData("delay_login", String(delayValue));
    }
    delayInputLogin.value = String(delayValue);
    console.log(`🕒 Current delay login loaded: ${delayValue}`);
  } catch (error) {
    console.error("❌ Failed to retrieve delay login:", error);
  }

  // Listen for value changes
  delayInputLogin.addEventListener("input", async () => {
    const newDelay = Number(delayInputLogin.value);

    if (!isNaN(newDelay) && newDelay >= 1 && newDelay <= 8) {
      await Neutralino.storage.setData("delay_login", String(newDelay));
      console.log(`✅ New delay login saved: ${newDelay}`);
      accountManager.showAlert(
        `Delay login set to ${newDelay} seconds.`,
        "success",
      );
      await accountManager.createLog(
        `Delay (login): ${newDelay}`,
        "Adjusting Delay",
        "True",
        Date.now(),
      );
    } else {
      await Neutralino.storage.setData("delay_login", "3");
      console.warn("⚠️ Delay value login out of range (1-8).");
      accountManager.showAlert(
        "Delay value login out of range: Expected (1-8) seconds.",
        "fail",
      );
    }
  });
});

// Neutralino.events: windowClose
Neutralino.events.on("windowClose", async () => {
  const button = await Neutralino.os.showMessageBox(
    "Confirm",
    "Are you sure you want to quit?",
    "YES_NO",
    "QUESTION",
  );
  if (button == "YES") {
    Neutralino.app.exit();
  }
});

// Neutralino.events: serverOffline
Neutralino.events.on("serverOffline", () => {
  location.reload();
  console.warn("WebSocket was disconnected. Refreshing..");
});

// other browser events
document.addEventListener("DOMContentLoaded", updateCapsLock);
document.addEventListener("keydown", updateCapsLock);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    updateCapsLock();
  }
});
document.getElementById("accountSelect")?.addEventListener("click", updateCapsLock);
const searchInput = document.getElementById("searchInput") as HTMLInputElement;

searchInput?.addEventListener("input", () => {
  accountManager.populateTable(searchInput.value.trim());
});

const click = document.getElementById("click") as HTMLElement;
const textarea = document.getElementById("textarea") as HTMLTextAreaElement;
const clicks = document.getElementById("count") as HTMLInputElement;
const dcCount = document.getElementById("dcCount") as HTMLInputElement;
const reset = document.getElementById("reset") as HTMLButtonElement;
const img = document.getElementById("gambarKlik") as HTMLImageElement;
const sound = new Audio("/static/ichad.wav");
const haik = new Audio("/static/haikchad.wav");

let prevClickMicrotime = microtime(true);

reset.onclick = function () {
  clicks.value = "0";
  dcCount.value = "0";
  textarea.value = "";
  click.style.background = "orange";
  prevClickMicrotime = microtime(true);
};

click.addEventListener("mousedown", () => {
  clickEvent();
});

function microtime(get_as_float: boolean = false): number {
  const now = Date.now() / 1000;
  return get_as_float ? now : Math.round(now * 1000) / 1000;
}

function clickEvent() {
  const clickTime = microtime(true);
  const diff = clickTime - prevClickMicrotime;

  if (diff <= 0.08) {
    click.style.background = "red";
    dcCount.value = (parseInt(dcCount.value) + 1).toString();
  }

  textarea.value = `${diff}\t${diff.toFixed(2)} sec.\n` + textarea.value;
  prevClickMicrotime = clickTime;
  clicks.value = (parseInt(clicks.value) + 1).toString();
}

img.addEventListener("click", () => {
  img.classList.remove("vibrate");
  void img.offsetWidth;
  img.classList.add("vibrate");

  sound.currentTime = 0;
  sound.play();
});

// Native borderless listener
window.addEventListener("DOMContentLoaded", () => {
  const minBtn = document.getElementById("minBtn");
  const maxBtn = document.getElementById("maxBtn");
  const closeBtn = document.getElementById("closeBtn");
  const titlebar = document.getElementById("titlebar");

  // Tombol Minimize
  minBtn?.addEventListener("click", () => {
    Neutralino.window.minimize();
  });

  maxBtn?.addEventListener("click", async () => {
    try {
      const isMax = await Neutralino.window.isMaximized();
      if (isMax) {
        await Neutralino.window.unmaximize();
      } else {
        await Neutralino.window.maximize();
      }
    } catch (e) {
      console.error("Error toggling maximize/unmaximize:", e);
    }
  });

  closeBtn?.addEventListener("click", async () => {
    const button = await Neutralino.os.showMessageBox(
      "Confirm",
      "Are you sure you want to quit?",
      "YES_NO",
      "QUESTION",
    );
    if (button == "YES") {
      Neutralino.app.exit();
    }
  });

  // Native Dragging
  let isDragging = false;
  const offset = { x: 0, y: 0 };

  titlebar?.addEventListener("mousedown", (e) => {
    isDragging = true;
    offset.x = e.clientX;
    offset.y = e.clientY;
  });

  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      Neutralino.window.move(
        e.screenX - offset.x,
        e.screenY - offset.y
      );
    }
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });
});

const placeholderText: string = `{
    "nickname": "FUFUFAFA",
    "email": "hey@scathach.id",
    "password": "ReDaCtEd123"
}`;

const accountTextArea = document.getElementById("jsonInput") as HTMLTextAreaElement;
let i = 0;

function typePlaceholder(): void {
  if (i <= placeholderText.length) {
    accountTextArea.setAttribute("placeholder", placeholderText.slice(0, i));
    i++;
    setTimeout(typePlaceholder, 40); 
  } else {
    return; 
  }
}

typePlaceholder();