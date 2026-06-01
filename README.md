<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1b8707ea-b917-4167-85cf-11e9353fdd1d

## Run Locally

**Prerequisites:** [Bun](https://bun.sh)

1. Install dependencies:
   `bun install`
2. Copy `.env.example` to `.env` and set your API keys
3. Run the app:
   `bun run dev`

The dev server serves the Vite frontend and `/api/process/mockup` on port 3000.

## Deploy to Vercel

**Prerequisites:** [Vercel CLI](https://vercel.com/docs/cli) (optional for local preview)

1. Push the repo to GitHub (or connect another Git provider in the Vercel dashboard).
2. Import the project in [Vercel](https://vercel.com/new).
3. Set environment variables in the project settings:
   - `GEMINI_API_KEY` — your Google Gemini API key (required)
   - `APP_URL` — your production URL (optional, e.g. `https://your-app.vercel.app`)
4. Deploy. Vercel runs `bun install` and `bun run build`, serves the SPA from `dist`, and runs the mockup API as a serverless function.

**Notes:**

- Mockup generation calls Gemini multiple times and can take 1–3 minutes. The API route is configured with a **300s** `maxDuration`, which requires a [Vercel Pro](https://vercel.com/docs/functions/runtimes#max-duration) plan (Hobby is limited to 10s).
- To test the Vercel setup locally: `bunx vercel dev` (or `bun run vercel:dev` after installing the Vercel CLI globally).

### Environment variables

| Variable         | Required | Description                          |
|------------------|----------|--------------------------------------|
| `GEMINI_API_KEY` | Yes      | Google Gemini API key                |
| `APP_URL`        | No       | Public app URL for metadata/links    |
