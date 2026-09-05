"use client";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
const publicApiUrl = (path: string) => typeof window !== "undefined" && window.location.hostname === "off-air.github.io" ? `https://yeojeonhi-vtuber-archive.lununs.workers.dev${path}` : path;
async function readResponseJson<T>(response: Response): Promise<T> { return response.json(); }
type RecordComment = {
  id: number;
  record_id: number;
  nickname: string;
  body: string;
  created_at: string;
  status?: "pending" | "approved" | "rejected";
};
export type AdminComment = RecordComment & {
  record_name: string;
  status: "pending" | "approved" | "rejected";
  moderation_source: string;
  moderation_flags: string;
  updated_at: string;
  reviewed_at?: string | null;
};
export type CommentEvent = {
  id: number;
  comment_id: number;
  record_id?: number | null;
  action: "author_deleted" | "admin_deleted";
  reason: string;
  created_at: string;
};



let turnstilePromise: Promise<void> | null = null;
function loadTurnstile() {
  if ((window as Window & { turnstile?: TurnstileApi }).turnstile) return Promise.resolve();
  if (turnstilePromise) return turnstilePromise;
  turnstilePromise = new Promise<void>((resolve, reject) => {
    document.querySelector('script[data-off-air-turnstile="true"]')?.remove();
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.dataset.offAirTurnstile = "true";
    const timer = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("Turnstile unavailable"));
    };
    script.onload = () => { window.clearTimeout(timer); resolve(); };
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error) => { turnstilePromise = null; throw error; });
  return turnstilePromise;
}

type TurnstileApi = {
  render: (element: HTMLElement, options: { sitekey: string; theme: "light"; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; "unsupported-callback": () => void }) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
const commentDeleteStorageKey = "off-air-comment-delete-tokens";

function loadCommentDeleteTokens() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  try {
    const saved = JSON.parse(localStorage.getItem(commentDeleteStorageKey) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([id, token]) => /^\d+$/.test(id) && typeof token === "string")) as Record<string, string>;
  }
  catch { return {}; }
}

