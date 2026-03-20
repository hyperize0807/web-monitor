import { useEffect, useState } from "react";
import { api, type NotificationSetting } from "../api";
import { useToast } from "../components/Toast";

interface ChannelFormConfig {
  imessage: { recipient: string };
  email: { host: string; port: string; user: string; pass: string; to: string };
  slack: { webhookUrl: string };
}

const channelMeta: Record<
  string,
  { label: string; description: string; fields: { key: string; label: string; type?: string; placeholder: string }[] }
> = {
  imessage: {
    label: "iMessage",
    description: "Mac에서 iMessage를 통해 알림을 받습니다. AppleScript를 사용하므로 macOS에서만 동작합니다.",
    fields: [
      { key: "recipient", label: "수신 번호/이메일", placeholder: "+821012345678 또는 email@icloud.com" },
    ],
  },
  email: {
    label: "Email",
    description: "SMTP를 통해 이메일 알림을 받습니다.",
    fields: [
      { key: "host", label: "SMTP 호스트", placeholder: "smtp.gmail.com" },
      { key: "port", label: "SMTP 포트", placeholder: "587" },
      { key: "user", label: "사용자", placeholder: "your_email@gmail.com" },
      { key: "pass", label: "비밀번호", type: "password", placeholder: "앱 비밀번호" },
      { key: "to", label: "수신 이메일", placeholder: "recipient@gmail.com" },
    ],
  },
  slack: {
    label: "Slack",
    description: "Slack Webhook을 통해 알림을 받습니다.",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." },
    ],
  },
};

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    try {
      setSettings(await api.getNotificationSettings());
    } catch (err) {
      toast.error("설정을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateConfig = (channel: string, key: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.channel === channel ? { ...s, config: { ...s.config, [key]: value } } : s
      )
    );
  };

  const toggleEnabled = (channel: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.channel === channel ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSave = async (channel: string) => {
    const setting = settings.find((s) => s.channel === channel);
    if (!setting) return;

    setSaving(channel);
    try {
      await api.updateNotificationSetting(channel, {
        config: setting.config,
        enabled: setting.enabled,
      });
      toast.success(`${channelMeta[channel]?.label || channel} 설정이 저장되었습니다.`);
    } catch (err) {
      toast.error("저장 실패: " + (err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>알림 설정</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {settings.map((s) => {
          const meta = channelMeta[s.channel];
          if (!meta) return null;

          return (
            <div key={s.channel} className="card">
              <div className="card-body">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{meta.label}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                      {meta.description}
                    </div>
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={() => toggleEnabled(s.channel)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      {s.enabled ? "활성" : "비활성"}
                    </span>
                  </label>
                </div>

                {meta.fields.map((field) => (
                  <div className="form-group" key={field.key}>
                    <label>{field.label}</label>
                    <input
                      type={field.type || "text"}
                      value={s.config[field.key] || ""}
                      onChange={(e) => updateConfig(s.channel, field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSave(s.channel)}
                    disabled={saving === s.channel}
                  >
                    {saving === s.channel ? "저장중..." : "저장"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
