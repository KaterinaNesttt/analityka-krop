import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function IndexRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
    else if (user.status !== "approved") navigate("/pending", { replace: true });
    else navigate(user.role === "user" ? "/analytics" : "/dashboard", { replace: true });
  }, [user, loading, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-sm text-muted-foreground">Завантаження…</div>
    </div>
  );
}
