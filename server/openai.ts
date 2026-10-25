import OpenAI from "openai";
import type { StudioSettings } from "@shared/schema";

// Small, cheap model with JSON mode; override with OPENAI_MODEL when OpenAI retires it
const DEFAULT_MODEL = "gpt-4.1-mini";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface ParsedTask {
  title: string;
  workType: 'shoot' | 'edit' | 'upload';
  format?: 'reel' | 'podcast';
  series?: string;
  guest?: string;
  assignee?: string;
  shootDate?: string;
  shootTime?: string;
  deliveryDate?: string;
}

export async function parseWeeklyScheduleToTasks(
  scheduleText: string,
  settings: StudioSettings,
): Promise<ParsedTask[]> {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error("OpenAI is not configured (missing OPENAI_API_KEY)");
    }

    // Get current date in Greek timezone
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const dayNames = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
    const currentDayName = dayNames[now.getDay()];
    const teamList = settings.team.length ? settings.team.map((m) => `"${m}"`).join(", ") : "(none defined)";
    const seriesList = settings.series.length ? settings.series.map((s) => `"${s}"`).join(", ") : "(none defined)";

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a production schedule parser for the HuffPost Greece video studio, which produces reels and podcasts with journalists. Parse natural language schedule descriptions into structured task data.

IMPORTANT: Today's date is ${currentDate} (${currentDayName}). Use this as reference when calculating dates from day names.

Extract tasks with the following fields:
- title: Short task name, e.g. "Οικονομικό reel - Μονεμβασιώτης"
- workType: Must be one of "shoot", "edit", or "upload"
- format: Must be "reel" or "podcast"
- series: One of the studio series: ${seriesList}. Omit if none matches.
- guest: The journalist or guest featured (optional), e.g. "Μονεμβασιώτης"
- assignee: Studio team member assigned to the task (optional). Must be one of: ${teamList}
- shootDate: Production date in YYYY-MM-DD format (optional)
- shootTime: Production time in HH:MM 24-hour format (optional)
- deliveryDate: Delivery date in YYYY-MM-DD format (optional)

Respond with a JSON object containing a "tasks" array. Each task should have the fields above.

Example: If today is ${currentDate} and user says "Τρίτη 11:00 γύρισμα οικονομικό reel με Μονεμβασιώτη, μοντάζ Τετάρτη", create a shoot task on Tuesday at 11:00 and an edit task on Wednesday, both format "reel", guest "Μονεμβασιώτης".

Important:
- ALWAYS calculate dates based on today's date (${currentDate})
- Day names refer to THIS week or NEXT week (whichever makes more sense contextually)
- If a day has already passed this week, assume it means next week
- Determine workType from keywords like "γύρισμα"/"ηχογράφηση" (shoot), "μοντάζ" (edit), "ανέβασμα/φόρτωμα" (upload)
- Determine format from keywords: "podcast" → "podcast"; "reel", "ριλ" or anything else → "reel"
- Match series loosely (e.g. "οικονομικό" matches "Οικονομικό")
- "με <όνομα>" usually names the guest journalist unless the name is a team member, in which case it is the assignee
- Use the nominative case for names (e.g. "με Μονεμβασιώτη" → "Μονεμβασιώτης")
- Create separate tasks if multiple activities are mentioned`
        },
        {
          role: "user",
          content: scheduleText,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.tasks || !Array.isArray(result.tasks)) {
      throw new Error("Invalid response format from OpenAI");
    }

    return result.tasks as ParsedTask[];
  } catch (error: any) {
    throw new Error("Failed to parse schedule: " + error.message);
  }
}
