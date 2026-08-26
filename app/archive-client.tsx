"use client";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

type View = "home" | "submit" | "admin" | "privacy";
type DialogOrigin = { x: number; y: number; scale: number };
type GalleryImage = {
  id: number;
  record_id: number;
  object_key: string;
  thumbnail_key?: string;
  caption?: string;
  memory_date?: string;
  source_url?: string;
};
export type Person = {
  id: number;
  name: string;
  handle: string;
  affiliation?: string;
  avatar_key?: string;
  initial: string;
  color: string;
  debut: string;
  last: string;
  category: string;
  activity_status?: string;
  gallery?: GalleryImage[];
  note: string;
  bio: string;
  graduation_message?: string;
  tags: string[];
  memories: number;
  published?: boolean | number;
};
type Submission = {
  id: number;
  submission_type: string;
  creator_name: string;
  channel_url: string;
  message: string;
  source_url?: string;
  status: string;
  created_at: string;
  images?: SubmissionImage[];
};
type SubmissionImage = {
  id: number;
  submission_id: number;
  object_key: string;
  thumbnail_key: string;
  caption: string;
  memory_date?: string;
  source_url?: string;
  published_gallery_id?: number | null;
};
type DeletedImage = {
  id: number;
  deletion_group: string;
  record_name: string;
  image_kind: string;
  object_key: string;
  deleted_at: string;
};

async function readResponseJson<T>(response: Response): Promise<T> {
  return await response.json() as T;
}

const publicApiUrl = (path: string) =>
  typeof window !== "undefined" && window.location.hostname === "off-air.github.io"
    ? `https://yeojeonhi-vtuber-archive.lununs.workers.dev${path}`
    : path;

const originalPeople: Person[] = [
  {
    id: 1,
    name: "유노하라 모리",
    handle: "@morino_yuno",
    initial: "森",
    color: "#879487",
    debut: "2020. 05. 12",
    last: "2023. 08. 17",
    category: "개인",
    note: "숲의 밤을 닮은 목소리로, 늦은 시간의 이야기를 건넸습니다.",
    bio: "잔잔한 게임과 심야 잡담을 중심으로 활동했습니다. 별일 없던 하루도 특별한 기록으로 남기는 따뜻한 방송을 이어갔습니다.",
    tags: ["잡담", "게임", "심야방송"],
    memories: 248,
  },
  {
    id: 2,
    name: "아마세 루카",
    handle: "@amase_luca",
    initial: "流",
    color: "#718096",
    debut: "2019. 02. 24",
    last: "2022. 11. 03",
    category: "소속",
    note: "노래와 그림, 조용한 잡담 방송의 순간들이 남아 있습니다.",
    bio: "직접 그린 그림과 어쿠스틱 노래를 함께 나누던 크리에이터입니다. 계절마다 작은 온라인 전시를 열었습니다.",
    tags: ["노래", "그림", "잡담"],
    memories: 391,
  },
  {
    id: 3,
    name: "호시노 네네",
    handle: "@nene_starlit",
    initial: "星",
    color: "#9290a1",
    debut: "2021. 07. 07",
    last: "2024. 01. 21",
    category: "개인",
    note: "별을 읽고 게임을 하며, 새벽의 시간을 함께 보냈습니다.",
    bio: "천문 이야기를 곁들인 게임 방송으로 알려졌습니다. 매주 일요일에는 시청자와 한 주의 밤하늘을 돌아보았습니다.",
    tags: ["게임", "천문", "라디오"],
    memories: 174,
  },
  {
    id: 4,
    name: "사사키 유라",
    handle: "@yura_sasaki",
    initial: "結",
    color: "#9c8f83",
    debut: "2018. 10. 09",
    last: "2021. 06. 14",
    category: "소속",
    note: "작은 노래와 다정한 인사로 수많은 저녁을 이어주었습니다.",
    bio: "짧은 노래 방송과 사연 라디오를 진행했습니다. 방송을 끝낼 때마다 “오늘도 잘 머물렀어요”라는 인사를 남겼습니다.",
    tags: ["노래", "라디오", "사연"],
    memories: 526,
  },
  {
    id: 5,
    name: "미즈키 아오",
    handle: "@ao_mizuki",
    initial: "水",
    color: "#7f9296",
    debut: "2022. 03. 30",
    last: "2024. 09. 02",
    category: "개인",
    note: "느린 게임과 긴 이야기를 좋아했던 푸른 목소리의 기록입니다.",
    bio: "인디 게임을 천천히 플레이하며 장면과 음악을 오래 이야기했습니다. 방송 후 남긴 짧은 감상문도 함께 기억됩니다.",
    tags: ["인디게임", "리뷰", "잡담"],
    memories: 119,
  },
  {
    id: 6,
    name: "코하루 린",
    handle: "@koharu_rin",
    initial: "春",
    color: "#a09187",
    debut: "2020. 04. 18",
    last: "2023. 03. 28",
    category: "소속",
    note: "봄처럼 가벼운 웃음으로 평범한 하루를 환하게 만들었습니다.",
    bio: "리듬 게임과 밝은 아침 방송을 중심으로 활동했습니다. 팬들이 보낸 하루의 작은 목표를 함께 응원했습니다.",
    tags: ["리듬게임", "아침방송", "잡담"],
    memories: 307,
  },
  {
    id: 7,
    name: "츠키시로 레이",
    handle: "@rei_tsukishiro",
    initial: "月",
    color: "#858b99",
    debut: "2019. 12. 01",
    last: "2022. 08. 19",
    category: "개인",
    note: "낮은 목소리로 읽어주던 이야기와 달빛 같은 음악이 남았습니다.",
    bio: "고전 문학 낭독과 피아노 연주를 결합한 방송을 선보였습니다. 월말마다 한 편의 긴 이야기를 완독했습니다.",
    tags: ["낭독", "피아노", "문학"],
    memories: 462,
  },
  {
    id: 8,
    name: "나나세 토와",
    handle: "@towa_nanase",
    initial: "永",
    color: "#8c968a",
    debut: "2021. 09. 17",
    last: "2024. 05. 11",
    category: "개인",
    note: "여행하지 않는 여행 방송, 지도 위의 수많은 밤을 기억합니다.",
    bio: "온라인 지도와 시청자의 사연으로 세계를 걷는 독특한 방송을 만들었습니다. 매 방송마다 한 장의 엽서를 남겼습니다.",
    tags: ["여행", "지도", "사연"],
    memories: 201,
  },
];

const parseArchiveDate = (value: string) => {
  const date = value.trim();
  const compact = date.match(/^([0-9]{4})([0-9]{2})([0-9]{2})$/);
  const separated = date.match(/^([0-9]{4})\D+([0-9]{1,2})\D+([0-9]{1,2})\D*$/);
  const parts = compact || separated;
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) return null;
  return parsed;
};
const daysAgo = (date: string) => {
  const parsed = parseArchiveDate(date);
  if (!parsed) return null;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86400000));
};
const formattedArchiveDate = (date: string) => {
  const parsed = parseArchiveDate(date);
  if (!parsed) return date || "확인 필요";
  return `${parsed.getFullYear()}. ${String(parsed.getMonth() + 1).padStart(2, "0")}. ${String(parsed.getDate()).padStart(2, "0")}`;
};
const yearsText = (date: string) => {
  const days = daysAgo(date);
  if (days === null) return "날짜 확인 필요";
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return y ? `${y}년 ${m ? `${m}개월` : ""}`.trim() : `${m}개월`;
};
const statusText = (person: Person) =>
  person.activity_status || "소식이 끊긴 버튜버";
const activityStatuses = [
  "공식적으로 활동 종료한 버튜버",
  "소식이 끊긴 버튜버",
  "무기한 휴식기에 들어간 버튜버",
] as const;
const statusToneClass = (status: string) => {
  if (status === "공식적으로 활동 종료한 버튜버") return "status-official";
  if (status === "무기한 휴식기에 들어간 버튜버") return "status-hiatus";
  return "status-silent";
};

async function resizeForUpload(file: File, maxWidth: number, quality: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("이미지 변환 실패")), "image/webp", quality),
  );
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const index = text.toLocaleLowerCase("ko").indexOf(needle.toLocaleLowerCase("ko"));
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + needle.length)}</mark>{text.slice(index + needle.length)}</>;
}

