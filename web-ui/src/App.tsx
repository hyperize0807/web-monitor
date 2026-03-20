import { Routes, Route, NavLink } from "react-router-dom";
import SourcesPage from "./pages/SourcesPage";
import CrawlLogsPage from "./pages/CrawlLogsPage";
import PostsPage from "./pages/PostsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">WebMonitor</div>
        <nav>
          <NavLink to="/" end>
            <span>&#9776;</span> 모니터링 소스
          </NavLink>
          <NavLink to="/crawl-logs">
            <span>&#128472;</span> 크롤링 이력
          </NavLink>
          <NavLink to="/posts">
            <span>&#128196;</span> 감지된 게시물
          </NavLink>
          <NavLink to="/notifications">
            <span>&#128276;</span> 알림 이력
          </NavLink>
          <NavLink to="/settings">
            <span>&#9881;</span> 알림 설정
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<SourcesPage />} />
          <Route path="/crawl-logs" element={<CrawlLogsPage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
