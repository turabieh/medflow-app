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

Based on the visit information below, write a professional SOAP clinical note.

FORMAT:
S (Subjective): Patient's chief complaint, symptoms, and history as reported
O (Objective): Vitals, examination findings, lab/imaging results  
A (Assessment): Diagnosis and clinical interpretation
P (Plan): Treatment plan, medications, follow-up instructions

Rules:
- Use proper medical terminology
- Be concise and specific
- Include all provided data
- If information is missing for a section, write "Not documented"
- Write in third person (e.g., "Patient presents with...")

VISIT INFORMATION:
${context}

Write the SOAP clinical note:`;
    } else if (type === "abstract") {
      prompt = `You are a medical assistant. Write a patient-friendly visit summary in both English and Arabic.

The summary should:
- Be written in simple, non-medical language the patient can understand
- Explain what was found and what the plan is
- Be reassuring and clear
- Be 3-5 sentences per language

FORMAT EXACTLY AS:
**English Summary:**
[English text here]

**ملخص بالعربية:**
[Arabic text here]

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
