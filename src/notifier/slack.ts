import axios from "axios";

export async function sendSlack(
  webhookUrl: string,
  message: string
): Promise<void> {
  await axios.post(webhookUrl, { text: message }, { timeout: 10000 });
}
