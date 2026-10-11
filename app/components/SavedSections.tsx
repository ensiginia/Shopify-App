import ResourcesLayout from "./ResourcesLayout";
import SectionsPage from "./SectionsPage";
import "./saved-sections.css";
export default function SavedSections({live=false,shop="local"}:{live?:boolean;shop?:string}){return <ResourcesLayout live={live} title="Saved Sections" subtitle="Sections you've saved for later. Click the heart icon on any section to add it here." active="saved"><div className="saved-sections-content"><SectionsPage savedOnly favoritesKey={`ss-section-favorites:${shop}`} homeHref={live?"/app":"/"}/></div></ResourcesLayout>}
