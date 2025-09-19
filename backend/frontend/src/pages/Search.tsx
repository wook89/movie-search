import { useEffect, useState, useRef } from "react";
import { searchMovies, getDetails, type Movie, type DetailData } from "../api";
import { useLocation, Link } from "react-router-dom";
import PreviewOverlay from "../components/PreviewOverlay";

export default function Search() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const q = params.get("q") ?? "";

  const [results, setResults] = useState<Movie[]>([]);
  const [previewDetails, setPreviewDetails] = useState<DetailData | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // When a new search is performed, close any open preview
    setPreviewDetails(null);

    const runSearch = async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        const data = await searchMovies(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      }
    };

    runSearch(q);
  }, [q]);

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
      <section className="section">
        <div className="head">
          <h2>검색 결과: {q}</h2>
        </div>
        <div className="container">
          {results.length > 0 ? (
            <div className="cards">
              {results.map((m) => (
                <Link 
                  to={`/detail/${m.media_type}/${m.id}`} 
                  key={m.id} 
                  className="card"
                  onMouseEnter={() => handleCardHover(m)}
                  onMouseLeave={handleCardLeave}
                >
                  {m.media_type && m.media_type !== 'movie' && (
                    <div className={`media-badge ${m.media_type}`}>{m.media_type}</div>
                  )}
                  {m.poster_url ? (
                    <img src={m.poster_url} alt={m.title} className="poster" />
                  ) : (
                    <div className="poster" />
                  )}
                  <div className="meta">
                    <div className="title">{m.title}</div>
                    <div className="sub">{m.release_date}</div>
                    <div className="overview">{m.overview}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p>"{q}"에 대한 검색 결과가 없습니다.</p>
          )}
        </div>
      </section>
      {previewDetails && (
        <PreviewOverlay
          details={previewDetails}
          onClose={closePreview}
        />
      )}
    </>
  );
}
