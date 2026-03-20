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
  const [matchedOnly, setMatchedOnly] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getPosts({
        source_id: filterSource,
        keyword: filterKeyword || undefined,
        matched_only: matchedOnly,
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
  }, [page, filterSource, matchedOnly]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const totalPages = Math.ceil(total / 50);

  const formatDate = (d: string) => {
    const date = new Date(d + "Z");
    return date.toLocaleString("ko-KR", {
      year: "numeric",
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
        <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
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
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
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
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              userSelect: "none",
              paddingBottom: 2,
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              checked={matchedOnly}
              onChange={() => {
                setMatchedOnly((v) => !v);
                setPage(1);
              }}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 13, fontWeight: 500 }}>키워드 매칭만</span>
          </label>
        </div>
      </div>

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
        <div className="post-list">
          {posts.map((p) => (
            <div key={p.id} className="card post-card">
              <div className="card-body">
                <div className="post-card-header">
                  <div className="post-card-meta">
                    <span className="badge badge-muted">{p.source_name}</span>
                    {p.author && (
                      <span className="post-author">{p.author}</span>
                    )}
                    <span className="post-date">{formatDate(p.detected_at)}</span>
                  </div>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="post-card-title"
                >
                  {p.title}
                </a>
                {p.summary && (
                  <div className="post-card-summary">
                    {p.summary.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
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
    </>
  );
}
