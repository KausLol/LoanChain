import { Home, FileText, Folder, Layers, History } from "lucide-react";

export default function Sidebar({ page, setPage }) {
  const navLinks = [
    { id: "dashboard",    label: "Dashboard",       icon: Home },
    { id: "new-loan",     label: "New Application", icon: FileText },
    { id: "documents",    label: "My Documents",    icon: Folder },
    { id: "applications", label: "Applications",    icon: Layers },
    { id: "audit",        label: "Audit Log",       icon: History },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = page === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
