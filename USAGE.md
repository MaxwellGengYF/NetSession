# ConversationFlow — Local Development Guide

## Overview

ConversationFlow is a React-based chat interface application built with:

- **Node.js 20**
- **Vite 7.2.4** — dev server & bundler
- **React 19 + TypeScript**
- **Tailwind CSS 3.4.19** — utility-first styling
- **shadcn/ui + Radix UI** — 40+ pre-built accessible components
- **React Router 7** — client-side routing

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | 20.x    |
| npm         | 10.x    |

> Verify versions:
> ```bash
> node -v   # should print v20.x.x
> npm -v    # should print 10.x.x
> ```

## Installation

```bash
# 1. Clone or navigate into the project directory
cd my-app

# 2. Install dependencies
npm install
```

## Running Locally

### Development server (hot reload)

```bash
npm run dev
```

- Vite starts the dev server at **`http://localhost:3000`**
- Supports Hot Module Replacement (HMR) via `@vitejs/plugin-react`
- Any change to `.tsx`, `.ts`, `.css`, or Tailwind classes updates instantly

### Build for production

```bash
npm run build
```

- Runs TypeScript compilation (`tsc -b`) then Vite production build
- Output is emitted to the `dist/` folder
- Assets are hashed and minified; `base: './'` ensures relative paths work

### Preview production build locally

```bash
npm run preview
```

- Serves the contents of `dist/` using Vite's production preview server
- Useful for verifying the build before deployment

### Linting

```bash
npm run lint
```

- Runs ESLint across the entire project using the flat config in `eslint.config.js`

## Project Structure

```
my-app/
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration (port 3000, path aliases)
├── tailwind.config.js      # Tailwind theme & plugin settings
├── postcss.config.js       # CSS post-processing
├── tsconfig.json           # TypeScript base config
├── tsconfig.app.json       # TS config for the app source
├── tsconfig.node.json      # TS config for Vite/Node tooling
├── package.json
├── public/                 # Static assets (copied to dist as-is)
└── src/
    ├── main.tsx            # React mount point
    ├── App.tsx             # Root component (chat layout)
    ├── App.css             # App-specific styles
    ├── index.css           # Global styles + Tailwind directives
    ├── components/         # UI components (Sidebar, ChatArea, HelpModal, ...)
    ├── components/ui/      # shadcn/ui primitives (button, card, dialog, etc.)
    ├── hooks/              # Custom React hooks (useConversations, etc.)
    ├── sections/           # Page sections
    ├── types/              # TypeScript type definitions
    └── lib/                # Utility helpers (cn, etc.)
```

## Key Configuration

- **Path alias `@`** → `./src` (configured in `vite.config.ts` and `tsconfig.json`)
- **Dev server port:** `3000`
- **Base path:** `./` (relative) — suitable for static hosting without a root domain

## Common Commands

| Command           | Purpose                              |
|-------------------|--------------------------------------|
| `npm run dev`     | Start dev server with HMR            |
| `npm run build`   | Type-check & bundle for production   |
| `npm run preview` | Serve the production build locally   |
| `npm run lint`    | Check code with ESLint               |

## Notes

- The app uses Google Fonts (`Inter`, `JetBrains Mono`) loaded from CDN in `index.html`; an internet connection is required for correct typography on first load.
- This is a frontend-only application; there is no backend server included.
