import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic();

const JSON_SYSTEM_MESSAGE =
  "You are a data extraction API. You only respond with valid JSON. Never include explanatory text, markdown formatting, or anything outside the JSON structure.";

interface RequestBody {
  topic: string;
  options: {
    sentiment: boolean;
    complaints: boolean;
    blog: boolean;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/** Robust JSON parser that handles Claude's common response quirks */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseClaudeJSON(response: string): any {
  // Strip markdown code fences if present
  let cleaned = response.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  // Try to find JSON object or array in the response
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return JSON.parse(cleaned);
}

/** Check if a URL is a generic homepage/tag page rather than a specific thread */
function isGenericUrl(url: string): boolean {
  const generic = [
    /^https?:\/\/(www\.)?reddit\.com\/r\/[^/]+\/?$/,              // subreddit homepage
    /^https?:\/\/(www\.)?reddit\.com\/?$/,                         // reddit homepage
    /^https?:\/\/news\.ycombinator\.com\/?$/,                      // HN homepage
    /^https?:\/\/stackoverflow\.com\/?$/,                           // SO homepage
    /^https?:\/\/stackoverflow\.com\/questions\/tagged\//,          // SO tag page
    /^https?:\/\/(www\.)?g2\.com\/products\/[^/]+\/?$/,            // G2 product page (not a review)
    /^https?:\/\/(www\.)?g2\.com\/?$/,                             // G2 homepage
    /^https?:\/\/community\.fivetran\.com\/?$/,                    // Fivetran community homepage
    /^https?:\/\/(www\.)?twitter\.com\/?$/,                        // Twitter homepage
    /^https?:\/\/(www\.)?x\.com\/?$/,                              // X homepage
  ];
  return generic.some((re) => re.test(url));
}

/** Concatenate all text blocks from a Claude response */
function extractText(response: Anthropic.Messages.Message): string {
  return response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

const JSON_SUFFIX =
  "\n\nRespond with ONLY valid JSON. No preamble, no explanation, no markdown backticks, no text before or after the JSON object. Your entire response must be parseable by JSON.parse().";

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function researchPrompt(topic: string): string {
  return `You are a market research analyst. Your task is to research what people are saying online about "${topic}" related to Fivetran.

Use your web search tool to run 5-8 different searches. Reddit is the HIGHEST PRIORITY source — run at least 2-3 Reddit-specific searches:
- "site:reddit.com fivetran ${topic}"
- "reddit fivetran ${topic} complaints"
- "r/dataengineering fivetran ${topic}"
Then also search:
- HackerNews / news.ycombinator.com (e.g. "site:news.ycombinator.com fivetran ${topic}")
- Stack Overflow
- G2 reviews (e.g. "site:g2.com fivetran review")
- X / Twitter
- Tech blogs and articles

For each meaningful mention you find, capture:
- platform: which platform/source
- url: the SPECIFIC, DIRECT URL to that exact post or comment thread (see URL rules below)
- text: the core quote, complaint, question, or opinion (keep it concise — 1-3 sentences)
- sentiment: "positive", "negative", or "neutral"
- engagement: any engagement clues like "top post", "highly upvoted", number of comments, etc. Use "" if unknown.
- author: username or company name if visible (use "" if unknown)

CRITICAL URL REQUIREMENT: For every mention, you MUST return the specific, direct URL to that exact post or comment thread — NOT the subreddit homepage, NOT the HN front page, NOT a general community page. Examples:

GOOD URLs (specific thread/post):
- https://www.reddit.com/r/dataengineering/comments/abc123/fivetran_pricing_is_insane/
- https://news.ycombinator.com/item?id=12345678
- https://stackoverflow.com/questions/12345678/fivetran-postgres-connector-issue
- https://www.g2.com/products/fivetran/reviews/fivetran-review-12345

BAD URLs (NEVER return these):
- https://www.reddit.com/r/dataengineering/
- https://news.ycombinator.com/
- https://stackoverflow.com/questions/tagged/fivetran
- https://community.fivetran.com/
- https://www.reddit.com/
- Any URL that is a homepage, tag page, or search results page

If you cannot find the specific thread URL for a mention, set url to "" (empty string) rather than guessing or using a generic page URL. Only include URLs you are confident link directly to that specific discussion.

After gathering mentions, compute ALL of the following:
- sentimentBreakdown: { positive: <percent>, neutral: <percent>, negative: <percent> } — must sum to 100
- totalMentions: total number of distinct mentions found
- estimatedAccounts: count of unique usernames, company names, or distinct authors across all mentions (number)
- platformBreakdown: array of { name: "<Platform>", count: <number> } — Reddit MUST appear here
- keyThemes: array of 4-6 short theme strings (e.g. "Pricing concerns", "Easy setup")
- trend: "Improving" | "Stable" | "Declining" — based on recency of posts
- painPoints: the 3-5 most recurring pain points across all mentions. Each:
  - title: short label (e.g. "Unpredictable Pricing")
  - description: 1-2 sentence summary of what users are saying about this pain point
  - frequency: how many mentions reference this pain point (number)
- competitors: alternative tools/services people mention as replacements or comparisons. Each:
  - name: competitor name (e.g. "Airbyte", "PeerDB", "AWS DMS")
  - mentions: how many times referenced (number)
  - context: 1 sentence on why people bring it up (e.g. "Cited as 5x cheaper for Postgres-only replication")
  Sort by mentions descending.
- keyInsights: a 3-4 sentence AI-generated summary paragraph of the most important patterns. What is the overall narrative? What should Fivetran's marketing team pay attention to most?

Return this exact JSON schema:
{
  "mentions": [
    {
      "platform": "Reddit",
      "url": "https://...",
      "text": "...",
      "sentiment": "negative",
      "engagement": "42 upvotes",
      "author": "user123"
    }
  ],
  "sentimentBreakdown": { "positive": 60, "neutral": 25, "negative": 15 },
  "totalMentions": 31,
  "estimatedAccounts": 24,
  "platformBreakdown": [{ "name": "Reddit", "count": 12 }],
  "keyThemes": ["Easy setup", "Pricing concerns"],
  "trend": "Improving",
  "painPoints": [
    { "title": "Unpredictable Pricing", "description": "Users report surprise bills after schema changes trigger full re-syncs.", "frequency": 8 }
  ],
  "competitors": [
    { "name": "Airbyte", "mentions": 5, "context": "Cited as open-source alternative with more flexibility." }
  ],
  "keyInsights": "The overall narrative around Fivetran..."
}${JSON_SUFFIX}`;
}

function complaintsPrompt(
  topic: string,
  mentions: unknown[] | null
): string {
  const mentionsCtx = mentions
    ? `\n\nHere are the research findings to analyze:\n${JSON.stringify(mentions, null, 2)}`
    : `\n\nNote: No prior research was provided. Use your knowledge of common complaints about "${topic}" related to Fivetran.`;

  return `Analyze the following mentions/complaints about "${topic}" and:

1. Select all negative and neutral mentions (complaints, questions, concerns). If there are fewer than 4, supplement with plausible common complaints you know about.

2. Rank them using a PLATFORM-WEIGHTED severity system. Apply this platform tier as a multiplier on top of content severity:

   Tier 1 (highest priority — rank at top, these are actionable):
   - Reddit (r/dataengineering, r/analytics, etc.)
   - HackerNews

   Tier 2:
   - Stack Overflow
   - X/Twitter
   - G2 Reviews
   - TrustRadius
   - Quora

   Tier 3 (lowest priority — rank below actionable posts):
   - Blog articles
   - News articles
   - Case studies
   - Documentation

   SORTING ORDER: Critical Tier 1 posts first, then Critical Tier 2, then Critical Tier 3, then High Tier 1, etc. Within the same severity+tier, rank by engagement.

3. Content severity is based on:
   - How damaging the complaint is to Fivetran's brand/reputation
   - Engagement signals (highly upvoted = more visible)
   - Funnel stage impact (Decision-stage complaints are most urgent)

4. Assign each:
   - severity: "Critical" | "High" | "Medium" | "Low"
   - funnelStage: "Awareness" | "Consideration" | "Decision"

5. Draft replies ONLY for actionable platforms where Fivetran can respond publicly:
   Reddit, HackerNews, Stack Overflow, X/Twitter, G2, TrustRadius, Quora, and forums.
   Do NOT generate draft replies for blog articles, news articles, case studies, or documentation — these are not places we can post a reply.
   For non-actionable sources, set draftReply to "" (empty string).

6. For actionable complaints, draft a reply that:
   - Addresses the specific concern directly
   - References Fivetran's actual capabilities and recent improvements
   - Sounds human and helpful, NOT corporate or robotic
   - Is 2-4 sentences long

CRITICAL URL PRESERVATION: Each complaint's "text", "source", and "sourceUrl" MUST stay together as a unit. Copy them EXACTLY from the input mentions data — do NOT mix up URLs between complaints, do NOT replace specific thread URLs with generic page URLs.

The sourceUrl MUST be the specific, direct URL to that exact post or comment thread:
GOOD: https://www.reddit.com/r/dataengineering/comments/abc123/fivetran_pricing/
BAD: https://www.reddit.com/r/dataengineering/

If the input mention has no URL, or the URL is a generic homepage/tag page, set sourceUrl to "" (empty string). Never guess, fabricate, or reuse another complaint's URL.
${mentionsCtx}

Return this exact JSON schema:
{
  "complaints": [
    {
      "id": 1,
      "text": "The actual complaint text...",
      "source": "Reddit",
      "sourceUrl": "https://... (exact URL for THIS quote, or empty string)",
      "severity": "Critical",
      "funnelStage": "Decision",
      "draftReply": "Thanks for raising this... (or empty string if non-actionable source)"
    }
  ]
}

Include 5-8 complaints.${JSON_SUFFIX}`;
}

function blogPrompt(
  topic: string,
  mentions: unknown[] | null,
  themes: string[] | null
): string {
  const context = mentions
    ? `\n\nKey themes from research: ${JSON.stringify(themes)}\n\nSample mentions:\n${JSON.stringify(mentions?.slice(0, 10), null, 2)}`
    : "";

  return `Write a blog article about "${topic}" that addresses common concerns and questions people have.
${context}

Requirements:
- Length: 800-1200 words
- Tone: helpful, authoritative, empathetic — not defensive or salesy
- Written from Fivetran's perspective (first-person plural "we")
- Structure:
  1. Compelling title
  2. Opening that acknowledges the real concerns people have
  3. 3-4 sections addressing the top themes/concerns with specific, helpful information
  4. Conclusion with a clear value proposition
- Use markdown formatting (##, **, -, etc.)
- Reference specific Fivetran features, recent improvements, and concrete details
- Include a call to action at the end

Return this exact JSON schema (the markdown field contains the full article in markdown):
{
  "markdown": "# Title here\\n\\nArticle body in markdown..."
}${JSON_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body: RequestBody = await request.json();
  const { topic, options } = body;

  const encoder = new TextEncoder();
  let researchMentions: unknown[] | null = null;
  let researchThemes: string[] | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(data)));
      };

      // ---------------------------------------------------------------
      // Step 1: Research & Sentiment
      // ---------------------------------------------------------------
      if (options.sentiment || options.complaints || options.blog) {
        try {
          send({
            type: "progress",
            step: "research",
            message: "Searching Reddit & forums...",
          });

          // Small delay so the client can render the first progress event
          await new Promise((r) => setTimeout(r, 300));

          send({
            type: "progress",
            step: "research",
            message: "Scanning X and tech blogs...",
          });

          // Sonnet — good reasoning for search queries + structured extraction
          const researchResponse = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 16000,
            system: JSON_SYSTEM_MESSAGE,
            tools: [
              {
                type: "web_search_20250305",
                name: "web_search",
                max_uses: 10,
              },
            ],
            messages: [{ role: "user", content: researchPrompt(topic) }],
          });

          const researchText = extractText(researchResponse);
          const researchData = parseClaudeJSON(researchText);

          researchMentions = researchData.mentions || [];
          researchThemes = researchData.keyThemes || [];

          send({
            type: "progress",
            step: "sentiment",
            message: `Analyzing sentiment across ${researchData.totalMentions || researchMentions?.length || 0} mentions...`,
          });

          if (options.sentiment) {
            send({
              type: "result",
              section: "sentiment",
              data: {
                positive: researchData.sentimentBreakdown?.positive ?? 0,
                neutral: researchData.sentimentBreakdown?.neutral ?? 0,
                negative: researchData.sentimentBreakdown?.negative ?? 0,
                totalMentions: researchData.totalMentions ?? 0,
                estimatedAccounts: researchData.estimatedAccounts ?? 0,
                platforms: researchData.platformBreakdown ?? [],
                themes: researchData.keyThemes ?? [],
                trend: researchData.trend ?? "Stable",
                painPoints: researchData.painPoints ?? [],
                competitors: researchData.competitors ?? [],
                keyInsights: researchData.keyInsights ?? "",
              },
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          send({
            type: "error",
            step: "research",
            message: `Research failed: ${msg}`,
          });
        }
      }

      // ---------------------------------------------------------------
      // Step 2: Rank Complaints & Draft Replies
      // ---------------------------------------------------------------
      if (options.complaints) {
        try {
          send({
            type: "progress",
            step: "complaints",
            message: "Ranking complaints by severity...",
          });

          // Haiku — cost-efficient for structured ranking and short reply drafts
          const complaintsResponse = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 16000,
            system: JSON_SYSTEM_MESSAGE,
            messages: [
              {
                role: "user",
                content: complaintsPrompt(topic, researchMentions),
              },
            ],
          });

          const complaintsText = extractText(complaintsResponse);
          const complaintsData = parseClaudeJSON(complaintsText);
          const complaints = (complaintsData.complaints || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => {
              // Validate sourceUrl — must be a real, specific URL (not a homepage)
              const url = typeof c.sourceUrl === "string" ? c.sourceUrl.trim() : "";
              const isValidUrl =
                (url.startsWith("http://") || url.startsWith("https://")) &&
                !isGenericUrl(url);
              return { ...c, sourceUrl: isValidUrl ? url : "" };
            }
          );

          console.log(
            "[complaints] Raw Claude response:\n",
            JSON.stringify(complaints, null, 2)
          );

          send({
            type: "progress",
            step: "complaints",
            message: `Drafting replies for ${complaints.length} complaints...`,
          });

          send({
            type: "result",
            section: "complaints",
            data: complaints,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          send({
            type: "error",
            step: "complaints",
            message: `Complaints analysis failed: ${msg}`,
          });
        }
      }

      // ---------------------------------------------------------------
      // Step 3: Draft Blog Article
      // ---------------------------------------------------------------
      if (options.blog) {
        try {
          send({
            type: "progress",
            step: "blog",
            message: "Writing blog article...",
          });

          // Opus — high quality needed for publishable content
          const blogResponse = await client.messages.create({
            model: "claude-opus-4-6",
            max_tokens: 8000,
            system: JSON_SYSTEM_MESSAGE,
            messages: [
              {
                role: "user",
                content: blogPrompt(topic, researchMentions, researchThemes),
              },
            ],
          });

          const blogText = extractText(blogResponse);
          const blogData = parseClaudeJSON(blogText);

          send({
            type: "result",
            section: "blog",
            data: { markdown: blogData.markdown || blogText },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          send({
            type: "error",
            step: "blog",
            message: `Blog generation failed: ${msg}`,
          });
        }
      }

      // ---------------------------------------------------------------
      // Done
      // ---------------------------------------------------------------
      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
