import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function sendIMessage(
  recipient: string,
  message: string
): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("iMessage is only available on macOS");
  }

  // Escape single quotes and backslashes for AppleScript
  const escaped = message
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");

  const script = `
    tell application "Messages"
      set targetService to 1st account whose service type = iMessage
      set targetBuddy to participant "${recipient}" of targetService
      send "${escaped}" to targetBuddy
    end tell
  `;

  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
}
