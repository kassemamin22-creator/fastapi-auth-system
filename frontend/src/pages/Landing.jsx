import { Link } from "react-router-dom";
import SealMark from "../components/ui/SealMark";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const FEATURES = [
  {
    title: "Every identity, accounted for",
    body: "Deletions are never destructive. Accounts are retired, not erased — so your audit trail stays intact and nothing important quietly disappears.",
  },
  {
    title: "Access, by design",
    body: "Every account is either admin or client, enforced at the API — not by convention. Roles decide what's visible before a single query runs.",
  },
  {
    title: "Built on verified sessions",
    body: "Every request carries a signed, expiring token. No session lives longer than it's supposed to, and no request is trusted on faith.",
  },
];

export default function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden bg-ink">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, var(--color-vault) 0%, transparent 60%)",
          }}
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-28 text-center">
          <SealMark size={120} className="mb-10" />
          <h1 className="font-display text-5xl font-semibold tracking-tight text-mist sm:text-6xl">
            Identity, <em className="italic text-brass">verified.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist/70">
            Vaultkeep is the identity layer for teams who take access
            seriously — registration, roles, and session security, built as
            a foundation instead of an afterthought.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="primary" className="px-7 py-3 text-base">
                Get started
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="px-7 py-3 text-base">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Why this exists
          </h2>
          <p className="mt-4 text-slate">
            Most auth systems are bolted on. Vaultkeep is designed the other
            way around — every account, role, and session decision made
            explicit from the start.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <h3 className="font-display text-lg font-semibold text-ink">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                {feature.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-ink">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center">
          <h2 className="font-display text-3xl font-semibold text-mist">
            Ready to secure your users?
          </h2>
          <p className="mt-4 max-w-lg text-mist/70">
            Create an account in under a minute — no credit card, no
            friction.
          </p>
          <Link to="/register" className="mt-8">
            <Button variant="primary" className="px-7 py-3 text-base">
              Create your account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
