import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export function PendingPage() {
  const { user, loading, logout, refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
    if (user?.status === "approved")
      navigate(user.role === "user" ? "/analytics" : "/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
          <Clock className="h-8 w-8 text-accent-foreground" />
        </div>
        <h1 className="text-2xl font-semibold">Очікування підтвердження</h1>
        <p className="mt-3 text-muted-foreground">
          Ваш акаунт очікує підтвердження адміністратором. Після підтвердження ви отримаєте повний
          доступ до платформи.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={() => refresh()}>
            Оновити статус
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await logout();
              navigate("/auth");
            }}
          >
            Вийти
          </Button>
        </div>
      </div>
    </div>
  );
}
