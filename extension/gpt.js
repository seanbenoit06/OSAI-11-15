// analyzer.js
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const systemPrompt = `
You are a contract analyzer that identifies potential red flags in contracts. Look for these categories:

1. Vague Terms - e.g., "reasonable time," "subject to agreement"
2. Hidden/Excessive Obligations - e.g. unexpected repairs, mold waivers, all-damage responsibility
3. Restricted or Missing Rights - e.g. unclear ownership, missing exit clauses, automatic renewals
4. Financial Issues - e.g. unclear payments, excessive penalties, high late fees, missing grace period
5. Misused Clauses - e.g. unnecessary confidentiality, clauses allowing unilateral changes
6. Dispute Gaps - e.g. no dispute resolution method

Instructions:
- Respond only with valid JSON, no extra text.
- Each category is a key mapping to a list of issues:
  { "example": "<text snippet>", "severity": <1-5>, "reason": "<short explanation why it's a red flag>" }.
- Keep explanations concise (1-2 sentences).
- Use severity 5 for very risky, 1 for minor, 0 if no issues.
- Be concise, professional, and consistent.
- IMPORTANT: Also extract the company/landlord/property management name from the contract and include it in your JSON response as "company_name": "<name>". If no clear company name is found, use "company_name": null.
`;

function extractTextFromContent(content) {
  if (!content) return "";
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) return "";
        if (typeof part === "string") return part;
        if (typeof part.text === "string") return part.text;
        return "";
      })
      .join("")
      .trim();
  }
  if (typeof content === "object") {
    if (typeof content.text === "string") return content.text.trim();
    return JSON.stringify(content).trim();
  }
  return "";
}

export async function analyzeChunk(userText) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ],
      max_completion_tokens: 4000,
      response_format: { type: "json_object" }
    });

    let assistantMessage = extractTextFromContent(
      response.choices?.[0]?.message?.content
    );

    if (!assistantMessage) {
      console.warn("Empty response from GPT. Skipping chunk.");
      return { flagged: null, susScore: 0 };
    }

    const firstBrace = assistantMessage.indexOf("{");
    const lastBrace = assistantMessage.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      assistantMessage = assistantMessage.slice(firstBrace, lastBrace + 1);
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(assistantMessage);
    } catch (err) {
      console.error("Error parsing JSON from GPT:", err);
      console.log("Raw GPT output:", assistantMessage);
      parsedResponse = null;
    }

    // Extract company name and flags
    const companyName = parsedResponse?.company_name || null;
    const flagged = parsedResponse ? { ...parsedResponse } : null;
    
    // Remove company_name from flagged object to keep it clean
    if (flagged && "company_name" in flagged) {
      delete flagged.company_name;
    }

    return { flagged, companyName };
  } catch (err) {
    console.error(err);
    return { flagged: null, companyName: null };
  }
}