export function RecordComments({ recordId, recordName }: { recordId: number; recordName: string }) {
  const [comments, setComments] = useState<RecordComment[]>([]);
  const [mine, setMine] = useState<RecordComment[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nickname, setNickname] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);
  const [deleteTokens, setDeleteTokens] = useState<Record<string, string>>(loadCommentDeleteTokens);
  const refreshMine = useCallback(async () => {
    const entries = Object.entries(loadCommentDeleteTokens());
    const owned: RecordComment[] = [];
    for (let index = 0; index < entries.length; index += 20) {
      const response = await fetch(publicApiUrl("/api/comments/mine"), {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordId, credentials: entries.slice(index, index + 20).map(([id, token]) => ({ id: Number(id), token })) }),
      });
      if (!response.ok) throw new Error("내 댓글을 불러오지 못했습니다.");
      owned.push(...await readResponseJson<RecordComment[]>(response));
    }
    setMine(owned);
  }, [recordId]);
  const widgetHostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const api = () => (window as Window & { turnstile?: TurnstileApi }).turnstile;

  useEffect(() => {
    Promise.all([
      fetch(publicApiUrl(`/api/comments?recordId=${recordId}`)).then((response) => response.ok ? readResponseJson<RecordComment[]>(response) : []),
      fetch(publicApiUrl("/api/runtime")).then((response): Promise<{ commentsEnabled?: boolean; turnstileSiteKey?: string }> => response.ok
        ? readResponseJson<{ commentsEnabled?: boolean; turnstileSiteKey?: string }>(response)
        : Promise.resolve({})),
    ]).then(([receivedComments, runtime]) => {
      setComments(receivedComments);
      setHasMore(receivedComments.length === 20);
      setCommentsEnabled(Boolean(runtime.commentsEnabled));
      setSiteKey(runtime.turnstileSiteKey || "");
    }).catch(() => setNotice("댓글을 불러오지 못했습니다."));
  }, [recordId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshMine().catch(() => setNotice("내 댓글을 불러오지 못했습니다. 잠시 후 다시 열어주세요.")); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshMine]);

  useEffect(() => {
    if (!siteKey) return;
    let active = true;
    loadTurnstile().then(() => { if (active) setTurnstileReady(true); }).catch(() => {
      if (active) { setTurnstileUnavailable(true); setNotice("남겨주신 글은 확인 후 공개됩니다."); }
    });
    return () => { active = false; };
  }, [siteKey]);

  useEffect(() => {
    const turnstile = api();
    if (!turnstileReady || !siteKey || !widgetHostRef.current || widgetIdRef.current || !turnstile) return;
    widgetIdRef.current = turnstile.render(widgetHostRef.current, {
      sitekey: siteKey,
      theme: "light",
      callback: (token) => {
        setTurnstileUnavailable(false);
        setTurnstileToken(token);
        setNotice("");
      },
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => {
        setTurnstileToken("");
        setTurnstileUnavailable(true);
        setNotice("남겨주신 글은 확인 후 공개됩니다.");
      },
      "unsupported-callback": () => {
        setTurnstileUnavailable(true);
        setNotice("남겨주신 글은 확인 후 공개됩니다.");
      },
    });
    return () => {
      if (widgetIdRef.current && api()) api()?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [siteKey, turnstileReady]);

  const resetTurnstile = () => {
    setTurnstileToken("");
    if (widgetIdRef.current) api()?.reset(widgetIdRef.current);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!turnstileToken && !turnstileUnavailable) { setNotice("사람 확인을 완료해주세요."); return; }
    setSubmitting(true);
    const form = event.currentTarget;
    const website = new FormData(form).get("website")?.toString() || "";
    try {
      const response = await fetch(publicApiUrl("/api/comments"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordId, nickname, body, website, turnstileToken }),
      });
      const result = await readResponseJson<{ comment?: RecordComment; deleteToken?: string; error?: string }>(response);
      if (!response.ok || !result.comment || !result.deleteToken) throw new Error(result.error || "댓글을 등록하지 못했습니다.");
      const nextTokens = { ...deleteTokens, [String(result.comment.id)]: result.deleteToken };
      setDeleteTokens(nextTokens);
      let saved = true;
      try { localStorage.setItem(commentDeleteStorageKey, JSON.stringify(nextTokens)); }
      catch { saved = false; }
      setMine((current) => [result.comment as RecordComment, ...current]);
      if (result.comment.status === "approved") {
        setComments((current) => [result.comment as RecordComment, ...current]);
        setNotice("기억을 남겼습니다. 이 기기에서는 직접 삭제할 수 있습니다.");
      } else setNotice("댓글이 접수되었습니다. 관리자가 확인한 뒤 공개됩니다.");
      if (!saved) setNotice("댓글은 접수되었지만 삭제 정보를 저장하지 못했습니다. 창을 닫으면 직접 삭제할 수 없으니, 아래 ‘내가 남긴 글’에서 확인해주세요.");
      setNickname("");
      setBody("");
      form.reset();
      resetTurnstile();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "댓글을 등록하지 못했습니다.");
      resetTurnstile();
    }
    setSubmitting(false);
  };
  const remove = async (comment: RecordComment) => {
    const deleteToken = deleteTokens[String(comment.id)];
    if (!deleteToken || !window.confirm("직접 남긴 댓글을 삭제할까요? 삭제한 내용은 복구할 수 없습니다.")) return;
    try {
      const response = await fetch(publicApiUrl("/api/comments"), {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commentId: comment.id, deleteToken }),
      });
      const result = await readResponseJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "댓글을 삭제하지 못했습니다.");
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setMine((current) => current.filter((item) => item.id !== comment.id));
      const nextTokens = { ...deleteTokens };
      delete nextTokens[String(comment.id)];
      setDeleteTokens(nextTokens);
      try { localStorage.setItem(commentDeleteStorageKey, JSON.stringify(nextTokens)); } catch { /* Already deleted on server. */ }
      setNotice("댓글을 삭제했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "댓글을 삭제하지 못했습니다.");
    }
  };

  return (
    <section className="record-comments" aria-labelledby={`record-comments-${recordId}`}>
      <div className="comment-heading">
        <div><p className="section-no">MEMORIES — MESSAGE</p><h2 id={`record-comments-${recordId}`}>남겨진 기억</h2></div>
        <span>함께 남긴 이야기</span>
      </div>
      <p className="comment-guidance">{recordName}의 활동을 기억하는 짧은 이야기를 남겨주세요. 비방이나 개인정보가 담긴 글은 남기지 말아주세요.</p>
      {commentsEnabled ? (
        <form className="comment-form" onSubmit={submit}>
          <label className="hp-field" aria-hidden="true">웹사이트<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <div className="comment-form-top">
            <label><span>이름</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} required placeholder="표시할 이름" /></label>
            <span>{body.length} / 300</span>
          </div>
          <label><span>기억</span><textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={2} maxLength={300} required rows={4} placeholder="함께 기억하고 싶은 순간을 적어주세요." /></label>
          <div className="comment-submit-row">
            <div ref={widgetHostRef} className="turnstile-host" />
            <button className="primary" type="submit" disabled={submitting || (!turnstileToken && !turnstileUnavailable)}>{submitting ? "등록 중…" : "기억 남기기"}</button>
          </div>
        </form>
      ) : <div className="comment-unavailable">댓글 등록 기능을 준비하고 있습니다. 공개된 기억은 계속 볼 수 있습니다.</div>}
      {notice && <p className="comment-notice" role="status">{notice}</p>}
      {mine.length > 0 && <section className="my-comments" aria-label="내가 남긴 글">
        <h3>내가 남긴 글</h3>
        <p>이 기기에 삭제 정보가 저장된 글입니다.</p>
        <div className="comment-list">{mine.map((comment) => <article key={comment.id}>
          <header><strong>{comment.nickname}</strong><span>{comment.status === "approved" ? "공개됨" : comment.status === "rejected" ? "비공개" : "확인 대기"}</span></header>
          <p>{comment.body}</p><button type="button" onClick={() => remove(comment)}>내 댓글 삭제</button>
        </article>)}</div>
      </section>}
      {comments.length ? (
        <div className="comment-list">
          {comments.map((comment) => (
            <article key={comment.id}>
              <header><strong>{comment.nickname}</strong><time>{new Date(comment.created_at).toLocaleDateString("ko-KR")}</time></header>
              <p>{comment.body}</p>
              {deleteTokens[String(comment.id)] && <button type="button" onClick={() => remove(comment)}>내 댓글 삭제</button>}
            </article>
          ))}
        </div>
      ) : <div className="comment-empty">아직 남겨진 이야기가 없습니다. 첫 번째 기억을 건네주세요.</div>}
      {hasMore && <button className="secondary comments-more" disabled={loadingMore} onClick={async () => {
        setLoadingMore(true);
        try {
          const response = await fetch(publicApiUrl(`/api/comments?recordId=${recordId}&before=${comments[comments.length - 1]?.id}`));
          if (!response.ok) throw new Error();
          const next = await readResponseJson<RecordComment[]>(response);
          setComments((current) => [...current, ...next.filter((item) => !current.some((old) => old.id === item.id))]);
          setHasMore(next.length === 20);
        } catch { setNotice("댓글을 불러오지 못했습니다. 다시 시도해주세요."); }
        finally { setLoadingMore(false); }
      }}>{loadingMore ? "불러오는 중…" : "이전 기억 더 보기"}</button>}
    </section>
  );
}

