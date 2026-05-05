import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@features/auth/AuthContext";
import type { Role } from "@/data/types";

export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Učitavanje...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
