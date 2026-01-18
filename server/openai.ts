import OpenAI from "openai";

// Using blueprint:javascript_openai
// Using gpt-3.5-turbo for cost efficiency

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
  tag?: 'newsit' | 'tlife' | 'zappit';
  assignee?: string;
  shootDate?: string;
  deliveryDate?: string;
}

export async function parseWeeklyScheduleToTasks(scheduleText: string): Promise<ParsedTask[]> {
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

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a production schedule parser. Parse natural language schedule descriptions into structured task data.

IMPORTANT: Today's date is ${currentDate} (${currentDayName}). Use this as reference when calculating dates from day names.

Extract tasks with the following fields:
- title: The project/task name
- workType: Must be one of "shoot", "edit", or "upload"
- tag: Must be one of "newsit", "tlife", or "zappit" (based on project category)
- assignee: Person assigned to the task (optional)
- shootDate: Production date in YYYY-MM-DD format (optional)
- deliveryDate: Delivery date in YYYY-MM-DD format (optional)

Respond with a JSON object containing a "tasks" array. Each task should have the fields above.

Example: If today is ${currentDate} and user says "Τρίτη γύρισμα TLIFE με Δημήτρη, παράδοση Πέμπτη", calculate the actual Tuesday and Thursday dates from today.

Important:
- ALWAYS calculate dates based on today's date (${currentDate})
- Day names refer to THIS week or NEXT week (whichever makes more sense contextually)
- If a day has already passed this week, assume it means next week
- Extract person names from context - look for team member names: "Δημήτρης", "Γιάννης", "Βασιλική" (or variations)
  - "με Δημήτρη" → assignee: "Δημήτρης"
  - "Δημήτρης" → assignee: "Δημήτρης"
  - "Γιάννης" → assignee: "Γιάννης"
  - "Βασιλική" → assignee: "Βασιλική"
- Determine workType from keywords like "γύρισμα" (shoot), "μοντάζ" (edit), "ανέβασμα/φόρτωμα" (upload)
- Determine tag from keywords: "zappit" → "zappit", "newsit" → "newsit", "tlife" or "TLIFE" → "tlife"
- If no tag keyword found, default to "tlife"
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
