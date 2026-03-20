import { useEffect, useState } from "react";
import { api, type CrawlLog, type Source } from "../api";
import { useToast } from "../components/Toast";

export default function CrawlLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<number | undefined>();

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getCrawlLogs({
        source_id: filterSource,
        page,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      toast.error("크롤링 이력을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadSources = async () => {
    try {
      setSources(await api.getSources());
    } catch {}
  };

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    load();
  }, [page, filterSource]);

  const totalPages = Math.ceil(total / 50);

  const formatDate = (d: string) => {
    const date = new Date(d + "Z");
    return date.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <>
      <div className="page-header">
        <h1>크롤링 이력</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            총 {total}건
          </span>
          <button className="btn btn-sm" onClick={() => { setPage(1); load(); }}>
            새로고침
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div className="form-group" style={{ marginBottom: 0, maxWidth: 300 }}>
            <label>소스 필터</label>
            <select
              value={filterSource ?? ""}
              onChange={(e) => {
                setFilterSource(e.target.value ? Number(e.target.value) : undefined);
                setPage(1);
              }}
            >
              <option value="">전체 소스</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <h3>크롤링 이력이 없습니다</h3>
            <p>소스를 등록하면 크롤링 결과가 여기에 기록됩니다.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>상태</th>
                  <th>소스</th>
                  <th>실행 시각</th>
                  <th>전체 수집</th>
                  <th>신규</th>
                  <th>키워드 매칭</th>
                  <th>오류</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      {log.status === "success" ? (
                        log.matched_posts > 0 ? (
                          <span className="badge badge-success">매칭</span>
                        ) : (
                          <span className="badge badge-muted">정상</span>
                        )
                      ) : (
                        <span className="badge badge-danger">오류</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{log.source_name}</span>
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "var(--text-secondary)" }}>
                      {formatDate(log.crawled_at)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {log.status === "success" ? log.total_found : "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {log.status === "success" ? (
                        log.new_posts > 0 ? (
                          <span style={{ color: "var(--primary)", fontWeight: 600 }}>{log.new_posts}</span>
                        ) : (
                          <span style={{ color: "var(--text-secondary)" }}>0</span>
                        )
                      ) : "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {log.status === "success" ? (
                        log.matched_posts > 0 ? (
                          <span style={{ color: "var(--success)", fontWeight: 600 }}>{log.matched_posts}</span>
                        ) : (
                          <span style={{ color: "var(--text-secondary)" }}>0</span>
                        )
                      ) : "-"}
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        color: "var(--danger)",
                        maxWidth: 250,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={log.error_message || undefined}
                    >
                      {log.error_message || ""}
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