export function CommentQueue({
  comments: initialComments,
  token,
  events,
  update,
  remove,
}: {
  comments: AdminComment[];
  token: string;
  events: CommentEvent[];
  update: (id: number, status: AdminComment["status"]) => void;
  remove: (id: number) => void;
}) {
  const [status, setStatus] = useState<AdminComment["status"]>("pending");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [comments, setComments] = useState(initialComments);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const requestVersion = useRef(0);
  const load = useCallback(async (before?: number) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/comments?status=${status}&sort=${sort}${before ? `&before=${before}` : ""}`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error();
      const data = await readResponseJson<{ comments: AdminComment[]; hasMore: boolean; counts: Record<string, number> }>(response);
      if (version !== requestVersion.current) return;
      setCounts(data.counts);
      setComments((current) => before ? [...current, ...data.comments.filter((item) => !current.some((old) => old.id === item.id))] : data.comments);
      setHasMore(data.hasMore);
    } catch { if (version === requestVersion.current) setError("댓글을 불러오지 못했습니다. 다시 시도해주세요."); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [status, sort, token]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      // This is a request generation counter, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestVersion.current++;
    };
  }, [load, initialComments]);
  const visible = comments.filter((comment) => comment.status === status).sort((a, b) => {
    const difference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return sort === "newest" ? difference : -difference;
  });
  const count = (value: AdminComment["status"]) => counts[value] || 0;
  const flags = (comment: AdminComment) => {
    try {
      const parsed = JSON.parse(comment.moderation_flags || "[]") as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch { return []; }
  };
  return (
    <section className="comment-queue">
      <div className="section-heading">
        <div><p className="section-no">COMMENTS — REVIEW</p><h2>댓글 검토</h2></div>
        <p>검토 대기 {count("pending")}건</p>
      </div>
      <div className="submission-tools">
        <div className="submission-tabs" role="tablist" aria-label="댓글 처리함 선택">
          <button className={status === "pending" ? "active" : ""} onClick={() => setStatus("pending")} role="tab" aria-selected={status === "pending"}>검토 대기 <span>{count("pending")}</span></button>
          <button className={status === "approved" ? "active" : ""} onClick={() => setStatus("approved")} role="tab" aria-selected={status === "approved"}>공개 댓글 <span>{count("approved")}</span></button>
          <button className={status === "rejected" ? "active" : ""} onClick={() => setStatus("rejected")} role="tab" aria-selected={status === "rejected"}>비공개 댓글 <span>{count("rejected")}</span></button>
        </div>
        <label>정렬<select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")}><option value="newest">최신 등록순</option><option value="oldest">오래된 등록순</option></select></label>
      </div>
      {error && <p role="alert">{error}<button onClick={() => void load()}>다시 시도</button></p>}
      {visible.length ? (
        <div className="admin-comment-list">
          {visible.map((comment) => (
            <article key={comment.id}>
              <header><div><span>{comment.record_name}</span><strong>{comment.nickname}</strong></div><time>{new Date(comment.created_at).toLocaleString("ko-KR")}</time></header>
              <p>{comment.body}</p>
              <div className="comment-review-meta">
                <span>검토: {comment.moderation_source === "openai" ? "자동 검토" : comment.moderation_source === "local" ? "기본 필터" : comment.moderation_source === "manual" ? "관리자" : "관리자 확인 필요"}</span>
                {flags(comment).map((flag) => <em key={flag}>{flag}</em>)}
              </div>
              <div className="comment-review-actions">
                <button className="danger" type="button" onClick={() => remove(comment.id)}>영구 삭제</button>
                {status !== "pending" && <button className="secondary" type="button" onClick={() => update(comment.id, "pending")}>다시 검토</button>}
                {status !== "rejected" && <button className="secondary" type="button" onClick={() => update(comment.id, "rejected")}>비공개</button>}
                {status !== "approved" && <button className="primary" type="button" onClick={() => update(comment.id, "approved")}>공개 승인</button>}
              </div>
            </article>
          ))}
        </div>
      ) : <div className="empty"><b>{status === "pending" ? "검토할 댓글이 없습니다." : status === "approved" ? "공개된 댓글이 없습니다." : "비공개 댓글이 없습니다."}</b></div>}
      {hasMore && <button className="secondary comments-more" disabled={loading} onClick={() => void load(comments[comments.length - 1]?.id)}>{loading ? "불러오는 중…" : "댓글 더 보기"}</button>}
      <details className="comment-events">
        <summary>최근 삭제 기록 {events.length}건</summary>
        {events.length ? <ul>{events.map((event) => <li key={event.id}><span>{event.action === "author_deleted" ? "작성자 삭제" : "관리자 삭제"}</span><b>댓글 #{event.comment_id}</b><time>{new Date(event.created_at).toLocaleString("ko-KR")}</time></li>)}</ul> : <p>삭제 기록이 없습니다.</p>}
      </details>
    </section>
  );
}
