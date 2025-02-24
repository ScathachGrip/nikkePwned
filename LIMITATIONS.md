# Limitations
## Prevent Windows Defender from Flagging the Tool  

Example If Windows Defender flags this tool as a malware, follow these steps to exclude it from scans:  

1. **Press** `Win + R`, type `windowsdefender://exclusions`, and press **Enter**.  
2. Click **"Add an exclusion"** and select **"Folder"**.  
3. Choose the folder where this tool is located.  

This prevents Defender from falsely detecting it as a malware, You can adjust it to your trusted antivirus programs 

## This Tool flagged as potential malware?  

Security software may flag this tool as **potential malware** because:  

1. **Running PowerShell with Admin Privileges**  
   - The tool uses PowerShell's `Start-Process` with `-Verb RunAs` to launch an application with **elevated (admin) permissions**.  
   - Malware often uses this method to gain control over a system, so antivirus programs treat it as suspicious.  

2. **Simulating Keystrokes for Auto-Login**  
   - The tool **automates login credentials** using `[System.Windows.Forms.SendKeys]::SendWait()`.  
   - This behavior is similar to **keyloggers or credential-stealing malware**, triggering security alerts.  

3. **Interacting with Stored Account Data**  
   - It retrieves and processes **stored accounts** from `Neutralino.storage.getData()`.  
   - Since malicious software often extracts sensitive data, security software may flag this activity.  