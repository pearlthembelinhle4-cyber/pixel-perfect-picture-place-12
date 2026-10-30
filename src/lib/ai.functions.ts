import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { structuredCall } from "./ai.server";

const emailInput = z.object({
  recipient: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(300),
  keyInfo: z.string().trim().min(1).max(6000),
  tone: z.enum(["formal", "friendly", "persuasive"]),
  length: z.enum(["short", "medium", "long"]),
  senderName: z.string().max(100).optional(),
});

const emailSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  body: z.string(),
  closing: z.string(),
});
export type GeneratedEmail = z.infer<typeof emailSchema>;

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data }) => {
    const tones = {
      formal: "formal — professional and respectful",
      friendly: "friendly — warm and conversational",
      persuasive: "persuasive — convincing and action-oriented",
    };
    const lengths = { short: "about 60-100 words", medium: "about 120-200 words", long: "about 250-350 words" };
    return structuredCall(
      emailSchema,
      `You write emails. Tone: ${tones[data.tone]}. Body length: ${lengths[data.length]}.
Use ONLY facts given by the user. Never invent dates, numbers, names, promises or commitments. If something needed is missing, write a neutral placeholder in square brackets like [date].
Return subject line, greeting (e.g. "Dear X,"), body (paragraphs separated by blank lines), and closing (sign-off line plus sender name${data.senderName ? ` "${data.senderName}"` : " placeholder [Your name]"}).`,
      `Recipient: ${data.recipient}\nSubject/purpose: ${data.subject}\nKey information:\n${data.keyInfo}`,
    );
  });

const actionSchema = z.object({
  task: z.string(),
  owner: z.string(),
  deadline: z.string(),
  deadlineISO: z.string().nullable(),
});
const summarySchema = z.object({
  overview: z.string(),
  discussionPoints: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(actionSchema),
  deadlines: z.array(z.string()),
  followUps: z.array(z.string()),
});
export type MeetingSummary = z.infer<typeof summarySchema>;

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ notes: z.string().trim().min(20).max(40000), today: z.string().max(20) }).parse(d),
  )
  .handler(async ({ data }) =>
    structuredCall(
      summarySchema,
      `You summarise meeting notes. Today is ${data.today}.
Rules: only report what is explicitly in the notes. Never invent decisions, names, responsibilities or deadlines.
- overview: 2-4 sentences.
- discussionPoints: main topics.
- decisions: only decisions explicitly recorded; empty list if none.
- actionItems: each task; owner = the named person or "Unspecified"; deadline = as written or "Unspecified"; deadlineISO = YYYY-MM-DD if the date can be resolved confidently, else null.
- deadlines: every date/time mentioned, with context.
- followUps: unresolved questions and follow-up activities.`,
      data.notes,
    ),
  );
