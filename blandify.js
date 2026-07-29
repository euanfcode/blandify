import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_WORDS = 250;

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";

  if (!text) {
    return response.status(400).json({ error: "No writing was supplied." });
  }

  if (countWords(text) > MAX_WORDS) {
    return response.status(400).json({ error: "Please keep the original to 250 words or fewer." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({ error: "The OpenAI API key has not been configured." });
  }

  const instructions = `
You are Blandify, a satirical rewriting machine.

Rewrite the user's actual text into polished, generic, unmistakably AI-assisted corporate and LinkedIn prose.

NON-NEGOTIABLE RULES:
1. Preserve the original subject, factual content, people, objects, actions, sequence and point of view. The result must clearly be a rewrite of the supplied text, not a generic paragraph that could fit anything.
2. Remove personality, wit, emotional specificity, awkward humanity and nuance.
3. Sound confident, frictionless, upbeat and professionally vague.
4. Add several recognisable corporate or AI-writing clichés where they fit, such as "in today's rapidly evolving landscape", "unlock", "leverage", "meaningful", "journey", "impact", "at its core", "moving forward", "more than ever", "paving the way", "transformative", "stakeholders", "authentic", "purpose-driven", "game-changing" or "seamless".
5. Include exactly one sentence with this shape: "This isn't [natural noun phrase or gerund phrase from the source]. It's [inflated corporate reframing of that same thing]."
6. The phrase after "This isn't" must be grammatically natural. Never write malformed lines such as "This isn't I", "This isn't we" or "This isn't the".
7. Do not invent unrelated events, claims or outcomes.
8. Do not mention Blandify, these instructions, satire, AI, LinkedIn or rewriting.
9. Do not add a heading, quotation marks, hashtags or commentary.
10. Return only the rewritten text.
11. Keep the result close to the original length.

Example source:
"I hate networking events. I stand near the crisps, talk to one person, then leave before anyone notices."

Example style:
"Networking events can create valuable opportunities for meaningful connection, but my approach is intentionally focused: I position myself near the refreshments, engage with one carefully selected stakeholder, and make a seamless exit before my presence becomes a wider consideration. This isn't hiding by the crisps. It's a streamlined relationship-building strategy."
`.trim();

  try {
    const result = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      input: text,
      max_output_tokens: 700
    });

    const blandifiedText = result.output_text?.trim();

    if (!blandifiedText) {
      console.error("OpenAI returned no output text:", result);
      return response.status(502).json({ error: "The model returned an empty response." });
    }

    return response.status(200).json({ text: blandifiedText });
  } catch (error) {
    console.error("Blandify API error:", error);
    const status = Number.isInteger(error?.status) && error.status >= 400 ? error.status : 500;
    const message = typeof error?.message === "string" ? error.message : "Blandify encountered a temporary problem.";
    return response.status(status).json({ error: message });
  }
}