function ProgressiveImage({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={`progressive-image ${loaded ? "loaded" : "loading"}`}>
      <span className="image-placeholder" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(true)} />
    </span>
  );
}

function recordIdFromLocation(value: string): number | null {
  const [path, rawQuery = ""] = value.split("?");
  const queryId = Number(new URLSearchParams(rawQuery).get("record"));
  if (Number.isInteger(queryId) && queryId > 0) return queryId;
  const pathId = Number(path.match(/^\/records\/(\d+)$/)?.[1]);
  return Number.isInteger(pathId) && pathId > 0 ? pathId : null;
}

function viewFromPath(value: string): View {
  const path = value.split("?")[0];
  const name = path.slice(1);
  return ["submit", "admin", "privacy"].includes(name)
    ? (name as View)
    : "home";
}

export default function Home({
  initialPath = "/",
  initialPeople = null,
}: {
  initialPath?: string;
  initialPeople?: Person[] | null;
}) {
  const [view, setView] = useState<View>(() => viewFromPath(initialPath));
  const [people, setPeople] = useState<Person[]>(initialPeople || []);
  const initialRecordId = recordIdFromLocation(initialPath) || 1;
  const [selected, setSelected] = useState<Person>(
    () =>
      initialPeople?.find((p) => p.id === initialRecordId) ||
      originalPeople.find((p) => p.id === initialRecordId) ||
      initialPeople?.[0] ||
      originalPeople[0],
  );
  const [detailOpen, setDetailOpen] = useState(
    () => recordIdFromLocation(initialPath) !== null,
  );
  const [dialogOrigin, setDialogOrigin] = useState<DialogOrigin>({
    x: 0,
    y: 0,
    scale: 0.72,
  });
  const [recordStatus, setRecordStatus] = useState<
    "loading" | "ready" | "error"
  >(initialPeople ? "ready" : "loading");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [statusFilters, setStatusFilters] = useState<string[]>([
    ...activityStatuses,
  ]);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [pageSize, setPageSize] = useState<5 | 10 | 15 | 20>(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [remembered, setRemembered] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("yeojeonhi-remembered") || "[]");
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adminDeployment, setAdminDeployment] = useState(false);
  const [adminDirty, setAdminDirty] = useState(false);
  useEffect(() => {
    fetch(publicApiUrl("/api/runtime"))
      .then((response) => response.ok ? readResponseJson<{ adminDeployment: boolean }>(response) : { adminDeployment: false })
      .then((runtime) => setAdminDeployment(runtime.adminDeployment))
      .catch(() => setAdminDeployment(false));
  }, []);
  useEffect(() => {
    if (initialPeople) return;
    fetch(publicApiUrl("/api/records"))
      .then((r) => {
        if (!r.ok) throw new Error();
        return readResponseJson<Person[]>(r);
      })
      .then((data) => {
        setPeople(data);
        setRecordStatus("ready");
      })
      .catch(() => setRecordStatus("error"));
  }, [initialPeople]);
  useEffect(() => {
    if (view !== "home")
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);
  useEffect(() => {
    if (!matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
        document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
      });
    };
    addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", move);
    };
  }, []);
  useEffect(() => {
    const applyLocation = () => {
      const path = location.pathname;
      const id = recordIdFromLocation(`${path}${location.search}`);
      if (id !== null) {
        const found = people.find((p) => p.id === id);
        if (found) {
          setSelected(found);
          setDetailOpen(true);
          setView("home");
          if (/^\/records\/\d+$/.test(path) && location.hostname === "off-air.github.io")
            history.replaceState(history.state, "", `/?record=${id}`);
        } else if (recordStatus === "ready") {
          setDetailOpen(false);
          setView("home");
        }
      } else if (["/submit", "/admin", "/privacy"].includes(path)) {
        setDetailOpen(false);
        setView(path.slice(1) as View);
      } else {
        setDetailOpen(false);
        setView("home");
      }
    };
    const timer = setTimeout(applyLocation, 0);
    addEventListener("popstate", applyLocation);
    return () => {
      clearTimeout(timer);
      removeEventListener("popstate", applyLocation);
    };
  }, [people, recordStatus]);
  const closePerson = useCallback(() => {
    if (history.state?.recordOverlay) history.back();
    else {
      history.replaceState(null, "", "/");
      setDetailOpen(false);
    }
  }, []);
  const go = (next: View) => {
    if (view === "admin" && next !== "admin" && adminDirty) {
      if (!window.confirm("저장하지 않은 변경 사항이 있습니다. 저장하지 않고 관리 화면을 나갈까요?")) return;
      setAdminDirty(false);
    }
    if (next === "home" && detailOpen) {
      closePerson();
      return;
    }
    if (next === "home") {
      setQuery("");
      setSort("recent");
    }
    setDetailOpen(false);
    setView(next);
    history.pushState(null, "", next === "home" ? "/" : `/${next}`);
  };
  const openPerson = (p: Person, rect: DOMRect) => {
    const panelWidth = Math.min(1040, window.innerWidth - 48);
    setDialogOrigin({
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: rect.top + rect.height / 2 - window.innerHeight / 2,
      scale: Math.max(0.24, Math.min(0.72, rect.width / panelWidth)),
    });
    setSelected(p);
    setView("home");
    setDetailOpen(true);
    history.pushState({ recordOverlay: true }, "", `/?record=${p.id}`);
  };
  const transitionLayout = (update: () => void) => {
    const animatedDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };
    if (
      animatedDocument.startViewTransition &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    ) animatedDocument.startViewTransition(() => flushSync(update));
    else update();
  };
  const remember = async (id: number) => {
    const isAdding = !remembered.includes(id);
    const next = isAdding
      ? [...remembered, id]
      : remembered.filter((x) => x !== id);
    let visitorId = localStorage.getItem("yeojeonhi-visitor");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("yeojeonhi-visitor", visitorId);
    }
    try {
      const response = await fetch(publicApiUrl("/api/remembrance"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordId: id, visitorId, remember: isAdding }),
      });
      if (!response.ok) throw new Error();
      const data = await readResponseJson<{ memories: number }>(response);
      setPeople((current) =>
        current.map((p) =>
          p.id === id ? { ...p, memories: data.memories } : p,
        ),
      );
      setSelected((current) =>
        current.id === id ? { ...current, memories: data.memories } : current,
      );
      setRemembered(next);
      localStorage.setItem("yeojeonhi-remembered", JSON.stringify(next));
      setToast(
        isAdding ? "이 기록을 기억함에 담았습니다." : "기억함에서 꺼냈습니다.",
      );
    } catch {
      setToast("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
    setTimeout(() => setToast(""), 2200);
  };
  const list = useMemo(
    () =>
      people
        .filter((p) => statusFilters.includes(statusText(p)))
        .filter((p) =>
          ([p.name, p.affiliation, p.category, p.note, p.bio, ...p.tags].filter(Boolean).join(" "))
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "oldest"
            ? (daysAgo(b.last) ?? -1) - (daysAgo(a.last) ?? -1)
            : sort === "name"
              ? a.name.localeCompare(b.name, "ko")
              : (daysAgo(a.last) ?? Number.MAX_SAFE_INTEGER) -
                (daysAgo(b.last) ?? Number.MAX_SAFE_INTEGER),
        ),
    [people, query, sort, statusFilters],
  );
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const pagedList = list.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const submitForm = async (e: FormEvent, selectedFiles: File[]): Promise<boolean> => {
    e.preventDefault();
    if (submitting) return false;
    setSubmitting(true);
    const form = e.target as HTMLFormElement;
    const fields = new FormData(form);
    try {
      fields.delete("images");
      selectedFiles.forEach((file) => fields.append("images", file));
      const thumbnails = await Promise.all(selectedFiles.map((file) => resizeForUpload(file, 480, 0.76)));
      thumbnails.forEach((thumbnail) => fields.append("thumbnails", thumbnail));
      const response = await fetch(publicApiUrl("/api/submissions"), {
        method: "POST",
        body: fields,
      });
      const data = await readResponseJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error);
      form.reset();
      setToast("제보가 안전하게 접수되었습니다.");
      setSubmitting(false);
      setTimeout(() => setToast(""), 2600);
      return true;
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "제보를 접수하지 못했습니다.",
      );
    }
    setSubmitting(false);
    setTimeout(() => setToast(""), 2600);
    return false;
  };
  return (
    <main>
      <div className="pointer-aura" aria-hidden="true" />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      <div id="site-shell" className="site-shell" aria-hidden={detailOpen || undefined}>
      <Header view={view} go={go} />
      <div className="view-transition" key={view}>
      {view === "home" && (
        <Archive
          list={pagedList}
          total={list.length}
          status={recordStatus}
          query={query}
          setQuery={(value) => { setQuery(value); setCurrentPage(1); }}
          sort={sort}
          setSort={(value) => transitionLayout(() => { setSort(value); setCurrentPage(1); })}
          statusFilters={statusFilters}
          toggleStatus={(value) => transitionLayout(() => {
            setStatusFilters((current) =>
              current.includes(value)
                ? current.filter((status) => status !== value)
                : [...current, value],
            );
            setCurrentPage(1);
          })}
          layout={layout}
          setLayout={(value) => transitionLayout(() => setLayout(value))}
          pageSize={pageSize}
          setPageSize={(value) => transitionLayout(() => { setPageSize(value); setCurrentPage(1); })}
          currentPage={currentPage}
          pageCount={pageCount}
          setCurrentPage={(value) => transitionLayout(() => setCurrentPage(value))}
          open={openPerson}
        />
      )}
      {view === "submit" && <Submit onSubmit={submitForm} submitting={submitting} />}{" "}
      {view === "admin" && (
        <Admin people={people} setPeople={setPeople} showToast={setToast} trustedAccess={adminDeployment} onDirtyChange={setAdminDirty} />
      )}{" "}
      {view === "privacy" && <Privacy />}
      </div>
      <Footer go={go} adminDeployment={adminDeployment} />
      </div>
      {detailOpen && recordStatus === "ready" && (
        <RecordDialog person={selected} origin={dialogOrigin} close={closePerson}>
          <Detail
            key={selected.id}
            person={selected}
            back={closePerson}
            remembered={remembered.includes(selected.id)}
            remember={() => remember(selected.id)}
            modal
            titleId={`record-dialog-title-${selected.id}`}
          />
        </RecordDialog>
      )}
    </main>
  );
}

