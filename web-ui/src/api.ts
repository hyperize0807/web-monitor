const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Source {
  id: number;
  name: string;
  url: string;
  type: "html" | "rss";
  interval_minutes: number;
  selectors: Record<string, string>;
  keywords: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  source_id: number;
  source_name: string;
  title: string;
  url: string;
  author: string | null;
  summary: string | null;
  detected_at: string;
}

export interface Notification {
  id: number;
  post_id: number;
  title: string;
  url: string;
  source_name: string;
  channel: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
}

export interface NotificationSetting {
  id: number;
  channel: string;
  config: Record<string, string>;
  enabled: boolean;
}

export interface AnalyzeResult {
  row: string;
  title: string;
  link: string;
  linkAttr?: string;
  author?: string;
  postId?: string;
  postIdAttr?: string;
  preview: Array<{ title: string; url: string; author?: string; postId?: string }>;
}

export interface CrawlLog {
  id: number;
  source_id: number;
  source_name: string;
  status: "success" | "error";
  total_found: number;
  new_posts: number;
  matched_posts: number;
  error_message: string | null;
  crawled_at: string;
}

export const api = {
  getSources: () => request<Source[]>("/sources"),

  createSource: (data: Partial<Source>) =>
    request<{ id: number }>("/sources", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSource: (id: number, data: Partial<Source>) =>
    request<void>(`/sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteSource: (id: number) =>
    request<void>(`/sources/${id}`, { method: "DELETE" }),

  analyzeSelectors: (url: string, rowSelector: string, useBrowser = false) =>
    request<AnalyzeResult>("/sources/analyze", {
      method: "POST",
      body: JSON.stringify({ url, rowSelector, useBrowser }),
    }),

  openLoginBrowser: (url: string) =>
    request<{ message: string }>("/browser/login", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  triggerCrawl: (id: number) =>
    request<void>(`/sources/${id}/crawl`, { method: "POST" }),

  getPosts: (params?: { source_id?: number; keyword?: string; matched_only?: boolean; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.source_id) q.set("source_id", String(params.source_id));
    if (params?.keyword) q.set("keyword", params.keyword);
    if (params?.matched_only) q.set("matched_only", "true");
    if (params?.page) q.set("page", String(params.page));
    return request<{ posts: Post[]; total: number; page: number; limit: number }>(
      `/posts?${q}`
    );
  },

  getNotifications: (page = 1) =>
    request<{ notifications: Notification[]; total: number; page: number; limit: number }>(
      `/notifications?page=${page}`
    ),

  getNotificationSettings: () =>
    request<NotificationSetting[]>("/notifications/settings"),

  updateNotificationSetting: (channel: string, data: { config: Record<string, string>; enabled: boolean }) =>
    request<void>(`/notifications/settings/${channel}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getCrawlLogs: (params?: { source_id?: number; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.source_id) q.set("source_id", String(params.source_id));
    if (params?.page) q.set("page", String(params.page));
    return request<{ logs: CrawlLog[]; total: number; page: number; limit: number }>(
      `/crawl-logs?${q}`
    );
  },
};
