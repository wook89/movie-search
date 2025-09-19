import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { autocomplete } from "../api";
import type { Movie } from "../api";

/**
 * 상단바 전역 검색 인풋
 * - Search.tsx의 자동완성 UX를 최대한 그대로 반영
 * - Enter 또는 항목 선택 시 /search?q=... 로 이동
 */
export default function TopSearch() {
  const navigate = useNavigate();
  const location = useLocation();

  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<Partial<Movie>[]>([]);
  const [openSugs, setOpenSugs] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<HTMLDivElement[]>([]);

  const debounceRef = useRef<number | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const suppressRef = useRef(false);
  const blockOpenRef = useRef<string | null>(null);

  const closeDropdown = (opts?: { external?: boolean }) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (acRef.current) { acRef.current.abort(); acRef.current = null; }
    suppressRef.current = true;
    if (opts?.external) blockOpenRef.current = q || "";
    setOpenSugs(false);
    setSugs([]);
    setHighlighted(-1);
  };

  const goSearch = (text?: string) => {
    const query = (text ?? q).trim();
    if (!query) return;
    closeDropdown();
    // /search?q=... 로 이동
    const usp = new URLSearchParams(location.search);
    usp.set("q", query);
    navigate(`/search?${usp.toString()}`);
  };

  const selectSuggestion = (s: Partial<Movie>) => {
    closeDropdown();
    setQ(s.title!);
    goSearch(s.title!);
    inputRef.current?.blur();
  };

  // URL과 검색창의 상태를 동기화
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryFromUrl = params.get('q') ?? '';

    if (location.pathname === '/search') {
      // 검색 페이지에 있으면 URL의 q를 검색창에 설정
      if (q !== queryFromUrl) {
        setQ(queryFromUrl);
      }
    } else {
      // 그 외 페이지에서는 검색창을 비움
      if (q !== '') {
        setQ('');
      }
    }
  }, [location.pathname, location.search]);

  // 자동완성 (디바운스 + 요청 취소 + 외부닫힘 락)
  useEffect(() => {
    // q가 바뀌면 바깥닫힘 락 해제
    if (blockOpenRef.current !== null && blockOpenRef.current !== q) {
      blockOpenRef.current = null;
    }

    if (!q.trim()) { closeDropdown(); suppressRef.current = false; return; }

    // 동일 q 재오픈 금지
    if (blockOpenRef.current !== null && blockOpenRef.current === q) return;

    if (suppressRef.current) { suppressRef.current = false; return; }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (acRef.current) { acRef.current.abort(); acRef.current = null; }

    const ctrl = new AbortController();
    acRef.current = ctrl;

    debounceRef.current = window.setTimeout(async () => {
      try {
        const data = await autocomplete(q.trim(), ctrl.signal);
        if (blockOpenRef.current !== null && blockOpenRef.current === q) return;
        setSugs(data);
        setOpenSugs(true);
        setHighlighted(-1);
      } catch (err: any) {
        // 사용자가 타이핑을 멈추거나 포커스를 잃은 경우 취소 에러 무시
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || err?.name === "AbortError") return;
        closeDropdown();
      } finally {
        if (acRef.current === ctrl) acRef.current = null;
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (acRef.current === ctrl) { ctrl.abort(); acRef.current = null; }
    };
  }, [q]);

  // 하이라이트 보이게 스크롤
  useEffect(() => {
    if (!openSugs || highlighted < 0) return;
    itemRefs.current[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [highlighted, openSugs]);

  // 바깥 클릭 → 즉시 닫기(요청 취소 + 락 설정), 캡처 단계 사용
  useEffect(() => {
    const onOutside = (e: PointerEvent) => {
      if (!openSugs) return;
      const el = boxRef.current;
      if (el && !el.contains(e.target as Node)) {
        closeDropdown({ external: true });
      }
    };
    window.addEventListener("pointerdown", onOutside, { capture: true });
    return () => window.removeEventListener("pointerdown", onOutside, { capture: true } as any);
  }, [openSugs, q]);

  return (
    <div className="nav-search" ref={boxRef}>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="nav-input"
        placeholder="영화·TV·인물 검색..."
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && openSugs && sugs.length) {
            e.preventDefault(); setHighlighted((p) => (p + 1) % sugs.length); return;
          }
          if (e.key === "ArrowUp" && openSugs && sugs.length) {
            e.preventDefault(); setHighlighted((p) => (p > 0 ? p - 1 : sugs.length - 1)); return;
          }
          if (e.key === "Enter") {
            if (openSugs && highlighted >= 0 && highlighted < sugs.length) {
              e.preventDefault(); selectSuggestion(sugs[highlighted]);
            } else {
              goSearch();
            }
          }
          if (e.key === "Escape") { e.preventDefault(); closeDropdown(); }
        }}
      />

      {openSugs && sugs.length > 0 && (
        <div className="nav-dropdown">
          {sugs.map((s, i) => (
            <div
              key={s.id}
              ref={(el) => (itemRefs.current[i] = el!)}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => selectSuggestion(s)}
              className={`nav-sug ${i === highlighted ? "active" : ""}`}
            >
              <div style={{ position: 'relative' }}>
                {s.poster_url ? (
                  <img className="nav-thumb" src={s.poster_url} alt="" />
                ) : (
                  <div className="nav-thumb" />
                )}
                {s.media_type && s.media_type !== 'movie' && (
                  <div className={`media-badge ${s.media_type}`} style={{ top: '4px', right: '4px', fontSize: '9px', padding: '2px 4px' }}>
                    {s.media_type}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.release_date || "-"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
