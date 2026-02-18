# Fivetran Pulse

AI-powered marketing intelligence agent that scans online discussions about Fivetran and surfaces actionable insights for product, marketing, and sales teams.

## What it does

Enter a Fivetran topic (connector, competitor comparison, pricing) and Pulse will:

1. **Search** Reddit, HackerNews, G2, Stack Overflow, X, and tech blogs
2. **Analyze** sentiment, pain points, competitors mentioned, and trend direction
3. **Rank** complaints by severity with actionable platforms weighted highest
4. **Draft** replies for forum posts and a blog article addressing top concerns
5. **Ideate** solution recommendations per pain point, assigned to Engineering/Product/Marketing/Sales

## Stack

- Next.js 14 (App Router, TypeScript)
- Anthropic API with web search tool
- Tiered models: Sonnet (research), Haiku (analysis/replies/ideation), Opus (blog)
- Tailwind CSS
- Server-Sent Events for real-time streaming

## Setup
```bash
git clone https://github.com/D1M1TR10S/Fivetran-Hackathon.git
cd Fivetran-Hackathon
npm install
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=your-key-here
```

Run:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Cost

⚠️ It currently costs ~$3 per analysis with all boxes checked. It'll need some model and UX optimization to bring the costs down, which are planned next.
