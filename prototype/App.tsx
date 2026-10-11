import { useEffect } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import Dashboard from "../app/components/Dashboard";
import SectionsPage from "../app/components/SectionsPage";
import ConversionBlocks from "../app/components/ConversionBlocks";
import ConversionTranslations from "../app/components/ConversionTranslations";
import BundlesPage from "../app/components/BundlesPage";
import ThemeMigrator from "../app/components/ThemeMigrator";
import HelpPage from "../app/components/HelpPage";
import SavedSections from "../app/components/SavedSections";
import AIPages from "../app/components/AIPages";
import ABTests from "../app/components/ABTests";
import CartDrawer from "../app/components/CartDrawer";
import "./shell.css";

function DashboardRoute() {
  const navigate = useNavigate();
  return <Dashboard onAuditBrowse={query => navigate("/sections?q=" + encodeURIComponent(query))} onAI={how => navigate("/ai-pages" + (how ? "?how=1" : ""))} onCart={() => navigate("/cart-drawer")} onBundles={() => navigate("/bundles")} onExplore={() => navigate("/sections")} onConversion={() => navigate("/conversion-blocks")} />;
}
function Shell() {
  const location = useLocation();
  useEffect(() => {
    document.title = `Section Store · ${location.pathname.startsWith("/cart-drawer") ? "Cart Drawer" : location.pathname === "/ai-pages" ? "AI Pages" : location.pathname === "/ab-tests" ? "A/B Tests" : location.pathname === "/bundles" ? "Bundles" : location.pathname === "/conversion-blocks" ? "Conversion Blocks" : location.pathname === "/sections" ? "Sections" : location.pathname === "/theme-migrator" ? "Theme Migrator" : location.pathname === "/saved-sections" ? "Saved Sections" : location.pathname === "/help" ? "Help & Resources" : "Dashboard"}`;
    if (location.hash) {
      const frame = window.requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      );
      return () => window.cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  return (
    <div className="ss-prototype-shell">

      <div className="ss-prototype-content">
        <Routes>
          <Route path="/" element={<DashboardRoute />} />
          <Route path="/sections" element={<SectionsPage />} />
          <Route path="/cart-drawer" element={<CartDrawer />} />
          <Route path="/cart-drawer/new" element={<CartDrawer editor />} />
          <Route path="/saved-sections" element={<SavedSections />} />
          <Route path="/theme-migrator" element={<ThemeMigrator />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/ai-pages" element={<AIPages />} />
          <Route path="/ab-tests" element={<ABTests />} />
          <Route path="/bundles" element={<BundlesPage />} />
          <Route path="/conversion-blocks" element={<ConversionBlocks />} />
          <Route path="/conversion-translations" element={<ConversionTranslations />} />
          <Route path="*" element={<DashboardRoute />} />
        </Routes>
      </div>
    </div>
  );
}
export default function PrototypeApp() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
