from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List
from pathlib import Path
import os
import httpx
from dotenv import load_dotenv

# .env 로드 (BOM 안전, 루트에서 읽기)
load_dotenv(Path(__file__).resolve().parents[2] / ".env", encoding="utf-8-sig")

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
IMG_BASE = "https://image.tmdb.org/t/p"

app = FastAPI(title="Movie Search API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

def map_result(m: Dict[str, Any]) -> Dict[str, Any]:
    media_type = m.get("media_type")
    
    title = m.get("title") or m.get("name")
    
    if media_type == 'movie':
        release_date = m.get("release_date")
        poster_path = m.get("poster_path")
        overview = m.get("overview")
    elif media_type == 'tv':
        release_date = m.get("first_air_date")
        poster_path = m.get("poster_path")
        overview = m.get("overview")
    elif media_type == 'person':
        release_date = m.get("known_for_department", "")
        poster_path = m.get("profile_path")
        known_for_titles = [i.get('title') or i.get('name') for i in m.get('known_for', []) if i.get('title') or i.get('name')]
        overview = f"주요 출연작: {', '.join(known_for_titles)}" if known_for_titles else ""
    else:
        release_date = None
        poster_path = None
        overview = None

    return {
        "id": m.get("id"),
        "title": title,
        "release_date": release_date,
        "overview": overview,
        "vote_average": m.get("vote_average"),
        "poster_url": f"{IMG_BASE}/w342{poster_path}" if poster_path else None,
        "media_type": media_type,
    }

@app.get("/search")
async def search(q: str = Query(..., description="검색어(자연어/키워드)"),
                 lang: str = "ko-KR", page: int = 1):
    if not TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY is missing")

    params = {
        "api_key": TMDB_API_KEY,
        "query": q,
        "language": lang,
        "page": page,
        "include_adult": "false",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get("https://api.themoviedb.org/3/search/multi", params=params)
        r.raise_for_status()
        data = r.json()

    results = [map_result(m) for m in data.get("results", []) if m.get("media_type") in ["movie", "tv", "person"]]
    return {"query": q, "results": results}

@app.get("/autocomplete")
async def autocomplete(prefix: str, lang: str = "ko-KR", limit: int = 10):
    if not TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY is missing")

    params = {
        "api_key": TMDB_API_KEY,
        "query": prefix,
        "language": lang,
        "page": 1,
        "include_adult": "false",
    }
    async with httpx.AsyncClient(timeout=8.0) as client:
        r = await client.get("https://api.themoviedb.org/3/search/multi", params=params)
        r.raise_for_status()
        data = r.json()

    suggestions = []
    filtered_results = [m for m in data.get("results", []) if m.get("media_type") in ["movie", "tv", "person"]]
    
    for m in filtered_results[:limit]:
        media_type = m.get("media_type")
        title = m.get("title") or m.get("name")
        
        if media_type == 'movie':
            release_date = m.get("release_date")
            poster_path = m.get("poster_path")
        elif media_type == 'tv':
            release_date = m.get("first_air_date")
            poster_path = m.get("poster_path")
        elif media_type == 'person':
            release_date = m.get("known_for_department", "")
            poster_path = m.get("profile_path")
        else:
            release_date = None
            poster_path = None

        suggestions.append({
            "id": m.get("id"),
            "title": title,
            "release_date": release_date,
            "poster_url": f"{IMG_BASE}/w154{poster_path}" if poster_path else None,
            "media_type": media_type,
        })
    return {"prefix": prefix, "suggestions": suggestions}

@app.get("/rankings")
async def rankings(
    media_type: str = "movie",
    list_type: str = "popular",
    region: str = "KR", 
    lang: str = "ko-KR", 
    limit: int = 10
):
    """
    홈 화면용 TOP 리스트.
    media_type: movie | tv
    list_type: popular | top_rated | trending
    region: KR 등 (popular/top_rated에서만 사용)
    """
    if not TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY is missing")
    
    if media_type not in ["movie", "tv"]:
        raise HTTPException(status_code=400, detail="media_type must be 'movie' or 'tv'")

    async with httpx.AsyncClient(timeout=10.0) as client:
        if list_type == "trending":
            url = f"https://api.themoviedb.org/3/trending/{media_type}/day"
            params = {"api_key": TMDB_API_KEY, "language": lang}
        else:
            url = f"https://api.themoviedb.org/3/{media_type}/{list_type}"
            params = {"api_key": TMDB_API_KEY, "language": lang, "region": region, "page": 1}

        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

    for item in data.get("results", []):
        item['media_type'] = media_type

    out = [map_result(m) for m in data.get("results", [])[:max(1, min(limit, 20))]]
    
    for i, m in enumerate(out, start=1):
        m["rank"] = i
        
    return {"type": list_type, "media_type": media_type, "region": region, "results": out}

@app.get("/details/{media_type}/{item_id}")
async def get_details(media_type: str, item_id: int, lang: str = "ko-KR"):
    if not TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY is missing")
    if media_type not in ["movie", "tv", "person"]:
        raise HTTPException(status_code=400, detail="Invalid media_type")

    params = {
        "api_key": TMDB_API_KEY,
        "language": lang,
        "append_to_response": "videos,keywords"
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        url = f"https://api.themoviedb.org/3/{media_type}/{item_id}"
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

    # Extract trailer
    trailer = None
    if "videos" in data and "results" in data["videos"]:
        for video in data["videos"]["results"]:
            if video.get("site") == "YouTube" and video.get("type") == "Trailer":
                trailer = f"https://www.youtube.com/watch?v={video.get('key')}"
                break
    
    # Extract keywords
    keywords = []
    if "keywords" in data:
        kw_data = data["keywords"]
        keywords = [kw.get("name") for kw in kw_data.get("keywords", []) or kw_data.get("results", [])]


    # Basic details
    details = {
        "id": data.get("id"),
        "title": data.get("title") or data.get("name"),
        "overview": data.get("overview") or data.get("biography"),
        "poster_url": f"{IMG_BASE}/w780{data.get('poster_path')}" if data.get("poster_path") else None,
        "backdrop_url": f"{IMG_BASE}/w1280{data.get('backdrop_path')}" if data.get("backdrop_path") else None,
        "release_date": data.get("release_date") or data.get("first_air_date"),
        "vote_average": data.get("vote_average"),
        "genres": [g.get("name") for g in data.get("genres", [])],
        "trailer_url": trailer,
        "keywords": keywords,
        "media_type": media_type,
    }
    
    if media_type == "person":
        details["poster_url"] = f"{IMG_BASE}/w780{data.get('profile_path')}" if data.get("profile_path") else None


    return details