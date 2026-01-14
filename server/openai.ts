import OpenAI from "openai";

// Using blueprint:javascript_openai
// Using gpt-3.5-turbo for cost efficiency

// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a production schedule parser. Parse natural language schedule descriptions into structured task data.

Extract tasks with the following fields:
- title: The project/task name
- workType: Must be one of "shoot", "edit", or "upload"
- tag: Must be one of "newsit", "tlife", or "zappit" (based on project category)
- assignee: Person assigned to the task (optional)
- shootDate: Production date in YYYY-MM-DD format (optional)
- deliveryDate: Delivery date in YYYY-MM-DD format (optional)

Respond with a JSON object containing a "tasks" array. Each task should have the fields above.

Example input: "Τρίτη γύρισμα TLIFE με Δημήτρη, παράδοση Πέμπτη"
Example output: { "tasks": [{ "title": "TLIFE με Δημήτρη", "workType": "shoot", "tag": "tlife", "assignee": "Δημήτρης", "shootDate": "2025-11-12", "deliveryDate": "2025-11-14" }] }

Example input: "zappit 9:00 το πρωί, Δημήτρης, παράδοση τρίτη 14:00"
Example output: { "tasks": [{ "title": "zappit το πρωί", "workType": "shoot", "tag": "zappit", "assignee": "Δημήτρης", "shootDate": "2025-11-11", "deliveryDate": "2025-11-12" }] }

Important:
- Infer dates based on day names (e.g., "Τρίτη" = Tuesday) relative to current week
- Extract person names from context - look for team member names: "Δημήτρης", "Ντίνος", "Χρυσάνθη" (or variations)
  - "με Δημήτρη" → assignee: "Δημήτρης"
  - "Δημήτρης" → assignee: "Δημήτρης"
  - "Ντίνος" → assignee: "Ντίνος"
  - "Χρυσάνθη" → assignee: "Χρυσάνθη"
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
