import React, { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Eye, LayoutDashboard, Package, Receipt } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navCls = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
    isActive
      ? "bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-md"
      : "text-gray-600 hover:bg-purple-50 hover:text-purple-800",
  ].join(" ");

export default function AdminLayout() {
  const { admin, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !admin) navigate("/login", { replace: true });
  }, [admin, loading, navigate]);

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 font-body text-gray-800">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  const initials = (admin.full_name || admin.email)
    .split(/\s+/)
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50 via-[#faf8ff] to-pink-50 font-body text-gray-900">
      <aside className="z-40 hidden w-64 flex-col border-r border-purple-100 bg-white/95 shadow-sm backdrop-blur-sm md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-purple-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-500">
            <Eye className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <Link to="/admin" className="text-lg font-bold">
            <span className="text-violet-900">Specs</span>
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">Vision</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink to="/admin" end className={navCls}>
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            Dashboard
          </NavLink>
          <NavLink to="/admin/products" className={navCls}>
            <Package className="h-5 w-5 shrink-0" />
            Products
          </NavLink>
          <NavLink to="/admin/orders" className={navCls}>
            <Receipt className="h-5 w-5 shrink-0" />
            Orders
          </NavLink>
        </nav>
        <div className="mt-auto border-t border-purple-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-800">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{admin.full_name || "Admin"}</p>
              <p className="truncate text-xs text-gray-500">{admin.email}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/" className="text-sm font-medium text-purple-700 hover:underline">
              View storefront
            </Link>
            <button type="button" onClick={logout} className="text-left text-sm text-gray-600 hover:text-pink-600">
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-purple-100 bg-white/90 px-4 shadow-sm backdrop-blur-md sm:h-16 sm:px-6">
          <h1 className="text-base font-bold text-gray-900 sm:text-lg">Admin</h1>
          <div className="flex items-center gap-3 md:hidden">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => (isActive ? "text-purple-700 font-semibold" : "text-sm text-gray-600")}
            >
              Home
            </NavLink>
            <NavLink
              to="/admin/products"
              className={({ isActive }) => (isActive ? "text-purple-700 font-semibold" : "text-sm text-gray-600")}
            >
              Products
            </NavLink>
            <NavLink
              to="/admin/orders"
              className={({ isActive }) => (isActive ? "text-purple-700 font-semibold" : "text-sm text-gray-600")}
            >
              Orders
            </NavLink>
          </div>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
