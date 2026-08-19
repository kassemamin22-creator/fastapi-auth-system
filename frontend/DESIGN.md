# Vaultkeep — design system

Concept: an identity/auth product should feel like a precision security
mechanism — a vault door, an official seal — not a generic SaaS blue
dashboard. "Trust, security, precision" expressed as engineering +
ceremony, not as another blue-on-white admin panel.

## Palette

| Name    | Hex       | Role                                              |
| ------- | --------- | -------------------------------------------------- |
| ink     | `#14132B` | nav bar, primary text, dark surfaces               |
| vault   | `#4B3F94` | primary actions, links, focus rings                |
| brass   | `#C2913C` | the one warm accent — seal mark, premium/verified   |
| mist    | `#F6F4FB` | base background (cool off-white, not cream/pure white) |
| fog     | `#E4E1F0` | borders, dividers, subtle surfaces                 |
| slate   | `#625C7A` | secondary/tertiary text                            |
| danger  | `#C1394F` | errors (utility, not core brand)                   |
| success | `#2E8B6F` | success states (utility, not core brand)            |

Deliberately not: warm cream + terracotta, near-black + acid green, or a
zero-radius newspaper layout. Cool indigo-violet + a single warm brass note
instead.

## Typography

- **Fraunces** (display, `font-display`) — headline moments only. Ceremonial/
  engraved character, used with tight tracking and occasional italic for
  emphasis words.
- **IBM Plex Sans** (`font-sans`, default body) — chosen over Inter
  specifically to avoid the "Inter for everything" default.
- **IBM Plex Mono** (`font-mono`) — reserved for numerals/data (stat
  figures, IDs) in the dashboard phase.

## Layout

- Top nav (not sidebar) for public/auth pages — a sidebar implies logged-in
  app chrome, which this phase doesn't have yet. Revisit for the dashboard
  phase, where a sidebar is the right call.
- `rounded-xl` as the one consistent radius everywhere.
- Spacious hero rhythm (`py-24`+) on marketing sections, tighter density in
  forms/cards.

## Signature element — the Seal Mark

`src/components/ui/SealMark.jsx` — a custom SVG (not a stock icon): a brass
ring of 24 tick marks (like a combination-lock dial) rotating slowly
(60s linear) around a fixed inner ink disc with a vault-glyph outline.
Mechanism + stillness in one mark.

Used: small as the nav logo (`size={30}`), large as the landing hero's
focal visual (`size={120}`), static (`spinning={false}`) in the footer.
Reserved for later reuse as a "verified/admin" badge in the dashboard.

## What's next (not built in this phase)

- Admin dashboard: user management (list/filter/paginate, edit, soft
  delete) and the three `/stats/*` endpoints, likely as a sidebar-nav
  layout distinct from the public Shell.
- Role-gated nav items (`useAuth().isAdmin` already exposed — see the TODO
  in `NavBar.jsx`).
- Self profile editing (`PUT /users/me`) on a proper account page.
