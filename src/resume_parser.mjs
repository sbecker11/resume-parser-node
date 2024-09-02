import 'dotenv/config';
//import { axios } from "@pipedream/platform"; 
import { promises as fs } from 'fs';
import mammoth from 'mammoth';
import Client from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RESUME_SCHEMA_PATH =   './inputs/resume-schema.json';

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

  // input: resumeDocxPath
  // convert the resume document at 
  // resumeDocxPath of a MSWord .docx file)
  // to plain text and use it to create 
  // a prompt for the LLM to convert it to
  // structured resume data and save it to
  // output: resumeDocxDataPath (JSON)
  async function processDocxResume(resumeDocxDataPath, resumeDocxPath) {  
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


        const client = new Client({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        start_time_millis = Date.now();
        console.log(`prompt sent to ${model}`);

        const model = "claude-3-sonnet-20240229";

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
            const responseData = response.data;

            const elapsed_seconds = ((Date.now() - start_time_millis)/1000).toFixed(2);
            console.log(`resume processed in ${elapsed_seconds} seconds`);

            // get the extracted resume data and save it to the output json file
            const resumeDocxData = responseData.choices[0].message.content;
            await saveResumeData(resumeDocxDataPath, resumeDocxData);
        }
    
    } catch (error) {
        console.error('Error processing resume:', error);
        throw error;
    }
}

async function main() {
// Call the processResume function
  try {

      // input: resumeDocxPath
      // convert the MSWord .docx file 
      // to plain text and use it to create 
      // a prompt for the LLM to convert it to
      // structured resume data and save it to
      // output: resumeDocxDataPath (JSON)

      const resumeDocxPath = './inputs/proj-mngr-resume.docx';
      const resumeDocxDataPath = './outputs/proj-mngr-resume-docx.json';

      await processDocxResume(resumeDocxDataPath, resumeDocxPath);
      
  } catch (error) {
      console.error('Error processing resume:', error);
      throw error;
  }
}

main();