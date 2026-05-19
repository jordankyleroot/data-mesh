import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';
import SchemasPage from './pages/SchemasPage';
import TopicsPage from './pages/TopicsPage';
import AccessPage from './pages/AccessPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">Data Mesh</span>
          </div>
          <NavLink to="/"         end>Catalog</NavLink>
          <NavLink to="/schemas">Schemas</NavLink>
          <NavLink to="/topics">Topics</NavLink>
          <NavLink to="/access">Access</NavLink>
        </nav>
        <main className="content">
          <Routes>
            <Route path="/"        element={<CatalogPage />} />
            <Route path="/schemas" element={<SchemasPage />} />
            <Route path="/topics"  element={<TopicsPage />} />
            <Route path="/access"  element={<AccessPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
