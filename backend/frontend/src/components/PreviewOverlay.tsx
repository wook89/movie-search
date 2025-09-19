import type { DetailData } from "../api";
import { Link } from "react-router-dom";
import "./PreviewOverlay.css";

interface PreviewOverlayProps {
  details: DetailData;
  onClose: () => void;
}

export default function PreviewOverlay({ details, onClose }: PreviewOverlayProps) {
  const trailerUrl = details.trailer_url
    ? details.trailer_url.replace("watch?v=", "embed/") + "?autoplay=1&mute=0&controls=0"
    : null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="preview-overlay-backdrop" onClick={handleBackdropClick}>
      <div className="preview-overlay">
        <div className="preview-media">
          {trailerUrl ? (
            <iframe
              src={trailerUrl}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            details.backdrop_url ? (
              <img src={details.backdrop_url} alt="" className="preview-backdrop" />
            ) : (
              <div className="preview-backdrop" /> // Placeholder div
            )
          )}
        </div>
        <div className="preview-content">
          <Link to={`/detail/${details.media_type}/${details.id}`}>
            <h3>{details.title}</h3>
            <p>{details.overview}</p>
          </Link>
          <Link to={`/detail/${details.media_type}/${details.id}`} className="btn-view-details">
            View Full Details
          </Link>
        </div>
      </div>
    </div>
  );
}
