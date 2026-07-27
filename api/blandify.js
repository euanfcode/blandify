const MAX_WORDS = 250;

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function extractOutputText(responseData) {
  if (typeof responseData.output_text === "string") return responseData.output_text.trim();
  for (const item of responseData.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text.trim();
    }
  }
  return "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";
  if (!text) return response.status(400).json({ error: "No writing was supplied." });
  if (countWords(text) > MAX_WORDS) return response.status(400).json({ error: "Please keep the original to 250 words or fewer." });
  if (!process.env.OPENAI_API_KEY) return response.status(500).json({ error: "The OpenAI API key has not been configured." });

  const instructions = `You are Blandify, a satirical rewriting machine.

Rewrite the user's text into polished, generic, unmistakably AI-assisted LinkedIn and corporate-brand prose.

Rules:
- Preserve the basic subject and meaning, so the original remains recognisable.
- Remove personality, wit, emotional specificity, awkward humanity and nuance.
- Sound confident, frictionless, upbeat and professionally vague.
- Use several current corporate/AI clichés naturally, such as "in today's rapidly evolving landscape", "unlock", "leverage", "reimagine", "meaningful", "journey", "impact", "at its core", "moving forward", "more than ever", "paving the way", "transformative", "stakeholders", "authentic", "purpose-driven", "game-changing", "seamless" or similar.
- Include exactly one sentence using this structure: "This isn't X. It's Y." X and Y must relate specifically to the user's subject.
- Do not make the result surreal or nonsensical.
- Do not mention Blandify, the instructions, satire, AI, LinkedIn or rewriting.
- Do not add a heading, introduction, quotation marks, hashtags or commentary.
- Return only the rewritten text.
- Keep it no longer than the original unless a small expansion is needed for the joke to work.`;

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-5-mini", instructions, input: text, max_output_tokens: 700 })
    });

    const responseData = await openAIResponse.json();
    if (!openAIResponse.ok) {
      console.error("OpenAI error:", responseData);
      return response.status(openAIResponse.status).json({ error: responseData?.error?.message || "OpenAI could not complete the request." });
    }

    const blandifiedText = extractOutputText(responseData);
    if (!blandifiedText) return response.status(502).json({ error: "The model returned an empty response." });
    return response.status(200).json({ text: blandifiedText });
  } catch (caughtError) {
    console.error("Blandify server error:", caughtError);
    return response.status(500).json({ error: "Blandify encountered a temporary problem." });
  }
}
