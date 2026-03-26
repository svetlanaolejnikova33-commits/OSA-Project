# OSA — Object Space Architecture

OSA is an experimental Next.js product interface for generating and reviewing interior concept descriptions in one focused workspace.

## Current Functionality

- Interactive single-page interface for concept generation workflows.
- Text-based input for interior description and related context.
- Generated concept/result area in the same UI flow.
- Fast local development with Next.js App Router.

## Tech Stack

- Next.js 14
- React 18
- Node.js + npm

## Run Locally

### 1) Install dependencies

```bash
npm install
```

### 2) Start development server

```bash
npm run dev
```

### 3) Open in browser

[http://localhost:3000](http://localhost:3000)

## Project Structure (Minimal)

- `app/` - App Router pages and layout.
- `public/` - static assets (for example, `logo.png`).
- `next.config.js` - Next.js configuration.
- `package.json` - scripts and dependencies.

## Roadmap

- Stabilize generation UX and state handling.
- Add reusable UI components and style system extraction.
- Introduce validation/error states for user input flows.
- Add tests and CI checks for production readiness.
