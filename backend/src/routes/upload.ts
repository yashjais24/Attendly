import { Router, Response } from 'express';
import multer from 'multer';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as os from 'node:os';

const router = Router();

router.use(requireAuth);

// Store uploaded files temporarily
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.post(
  '/',
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        error: 'No file uploaded',
      });
      return;
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    console.log('📁 Uploaded file:', req.file.originalname);
    console.log('📄 MIME type:', mimeType);

    try {
      // --------------------------------------------------
      // 1. Validate Gemini API key
      // --------------------------------------------------

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not configured in backend .env'
        );
      }

      // --------------------------------------------------
      // 2. Validate file type
      // --------------------------------------------------

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
      ];

      if (!allowedTypes.includes(mimeType)) {
        throw new Error(
          'Unsupported file type. Please upload JPG, PNG, or PDF.'
        );
      }

      // --------------------------------------------------
      // 3. Initialize Gemini
      // --------------------------------------------------

      const ai = new GoogleGenAI({
        apiKey,
      });

      // --------------------------------------------------
      // 4. Timetable extraction prompt
      // --------------------------------------------------

      const prompt = `
You are an expert college timetable extraction system.

I am uploading a college timetable as an image or PDF.

Your job is to identify EVERY lecture/class from the timetable and convert it into structured data.

IMPORTANT RULES:

1. Extract EVERY class shown in the timetable.

2. NEVER merge two separate lectures.

3. If the same subject appears twice on the same day,
   create TWO separate lecture objects.

4. If one lecture lasts for 100 minutes, split it into TWO objects.

For example:

10:00 - 11:40 DAA

must become:

10:00 - 10:50 DAA
10:50 - 11:40 DAA

These represent TWO separate attendance records.

5. Preserve the actual timetable start and end times.

6. Use 24-hour HH:MM format.

7. dayOfWeek must be:

0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday

8. SUBJECT EXTRACTION:

For every lecture, carefully inspect the timetable cell and extract:

- suggestedSubjectName
- suggestedSubjectCode

The subject name should be the ACTUAL SUBJECT NAME visible in the timetable.

Examples:

"Data Structures and Algorithms"
"Operating Systems"
"Database Management System"
"Computer Networks"

Do NOT use the teacher name, room number, section name,
or any other text as the subject name.

If a subject code is clearly visible, use that exact code.

If no subject code is visible, use a short recognizable abbreviation
based only on the visible subject name.

Do NOT invent a random course code.

If the subject name is clearly visible but the code is not,
still provide the subject name.

If the text is unclear, make your best extraction based only
on what is actually visible.

9. lectureNumber:
   - Number individual lectures separately.
   - For a 2-hour class split into two blocks, use:
     first block = 1
     second block = 2

10. Ignore:

- breaks
- lunch
- free periods
- holidays
- announcements
- room-only information
- teacher-only information

11. Do not invent classes.

12. EVERY lecture object must contain:

- dayOfWeek
- startTime
- endTime
- suggestedSubjectName
- suggestedSubjectCode
- lectureNumber

13. Return ONLY valid JSON.

14. Do NOT return markdown.

15. Do NOT use \`\`\`json.

16. Do NOT include explanations.

Return exactly this structure:

[
  {
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "10:00",
    "suggestedSubjectName": "Data Structures and Algorithms",
    "suggestedSubjectCode": "DSA",
    "lectureNumber": 1
  }
]
`;

      // --------------------------------------------------
      // 5. Read file as Base64
      // --------------------------------------------------

      const fileBase64 = fs
        .readFileSync(filePath)
        .toString('base64');

      // --------------------------------------------------
      // 6. Prepare Gemini input
      // --------------------------------------------------

      let fileInput: any;

      if (mimeType === 'application/pdf') {
        fileInput = {
          type: 'document',
          data: fileBase64,
          mime_type: 'application/pdf',
        };
      } else {
        fileInput = {
          type: 'image',
          data: fileBase64,
          mime_type: mimeType,
        };
      }

      // --------------------------------------------------
      // 7. Send timetable to Gemini
      // --------------------------------------------------

      console.log('🤖 Sending timetable to Gemini...');

      const interaction = await ai.interactions.create({
        model: 'gemini-3.5-flash-lite',

        input: [
          {
            type: 'text',
            text: prompt,
          },

          fileInput,
        ],

        generation_config: {
          thinking_level: 'minimal',
        },

        response_format: {
          type: 'text',
          mime_type: 'application/json',
        },
      });

      // --------------------------------------------------
      // 8. Get Gemini response
      // --------------------------------------------------

      let text = interaction.output_text || '';

      console.log('🤖 Gemini response received');

      if (!text) {
        throw new Error(
          'Gemini returned an empty response'
        );
      }

      console.log('Gemini raw response:', text);

      // --------------------------------------------------
      // 9. Clean JSON response
      // --------------------------------------------------

      text = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // --------------------------------------------------
      // 10. Parse JSON
      // --------------------------------------------------

      let parsedSlots: any;

      try {
        parsedSlots = JSON.parse(text);
      } catch (jsonError) {
        console.error(
          '❌ Gemini returned invalid JSON:',
          text
        );

        throw new Error(
          'Gemini returned invalid JSON'
        );
      }

      // --------------------------------------------------
      // 11. Validate result
      // --------------------------------------------------

      if (!Array.isArray(parsedSlots)) {
        throw new Error(
          'Gemini response is not a valid timetable array'
        );
      }

      for (const lecture of parsedSlots) {
        if (
          typeof lecture.dayOfWeek !== 'number' ||
          typeof lecture.startTime !== 'string' ||
          typeof lecture.endTime !== 'string' ||
          typeof lecture.suggestedSubjectName !== 'string' ||
          typeof lecture.suggestedSubjectCode !== 'string' ||
          typeof lecture.lectureNumber !== 'number'
        ) {
          throw new Error(
            'Gemini returned timetable data in an unexpected format'
          );
        }
      }

      console.log(
        `✅ Extracted ${parsedSlots.length} lecture blocks`
      );

      // --------------------------------------------------
      // 12. Delete temporary file
      // --------------------------------------------------

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // --------------------------------------------------
      // 13. Return result to frontend
      // --------------------------------------------------

      res.json({
        rawText: 'Extracted via Gemini AI',
        parsedSlots,
      });
    } catch (error: any) {
      console.error(
        '❌ UPLOAD PARSE ERROR:',
        error
      );

      // Cleanup temporary file
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error(
            'Failed to delete temporary file:',
            cleanupError
          );
        }
      }

      res.status(500).json({
        error: 'Failed to process file with Gemini AI',
        details:
          error?.message ||
          String(error),
      });
    }
  }
);

export default router;