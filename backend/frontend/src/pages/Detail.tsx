import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDetails, type DetailData } from "../api";
import "../styles.css";

export default function Detail() {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const [details, setDetails] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaType || !id) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const data = await getDetails(mediaType, parseInt(id, 10));
        setDetails(data);
      } catch (err) {
        setError("Failed to fetch details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [mediaType, id]);

  if (loading) {
    return <div className="container"><p>Loading...</p></div>;
  }

  if (error) {
    return <div className="container"><p>{error}</p></div>;
  }

  if (!details) {
    return <div className="container"><p>No details found.</p></div>;
  }

  return (
    <div>
      {details.backdrop_url && (
        <div
          className="backdrop"
          style={{ backgroundImage: `url(${details.backdrop_url})` }}
        ></div>
      )}

      <div className="container" style={{ position: 'relative', zIndex: 2, marginTop: details.backdrop_url ? '-200px' : '0' }}>
        <div className="detail-grid">
          <div className="detail-poster">
            {details.poster_url ? 
              <img src={details.poster_url} alt={details.title} /> : 
              <div className="poster-placeholder" />
            }
          </div>

          <div className="detail-info">
            <h1>{details.title}</h1>
            <div className="sub-info">
              {details.release_date && <span>{details.release_date}</span>}
              {details.vote_average && details.vote_average > 0 && (
                <span>⭐ {details.vote_average.toFixed(1)}</span>
              )}
            </div>
            {details.genres && details.genres.length > 0 && (
              <div className="genres">
                {details.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
              </div>
            )}
            <p className="overview">{details.overview}</p>
            {details.trailer_url && (
              <a href={details.trailer_url} target="_blank" rel="noopener noreferrer" className="btn-trailer">
                ▶️ Watch Trailer
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
