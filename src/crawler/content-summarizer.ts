import Anthropic from "@anthropic-ai/sdk";
import { fetchPageContent } from "./html-crawler.js";

const client = new Anthropic();

export async function summarizePost(url: string): Promise<string> {
  const content = await fetchPageContent(url);

  if (!content || content.length < 30) {
    return "내용을 가져올 수 없습니다.";
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `다음 게시글 내용을 한국어로 2-3문장으로 핵심만 요약해주세요.

${content.slice(0, 3000)}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return text.trim();
}
