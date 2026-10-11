# Local setup

This project uses the official Shopify React Router starter with TypeScript,
App Bridge, Polaris web components, and Prisma/SQLite session storage.

## First connection to Shopify

From PowerShell:

```powershell
cd "D:\Shopify App"
npm.cmd run dev
```

Shopify CLI asks you to sign in and select/create a development app and a dev
store. The CLI then populates the app configuration, provides credentials,
starts a tunnel, and opens an installation preview. Press `p` in its terminal
when ready to open the embedded app. Store installation requires your account.

`shopify.app.toml` intentionally has an empty `client_id` until linking.
The example.com URL is a placeholder; the CLI replaces it during development. If using an existing app, run `npm.cmd run config:link` first.
Do not deploy the starter configuration before linking it.

## Development commands

For the standalone dashboard design preview (no Shopify account required):

```powershell
npm.cmd run dev:prototype
```

Open http://127.0.0.1:4173/. Both this preview and the authenticated `/app`
home page render `app/components/Dashboard.tsx`, styled by
`app/components/dashboard.css`.

The audit, section catalog, search, filters, trial dialog, notifications, and
help use sample data. They do not audit a real store, install sections, create
subscriptions, or charge a merchant. Names, reviews, features, and prices are
reference placeholders. The app tiles are CSS illustrations.

The lower dashboard includes the Plus feature grid, AI Pages, quick guides,
and Help and Resources in `app/components/DashboardExtras.tsx`. Guide artwork
displays thumbnail regions from the supplied reference screenshot. Guide
dialogs show sample steps; no videos are connected yet. The AI builder
creates a sample wireframe, and support and suggestion forms only preview
messages locally. They send no requests.

The Sections design preview is at http://127.0.0.1:4173/sections. Dashboard
explore buttons and the prototype sidebar link to it. The same component
is served behind authentication at `/app/sections` in the Shopify app.
The page has sample search/category filtering, saved sections, a bundle
selector and section preview dialogs. Artwork is displayed from the supplied
reference screenshots. Buying, billing, demo storefronts and section/theme
installation are not connected. The other main page designs remain pending.

`npm.cmd run build:prototype` outputs a standalone bundle in `build/prototype`.
Serve that folder with a static server. Verification inside Shopify admin
still requires the authenticated development workflow above.

For the Shopify development app:

```powershell
npm.cmd install
npm.cmd run setup        # Generate Prisma client and migrate local SQLite
npm.cmd run dev          # Shopify development tunnel and embedded preview
npm.cmd run check        # TypeScript, ESLint, production build
npm.cmd run build
npm.cmd run start        # Requires real environment variables
```

`npm.cmd run dev:local` runs the framework server only. It still needs app
credentials and does not create a Shopify tunnel or provide an embedded
admin session. Use `npm.cmd run dev` for normal Shopify development.

The CLI supplies environment variables automatically. `.env.example` documents
the variables for manual hosting; never commit real credentials.

## Main files

- `app/shopify.server.ts`: Shopify authentication and session configuration.
- `app/routes/app.tsx`: authenticated embedded app shell and navigation.
- `app/routes/app._index.tsx`: embedded app home screen.
- `app/routes/auth.*`: login and authentication routes.
- `app/routes/webhooks.*`: uninstall and scope-update handlers.
- `prisma/schema.prisma`: session database schema.
- `shopify.app.toml`: linked app identity, scopes, and webhook configuration.
- `shopify.web.toml`: CLI frontend/backend startup commands.

The official starter requests `write_products`. Adjust the scopes
and replace the demo when the app's intended features are defined.
SQLite is ready for local development. Plan persistent database storage before
production deployment. Dockerfile and the official template README are included.

Template source: https://github.com/Shopify/shopify-app-template-react-router


Admin API, GraphQL code generation, and webhook configuration use 2026-10.


