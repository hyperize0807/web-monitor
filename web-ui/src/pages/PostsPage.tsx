import { useEffect, useState } from "react";
import { api, type Post, type Source } from "../api";
import { useToast } from "../components/Toast";

export default function PostsPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<number | undefined>();
  const [filterKeyword, setFilterKeyword] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getPosts({
        source_id: filterSource,
        keyword: filterKeyword || undefined,
        page,
      });
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err) {
      toast.error("게시물을 불러올 수 없습니다.");
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

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const totalPages = Math.ceil(total / 50);

  const formatDate = (d: string) => {
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
        <h1>감지된 게시물</h1>
        <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          총 {total}건
        </span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
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
          <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
            <label>검색</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                placeholder="제목 또는 내용 검색..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button className="btn btn-primary" onClick={handleSearch}>
                검색
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <h3>감지된 게시물이 없습니다</h3>
            <p>모니터링 소스를 등록하면 새 게시물이 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>소스</th>
                  <th>제목</th>
                  <th>작성자</th>
                  <th>요약</th>
                  <th>감지 시각</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="badge badge-muted">{p.source_name}</span>
                    </td>
                    <td>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontWeight: 500 }}
                      >
                        {p.title}
                      </a>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {p.author || "-"}
                    </td>
                    <td
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        maxWidth: 280,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={p.summary || undefined}
                    >
                      {p.summary || "-"}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "var(--text-secondary)" }}>
                      {formatDate(p.detected_at)}
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
