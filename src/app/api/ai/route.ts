import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
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
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ text });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}
