import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const JSON_SYSTEM_MESSAGE =
  "You are a data extraction API. You only respond with valid JSON. Never include explanatory text, markdown formatting, or anything outside the JSON structure.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseClaudeJSON(response: string): any {
  let cleaned = response.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return JSON.parse(cleaned);
}

interface RequestBody {
  painPoint: string;
  description: string;
  topic: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { painPoint, description, topic } = body;

    // Haiku — cost-efficient for structured brainstorming
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: JSON_SYSTEM_MESSAGE,
      messages: [
        {
          role: "user",
          content: `You are a strategic advisor for Fivetran's internal teams. Given this customer pain point about "${topic}":

Pain Point: ${painPoint}
Details: ${description}

Suggest 1-3 high-impact solutions. For each, assign exactly ONE team owner:

- Engineering: A bug or broken behavior that should already work. Engineering fixes it.
- Product: Requires a new feature or optimization that doesn't exist yet. Product evaluates and prioritizes.
- Marketing: Customers don't know about existing solutions. Marketing creates content to educate customers and prospects.
- Sales: An objection or misconception in buying conversations. Sales keeps these counterpoints ready for prospect and customer discussions.

For each solution provide:
- team: one of "Engineering", "Product", "Marketing", "Sales"
- idea: clear title (5-8 words, e.g. "Publish Transparent Pricing Calculator")
- detail: 2-4 sentences explaining the specific approach, why it addresses this pain point, and expected impact.

Return ONLY valid JSON:
{
  "solutions": [
    {
      "team": "Engineering",
      "idea": "Short title",
      "detail": "2-4 sentences on approach and impact."
    }
  ]
}

Cap at 3 max. Often 1-2 is enough. Don't pad with weak ideas.

Respond with ONLY valid JSON. No preamble, no explanation, no markdown backticks, no text before or after the JSON object. Your entire response must be parseable by JSON.parse().`,
        },
      ],
    });

    const text = response.content
      .filter(
        (b): b is Anthropic.Messages.TextBlock => b.type === "text"
      )
      .map((b) => b.text)
      .join("\n");

    const data = parseClaudeJSON(text);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
