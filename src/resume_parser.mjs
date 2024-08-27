import 'dotenv/config';
import axios from 'axios';
//import { axios } from "@pipedream/platform"; 
import { promises as fs } from 'fs';
import mammoth from 'mammoth';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RESUME_SCHEMA_PATH =   './resume-inputs/resume-schema.json';
const RESUME_DOCX_PATH =     './resume-inputs/resume.docx';
const RESUME_DOCX_JSON_PATH = './resume-outputs/resume.docx.json';

async function getResumeSchema() {
  try {
      const schemaData = await fs.readFile (RESUME_SCHEMA_PATH, 'utf8');
      return JSON.parse(schemaData);
  } catch (error) {
      console.error('Error reading resume schema:', error);
      throw error;
  }
}

async function getResumeText() {
  try {
    const fileBuffer = await fs.readFile(RESUME_DOCX_PATH); // Correct usage of readFileSync
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error) {
    console.error('Error reading resume text:', error);
    throw error;
  }
}

async function getResumeDataPrompt() {
  const resumeSchemaString = JSON.stringify(await getResumeSchema());
  const resumeText = await getResumeText();

  const prompt = `
  Please convert the following resume text 
  into a JSON object that conforms to the 
  provided schema.

  The resume text starts here:
      ${resumeText}
  The resume text ends here.

  The schema starts here:
      ${resumeSchemaString}
  The schema ends here.
  `;
  return prompt;
}

async function saveResumeData(resumeData) {
  try {
    const resumeDataString = JSON.stringify(resumeData, null, 2);
    await fs.writeFile(RESUME_DOCX_JSON_PATH, resumeDataString);
  } catch (error) {
    console.error(`Error saving resume data:`, error);
    throw error;
  }
}

// Example function to process resume
async function processResume() {
  try {
    const resumeSchema = await getResumeSchema();
    const resumeDocx = await fs.readFile(RESUME_DOCX_PATH);
    const { value: resumeText } = await mammoth.extractRawText({ buffer: resumeDocx });

    // Assuming you have a function to get resume data prompt
    const data = {
      prompt: await getResumeDataPrompt() + `. Assistant: `,
      model: 'claude-v1',
      max_tokens_to_sample: 300,
    };

    const response = await axios.post('https://api.anthropic.com/v1/complete', data, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
    });

    let responseData;
    if (typeof response.data === 'string') {
      responseData = JSON.parse(response.data);
    } else {
      responseData = response.data;
    }

    const resumeData = {
      name: responseData.name,
      experience: responseData.experience,
      skills: responseData.skills,
    };

    await saveResumeData(resumeData);
    return responseData;
  } catch (error) {
    console.error('Error processing resume:', error);
    throw error;
  }
}

// Call the processResume function
processResume().catch(console.error);