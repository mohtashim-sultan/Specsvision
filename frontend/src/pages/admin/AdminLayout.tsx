import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Eye, LayoutDashboard, Package, Receipt, LogOut, Store, ChevronRight, Menu, X, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/common/ThemeToggle";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package, end: false },
  { to: "/admin/orders", label: "Orders", icon: Receipt, end: false },
];

const navCls = ({ isActive }: { isActive: boolean }) =>
  [
    "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
    isActive
      ? "bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-lg shadow-purple-500/25"
      : "text-gray-600 hover:bg-purple-50 hover:text-purple-800",
  ].join(" ");

export default function AdminLayout() {
  const { admin, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !admin) navigate("/login", { replace: true });
  }, [admin, loading, navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 font-body text-gray-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  const initials = (admin.full_name || admin.email)
    .split(/\s+/)
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/admin") return "Dashboard";
    if (path.includes("/products")) return "Products";
    if (path.includes("/orders")) return "Orders";
    return "Admin";
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 shadow-md shadow-purple-500/20">
          <Eye className="h-5 w-5 text-white" strokeWidth={2.2} />
        </div>
        <Link to="/admin" className="text-lg font-bold">
          <span style={{ color: 'var(--text-primary)' }}>Specs</span>
          <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">Vision</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Menu
        </p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navCls}>
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User info + actions */}
      <div className="border-t p-4" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-inner"
            style={{ backgroundColor: 'var(--surface-bg-secondary)', color: 'var(--text-accent)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {admin.full_name || "Admin"}
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
              {admin.email}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-accent)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Store className="h-4 w-4" />
            View storefront
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className="flex min-h-screen font-body"
      style={{ backgroundColor: 'var(--bg-page-start)', color: 'var(--text-primary)' }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="z-40 hidden w-64 flex-col md:flex sticky top-0 h-screen"
        style={{ backgroundColor: 'var(--surface-bg)', borderRight: '1px solid var(--border-color)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative z-10 flex h-full w-72 flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--surface-bg)' }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8"
          style={{
            backgroundColor: 'var(--surface-bg)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {/* Admin avatar (desktop) */}
            <div
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold cursor-default"
              style={{ backgroundColor: 'var(--surface-bg-secondary)', color: 'var(--text-accent)' }}
              title={admin.email}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
