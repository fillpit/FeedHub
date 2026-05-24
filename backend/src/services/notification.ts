import { getDb } from "../db/schema";

/**
 * Send notification through all enabled channels.
 */
export async function sendNotification(title: string, content: string): Promise<void> {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'feed_%'").all() as { key: string; value: string }[];
  
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  const isBarkEnabled = settings.feed_bark_enabled === "true";
  const barkUrl = settings.feed_bark_url;
  if (isBarkEnabled && barkUrl) {
    await sendBarkNotification(barkUrl, title, content);
  }

  const isFeishuEnabled = settings.feed_feishu_enabled === "true";
  const feishuWebhook = settings.feed_feishu_webhook;
  if (isFeishuEnabled && feishuWebhook) {
    await sendFeishuNotification(feishuWebhook, title, content);
  }
}

/**
 * Send Bark notification.
 */
async function sendBarkNotification(url: string, title: string, content: string): Promise<void> {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const encodedTitle = encodeURIComponent(title);
    const encodedContent = encodeURIComponent(content);
    const targetUrl = `${cleanUrl}/${encodedTitle}/${encodedContent}?group=FeedHub`;
    const response = await fetch(targetUrl);
    if (!response.ok) {
      console.error(`Bark notification failed with status: ${response.status}`);
    }
  } catch (err: unknown) {
    console.error("Failed to send Bark notification:", err);
  }
}

/**
 * Send Feishu/Lark notification.
 */
async function sendFeishuNotification(webhook: string, title: string, content: string): Promise<void> {
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_type: "text",
        content: { text: `【${title}】\n${content}` },
      }),
    });
    if (!response.ok) {
      console.error(`Feishu notification failed with status: ${response.status}`);
    }
  } catch (err: unknown) {
    console.error("Failed to send Feishu notification:", err);
  }
}