function Header({ view, go }: { view: View; go: (v: View) => void }) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const update = () => setCompact(window.scrollY > 28);
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);
  return (
    <header className={`site-header ${compact ? "compact" : ""}`}>
      <button className="wordmark" onClick={() => go("home")}>
        OFF<span>–</span>AIR
      </button>
      <nav aria-label="주요 메뉴">
        <button
          className={view === "home" ? "active" : ""}
          onClick={() => go("home")}
        >
          기록
        </button>
        <button
          className={view === "submit" ? "active" : ""}
          onClick={() => go("submit")}
        >
          제보
        </button>
      </nav>
    </header>
  );
}
function Archive({
  list,
  total,
  status,
  query,
  setQuery,
  sort,
  setSort,
  statusFilters,
  toggleStatus,
  layout,
  setLayout,
  pageSize,
  setPageSize,
  currentPage,
  pageCount,
  setCurrentPage,
  open,
}: {
  list: Person[];
  total: number;
  status: "loading" | "ready" | "error";
  query: string;
  setQuery: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  statusFilters: string[];
  toggleStatus: (v: string) => void;
  layout: "grid" | "list";
  setLayout: (v: "grid" | "list") => void;
  pageSize: 5 | 10 | 15 | 20;
  setPageSize: (v: 5 | 10 | 15 | 20) => void;
  currentPage: number;
  pageCount: number;
  setCurrentPage: (v: number) => void;
  open: (p: Person, rect: DOMRect) => void;
}) {
  return (
    <section className="records" id="records">
      <div className="section-heading">
        <div>
          <p className="section-no">OFF–AIR ARCHIVE</p>
          <h1>기록</h1>
        </div>
      </div>
      {status === "loading" ? (
        <div className="empty" role="status">
          <b>기록을 불러오고 있습니다.</b>
          <p>잠시만 기다려주세요.</p>
        </div>
      ) : status === "error" ? (
        <div className="empty" role="alert">
          <b>기록을 불러올 수 없습니다.</b>
          <p>잠시 후 페이지를 새로고침해주세요.</p>
          <button className="secondary" onClick={() => location.reload()}>
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <div className="archive-tools">
            <label className="search">
              <span>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="활동명, 키워드로 찾기"
                aria-label="기록 검색"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="검색어 지우기">
                  ×
                </button>
              )}
            </label>
            <label className="sort">
              정렬
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">최근 활동순</option>
                <option value="oldest">오래된 기록순</option>
                <option value="name">이름순</option>
              </select>
            </label>
            <label className="sort page-size">
              표시
              <select
                value={pageSize}
                onChange={(e) =>
                  setPageSize(Number(e.target.value) as 5 | 10 | 15 | 20)
                }
              >
                <option value={5}>5개씩</option>
                <option value={10}>10개씩</option>
                <option value={15}>15개씩</option>
                <option value={20}>20개씩</option>
              </select>
            </label>
            <div className="view-switch" aria-label="보기 방식">
              <button
                className={layout === "list" ? "active" : ""}
                onClick={() => setLayout("list")}
                aria-pressed={layout === "list"}
              >
                리스트
              </button>
              <button
                className={layout === "grid" ? "active" : ""}
                onClick={() => setLayout("grid")}
                aria-pressed={layout === "grid"}
              >
                격자
              </button>
            </div>
          </div>
          <div className="status-filters" role="group" aria-label="활동 상태">
            <span className="status-filter-title">활동 상태</span>
            {activityStatuses.map((activityStatus) => (
              <button
                key={activityStatus}
                type="button"
                className={`${statusToneClass(activityStatus)} ${statusFilters.includes(activityStatus) ? "active" : ""}`}
                aria-pressed={statusFilters.includes(activityStatus)}
                onClick={() => toggleStatus(activityStatus)}
              >
                {activityStatus}
              </button>
            ))}
          </div>
          <p className="result-count">기록 {total}건</p>
          {list.length ? (
            <div key={layout} className={`card-grid layout-transition ${layout === "list" ? "list-view" : ""}`}>
              {list.map((p) => (
                <Card key={p.id} p={p} query={query} open={(rect) => open(p, rect)} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <b>찾는 기록이 없습니다.</b>
              <p>검색어나 활동 상태 선택을 바꿔보세요.</p>
            </div>
          )}
          {pageCount > 1 && (
            <nav className="pagination" aria-label="기록 페이지">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                이전
              </button>
              <span>{currentPage} / {pageCount}</span>
              <button
                onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
              >
                다음
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
function Portrait({ p, large = false }: { p: Person; large?: boolean }) {
  return (
    <div
      className={`portrait ${large ? "large" : ""} ${p.avatar_key ? "has-image" : ""}`}
      style={{ "--portrait": p.color } as React.CSSProperties}
    >
      <div className="portrait-media">
        {p.avatar_key ? (
          <ProgressiveImage src={publicApiUrl(`/api/profile-images/${encodeURIComponent(p.avatar_key)}`)} alt={`${p.name} 프로필`} eager={large} />
        ) : (
          <span>{p.initial}</span>
        )}
      </div>
    </div>
  );
}
function Card({ p, query, open }: { p: Person; query: string; open: (rect: DOMRect) => void }) {
  const resetPointer = (element: HTMLElement) => {
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
    element.style.setProperty("--portrait-shift-x", "0px");
    element.style.setProperty("--portrait-shift-y", "0px");
    element.style.setProperty("--content-shift-x", "0px");
    element.style.setProperty("--content-shift-y", "0px");
    element.style.setProperty("--glow-opacity", "0");
  };
  return (
    <article
      id={`record-card-${p.id}`}
      className="record-card"
      onClick={(event) => open(event.currentTarget.getBoundingClientRect())}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
      aria-label={`${p.name} 기록 보기`}
      style={{ viewTransitionName: `record-${p.id}` } as React.CSSProperties}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
        card.style.setProperty("--tilt-x", `${((0.5 - y) * 1.6).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${((x - 0.5) * 1.6).toFixed(2)}deg`);
        card.style.setProperty("--portrait-shift-x", `${((x - 0.5) * 7).toFixed(2)}px`);
        card.style.setProperty("--portrait-shift-y", `${((y - 0.5) * 7).toFixed(2)}px`);
        card.style.setProperty("--content-shift-x", `${((x - 0.5) * 1.8).toFixed(2)}px`);
        card.style.setProperty("--content-shift-y", `${((y - 0.5) * 1.8).toFixed(2)}px`);
        card.style.setProperty("--glow-x", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--glow-y", `${(y * 100).toFixed(1)}%`);
        card.style.setProperty("--glow-opacity", "1");
      }}
      onPointerLeave={(event) => resetPointer(event.currentTarget)}
      onBlur={(event) => resetPointer(event.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(e.currentTarget.getBoundingClientRect());
        }
      }}
    >
      <Portrait p={p} />
      <div className="card-body">
        <div className="identity">
          <div>
            <h3><Highlight text={p.name} query={query} /></h3>
            <p><Highlight text={`${p.affiliation || p.category} · ${p.tags.slice(0, 2).map((tag) => `#${tag}`).join(" ")}`} query={query} /></p>
          </div>
          <span className="record-link">
            기록 펼치기 ↗
          </span>
        </div>
        <span className={`status-badge ${statusToneClass(statusText(p))}`}>{statusText(p)}</span>
        <p className="note"><Highlight text={p.note} query={query} /></p>
        <div className="last-seen">
          <span>마지막 활동으로부터</span>
          <strong>{daysAgo(p.last)?.toLocaleString("ko-KR") ?? "확인 필요"}{daysAgo(p.last) === null ? "" : "일"}</strong>
        </div>
      </div>
    </article>
  );
}
function RecordDialog({
  person,
  origin,
  close,
  children,
}: {
  person: Person;
  origin: DialogOrigin;
  close: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const shell = document.getElementById("site-shell") as (HTMLElement & { inert: boolean }) | null;
    const previousOverflow = document.body.style.overflow;
    if (shell) shell.inert = true;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      if (shell) shell.inert = false;
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => {
        document.getElementById(`record-card-${person.id}`)?.focus();
        if (!document.activeElement || document.activeElement === document.body)
          previousFocus?.focus();
      });
    };
  }, [person.id]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const lightbox = panel.querySelector<HTMLElement>(".lightbox");
    if (event.key === "Escape") {
      if (lightbox) return;
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const scope = lightbox || panel;
    const focusable = Array.from(
      scope.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  return (
    <div
      className="record-dialog"
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      style={{
        "--dialog-shift-x": `${origin.x}px`,
        "--dialog-shift-y": `${origin.y}px`,
        "--dialog-start-scale": origin.scale,
      } as React.CSSProperties}
    >
      <section
        ref={panelRef}
        className="record-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`record-dialog-title-${person.id}`}
        onKeyDown={onKeyDown}
      >
        <button ref={closeRef} className="record-dialog-close" type="button" onClick={close} aria-label={`${person.name} 기록 닫기`}>
          <span aria-hidden="true">×</span>
        </button>
        {children}
      </section>
    </div>
  );
}
function Detail({
  person: p,
  back,
  remembered,
  remember,
  modal = false,
  titleId,
}: {
  person: Person;
  back: () => void;
  remembered: boolean;
  remember: () => void;
  modal?: boolean;
  titleId?: string;
}) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [gallery, setGallery] = useState(p.gallery || []);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const detailHeroRef = useRef<HTMLElement>(null);
  const lightboxOpen = galleryIndex !== null;
  const activeGalleryImage = galleryIndex === null ? null : gallery[galleryIndex];
  useEffect(() => {
    fetch(publicApiUrl(`/api/gallery?recordId=${p.id}`))
      .then((response) => response.ok ? readResponseJson<GalleryImage[]>(response) : [])
      .then(setGallery)
      .catch(() => undefined);
  }, [p.id]);
  useEffect(() => {
    if (!lightboxOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lightboxCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [lightboxOpen]);
  useEffect(() => {
    if (galleryIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGalleryIndex(null);
      if (event.key === "ArrowLeft")
        setGalleryIndex((current) => current === null ? null : Math.max(0, current - 1));
      if (event.key === "ArrowRight")
        setGalleryIndex((current) => current === null ? null : Math.min(gallery.length - 1, current + 1));
    };
    addEventListener("keydown", onKeyDown);
    return () => removeEventListener("keydown", onKeyDown);
  }, [gallery.length, galleryIndex]);
  useEffect(() => {
    const hero = detailHeroRef.current;
    if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const updateDepth = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const shift = Math.max(-12, Math.min(12, (window.innerHeight / 2 - (rect.top + rect.height / 2)) * 0.035));
        hero.style.setProperty("--profile-depth", `${shift.toFixed(1)}px`);
      });
    };
    updateDepth();
    addEventListener("scroll", updateDepth, { passive: true });
    return () => { cancelAnimationFrame(frame); removeEventListener("scroll", updateDepth); };
  }, [p.id]);
  return (
    <div className={`page detail-page ${modal ? "detail-page-modal" : ""}`}>
      {!modal && (
        <button className="back" onClick={back}>
          ← 기록 목록으로
        </button>
      )}
      <section
        className="detail-hero"
        ref={detailHeroRef}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          event.currentTarget.style.setProperty("--profile-pointer-x", `${(x * 8).toFixed(2)}px`);
          event.currentTarget.style.setProperty("--profile-pointer-y", `${(y * 8).toFixed(2)}px`);
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.setProperty("--profile-pointer-x", "0px");
          event.currentTarget.style.setProperty("--profile-pointer-y", "0px");
        }}
      >
        <Portrait p={p} large />
        <div className="detail-intro">
          <p className="eyebrow">ARCHIVE NO. {String(p.id).padStart(3, "0")}</p>
          <h1 id={titleId}>{p.name}</h1>
          <p className="handle">{p.affiliation || p.category} · {p.tags.map((tag) => `#${tag}`).join(" ")}</p>
          <span className={`status-badge detail-status ${statusToneClass(statusText(p))}`}>{statusText(p)}</span>
          <p className="lead">{p.note}</p>
          <button
            className={`remember ${remembered ? "saved" : ""}`}
            onClick={remember}
            aria-pressed={remembered}
          >
            <span aria-hidden="true">{remembered ? "●" : "○"}</span><b>기억하고 있어요</b>
          </button>
          <small>
            선택 여부는 이 기기에, 전체 기억 수는 서버에 저장됩니다.
          </small>
        </div>
      </section>
      <section className="timeline">
        <div className="time-block">
          <span>활동 시작</span>
          <strong>{p.debut}</strong>
        </div>
        <div className="time-line">
          <i />
        </div>
        <div className="time-block right">
          <span>마지막 확인</span>
          <strong>{formattedArchiveDate(p.last)}</strong>
        </div>
      </section>
      <section className="detail-body">
        <div>
          <p className="section-no">02 — RECORD</p>
          <h2>기억하고 있는 활동</h2>
        </div>
        <div className="prose">
          <p>{p.bio}</p>
          <blockquote>“{p.note}”</blockquote>
          <div className="tags">
            {p.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        </div>
      </section>
      {p.graduation_message?.trim() && (
        <section className="graduation-message" aria-labelledby="graduation-message-title">
          <p className="section-no">LAST MESSAGE</p>
          <h2 id="graduation-message-title">마지막으로 남긴 말</h2>
          <blockquote>{p.graduation_message}</blockquote>
        </section>
      )}
      {gallery.length > 0 && (
        <section className="record-gallery">
          <div className="gallery-heading">
            <div>
              <p className="section-no">03 — GALLERY</p>
              <h2>남아 있는 장면</h2>
            </div>
            <span>{gallery.length}장의 기록</span>
          </div>
          <div className="gallery-grid">
            {gallery.map((image, index) => (
              <button className="gallery-card" key={image.id} onClick={() => setGalleryIndex(index)} aria-label={`${p.name} 갤러리 ${index + 1}번 크게 보기`}>
                <ProgressiveImage src={publicApiUrl(`/api/profile-images/${encodeURIComponent(image.thumbnail_key || image.object_key)}`)} alt={`${p.name} 활동 기록 ${index + 1}`} />
                {(image.caption || image.memory_date) && (
                  <span className="gallery-caption">
                    {image.memory_date && <time>{image.memory_date}</time>}
                    {image.caption && <b>{image.caption}</b>}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
      {galleryIndex !== null && activeGalleryImage && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${p.name} 갤러리`} onClick={() => setGalleryIndex(null)}>
          <button ref={lightboxCloseRef} className="lightbox-close" onClick={() => setGalleryIndex(null)} aria-label="갤러리 닫기">×</button>
          <button className="lightbox-nav prev" disabled={galleryIndex === 0} onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.max(0, galleryIndex - 1)); }} aria-label="이전 사진">←</button>
          <figure className="lightbox-stage" key={activeGalleryImage.id} onClick={(e) => e.stopPropagation()}>
            <ProgressiveImage src={publicApiUrl(`/api/profile-images/${encodeURIComponent(activeGalleryImage.object_key)}`)} alt={`${p.name} 활동 기록 ${galleryIndex + 1}`} eager />
            {(activeGalleryImage.caption || activeGalleryImage.memory_date || activeGalleryImage.source_url) && (
              <figcaption>
                {activeGalleryImage.memory_date && <time>{activeGalleryImage.memory_date}</time>}
                {activeGalleryImage.caption && <p>{activeGalleryImage.caption}</p>}
                {activeGalleryImage.source_url && <a href={activeGalleryImage.source_url} target="_blank" rel="noreferrer">출처 확인 ↗</a>}
              </figcaption>
            )}
          </figure>
          <button className="lightbox-nav next" disabled={galleryIndex === gallery.length - 1} onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.min(gallery.length - 1, galleryIndex + 1)); }} aria-label="다음 사진">→</button>
          <span className="lightbox-count">{galleryIndex + 1} / {gallery.length}</span>
        </div>
      )}
      <section className="elapsed">
        <p>마지막 소식으로부터</p>
        <strong>{yearsText(p.last)}</strong>
        <span>
          {daysAgo(p.last) === null
            ? "마지막 확인 일자를 확인하고 있습니다."
            : `정확히 ${daysAgo(p.last)?.toLocaleString("ko-KR")}일이 흘렀습니다.`}
        </span>
      </section>
      <section className="community-memory">
        <span>이 기록을 기억하는 마음</span>
        <strong>{p.memories.toLocaleString("ko-KR")}</strong>
        <p>
          숫자는 크기를 겨루기 위한 것이 아니라,
          <br />
          누군가 기억하고 있다는 작은 표시입니다.
        </p>
      </section>
    </div>
  );
}
function PageTitle({
  no,
  title,
  children,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <p className="section-no">{no}</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}
function Privacy() {
  return (
    <div className="page">
      <PageTitle no="PRIVACY — OPERATION" title="개인정보·운영 안내">
        필요한 정보만 저장하며 광고 추적이나 판매에 이용하지 않습니다.
      </PageTitle>
      <section className="privacy-grid">
        <article>
          <b>01</b>
          <h2>기억하기</h2>
          <p>
            선택한 기록 번호와 무작위 식별값을 저장합니다. 선택 상태는 이 기기에,
            중복 집계 방지용 값은 서버에 보관됩니다.
          </p>
        </article>
        <article>
          <b>02</b>
          <h2>제보와 이미지</h2>
          <p>
            활동명, 공개 주소, 제보·출처와 선택한 이미지 설명을 검토 목적으로
            저장합니다. 개인 연락처나 비공개 정보는 보내지 말아주세요.
          </p>
        </article>
        <article>
          <b>03</b>
          <h2>보관과 보호</h2>
          <p>
            기능 데이터는 Cloudflare D1·R2에 보관되며 관리자만 확인합니다. 요청
            제한용 네트워크 주소는 복원하기 어려운 값으로 바꿔 제한된 기간만 사용합니다.
          </p>
        </article>
        <article>
          <b>04</b>
          <h2>수정·비공개 요청</h2>
          <p>
            제보 페이지에서 ‘정보 수정’ 또는 ‘비공개 요청’을 선택해 보내주세요.
            당사자나 관계자의 요청을 확인한 뒤 필요한 조치를 진행합니다.
          </p>
        </article>
      </section>
      <p className="privacy-note">
        제보와 이미지는 검토와 기록 운영에 필요한 동안 보관하고, 목적이 끝나거나 삭제 요청이 확인되면 정리합니다.
        <span>시행일 2026. 08. 27.</span>
      </p>
    </div>
  );
}
function SubmissionImageDraft({ file, index, remove }: { file: File; index: number; remove: () => void }) {
  const preview = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);
  return (
    <article className="submission-image-draft">
      <div className="submission-image-preview">
        <ProgressiveImage src={preview} alt={`${file.name} 미리보기`} eager />
        <button type="button" onClick={remove} aria-label={`${file.name} 첨부 취소`}>×</button>
      </div>
      <div>
        <span className="file-name">{index + 1}. {file.name}</span>
        <label>
          <span>이 이미지에 담긴 기억 · 필수</span>
          <textarea name="imageCaption" required maxLength={300} rows={3} placeholder="어떤 순간인지, 왜 기억하고 싶은지 적어주세요." />
        </label>
        <div className="field-row">
          <label>
            <span>촬영 또는 게시 시기 · 선택</span>
            <input name="imageDate" maxLength={30} placeholder="예: 2022년 여름" />
          </label>
          <label>
            <span>이미지 출처 · 선택</span>
            <input name="imageSource" type="url" placeholder="https://" />
          </label>
        </div>
      </div>
    </article>
  );
}

function Submit({ onSubmit, submitting }: { onSubmit: (e: FormEvent, images: File[]) => Promise<boolean>; submitting: boolean }) {
  const [images, setImages] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const chooseImages = (files?: FileList | null) => {
    const selected = Array.from(files || []);
    if (selected.length > 5) {
      setFileError("이미지는 한 번에 최대 5장까지 첨부할 수 있습니다.");
      setImages([]);
      return false;
    }
    if (selected.some((file) => file.size > 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setFileError("각 1MB 이하의 JPG, PNG, WEBP 이미지만 첨부할 수 있습니다.");
      setImages([]);
      return false;
    }
    setFileError("");
    setImages(selected);
    return true;
  };
  return (
    <div className="page submit-page">
      <section className="form-wrap">
        <div className="form-aside">
          <span>제보 전 확인해주세요</span>
          <ul>
            <li>공개된 활동 정보만 보내주세요.</li>
            <li>개인 연락처나 사적인 정보는 적지 말아주세요.</li>
            <li>확인을 위한 출처 링크를 함께 남겨주세요.</li>
          </ul>
          <p>
            접수된 내용은 공개되지 않으며,
            <br />
            관리자가 확인한 뒤 기록에 반영합니다.
          </p>
        </div>
        <form onSubmit={async (event) => { if (await onSubmit(event, images)) setImages([]); }}>
          <label className="hp-field" aria-hidden="true">
            웹사이트
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <div className="field-row">
            <label>
              <span>제보 유형</span>
              <select name="type" required defaultValue="">
                <option value="" disabled>
                  선택해주세요
                </option>
                <option>새 기록 제안</option>
                <option>정보 수정</option>
                <option>활동 재개</option>
                <option>비공개 요청</option>
              </select>
            </label>
            <label>
              <span>활동명</span>
              <input name="name" required placeholder="기록할 이름" />
            </label>
          </div>
          <label>
            <span>채널 또는 계정 주소</span>
            <input
              name="channelUrl"
              type="url"
              required
              placeholder="https://"
            />
          </label>
          <label>
            <span>전하고 싶은 내용</span>
            <textarea
              name="message"
              required
              maxLength={4000}
              rows={7}
              placeholder="확인이 필요한 내용을 차분히 적어주세요."
            />
          </label>
          <label>
            <span>확인 가능한 출처</span>
            <input
              name="sourceUrl"
              type="url"
              placeholder="공식 채널, 게시물 등의 주소"
            />
          </label>
          <div className="submission-image-field">
            <label>
              <span>기억을 담은 이미지 · 선택 / 최대 5장, 각 1MB</span>
              <input name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { if (!chooseImages(event.target.files)) event.currentTarget.value = ""; }} />
            </label>
            <p>첨부 이미지는 관리자가 출처와 내용을 확인한 뒤에만 공개 갤러리에 반영됩니다.</p>
            {fileError && <strong role="alert">{fileError}</strong>}
            {images.length > 0 && (
              <div className="submission-image-list">
                {images.map((file, index) => (
                  <SubmissionImageDraft key={`${file.name}-${file.lastModified}-${index}`} file={file} index={index} remove={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
                ))}
              </div>
            )}
          </div>
          <label className="checkbox">
            <input type="checkbox" name="publicInfoConsent" value="yes" required />
            <span>개인정보가 아닌 공개된 정보임을 확인했습니다.</span>
          </label>
          {images.length > 0 && (
            <label className="checkbox">
              <input type="checkbox" name="imageRights" value="yes" required />
              <span>이미지의 검토와 아카이브 공개에 필요한 권리가 있음을 확인했습니다.</span>
            </label>
          )}
          <button className="primary" type="submit" disabled={submitting || Boolean(fileError)}>
            {submitting ? "제보 보내는 중…" : "제보 보내기"} <span>{submitting ? "" : "→"}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
function Admin({
  people,
  setPeople,
  showToast,
  trustedAccess,
  onDirtyChange,
}: {
  people: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  showToast: (s: string) => void;
  trustedAccess: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [active, setActive] = useState(1);
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [deletedImages, setDeletedImages] = useState<DeletedImage[]>([]);
  const p =
    people.find((x) => x.id === active) || people[0] || originalPeople[0];
  const update = (key: keyof Person, val: Person[keyof Person], markDirty = true) => {
    if (markDirty) setDirty(true);
    setPeople(
      people.map((x) =>
        x.id === active ? ({ ...x, [key]: val } as Person) : x,
      ),
    );
  };
  const authenticate = useCallback(async () => {
    try {
      const headers = { authorization: `Bearer ${token}` };
      const [recordsResponse, submissionsResponse, deletedImagesResponse] = await Promise.all([
        fetch("/api/admin/records", { headers }),
        fetch("/api/admin/submissions", { headers }),
        fetch("/api/admin/deleted-images", { headers }),
      ]);
      if (!recordsResponse.ok || !submissionsResponse.ok || !deletedImagesResponse.ok) throw new Error();
      const records = await readResponseJson<Person[]>(recordsResponse);
      const received = await readResponseJson<Submission[]>(submissionsResponse);
      const retainedImages = await readResponseJson<DeletedImage[]>(deletedImagesResponse);
      setPeople(records);
      setActive((current) => records.some((record) => record.id === current) ? current : records[0]?.id || 0);
      setSubmissions(received);
      setDeletedImages(retainedImages);
      setAuthenticated(true);
      setDirty(false);
      showToast("관리자 인증이 완료되었습니다.");
    } catch {
      showToast("관리자 키가 올바르지 않습니다.");
    }
    setTimeout(() => showToast(""), 2200);
  }, [setPeople, showToast, token]);
  useEffect(() => {
    if (!trustedAccess || authenticated) return;
    const timer = setTimeout(() => void authenticate(), 0);
    return () => clearTimeout(timer);
  }, [authenticate, authenticated, trustedAccess]);
  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    addEventListener("beforeunload", warnBeforeLeaving);
    return () => removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  const save = async () => {
    try {
      const response = await fetch("/api/admin/records", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(p),
      });
      if (!response.ok) throw new Error();
      setDirty(false);
      showToast("변경 사항을 서버에 저장했습니다.");
    } catch {
      showToast("저장하지 못했습니다. 다시 인증해주세요.");
      setAuthenticated(false);
    }
    setTimeout(() => showToast(""), 2400);
  };
  const createRecord = async () => {
    try {
      const response = await fetch("/api/admin/records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: "{}",
      });
      const record = await readResponseJson<Person & { error?: string }>(response);
      if (!response.ok) throw new Error(record.error);
      setPeople([...people, record]);
      setActive(record.id);
      setDirty(false);
      showToast("새 기록을 만들었습니다. 내용을 입력해 저장해주세요.");
    } catch {
      showToast("새 기록을 만들지 못했습니다.");
    }
    setTimeout(() => showToast(""), 2400);
  };
  const deleteRecord = async () => {
    if (!window.confirm(`“${p.name}” 기록을 삭제할까요?\n기록은 복구할 수 없으며 이미지는 검토 보관함으로 이동합니다.`)) return;
    try {
      const response = await fetch("/api/admin/records", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: p.id }),
      });
      if (!response.ok) throw new Error();
      const retainedResponse = await fetch("/api/admin/deleted-images", { headers: { authorization: `Bearer ${token}` } });
      if (retainedResponse.ok) setDeletedImages(await readResponseJson<DeletedImage[]>(retainedResponse));
      const remaining = people.filter((record) => record.id !== p.id);
      setPeople(remaining);
      if (remaining.length) setActive(remaining[0].id);
      setDirty(false);
      showToast("기록을 삭제했습니다.");
    } catch {
      showToast("기록을 삭제하지 못했습니다. 다시 인증해주세요.");
      setAuthenticated(false);
    }
    setTimeout(() => showToast(""), 2400);
  };
  const uploadProfile = async (file?: File) => {
    if (!file) return;
    try {
      const optimized = file.type === "image/gif" ? file : await resizeForUpload(file, 1200, 0.84);
      const form = new FormData();
      form.set("file", optimized);
      form.set("recordId", String(p.id));
      const response = await fetch("/api/admin/profile-images", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await readResponseJson<{ avatar_key: string; error?: string }>(response);
      if (!response.ok) throw new Error(data.error);
      update("avatar_key", data.avatar_key, false);
      showToast("프로필 사진을 업로드했습니다.");
    } catch {
      showToast("사진을 최적화하거나 업로드하지 못했습니다. 다른 이미지를 사용해주세요.");
    }
    setTimeout(() => showToast(""), 2600);
  };
  const uploadGallery = async (files?: FileList | null) => {
    if (!files?.length) return;
    try {
      const originals = Array.from(files);
      let gallery: GalleryImage[] = p.gallery || [];
      for (let start = 0; start < originals.length; start += 10) {
        const batch = originals.slice(start, start + 10);
        const thumbnails = await Promise.all(batch.map((file) => resizeForUpload(file, 480, 0.76)));
        const form = new FormData();
        form.set("recordId", String(p.id));
        batch.forEach((file) => form.append("files", file));
        thumbnails.forEach((file) => form.append("thumbnails", file));
        const response = await fetch("/api/admin/gallery", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
        const result = await readResponseJson<GalleryImage[] & { error?: string }>(response);
        if (!response.ok) throw new Error(result.error);
        gallery = result;
      }
      update("gallery", gallery, false);
      showToast("갤러리 사진을 추가했습니다.");
    } catch {
      showToast("사진을 추가하지 못했습니다. 최대 장수와 파일 크기를 확인해주세요.");
    }
    setTimeout(() => showToast(""), 2600);
  };
  const deleteGalleryImage = async (id: number) => {
    if (!window.confirm("이 갤러리 사진을 삭제할까요?")) return;
    try {
      const response = await fetch("/api/admin/gallery", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error();
      update("gallery", (p.gallery || []).filter((image) => image.id !== id), false);
      showToast("갤러리 사진을 삭제했습니다.");
    } catch {
      showToast("사진을 삭제하지 못했습니다.");
    }
    setTimeout(() => showToast(""), 2200);
  };
  const updateGalleryMeta = async (id: number, caption: string, memoryDate: string, sourceUrl: string) => {
    try {
      const response = await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, caption, memoryDate, sourceUrl }),
      });
      const updated = await readResponseJson<{ id: number; caption: string; memory_date: string; source_url: string; error?: string }>(response);
      if (!response.ok) throw new Error(updated.error);
      setPeople((current) => current.map((record) => ({
        ...record,
        gallery: (record.gallery || []).map((image) => image.id === id ? { ...image, ...updated } : image),
      })));
      showToast("갤러리 설명을 저장했습니다.");
    } catch (error) {
      showToast(error instanceof Error && error.message ? error.message : "갤러리 설명을 저장하지 못했습니다.");
    }
    setTimeout(() => showToast(""), 2200);
  };
  if (!authenticated)
    return (
      <div className="page admin-page">
        <PageTitle no="ADMIN — SECURE" title="관리자 확인">
          관리자 키를 확인한 뒤에만 기록 편집 화면이 표시됩니다.
        </PageTitle>
        <div className="admin-login">
          <label>
            <span>관리자 키</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") authenticate();
              }}
              placeholder="관리자 키 입력"
              autoComplete="current-password"
            />
          </label>
          <button className="primary" onClick={authenticate}>
            관리 화면 열기
          </button>
          <p>관리자 키는 브라우저에 저장되지 않습니다.</p>
        </div>
      </div>
    );
  const updateSubmission = async (id: number, status: string) => {
    try {
      const response = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error();
      setSubmissions((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      showToast("제보 상태를 변경했습니다.");
    } catch {
      showToast("제보 상태를 변경하지 못했습니다.");
    }
    setTimeout(() => showToast(""), 2200);
  };
  const publishSubmissionImage = async (imageId: number, recordId: number) => {
    try {
      const response = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageId, recordId }),
      });
      const galleryImage = await readResponseJson<GalleryImage & { submission_image_id: number; error?: string }>(response);
      if (!response.ok) throw new Error(galleryImage.error);
      setSubmissions((current) => current.map((submission) => ({
        ...submission,
        images: (submission.images || []).map((image) => image.id === imageId ? { ...image, published_gallery_id: galleryImage.id } : image),
      })));
      setPeople((current) => current.map((record) => record.id === recordId ? { ...record, gallery: [...(record.gallery || []), galleryImage] } : record));
      showToast("제보 이미지를 선택한 기록의 갤러리에 반영했습니다.");
    } catch (error) {
      showToast(error instanceof Error && error.message ? error.message : "제보 이미지를 반영하지 못했습니다.");
    }
    setTimeout(() => showToast(""), 2400);
  };
  const purgeDeletedImages = async (deletionGroup: string) => {
    if (!window.confirm("이 기록의 보관 이미지를 서버에서 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      const response = await fetch("/api/admin/deleted-images", {
        method: "DELETE",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ deletion_group: deletionGroup }),
      });
      if (!response.ok) throw new Error();
      setDeletedImages((current) => current.filter((image) => image.deletion_group !== deletionGroup));
      showToast("보관 이미지를 영구 삭제했습니다.");
    } catch {
      showToast("보관 이미지를 삭제하지 못했습니다.");
    }
    setTimeout(() => showToast(""), 2400);
  };
  const selectRecord = (id: number) => {
    if (id === active) return;
    if (dirty && !window.confirm("저장하지 않은 변경 사항이 있습니다. 저장하지 않고 다른 기록으로 이동할까요?")) return;
    setDirty(false);
    setActive(id);
  };
  const restoreRecords = () => {
    if (dirty && !window.confirm("저장하지 않은 변경 사항을 버리고 서버 값으로 복원할까요?")) return;
    void authenticate();
  };
  return (
    <div className="page admin-page">
      <PageTitle no="ADMIN — SECURE" title="기록 관리">
        인증된 관리자만 공개 기록을 편집할 수 있습니다.
      </PageTitle>
      <div className="admin-grid">
        <aside>
          <div className="admin-side-title">
            <b>전체 기록</b>
            <span>{people.length}</span>
            <button className="add-record" onClick={createRecord}>+ 새 기록</button>
          </div>
          {people.map((x) => (
            <button
              className={x.id === active ? "active" : ""}
              onClick={() => selectRecord(x.id)}
              key={x.id}
            >
              <i style={{ background: x.color }}>{x.initial}</i>
              <span>
                <b>{x.name}</b>
                <small>{x.affiliation || x.category}</small>
              </span>
              <em>{Boolean(x.published) ? "공개" : "비공개"}</em>
            </button>
          ))}
        </aside>
        <section className="editor">
          <div className="editor-head">
            <div>
              <span>ARCHIVE NO. {String(p.id).padStart(3, "0")}</span>
              <h2>{p.name} 편집</h2>
              {dirty && <small className="unsaved" role="status">저장되지 않은 변경</small>}
            </div>
            <div>
              <button className="danger" onClick={deleteRecord}>
                기록 삭제
              </button>
              <button className="secondary" onClick={restoreRecords}>
                서버 값 복원
              </button>
              <button className="primary" onClick={save}>
                서버 저장
              </button>
            </div>
          </div>
          <div className="status-line">
            <span>공개 상태</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={Boolean(p.published)}
                onChange={(e) => update("published", e.target.checked)}
              />
              <i />
            </label>
            <b>{Boolean(p.published) ? "사이트에 공개" : "비공개로 보관"}</b>
          </div>
          <div className="editor-form">
            <div className="field-row">
              <label>
                <span>활동명</span>
                <input
                  value={p.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </label>
              <label>
                <span>태그 · #으로 구분</span>
                <input
                  key={`tags-${p.id}`}
                  defaultValue={p.tags.join("#")}
                  onChange={() => setDirty(true)}
                  onBlur={(e) => update("tags", e.target.value.split("#").map((tag) => tag.trim()).filter(Boolean))}
                  placeholder="게임#노래#잡담"
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                <span>활동 시작</span>
                <input
                  value={p.debut}
                  onChange={(e) => update("debut", e.target.value)}
                />
              </label>
              <label>
                <span>마지막 확인</span>
                <input
                  value={p.last}
                  onChange={(e) => update("last", e.target.value)}
                />
              </label>
            </div>
            <label>
              <span>목록 소개</span>
              <textarea
                rows={3}
                value={p.note}
                onChange={(e) => update("note", e.target.value)}
              />
            </label>
            <label>
              <span>상세 기록</span>
              <textarea
                rows={6}
                value={p.bio}
                onChange={(e) => update("bio", e.target.value)}
              />
            </label>
            <label>
              <span>마지막 졸업사 · 선택 입력</span>
              <textarea
                rows={8}
                maxLength={20000}
                value={p.graduation_message || ""}
                onChange={(e) => update("graduation_message", e.target.value)}
                placeholder="마지막 방송이나 공식 졸업 안내에서 남긴 말을 입력해주세요."
              />
              <small className="field-help">입력한 경우에만 공개 상세 기록에 원문 형태로 표시됩니다.</small>
            </label>
            <div className="field-row">
              <label>
                <span>활동 형태</span>
                <select
                  value={p.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  <option>개인</option>
                  <option>소속</option>
                </select>
              </label>
              <label>
                <span>활동 상태 분류</span>
                <select value={statusText(p)} onChange={(e) => update("activity_status", e.target.value)}>
                  <option>공식적으로 활동 종료한 버튜버</option>
                  <option>소식이 끊긴 버튜버</option>
                  <option>무기한 휴식기에 들어간 버튜버</option>
                </select>
              </label>
            </div>
            <div className="field-row">
              <label>
                <span>표지 색상</span>
                <div className="color-input">
                  <input
                    type="color"
                    value={p.color}
                    onChange={(e) => update("color", e.target.value)}
                  />
                  <code>{p.color}</code>
                </div>
              </label>
            </div>
            {p.category === "소속" && (
              <label>
                <span>소속명</span>
                <input
                  value={p.affiliation || ""}
                  onChange={(e) => update("affiliation", e.target.value)}
                  placeholder="소속 그룹 또는 회사명"
                />
              </label>
            )}
            <label className="profile-upload">
              <span>프로필 사진 · JPG, PNG, WEBP, GIF / 최대 5MB</span>
              <div>
                <Portrait p={p} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => uploadProfile(e.target.files?.[0])}
                />
              </div>
            </label>
            <div className="gallery-admin">
              <label>
                <span>상세 갤러리 · 최대 50장 / 각 1MB</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => { uploadGallery(e.target.files); e.currentTarget.value = ""; }} />
              </label>
              {(p.gallery || []).length > 0 && (
                <div className="gallery-admin-list">
                  {(p.gallery || []).map((image, index) => (
                    <GalleryAdminCard key={image.id} image={image} index={index} save={updateGalleryMeta} remove={() => deleteGalleryImage(image.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      <SubmissionQueue items={submissions} update={updateSubmission} people={people} publishImage={publishSubmissionImage} deletedImages={deletedImages} purgeDeletedImages={purgeDeletedImages} />
    </div>
  );
}

function GalleryAdminCard({ image, index, save, remove }: {
  image: GalleryImage;
  index: number;
  save: (id: number, caption: string, memoryDate: string, sourceUrl: string) => void;
  remove: () => void;
}) {
  const [caption, setCaption] = useState(image.caption || "");
  const [memoryDate, setMemoryDate] = useState(image.memory_date || "");
  const [sourceUrl, setSourceUrl] = useState(image.source_url || "");
  return (
    <article className="gallery-admin-card">
      <div className="gallery-admin-preview">
        <ProgressiveImage src={`/api/profile-images/${encodeURIComponent(image.thumbnail_key || image.object_key)}`} alt={`갤러리 ${index + 1}`} />
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="gallery-admin-fields">
        <label>
          <span>사진에 담긴 기억</span>
          <textarea value={caption} maxLength={300} rows={3} onChange={(event) => setCaption(event.target.value)} placeholder="공개 갤러리에 표시할 설명" />
        </label>
        <div className="field-row">
          <label><span>시기</span><input value={memoryDate} maxLength={30} onChange={(event) => setMemoryDate(event.target.value)} placeholder="예: 2022년 여름" /></label>
          <label><span>출처</span><input value={sourceUrl} type="url" onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label>
        </div>
        <div className="gallery-admin-actions">
          <button type="button" className="danger" onClick={remove}>사진 삭제</button>
          <button type="button" className="secondary" onClick={() => save(image.id, caption, memoryDate, sourceUrl)}>설명 저장</button>
        </div>
      </div>
    </article>
  );
}

function SubmissionImageReview({ image, people, publish }: { image: SubmissionImage; people: Person[]; publish: (imageId: number, recordId: number) => void }) {
  const [recordId, setRecordId] = useState(people[0]?.id || 0);
  return (
    <article className="submission-image-review">
      <div className="submission-image-review-preview">
        <ProgressiveImage src={`/api/profile-images/${encodeURIComponent(image.thumbnail_key)}`} alt="제보 이미지 미리보기" />
        {image.published_gallery_id && <span>갤러리 반영 완료</span>}
      </div>
      <div>
        {image.memory_date && <time>{image.memory_date}</time>}
        <p>{image.caption}</p>
        {image.source_url && <a href={image.source_url} target="_blank" rel="noreferrer">이미지 출처 확인 ↗</a>}
        <div className="submission-image-publish">
          <select value={recordId} onChange={(event) => setRecordId(Number(event.target.value))} aria-label="이미지를 반영할 기록">
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <button type="button" className="secondary" disabled={Boolean(image.published_gallery_id) || !recordId} onClick={() => publish(image.id, recordId)}>
            {image.published_gallery_id ? "반영됨" : "이 기록에 반영"}
          </button>
        </div>
      </div>
    </article>
  );
}

function SubmissionQueue({
  items,
  update,
  people,
  publishImage,
  deletedImages,
  purgeDeletedImages,
}: {
  items: Submission[];
  update: (id: number, status: string) => void;
  people: Person[];
  publishImage: (imageId: number, recordId: number) => void;
  deletedImages: DeletedImage[];
  purgeDeletedImages: (deletionGroup: string) => void;
}) {
  const [box, setBox] = useState<"inbox" | "completed" | "deleted-images">("inbox");
  const [submissionSort, setSubmissionSort] = useState<"newest" | "oldest" | "status">("newest");
  const pendingCount = items.filter((item) => item.status === "pending").length;
  const completedCount = items.length - pendingCount;
  const visibleItems = items
    .filter((item) => box === "inbox" ? item.status === "pending" : item.status !== "pending")
    .sort((a, b) => submissionSort === "oldest"
      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      : submissionSort === "status"
        ? a.status.localeCompare(b.status)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const deletedGroups = Object.values(deletedImages.reduce<Record<string, DeletedImage[]>>((groups, image) => {
    (groups[image.deletion_group] ||= []).push(image);
    return groups;
  }, {}));
  return (
    <section className="submission-queue">
      <div className="section-heading">
        <div>
          <p className="section-no">SUBMISSIONS — REVIEW</p>
          <h2>{box === "inbox" ? "접수된 제보" : box === "completed" ? "처리한 제보" : "삭제 기록 이미지"}</h2>
        </div>
        <p>{box === "inbox" ? `접수 ${pendingCount}건` : box === "completed" ? `완료 ${completedCount}건` : `보관 ${deletedGroups.length}건`}</p>
      </div>
      <div className="submission-tools">
        <div className="submission-tabs" role="tablist" aria-label="제보함 선택">
          <button className={box === "inbox" ? "active" : ""} onClick={() => setBox("inbox")} role="tab" aria-selected={box === "inbox"}>접수된 제보 <span>{pendingCount}</span></button>
          <button className={box === "completed" ? "active" : ""} onClick={() => setBox("completed")} role="tab" aria-selected={box === "completed"}>처리한 제보 <span>{completedCount}</span></button>
          <button className={box === "deleted-images" ? "active" : ""} onClick={() => setBox("deleted-images")} role="tab" aria-selected={box === "deleted-images"}>삭제 기록 이미지 <span>{deletedGroups.length}</span></button>
        </div>
        {box !== "deleted-images" && <label>
          정렬
          <select value={submissionSort} onChange={(event) => setSubmissionSort(event.target.value as "newest" | "oldest" | "status")}>
            <option value="newest">최신 접수순</option>
            <option value="oldest">오래된 접수순</option>
            <option value="status">처리 상태순</option>
          </select>
        </label>}
      </div>
      {box === "deleted-images" ? (
        deletedGroups.length ? (
          <div className="deleted-image-groups">
            <p>삭제된 기록의 이미지는 검토를 위해 30일간 보관되며, 이후 이 화면을 열 때 자동으로 영구 삭제됩니다.</p>
            {deletedGroups.map((group) => (
              <article key={group[0].deletion_group}>
                <div className="deleted-image-head">
                  <div><span>삭제된 기록</span><h3>{group[0].record_name}</h3><time>{new Date(group[0].deleted_at).toLocaleString("ko-KR")}</time></div>
                  <button className="danger" onClick={() => purgeDeletedImages(group[0].deletion_group)}>전체 영구 삭제</button>
                </div>
                <div className="deleted-image-grid">
                  {group.map((image) => (
                    <figure key={image.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/profile-images/${encodeURIComponent(image.object_key)}`} alt={`${group[0].record_name} ${image.image_kind}`} loading="lazy" />
                      <figcaption>{image.image_kind}</figcaption>
                    </figure>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty"><b>검토할 삭제 이미지가 없습니다.</b></div>
      ) : visibleItems.length ? (
        <div className="submission-list">
          {visibleItems.map((item) => (
            <article key={item.id}>
              <div>
                <span>{item.submission_type}</span>
                <time>
                  {new Date(item.created_at).toLocaleDateString("ko-KR")}
                </time>
              </div>
              <h3>{item.creator_name}</h3>
              <p>{item.message}</p>
              <div className="submission-links">
                <a href={item.channel_url} target="_blank" rel="noreferrer">
                  채널 확인 ↗
                </a>
                {item.source_url && (
                  <a href={item.source_url} target="_blank" rel="noreferrer">
                    출처 확인 ↗
                  </a>
                )}
              </div>
              {(item.images || []).length > 0 && (
                <div className="submission-image-reviews">
                  <h4>첨부 이미지 {item.images?.length}장</h4>
                  {item.images?.map((image) => <SubmissionImageReview key={image.id} image={image} people={people} publish={publishImage} />)}
                </div>
              )}
              <label>
                <span>처리 상태</span>
                <select
                  value={item.status}
                  onChange={(event) => update(item.id, event.target.value)}
                >
                  <option value="pending">확인 대기</option>
                  <option value="reviewed">확인 완료</option>
                </select>
              </label>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <b>{box === "inbox" ? "접수된 제보가 없습니다." : "처리한 제보가 없습니다."}</b>
          {box === "completed" && <p>확인 완료한 제보가 이곳에 모입니다.</p>}
        </div>
      )}
    </section>
  );
}
function Footer({ go, adminDeployment }: { go: (v: View) => void; adminDeployment: boolean }) {
  return (
    <footer>
      <button onClick={() => go("home")}>OFF–AIR</button>
      <div>
        <button onClick={() => go("submit")}>기록 제보</button>
        <button onClick={() => go("privacy")}>개인정보·운영 안내</button>
        {adminDeployment && <button onClick={() => go("admin")}>관리</button>}
        <small>© 2026 OFF–AIR ARCHIVE</small>
      </div>
    </footer>
  );
}
