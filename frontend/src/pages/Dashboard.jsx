import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SealMark from "../components/ui/SealMark";

// Placeholder for this phase — the real admin dashboard (user management,
// stats) is built in the next phase. This just proves the authenticated
// route + shell + role data are all wired correctly end to end.
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <SealMark size={56} />
        <h1 className="font-display text-2xl font-semibold text-ink">
          Welcome, {user?.first_name}.
        </h1>
        <Badge variant={user?.type === "admin" ? "brass" : "default"}>
          {user?.type}
        </Badge>
        <p className="max-w-md text-sm text-slate">
          Your real dashboard — profile editing, and for admins, user
          management and platform stats — arrives in the next build phase.
          This route confirms the auth flow, protected routing, and role
          data are all working end to end.
        </p>
      </Card>
    </div>
  );
}
