import { useEffect, useState } from "react";
import { api, type Source, type AnalyzeResult } from "../api";
import { useToast } from "../components/Toast";

interface SourceForm {
  name: string;
  url: string;
  type: "html" | "rss";
  interval_minutes: number;
  keywords: string;
  selectors: {
    row: string;
    title: string;
    link: string;
    linkAttr: string;
    author: string;
    postId: string;
    postIdAttr: string;
    useBrowser: boolean;
  };
}

const emptyForm: SourceForm = {
  name: "",
  url: "",
  type: "html",
  interval_minutes: 5,
  keywords: "",
  selectors: { row: "", title: "", link: "", linkAttr: "href", author: "", postId: "", postIdAttr: "", useBrowser: false },
};

export default function SourcesPage() {
  const toast = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SourceForm>(emptyForm);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<AnalyzeResult["preview"] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.getSources();
      setSources(data);
    } catch (err) {
      toast.error("소스 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPreview(null);
    setShowModal(true);
  };

  const openEdit = (s: Source) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      url: s.url,
      type: s.type,
      interval_minutes: s.interval_minutes,
      keywords: s.keywords.join(", "),
      selectors: {
        row: s.selectors.row || "",
        title: s.selectors.title || "",
        link: s.selectors.link || "",
        linkAttr: s.selectors.linkAttr || "href",
        author: s.selectors.author || "",
        postId: s.selectors.postId || "",
        postIdAttr: s.selectors.postIdAttr || "",
        useBrowser: !!s.selectors.useBrowser,
      },
    });
    setPreview(null);
    setShowModal(true);
  };

  const handleAnalyze = async () => {
    if (!form.url) {
      toast.error("URL을 먼저 입력해주세요.");
      return;
    }
    if (!form.selectors.row) {
      toast.error("게시물 행(row) 셀렉터를 먼저 입력해주세요.");
      return;
    }
    setAnalyzing(true);
    setPreview(null);
    try {
      const result = await api.analyzeSelectors(form.url, form.selectors.row, form.selectors.useBrowser);
      setForm((f) => ({
        ...f,
        selectors: {
          ...f.selectors,
          title: result.title,
          link: result.link,
          linkAttr: result.linkAttr || "href",
          author: result.author || "",
          postId: result.postId || "",
          postIdAttr: result.postIdAttr || "",
        },
      }));
      setPreview(result.preview);
      if (result.preview.length > 0) {
        toast.success(`${result.preview.length}개 게시물이 감지되었습니다.`);
      } else {
        toast.error("게시물을 감지하지 못했습니다. row 셀렉터를 다시 확인해주세요.");
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith("BLOCKED:")) {
        toast.error(msg.replace("BLOCKED: ", ""), 8000);
      } else {
        toast.error("분석 실패: " + msg);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.url) {
      toast.error("이름과 URL은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const keywords = form.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const data = {
        name: form.name,
        url: form.url,
        type: form.type,
        interval_minutes: form.interval_minutes,
        keywords,
        selectors: form.type === "html" ? form.selectors : {},
        enabled: true,
      };

      if (editingId) {
        await api.updateSource(editingId, data);
        toast.success("소스가 수정되었습니다.");
      } else {
        await api.createSource(data);
        toast.success("소스가 등록되었습니다.");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error("저장 실패: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await api.deleteSource(id);
      toast.success("소스가 삭제되었습니다.");
      load();
    } catch (err) {
      toast.error("삭제 실패: " + (err as Error).message);
    }
  };

  const handleToggle = async (s: Source) => {
    try {
      await api.updateSource(s.id, { ...s, enabled: !s.enabled });
      toast.success(s.enabled ? "모니터링이 중지되었습니다." : "모니터링이 시작되었습니다.");
      load();
    } catch (err) {
      toast.error("변경 실패");
    }
  };

  const handleCrawl = async (id: number) => {
    try {
      await api.triggerCrawl(id);
      toast.success("크롤링이 실행되었습니다.");
    } catch (err) {
      toast.error("크롤링 실패: " + (err as Error).message);
    }
  };

  const handleLoginBrowser = async () => {
    if (!form.url) {
      toast.error("URL을 먼저 입력해주세요.");
      return;
    }
    try {
      const result = await api.openLoginBrowser(form.url);
      toast.success(result.message, 6000);
    } catch (err) {
      toast.error("브라우저 열기 실패: " + (err as Error).message);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>모니터링 소스</h1>
        <button className="btn btn-primary" onClick={openNew}>
          + 새 소스 등록
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
        </div>
      ) : sources.length === 0 ? (
        <div className="empty-state">
          <h3>등록된 소스가 없습니다</h3>
          <p>모니터링할 웹사이트를 등록해보세요.</p>
          <button className="btn btn-primary" onClick={openNew}>
            + 새 소스 등록
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>상태</th>
                  <th>이름</th>
                  <th>URL</th>
                  <th>유형</th>
                  <th>주기</th>
                  <th>키워드</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span
                        className={`status-dot ${s.enabled ? "on" : "off"}`}
                        title={s.enabled ? "활성" : "비활성"}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate"
                        style={{ display: "inline-block", maxWidth: 220 }}
                      >
                        {s.url}
                      </a>
                    </td>
                    <td>
                      <span className="badge badge-info">{s.type.toUpperCase()}</span>
                    </td>
                    <td>{s.interval_minutes}분</td>
                    <td>
                      <div className="keyword-tags">
                        {s.keywords.length > 0
                          ? s.keywords.map((kw) => (
                              <span key={kw} className="keyword-tag">
                                {kw}
                              </span>
                            ))
                          : <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>전체</span>}
                      </div>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm"
                          onClick={() => handleToggle(s)}
                          title={s.enabled ? "중지" : "시작"}
                        >
                          {s.enabled ? "중지" : "시작"}
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleCrawl(s.id)}
                          title="지금 크롤링"
                        >
                          실행
                        </button>
                        <button className="btn btn-sm" onClick={() => openEdit(s)}>
                          수정
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(s.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? "소스 수정" : "새 소스 등록"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>이름</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="예: 뽐뿌 핫딜"
                  />
                </div>
                <div className="form-group">
                  <label>유형</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value as "html" | "rss" }))
                    }
                  >
                    <option value="html">HTML (게시판)</option>
                    <option value="rss">RSS</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>URL</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://example.com/board"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>키워드</label>
                  <input
                    value={form.keywords}
                    onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                    placeholder="키워드1, 키워드2, ..."
                  />
                  <div className="form-hint">쉼표로 구분. 비워두면 모든 새 게시물 감지.</div>
                </div>
                <div className="form-group">
                  <label>크롤링 주기 (분)</label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={form.interval_minutes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        interval_minutes: Math.max(1, Number(e.target.value)),
                      }))
                    }
                  />
                  <div className="form-hint">기본 5분. 사이트에 따라 조절하세요.</div>
                </div>
              </div>

              {form.type === "html" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>CSS 셀렉터</span>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={form.selectors.useBrowser}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            selectors: { ...f.selectors, useBrowser: e.target.checked },
                          }))
                        }
                      />
                      브라우저 렌더링 사용
                      {form.selectors.useBrowser && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={handleLoginBrowser}
                          style={{ marginLeft: 4 }}
                          title="네이버 등 로그인이 필요한 사이트에서 브라우저를 열어 직접 로그인합니다"
                        >
                          로그인
                        </button>
                      )}
                    </label>
                  </div>
                  {form.selectors.useBrowser && (
                    <div className="form-hint" style={{ marginBottom: 10 }}>
                      JS 렌더링이 필요하거나 로그인이 필요한 사이트에 사용합니다.
                      로그인이 필요한 경우 "로그인" 버튼으로 브라우저 창을 열어 직접 로그인하세요.
                    </div>
                  )}
                  <div className="form-group">
                    <label>게시물 행 (row)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={form.selectors.row}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            selectors: { ...f.selectors, row: e.target.value },
                          }))
                        }
                        placeholder="예: table.board-list tbody tr"
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {analyzing ? (
                          <>
                            <span className="spinner" /> 분석중...
                          </>
                        ) : (
                          "AI 분석"
                        )}
                      </button>
                    </div>
                    <div className="form-hint">
                      row 셀렉터 입력 후 "AI 분석"을 누르면 나머지 셀렉터를 자동으로 채웁니다.
                    </div>
                  </div>
                  <div className="form-group">
                    <label>제목 (title)</label>
                    <input
                      value={form.selectors.title}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          selectors: { ...f.selectors, title: e.target.value },
                        }))
                      }
                      placeholder="예: td.title a"
                    />
                  </div>
                  <div className="form-group">
                    <label>링크 (link)</label>
                    <input
                      value={form.selectors.link}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          selectors: { ...f.selectors, link: e.target.value },
                        }))
                      }
                      placeholder="예: td.title a"
                    />
                  </div>
                  <div className="form-group">
                    <label>작성자 (author)</label>
                    <input
                      value={form.selectors.author}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          selectors: { ...f.selectors, author: e.target.value },
                        }))
                      }
                      placeholder="예: td.author (선택사항)"
                    />
                  </div>
                  <div className="form-group">
                    <label>게시글 ID (postId)</label>
                    <input
                      value={form.selectors.postId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          selectors: { ...f.selectors, postId: e.target.value },
                        }))
                      }
                      placeholder="예: td.no (선택사항)"
                    />
                    <div className="form-hint">게시글 고유번호 셀렉터. 중복 알림 방지에 사용됩니다.</div>
                  </div>
                  <div className="form-group">
                    <label>게시글 ID 속성 (postIdAttr)</label>
                    <input
                      value={form.selectors.postIdAttr}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          selectors: { ...f.selectors, postIdAttr: e.target.value },
                        }))
                      }
                      placeholder="예: data-id (비워두면 텍스트 사용)"
                    />
                    <div className="form-hint">속성에서 ID를 가져올 경우 지정. 보통 비워둡니다.</div>
                  </div>
                </>
              )}

              {preview && preview.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    미리보기 ({preview.length}건)
                  </div>
                  <div className="preview-list">
                    {preview.map((p, i) => (
                      <div key={i} className="preview-item">
                        {p.postId && <span className="badge badge-info" style={{ marginRight: 6 }}>#{p.postId}</span>}
                        <a href={p.url} target="_blank" rel="noreferrer">
                          {p.title}
                        </a>
                        {p.author && <span className="author"> - {p.author}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "저장중..." : editingId ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
