import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getClinicTier, hasFeature } from "@/lib/clinic-tier";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    // Check if user's clinic has AI feature
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users").select("clinic_id").eq("id", user.id).single();

    if (profile?.clinic_id) {
      const tier = await getClinicTier(profile.clinic_id);
      if (!hasFeature(tier, "ai_diagnosis")) {
        return NextResponse.json({
          error: "AI features are not available on your current plan. Upgrade to AI Plus to access AI diagnosis and clinical notes."
        }, { status: 403 });
      }
    }

    const { type, context, specialty } = await request.json();

    if (!context) {
      return NextResponse.json({ error: "Missing context" }, { status: 400 });
    }

    const clinicSpecialty = specialty ?? "Neurology";

    let prompt = "";

    if (type === "clinical_note") {
      prompt = `You are a medical assistant helping a ${clinicSpecialty} specialist write a clinical note.

Based on the visit information below, write a professional SOAP clinical note as PLAIN TEXT only.

IMPORTANT: Do NOT use markdown formatting. No asterisks, no pound signs, no bullet dashes. Use plain text only.

FORMAT (use these exact section labels on their own line):
SUBJECTIVE:
[patient's chief complaint, symptoms, history]

OBJECTIVE:
[vitals, examination findings, lab/imaging results]

ASSESSMENT:
[diagnosis and clinical interpretation]

PLAN:
[treatment plan, medications, follow-up instructions]

Rules:
- Plain text only, no markdown
- Use proper medical terminology
- Be concise and specific
- Write in third person
- If a section has no data, write "Not documented"

VISIT INFORMATION:
${context}

Write the SOAP note:`;
    } else if (type === "abstract") {
      prompt = `You are a medical assistant. Write a patient-friendly visit summary in both English and Arabic as PLAIN TEXT only.

IMPORTANT: Do NOT use markdown. No asterisks, no pound signs. Use plain text only.

FORMAT (use these exact labels):
English Summary:
[3-4 sentences in simple non-medical English]

ملخص بالعربية:
[3-4 sentences in simple Arabic]

Rules:
- Plain text, no markdown symbols
- Simple language the patient can understand
- Reassuring and clear tone
- Explain what was found and the plan

VISIT INFORMATION:
${context}

Write the bilingual summary:`;
    } else if (type === "icd_suggest") {
      prompt = `You are a medical coding assistant specializing in ${clinicSpecialty}.

Based on the clinical information below, suggest the top 5 most likely ICD-10-CM diagnosis codes.

RESPOND WITH ONLY A JSON ARRAY, no other text:
[
  {"code": "G43.909", "description": "Migraine, unspecified, not intractable, without status migrainosus"},
  {"code": "R51.9", "description": "Headache, unspecified"}
]

Rules:
- Return exactly 5 items (fewer if truly not enough data)
- Most likely diagnosis first
- Use full ICD-10-CM codes (e.g. G43.909 not just G43)
- Descriptions must be the official ICD-10 description
- JSON only, no explanation

CLINICAL INFORMATION:
${context}

JSON response:`;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // For ICD suggestions, parse and return as JSON array
    if (type === "icd_suggest") {
      try {
        const clean = text.replace(/```json|```/g, "").trim();
        const suggestions = JSON.parse(clean);
        return NextResponse.json({ suggestions });
      } catch {
        return NextResponse.json({ suggestions: [] });
      }
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}
