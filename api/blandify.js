const MAX_WORDS = 250;

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (
        content.type === "output_text" &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      error: "Method not allowed."
    });
  }

  const text =
    typeof request.body?.text === "string"
      ? request.body.text.trim()
      : "";

  if (!text) {
    return response.status(400).json({
      error: "No writing was supplied."
    });
  }

  if (countWords(text) > MAX_WORDS) {
    return response.status(400).json({
      error: "Please keep the original to 250 words or fewer."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({
      error: "The OpenAI API key has not been configured."
    });
  }

  const instructions = `
You are Blandify, a satirical rewriting machine.

Rewrite the user's actual text into polished, generic, unmistakably
AI-assisted corporate and LinkedIn prose.

Rules:

- Preserve the original subject, facts, people, objects, actions and sequence.
- The result must clearly be a rewrite of the supplied text.
- Remove personality, wit, emotional specificity, awkward humanity and nuance.
- Sound confident, frictionless, upbeat and professionally vague.
- Add several recognisable corporate clichés where they fit.
- Useful phrases include:
  "in today's rapidly evolving landscape"
  "unlock"
  "leverage"
  "meaningful"
  "journey"
  "impact"
  "at its core"
  "moving forward"
  "more than ever"
  "paving the way"
  "transformative"
  "stakeholders"
  "authentic"
  "purpose-driven"
  "game-changing"
  "seamless"

- Include exactly one sentence using this structure:
  "This isn't [natural activity or noun phrase from the original].
  It's [inflated corporate reframing of the same thing]."

- The words after "This isn't" must be grammatically natural.
- Never write malformed phrases such as:
  "This isn't I."
  "This isn't we."
  "This isn't the."

- Do not invent unrelated events or claims.
- Do not mention Blandify, satire, AI, LinkedIn, prompts or rewriting.
- Do not add a heading, hashtags, quotation marks or commentary.
- Return only the rewritten text.
- Keep the result reasonably close to the original length.
`.trim();

  try {
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions,
          input: text,
          max_output_tokens: 700
        })
      }
    );

    const data = await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error("OpenAI error:", data);

      return response.status(openAIResponse.status).json({
        error:
          data?.error?.message ||
          "OpenAI could not complete the request."
      });
    }

    const blandifiedText = extractOutputText(data);

    if (!blandifiedText) {
      console.error("Empty OpenAI response:", data);

      return response.status(502).json({
        error: "The model returned an empty response."
      });
    }

    return response.status(200).json({
      text: blandifiedText
    });
  } catch (error) {
    console.error("Blandify server error:", error);

    return response.status(500).json({
      error: "Blandify encountered a temporary problem."
    });
  }
}
