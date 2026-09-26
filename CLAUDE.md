# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

A single-clinic CRM for **PrimeMotion Physiotherapy** (see `src/lib/clinic.ts` — edit clinic
name/address/logo there, it's used everywhere including invoices). Manages patients,
appointments, treatment sessions, payments, and follow-ups. Single-tenant, single-user
(PIN-based auth, no multi-user accounts).

Stack: Next.js 16 (App Router, RSC), React 19, TypeScript, Prisma 7 (Neon serverless Postgres
adapter), Tailwind v4, shadcn/ui (`base-nova` style), react-hook-form + zod, uploadthing for
file uploads, deployed on Vercel (Hobby plan — region pinned to `sin1`).

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # eslint
npm run db:generate   # prisma generate (client output goes to src/generated/prisma)
npm run db:migrate    # prisma migrate dev
npm run db:push       # prisma db push (no migration file)
npm run db:seed       # tsx prisma/seed.ts
```

There is no test suite in this repo currently.

## Architecture

- Route groups: `src/app/(auth)/login`, `src/app/(dashboard)/...` — dashboard layout wraps
  patients, appointments, billing, and the home/dashboard page.
- API routes under `src/app/api/*` are the only place that talks to Prisma from request
  handlers; pages/components call these routes or use server components directly.
- `src/lib/prisma.ts` — singleton Prisma client using `@prisma/adapter-neon`. Reuse this
  import, never instantiate `PrismaClient` elsewhere.
- `src/lib/validators.ts` — all zod schemas for the five models (Patient, Appointment,
  Session, Payment, FollowUp). API routes validate `request.json()` with `schema.safeParse`
  and return `{ error: result.error.flatten() }` with 400 on failure. Reuse/extend these
  schemas rather than inlining new validation.
- `src/lib/revalidate.ts` — call `revalidateCrm()` from any route handler after a
  create/update/delete. The five models are tightly cross-referential (a payment shows up on
  billing, dashboard, and the patient page), so this single helper revalidates all list routes
  plus the `"dashboard"` cache tag rather than tracking per-mutation dependencies.
- `src/generated/prisma/*` is generated output (custom output path, not the default
  `node_modules/.prisma`) — never hand-edit, regenerate via `npm run db:generate`.
- Auth is a single shared PIN (`AUTH_PIN` env var) → HMAC-signed cookie (`AUTH_SECRET`),
  checked in `src/middleware.ts`. There are no user accounts/roles.

## Data model

Patient → Appointment → Session → Payment, plus FollowUp (all keyed off Patient). IDs are
`cuid()`. Status fields are plain strings, not Prisma enums (e.g. appointment status:
`scheduled | completed | cancelled | no-show`; payment status: `pending | paid`) — match the
existing string values exactly, don't introduce enums without discussing it first.

## Design / theme — do not improvise new styles

This app has an established **teal → emerald brand theme**. When building UI, reuse what
exists instead of inventing new colors, shadows, or one-off styles.

- Theme tokens live in `src/app/globals.css` as CSS variables (`--primary`, `--brand-50`
  through `--brand-800`, `--brand-alt-500/600/700`, chart colors, sidebar colors). Light and
  dark variants are both defined — don't hardcode hex/hsl colors in components, use the
  existing `--color-*` Tailwind tokens (`bg-primary`, `text-accent-foreground`, `bg-brand-50`,
  etc.).
- Reusable brand utility classes already exist in `globals.css` under `@layer components`:
  - `.btn-brand-gradient` — primary CTA gradient button (teal → emerald)
  - `.brand-text-gradient` — gradient text for page titles / wordmark
  - `.stat-card` — dashboard hero stat card gradient fill
  Reuse these instead of writing new gradients inline.
- shadcn/ui components live in `src/components/ui/*` (base-nova style, neutral base color,
  no prefix). Add new shadcn components via the CLI (`npx shadcn add <component>`) so they
  land with the same conventions — don't hand-roll a component that shadcn already provides.
- Icons: `lucide-react` throughout — keep using it for consistency, don't mix in another icon
  set.
- Radius scale (`--radius-sm` … `--radius-4xl`) is derived from a single `--radius` var —
  prefer the Tailwind radius tokens over arbitrary values.

If a page needs a look that doesn't fit these tokens, flag it and extend the theme in
`globals.css` rather than styling around it locally.

## Conventions to follow

- API route handlers: `NextRequest`/`NextResponse` from `next/server`, validate body with the
  matching zod schema, call `revalidateCrm()` after writes, use `Promise.all` for parallel
  independent Prisma queries (see `src/app/api/dashboard/route.ts`).
- Forms: `react-hook-form` + `@hookform/resolvers/zod` + the shared schemas/types from
  `src/lib/validators.ts`.
- Toasts via `sonner`, theming via `next-themes` (`src/components/theme-provider.tsx`).
- Keep clinic-identity strings (name, address, logo) sourced from `src/lib/clinic.ts`, never
  hardcoded in a page/component.

## Environment variables

`DATABASE_URL`, `UPLOADTHING_TOKEN`, `AUTH_PIN`, `AUTH_SECRET` — set in `.env.local` for
local dev. Never print or commit real values.
