import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getDetails, getRankings, type Movie, type DetailData } from "../api";
import PreviewOverlay from "../components/PreviewOverlay";

function RankingCarousel({ 
  title, 
  items, 
  onHover, 
  onLeave 
}: { 
  title: string, 
  items: Movie[],
  onHover: (item: Movie) => void,
  onLeave: () => void,
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const isInitialSetup = useRef(true);

  const PAGE_SIZE = 5; // Number of items to clone
  const canLoop = items.length > PAGE_SIZE;

  const renderList = canLoop ? [...items.slice(-PAGE_SIZE), ...items, ...items.slice(0, PAGE_SIZE)] : items;

  const setInitialScroll = () => {
    const track = trackRef.current;
    if (track && canLoop) {
      const itemWidth = track.scrollWidth / renderList.length;
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = itemWidth * PAGE_SIZE;
    }
  };

  const handleLooping = () => {
    const track = trackRef.current;
    if (!track || !canLoop) return;

    const itemWidth = track.scrollWidth / renderList.length;
    const scrollEnd = track.scrollWidth - track.clientWidth;

    if (track.scrollLeft > scrollEnd - itemWidth) {
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = itemWidth * PAGE_SIZE + (track.scrollLeft - scrollEnd);
      setTimeout(() => { if (track) track.style.scrollBehavior = 'smooth'; }, 50);
    }

    if (track.scrollLeft < itemWidth) {
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = scrollEnd - (itemWidth * PAGE_SIZE) - (itemWidth - track.scrollLeft);
      setTimeout(() => { if (track) track.style.scrollBehavior = 'smooth'; }, 50);
    }
  };

  const debouncedHandleScroll = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      handleLooping();
    }, 150);
  };

  useEffect(() => {
    if (canLoop && items.length > 0 && isInitialSetup.current) {
      setInitialScroll();
      isInitialSetup.current = false;
    }
  }, [items, canLoop]);

  useEffect(() => {
    const track = trackRef.current;
    if (track && canLoop) {
      track.addEventListener('scroll', debouncedHandleScroll);
      return () => track.removeEventListener('scroll', debouncedHandleScroll);
    }
  }, [canLoop]);

  const scroll = (dir: "left" | "right") => {
    const track = trackRef.current;
    if (!track) return;
    const scrollAmount = track.clientWidth * 0.7;
    track.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="section">
      <div className="head">
        <h2>{title}</h2>
      </div>
      <div className="nf-row">
        <button className="nf-arrow nf-left" onClick={() => scroll("left")}>‹</button>
        <div className="nf-track" ref={trackRef}>
          {renderList.map((m, idx) => (
            <Link 
              to={`/detail/${m.media_type}/${m.id}`} 
              className="card card-lg nf-item" 
              key={`${m.id}-${idx}`}
              onMouseEnter={() => onHover(m)}
              onMouseLeave={onLeave}
            >
              {m.rank && <div className="rank-tag">{m.rank}</div>}
              {m.media_type && m.media_type !== 'movie' && (
                <div className={`media-badge ${m.media_type}`}>{m.media_type}</div>
              )}
              {m.poster_url ? (
                <img className="poster" src={m.poster_url} alt={m.title} loading="lazy" />
              ) : (
                <div className="poster" />
              )}
              <div className="meta">
                <div className="title">{m.title}</div>
                <div className="sub">
                  {m.release_date || "-"} • ⭐ {m.vote_average?.toFixed(1) ?? "-"}
                </div>
                <p className="overview">{m.overview || "요약 정보 없음"}</p>
              </div>
            </Link>
          ))}
        </div>
        <button className="nf-arrow nf-right" onClick={() => scroll("right")}>›</button>
      </div>
    </section>
  );
}


export default function Home() {
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [tvList, setTvList] = useState<Movie[]>([]);
  const [previewDetails, setPreviewDetails] = useState<DetailData | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [movies, tvs] = await Promise.all([
          getRankings("movie", "popular", "KR", "ko-KR", 10),
          getRankings("tv", "popular", "KR", "ko-KR", 10)
        ]);
        setMovieList(movies);
        setTvList(tvs);
      } catch (error) {
        console.error("Error fetching rankings:", error);
      }
    })();
  }, []);

  const handleCardHover = (item: Movie) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(async () => {
      if (!item.media_type) return;
      try {
        const details = await getDetails(item.media_type, item.id);
        setPreviewDetails(details);
      } catch (error) {
        console.error("Failed to fetch preview details", error);
      }
    }, 700);
  };

  const handleCardLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const closePreview = () => {
    setPreviewDetails(null);
  };

  return (
    <>
      <RankingCarousel 
        title="오늘 대한민국의 TOP 10 영화" 
        items={movieList} 
        onHover={handleCardHover} 
        onLeave={handleCardLeave} 
      />
      <RankingCarousel 
        title="오늘 대한민국의 TOP 10 TV 시리즈" 
        items={tvList} 
        onHover={handleCardHover} 
        onLeave={handleCardLeave} 
      />
      {previewDetails && (
        <PreviewOverlay
          details={previewDetails}
          onClose={closePreview}
        />
      )}
    </>
  );
}
