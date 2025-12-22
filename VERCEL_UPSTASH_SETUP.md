Vercel + Upstash quick setup

1) Create an Upstash Redis database
  - Go to https://upstash.com and sign up (free tier available).
  - Create a Redis database and note two values from the dashboard:
    - REST URL (example: https://us1-xxxxx.upstash.io)
    - REST token

2) Add environment variables on Vercel
  - In your Vercel project settings -> Environment Variables add:
    - `UPSTASH_REDIS_REST_URL` = REST URL from Upstash
    - `UPSTASH_REDIS_REST_TOKEN` = REST token from Upstash

3) Deploy to Vercel
  - Push your repo to GitHub
  - Create a new project in Vercel and connect the GitHub repo
  - Vercel will install dependencies (we added `@upstash/redis`) and deploy

4) How it works
  - Client calls `/api/counter` (serverless function). POST increments the counter; GET reads the current value.
  - Counter key used: `nammauk:visits` (change in `api/counter.js` if you want a different key)

Local testing
  - You can test the serverless route locally using Vercel CLI (optional):
    ```bash
    npm i -g vercel
    vercel dev
    ```
