// src/App.tsx  — Router 중복 제거 버전
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Detail from "./pages/Detail";
import "./styles.css";
import TopSearch from "./components/TopSearch";

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        {/* 왼쪽 로고 */}
        <div className="brand">
          <Link to="/" className="brand-link">🎬 MovieSense</Link>
        </div>

        {/* 오른쪽 검색 */}
        <nav className="nav">
          <TopSearch />
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  // ✅ Router는 main.tsx에서만 감쌉니다.
  return (
    <>
      <Header />
      <main className="section">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/detail/:mediaType/:id" element={<Detail />} />
        </Routes>
      </main>
    </>
  );
}
