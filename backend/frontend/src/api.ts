import axios from "axios";

export const API = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 8000,
});

export type Movie = {
  id: number;
  title: string;
  release_date?: string;
  overview?: string;
  vote_average?: number;
  poster_url?: string | null;
  rank?: number;
  media_type?: "movie" | "tv" | "person";
};

export const searchMovies = async (q: string): Promise<Movie[]> => {
  const { data } = await API.get("/search", { params: { q } });
  return data.results as Movie[];
};

export const autocomplete = async (prefix: string, signal?: AbortSignal) => {
  const { data } = await API.get("/autocomplete", { params: { prefix }, signal });
  return data.suggestions as {
    id: number;
    title: string;
    release_date?: string;
    poster_url?: string | null;
    media_type?: "movie" | "tv" | "person";
  }[];
};


export const getRankings = async (
  media_type: "movie" | "tv" = "movie",
  list_type: "popular" | "top_rated" | "trending" = "popular",
  region: string = "KR",
  lang: string = "ko-KR",
  limit: number = 10
) => {
  const { data } = await API.get("/rankings", { params: { media_type, list_type, region, lang, limit } });
  return data.results as Movie[];
};

export type DetailData = Movie & {
  backdrop_url?: string | null;
  genres?: string[];
  trailer_url?: string | null;
  keywords?: string[];
};

export const getDetails = async (mediaType: string, id: number): Promise<DetailData> => {
  const { data } = await API.get(`/details/${mediaType}/${id}`);
  return data as DetailData;
};
