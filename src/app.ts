let ws: WebSocket | null = null;

interface Account {
  email: string;
  password: string;
  nickname: string;
}

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

isRPCRunning().then((running) => {
  if (running) {
    ws = new WebSocket("ws://localhost:6464");
    ws.onopen = () => console.log("🟢 Connected to RPC WebSocket");
    ws.onerror = (err) => console.warn("⚠️ WebSocket error:", err);
  }
});

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
      this.select.innerHTML = "<option value=\"\">Select an Account</option>";
  
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
   * Redacts part of an email address for privacy.
   * 
   * @param {string} email - The email address to redact.
   * @returns {string} The redacted email address.
   */
  private redactedEmails(email: string): string {
    return email.replace(/(.{3})@/, "***@");
  }

  /**
   * Regex to escape special characters in SendKeys. 
   * 
   * Some characters have special meanings in SendKeys and must be escaped using `{}` notation.
   * This function replaces those characters with their escaped versions.
   *
   * @param {string} input - The string to escape.
   * @returns {string} The escaped string, safe for SendKeys.
   */
  public escapeSendKeys(input: string): string {
    return input
      .replace(/\+/g, "{+}")
      .replace(/~/g, "{~}")
      .replace(/\^/g, "{^}")
      .replace(/%/g, "{%}")
      .replace(/&/g, "{&}")
      .replace(/\(/g, "{(}")
      .replace(/\)/g, "{)}")
      .replace(/\{/g, "{{}")
      .replace(/\}/g, "{}}")
      .replace(/\[/g, "{[}")
      .replace(/\]/g, "{]}")
      .replace(/\\/g, "{\\}")
      .replace(/\//g, "{/}")
      .replace(/"/g, "{\"}")
      .replace(/'/g, "{'}");
  }

  /**
   * Updates the Discord Rich Presence (RPC) with new details.
   * This function sends updated information to `discord-rpc.exe` through WebSocket.
   * @param {string} details - The main text displayed in the Discord activity.
   * @param {string} state - The secondary text displayed below `details`.
   */
  public updateDiscordRPC(details: string, state: string) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ details, state }));
      console.log("📤 Sent RPC Update:", { details, state });
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
   * @param {"success" | "fail"} type - Determines the appearance of the snackbar: green for success, red for fail.
   * 
   * @returns {void} This function does not return a value.
   */
  public showAlert(message: string, type: "success" | "fail"): void {
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

    progressBar.style.width = "0%";
    progressBar.style.transition = "none"; 
    void progressBar.offsetWidth; 
    progressBar.style.transition = "width 3s linear";
    progressBar.style.width = "100%"; 
  
    setTimeout(() => {
      snackbar.classList.remove("show", "success", "fail");
    }, 3000);
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
  (document.getElementById("appVersion") as HTMLElement).innerText = config.version || "Unknown";

  await accountManager.loadAccounts();

  const pathDisplay = document.getElementById("selectedPath") as HTMLElement;
  const runBtn = document.getElementById("runBtn") as HTMLButtonElement;

  const storedPath = await Neutralino.storage.getData("nikkeLauncherPath").catch(() => null);
  if (storedPath) {
    launcherPath = storedPath;
    pathDisplay.textContent = launcherPath;
    runBtn.disabled = false;
  }

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
  (document.getElementById("selectPathBtn") as HTMLButtonElement).addEventListener("click", async () => {
    try {
      const file = await Neutralino.os.showOpenDialog("Open a nikke", {
        filters: [
          { name: "Executables", extensions: ["exe"] }
        ]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as any);

      if (!file || file.length === 0) {
        console.warn("⚠️ No file selected.");
        return;
      }
      if (!file[0].includes("nikke_launcher.exe")) {
        await Neutralino.os.showNotification("Oops :/", "Please select nikke_launcher.exe", "ERROR");
        accountManager.showAlert("Please select nikke_launcher.exe", "fail");
        return;
      }
      if (file && file.length > 0) {
        launcherPath = file[0]; // Store selected path in global variable
        await Neutralino.storage.setData("nikkeLauncherPath", launcherPath);
        pathDisplay.textContent = launcherPath;
        runBtn.disabled = false;
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      await Neutralino.os.showNotification("Oops :/", "Failed to select file.", "ERROR");
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
  (document.getElementById("registerBtn") as HTMLButtonElement).addEventListener("click", async () => {
    const input = (document.getElementById("jsonInput") as HTMLTextAreaElement).value;
    try {
      const parsedData = JSON.parse(input);
      const newAccounts = Array.isArray(parsedData) ? parsedData : [parsedData];

      const existingData = await Neutralino.storage.getData("accounts").catch(() => "[]");
      const existingAccounts = JSON.parse(existingData);

      const accountMap = new Map<string, Account>();

      existingAccounts.forEach((acc: Account) => accountMap.set(acc.email, acc));
      
      newAccounts.forEach((acc: Account) => {
        if (!acc.email || !acc.password || !acc.nickname) {
          throw new Error("Each account must have nickname, email, and password");
        }
        accountMap.set(acc.email, acc);
      });
      
      const updatedAccounts = Array.from(accountMap.values());
      await Neutralino.storage.setData("accounts", JSON.stringify(updatedAccounts));
      accountManager.showAlert("Accounts Registered!", "success");
      await accountManager.loadAccounts();
    } catch (e) {
      console.error("Invalid JSON format!", e);
      await Neutralino.os.showNotification("Oops :/", "Invalid JSON format! Please correct it.", "ERROR");
      accountManager.showAlert("Invalid JSON format! Please correct it.", "fail");
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
  (document.getElementById("runBtn") as HTMLButtonElement).addEventListener("click", async () => {
    const select = document.getElementById("accountSelect") as HTMLSelectElement;
    const selectedIndex = select.value;
    const currentArray = Number(selectedIndex) + 1;

    if (selectedIndex === "") {
      await Neutralino.os.showNotification(">:(", "Please select an account!", "ERROR");
      accountManager.showAlert("Please select an account!", "fail");
      return;
    }

    try {
      const data = await Neutralino.storage.getData("accounts");
      if (!data) {
        accountManager.showAlert("No accounts found! Register first.", "fail");
        return;
      }
      const accounts = JSON.parse(data);
      const account = accounts[selectedIndex];

      const emailFixed = accountManager.escapeSendKeys(account.email);
      const passwordFixed = accountManager.escapeSendKeys(account.password);

      if (!launcherPath) {
        accountManager.showAlert("You did not edit where nikke_launcher is located!", "fail");
        return;
      }

      console.log(`Opening NIKKE Launcher... (${launcherPath})`);
      await Neutralino.os.execCommand(`powershell -ExecutionPolicy Bypass -Command "Start-Process '${launcherPath}' -Verb RunAs"`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      // console.log(`Executing: [${emailFixed}] & [${passwordFixed}]`);
      await Neutralino.os.execCommand(`powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Seconds 5; [System.Windows.Forms.SendKeys]::SendWait('{TAB}${emailFixed}{TAB}${passwordFixed}{ENTER}')"`);  
      console.log("✅ Login complete!");
      await Neutralino.os.showNotification(`${account.nickname} `, "Successfully logged in!");
      accountManager.showAlert(`Logged in as ${account.nickname}!`, "success");

      accountManager.updateDiscordRPC(`Playing NIKKE ${currentArray} / ${accounts.length} accounts`, `Logged in as ${account.nickname}`);
    } catch (error) {
      console.error("Execution failed:", error);
    }
  });

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
  (document.getElementById("removeBtn") as HTMLButtonElement).addEventListener("click", async () => {
    const selectedEmail = (document.getElementById("accountSelect") as HTMLSelectElement).value;
    if (!selectedEmail) {
      accountManager.showAlert("Please select an account!", "fail");

      return;
    }
  
    const storedData = await Neutralino.storage.getData("accounts").catch(() => "[]");
    const accounts: Account[] = JSON.parse(storedData);
    const updatedAccounts = accounts.filter((acc: Account) => acc.email !== selectedEmail);
  
    await Neutralino.storage.setData("accounts", JSON.stringify(updatedAccounts));
    accountManager.showAlert(`Account ${selectedEmail} removed!`, "success");
    await accountManager.loadAccounts();
  });  
});

// events: windowClose
Neutralino.events.on("windowClose", async () => {
  const button = await Neutralino.os.showMessageBox("Confirm", "Are you sure you want to quit?", "YES_NO", "QUESTION");
  if (button == "YES") {
    Neutralino.app.exit();
  }
});

// events: serverOffline
Neutralino.events.on("serverOffline", () => {
  location.reload();
  console.warn("WebSocket was disconnected. Refreshing..");
});