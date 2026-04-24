/**
 * Health Symptom Guide — Agentic AI Edge Function
 *
 * Architecture:
 *   1. RAG Layer  — retrieves relevant symptom knowledge from Supabase
 *   2. Agent Loop — reasons over context, asks follow-up questions, refines answers
 *   3. Memory     — maintains conversation history for multi-turn dialogue
 *
 * LangChain-style agent flow (implemented natively for Deno/Edge):
 *   User input → Intent detection → RAG retrieval → Agent reasoning → Response
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface SymptomKnowledge {
  id: string;
  condition: string;
  symptoms: string;
  description: string;
  precautions: string;
  remedies: string;
  when_to_see_doctor: string;
  severity: "low" | "medium" | "high";
}

interface AgentState {
  symptoms: string[];
  collectedInfo: {
    duration?: string;
    severity?: string;
    age?: string;
    existing_conditions?: string;
  };
  phase: "collecting" | "analyzing" | "complete";
  turnCount: number;
}

// ─── RAG: Retrieve relevant knowledge ────────────────────────────────────────

async function retrieveRelevantKnowledge(
  supabase: ReturnType<typeof createClient>,
  userSymptoms: string[]
): Promise<SymptomKnowledge[]> {
  const { data, error } = await supabase
    .from("symptom_knowledge")
    .select("*");

  if (error || !data) return [];

  // Simple keyword-based relevance scoring (RAG retrieval step)
  const scored = data.map((entry: SymptomKnowledge) => {
    const entrySymptoms = entry.symptoms.toLowerCase().split(",").map((s: string) => s.trim());
    const conditionText = (entry.condition + " " + entry.description).toLowerCase();

    let score = 0;
    for (const sym of userSymptoms) {
      const symLower = sym.toLowerCase().trim();
      // Exact symptom match
      if (entrySymptoms.some((es: string) => es.includes(symLower) || symLower.includes(es))) {
        score += 3;
      }
      // Condition/description mention
      if (conditionText.includes(symLower)) {
        score += 1;
      }
    }
    return { entry, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ entry }) => entry);
}

// ─── Agent: Parse symptoms from free text ────────────────────────────────────

function extractSymptoms(text: string): string[] {
  const commonSymptoms = [
    "fever", "headache", "cough", "cold", "runny nose", "sore throat",
    "fatigue", "tiredness", "weakness", "nausea", "vomiting", "diarrhea",
    "stomach pain", "chest pain", "shortness of breath", "dizziness",
    "back pain", "joint pain", "muscle aches", "body aches", "rash",
    "itching", "sneezing", "congestion", "loss of taste", "loss of smell",
    "blurred vision", "frequent urination", "burning urination",
    "weight gain", "weight loss", "anxiety", "depression", "insomnia",
    "cold hands", "cold feet", "pale skin", "hair loss", "dry skin",
    "wheezing", "swollen lymph nodes", "chills", "sweating"
  ];

  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const sym of commonSymptoms) {
    if (lowerText.includes(sym)) {
      found.push(sym);
    }
  }

  // Also extract words that might be symptoms not in our list
  const words = text.split(/[\s,]+/).filter(w => w.length > 3);
  for (const word of words) {
    if (!found.includes(word.toLowerCase()) &&
        !["have", "been", "feeling", "with", "also", "that", "this", "from"].includes(word.toLowerCase())) {
      found.push(word.toLowerCase());
    }
  }

  return [...new Set(found)];
}

// ─── Agent: Determine what follow-up info is still needed ────────────────────

function determineFollowUp(state: AgentState): string | null {
  if (state.turnCount === 1 && !state.collectedInfo.duration) {
    return "duration";
  }
  if (state.turnCount === 2 && !state.collectedInfo.severity) {
    return "severity";
  }
  if (state.turnCount === 3 && !state.collectedInfo.age) {
    return "age";
  }
  return null;
}

// ─── Agent: Parse follow-up answers from user messages ───────────────────────

function parseFollowUpAnswer(text: string, phase: string): Partial<AgentState["collectedInfo"]> {
  const lower = text.toLowerCase();

  if (phase === "duration") {
    const durationPatterns = [
      /(\d+)\s*(day|days|hour|hours|week|weeks|month|months)/i,
      /since\s+(yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /a\s+(few|couple)\s+(days|hours|weeks)/i,
    ];
    for (const p of durationPatterns) {
      const m = text.match(p);
      if (m) return { duration: m[0] };
    }
    if (lower.includes("just started") || lower.includes("today")) return { duration: "less than 1 day" };
    if (lower.includes("week")) return { duration: "about a week" };
    return { duration: text.split(" ").slice(0, 5).join(" ") };
  }

  if (phase === "severity") {
    if (lower.includes("mild") || lower.includes("slight") || lower.includes("little")) return { severity: "mild" };
    if (lower.includes("severe") || lower.includes("very bad") || lower.includes("unbearable")) return { severity: "severe" };
    if (lower.includes("moderate") || lower.includes("medium") || lower.includes("somewhat")) return { severity: "moderate" };
    if (/\b[1-4]\b/.test(text)) return { severity: "mild (1-4/10)" };
    if (/\b[5-7]\b/.test(text)) return { severity: "moderate (5-7/10)" };
    if (/\b[8-9]|10\b/.test(text)) return { severity: "severe (8-10/10)" };
    return { severity: text.split(" ").slice(0, 4).join(" ") };
  }

  if (phase === "age") {
    const ageMatch = text.match(/\b(\d{1,3})\b/);
    if (ageMatch) return { age: ageMatch[1] };
    if (lower.includes("child") || lower.includes("kid")) return { age: "child" };
    if (lower.includes("elderly") || lower.includes("senior") || lower.includes("old")) return { age: "elderly" };
    return { age: text.split(" ").slice(0, 3).join(" ") };
  }

  return {};
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a compassionate and knowledgeable health assistant. Your role is to help users understand their symptoms and provide general health guidance.

IMPORTANT DISCLAIMER: You provide general health information and guidance only. You are NOT a medical doctor and do NOT provide medical diagnoses. Always remind users to consult a healthcare professional for proper medical advice, diagnosis, or treatment.

Your approach:
1. Listen carefully to symptoms described
2. Ask clarifying questions about duration, severity, and relevant medical history
3. Based on the information gathered, suggest possible conditions that match the symptoms
4. Provide practical home remedies and precautions
5. Always indicate when professional medical care is needed
6. Be empathetic, clear, and supportive

Format your responses clearly with sections when providing analysis:
- Possible Conditions
- Recommended Precautions
- Home Remedies
- When to See a Doctor

Always include the safety disclaimer in your final analysis.`;
}

function buildAgentPrompt(
  state: AgentState,
  knowledge: SymptomKnowledge[],
  conversationHistory: Message[]
): string {
  const historyText = conversationHistory
    .slice(-6) // Keep last 6 messages for context window
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const knowledgeText = knowledge.length > 0
    ? knowledge.map(k => `
CONDITION: ${k.condition} (Severity: ${k.severity})
Symptoms: ${k.symptoms}
Description: ${k.description}
Precautions: ${k.precautions}
Remedies: ${k.remedies}
When to see doctor: ${k.when_to_see_doctor}
`).join("\n---\n")
    : "No specific matching conditions found in knowledge base.";

  const collectedContext = Object.entries(state.collectedInfo)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const needsFollowUp = determineFollowUp(state);

  let instruction = "";

  if (needsFollowUp === "duration") {
    instruction = `The user has described symptoms. Ask them how long they have been experiencing these symptoms. Be conversational and caring.`;
  } else if (needsFollowUp === "severity") {
    instruction = `Ask the user to rate the severity of their symptoms on a scale of 1-10 or describe as mild, moderate, or severe.`;
  } else if (needsFollowUp === "age") {
    instruction = `Ask the user their age or age range (optional but helpful for more personalized guidance).`;
  } else {
    instruction = `You now have enough information to provide a thorough health guidance response.

Symptoms reported: ${state.symptoms.join(", ")}
Patient info: ${collectedContext || "Not provided"}

Using the retrieved medical knowledge below, provide:
1. Possible conditions that match these symptoms (2-3 most likely)
2. Recommended precautions
3. Home remedies and self-care tips
4. Clear guidance on when to see a doctor

RETRIEVED MEDICAL KNOWLEDGE:
${knowledgeText}

Be thorough but concise. End with a clear disclaimer that this is not medical advice.`;
  }

  return `${buildSystemPrompt()}

CONVERSATION HISTORY:
${historyText}

CURRENT TASK:
${instruction}`;
}

// ─── LLM Call ────────────────────────────────────────────────────────────────

async function callLLM(prompt: string, userMessage: string): Promise<string> {
  const openAIKey = Deno.env.get("OPENAI_API_KEY");

  if (!openAIKey) {
    // Fallback: rule-based response when no API key is configured
    return generateRuleBasedResponse(prompt, userMessage);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAIKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenAI error:", err);
    return generateRuleBasedResponse(prompt, userMessage);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "I'm having trouble processing your request. Please try again.";
}

// ─── Rule-based fallback (works without OpenAI key) ──────────────────────────

function generateRuleBasedResponse(prompt: string, _userMessage: string): string {
  // Extract instruction type from the prompt
  if (prompt.includes("how long they have been experiencing")) {
    return "Thank you for sharing that with me. To help me give you better guidance, could you tell me **how long** you've been experiencing these symptoms? For example, a few hours, 1-2 days, or longer?";
  }

  if (prompt.includes("rate the severity")) {
    return "That's helpful to know! Now, how would you describe the **severity** of your symptoms? You can use a scale of 1-10, or describe them as mild, moderate, or severe.";
  }

  if (prompt.includes("age or age range")) {
    return "One more question — could you share your **age** or age range? This helps me provide more personalized guidance. (This is entirely optional.)";
  }

  if (prompt.includes("RETRIEVED MEDICAL KNOWLEDGE")) {
    // Extract knowledge from prompt and format response
    const conditionMatch = prompt.match(/CONDITION: ([^\n]+)/g);
    const conditions = conditionMatch
      ? conditionMatch.map(c => c.replace("CONDITION: ", "").split(" (")[0]).slice(0, 3)
      : ["the symptoms you described"];

    return `Based on the symptoms you've described, here is my assessment:

## Possible Conditions

The symptoms you're experiencing could be consistent with:
${conditions.map((c, i) => `${i + 1}. **${c}**`).join("\n")}

Please note these are possibilities based on general symptom patterns, not a definitive diagnosis.

## Recommended Precautions
- Rest adequately and avoid strenuous activity
- Stay well-hydrated (8+ glasses of water daily)
- Monitor your symptoms and note any changes
- Avoid self-medicating without professional guidance
- Wash hands regularly to prevent spreading infection

## Home Remedies & Self-Care
- Warm fluids (soups, herbal teas, warm water with honey and lemon)
- Steam inhalation if you have respiratory symptoms
- Adequate rest and sleep
- Light, easily digestible foods
- Keep a comfortable room temperature

## When to See a Doctor
Seek medical attention if:
- Symptoms worsen or don't improve within 3-5 days
- You develop high fever (above 103°F / 39.4°C)
- You experience difficulty breathing or chest pain
- Symptoms significantly interfere with daily activities
- You have any underlying health conditions

---
**IMPORTANT DISCLAIMER:** This information is for general guidance only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for proper medical evaluation and treatment. In case of emergency, call your local emergency services immediately.`;
  }

  return "Hello! I'm your Health Symptom Guide. Please describe the symptoms you're experiencing, and I'll help provide some general guidance. Remember, I'm here to help with general health information — always consult a doctor for proper medical advice.";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { message, conversationId, sessionId } = body as {
      message: string;
      conversationId?: string;
      sessionId: string;
    };

    if (!message || !sessionId) {
      return new Response(
        JSON.stringify({ error: "message and sessionId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 1: Get or create conversation ──────────────────────────────────
    let convId = conversationId;

    if (!convId) {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ user_session_id: sessionId })
        .select("id")
        .single();

      if (convErr || !conv) {
        throw new Error("Failed to create conversation");
      }
      convId = conv.id;
    }

    // ── Step 2: Load conversation history ───────────────────────────────────
    const { data: historyData } = await supabase
      .from("messages")
      .select("role, content, metadata")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    const history: Message[] = (historyData ?? []).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // ── Step 3: Rebuild agent state from history ─────────────────────────────
    const allUserMessages = history
      .filter(m => m.role === "user")
      .map(m => m.content);

    const agentState: AgentState = {
      symptoms: extractSymptoms(allUserMessages[0] ?? message),
      collectedInfo: {},
      phase: "collecting",
      turnCount: allUserMessages.length + 1,
    };

    // Parse follow-up answers from previous turns
    if (history.length >= 2) {
      const assistantMessages = history.filter(m => m.role === "assistant");

      // Turn 1 → asked about duration
      if (allUserMessages.length >= 2) {
        agentState.collectedInfo = {
          ...agentState.collectedInfo,
          ...parseFollowUpAnswer(allUserMessages[1], "duration"),
        };
      }
      // Turn 2 → asked about severity
      if (allUserMessages.length >= 3) {
        agentState.collectedInfo = {
          ...agentState.collectedInfo,
          ...parseFollowUpAnswer(allUserMessages[2], "severity"),
        };
      }
      // Turn 3 → asked about age
      if (allUserMessages.length >= 4) {
        agentState.collectedInfo = {
          ...agentState.collectedInfo,
          ...parseFollowUpAnswer(allUserMessages[3], "age"),
        };
      }

      // Set phase based on turn count
      if (assistantMessages.length >= 3) {
        agentState.phase = "analyzing";
      }
    }

    // Also include symptoms from current message
    const currentSymptoms = extractSymptoms(message);
    agentState.symptoms = [...new Set([...agentState.symptoms, ...currentSymptoms])];

    // ── Step 4: RAG — retrieve relevant knowledge ───────────────────────────
    const knowledge = await retrieveRelevantKnowledge(supabase, agentState.symptoms);

    // ── Step 5: Build agent prompt and call LLM ──────────────────────────────
    const agentPrompt = buildAgentPrompt(agentState, knowledge, history);
    const aiResponse = await callLLM(agentPrompt, message);

    // ── Step 6: Persist messages ─────────────────────────────────────────────
    await supabase.from("messages").insert([
      {
        conversation_id: convId,
        role: "user",
        content: message,
        metadata: { symptoms: agentState.symptoms },
      },
      {
        conversation_id: convId,
        role: "assistant",
        content: aiResponse,
        metadata: {
          phase: agentState.phase,
          turn: agentState.turnCount,
          knowledgeRetrieved: knowledge.map(k => k.condition),
        },
      },
    ]);

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        conversationId: convId,
        agentState: {
          symptoms: agentState.symptoms,
          phase: agentState.phase,
          turnCount: agentState.turnCount,
          retrievedConditions: knowledge.map(k => k.condition),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Health agent error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
