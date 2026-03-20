import { useEffect, useState } from "react";
import { api, type Notification } from "../api";
import { useToast } from "../components/Toast";

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(page);
      setNotifications(data.notifications);
      setTotal(data.total);
    } catch (err) {
      toast.error("알림 이력을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const totalPages = Math.ceil(total / 50);

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <span className="badge badge-success">발송</span>;
      case "failed":
        return <span className="badge badge-danger">실패</span>;
      default:
        return <span className="badge badge-warning">대기</span>;
    }
  };

  const channelLabel = (ch: string) => {
    switch (ch) {
      case "imessage":
        return "iMessage";
      case "email":
        return "Email";
      case "slack":
        return "Slack";
      default:
        return ch;
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    const date = new Date(d + "Z");
    return date.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="page-header">
        <h1>알림 이력</h1>
        <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          총 {total}건
        </span>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <h3>알림 이력이 없습니다</h3>
            <p>키워드에 해당하는 게시물이 감지되면 알림이 발송됩니다.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>상태</th>
                  <th>채널</th>
                  <th>소스</th>
                  <th>게시물</th>
                  <th>발송 시각</th>
                  <th>오류</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td>{statusBadge(n.status)}</td>
                    <td>
                      <span className="badge badge-info">{channelLabel(n.channel)}</span>
                    </td>
                    <td>
                      <span className="badge badge-muted">{n.source_name}</span>
                    </td>
                    <td>
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontWeight: 500 }}
                      >
                        {n.title}
                      </a>
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "var(--text-secondary)" }}>
                      {formatDate(n.sent_at)}
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        color: "var(--danger)",
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={n.error_message || undefined}
                    >
                      {n.error_message || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              이전
            </button>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {page} / {totalPages}
            </span>
            <button
              className="btn btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </>
  );
}
