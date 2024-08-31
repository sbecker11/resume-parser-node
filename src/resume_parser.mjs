import 'dotenv/config';
//import { axios } from "@pipedream/platform"; 
import { promises as fs } from 'fs';
import mammoth from 'mammoth';
import { Client } from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RESUME_SCHEMA_PATH =   './inputs/resume-schema.json';

const client = new Client({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function getResumeSchema() {
  try {
      const schemaData = await fs.readFile (RESUME_SCHEMA_PATH, 'utf8');
      return JSON.parse(schemaData);
  } catch (error) {
      console.error('Error reading resume schema:', error);
      throw error;
  }
}

async function getResumDocxText(resumeDocxPath) {
  try {
    const fileBuffer = await fs.readFile(resumeDocxPath); // Correct usage of readFileSync
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error) {
    console.error('Error reading resume text:', error);
    throw error;
  }
}

async function getResumeDataPrompt(resumeDocxText, resumeSchema) {
  const resumeSchemaString = JSON.stringify(resumeSchema, null, 2);

  const prompt = `
  Please convert the following resume text 
  into a JSON object that conforms to the 
  provided resume schema. 
  Return only the JSON object without any 
  other text.

  The resume text starts here:
      ${resumeDocxText}
  The resume text ends here.

  The resume schema starts here:
      ${resumeSchemaString}
  The resume schema ends here.
  `;
  console.log(`<PROMPT>${prompt}</PROMPT>`);
  return prompt;
}

async function saveResumeData(resumeDocxJsonPath, resumeDocxData) {
  try {
    const resumeDocxDataString = JSON.stringify(resumeDocxData, null, 2);
    await fs.writeFile(resumeDocxJsonPath, resumeDocxDataString);
  } catch (error) {
    console.error(`Error saving resume data:`, error);
    throw error;
  }
}

// Example function to process resume
async function processDocxResume(resumeDocxPath, resumeDocxPath) {
  try {
    const resumeSchema = await getResumeSchema(RESUME_SCHEMA_PATH);
    const resumeSchemaString = JSON.stringify(resumeSchema, null, 2);
    const resumeDocx = await fs.readFile(resumeDocxPath);
    const { value: resumeDocxText } = await mammoth.extractRawText({ buffer: resumeDocx });

    prompt_text =```
    Please convert the following resume text 
    into a JSON object that conforms to the 
    provided resume schema.

    The resume text starts here:
    ${resumeDocxText}
    The resume text ends here.

    The resume schema starts here:
    ${resumeSchemaString}
    The resume schema ends here.
    
    Please provide only the JSON object in 
    your response, with no additional text.
    ```;

    const model = "claude-3-sonnet-20240229";

    const client = new Client({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    start_time_millis = Date.now();
    console.log(`prompt sent to ${model}`);

    async function createMessage(promptText) {
      const response = await client.completions.create({
          model: model, // Replace with your actual model name
          max_tokens: 4000,
          temperature: 0,
          system: "You are an expert at using resume schemas to convert resume text into structured resume objects.",
          messages: [
              { role: "user", content: promptText }
          ]
      });
  
      return response.data;
    }

    createMessage(prompt_text).then(responseData => {
        console.log(responseData);

        await saveResumeData(resumeDocxDataPath, resumeDocxData);
        return responseData;
      } catch (error) {
        console.error('Error processing resume:', error);
        throw error;

        
    }).catch(error => {
        console.error(error);
    });
    const elapsed_time = (Date.now() - start_time_millis)/1000;
    console.log(`response received in ${elapsed_time:.2f} seconds`);")

}


    const response = await axios.post('https://api.anthropic.com/v1/complete', data, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
    });

    let responseData;
    if (typeof response.data === 'string') {
      responseDocxData = JSON.parse(response.data);
    } else {
      responseDocxData = response.data;
    }

    await saveResumeData(resumeDocxDataPath, resumeDocxData);
    return responseData;
  } catch (error) {
    console.error('Error processing resume:', error);
    throw error;
  }
}

// Call the processResume function
try {
  resumeDocxPath = './inputs/proj-mngr-resume.docx';
  resumeDocxDataPath = './outputs/proj-mngr-resume-docx.json';
  await processDocxResume(resumeDocxDataPath, resumeDocxPath);
} catch (error) {
  console.error('Error processing resume:', error);
}