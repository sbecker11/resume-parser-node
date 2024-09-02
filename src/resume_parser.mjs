import 'dotenv/config';
//import { axios } from "@pipedream/platform"; 
import { promises as fs } from 'fs';
import mammoth from 'mammoth';
import Client from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if ( !ANTHROPIC_API_KEY ) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
}

const RESUME_SCHEMA_PATH =   './inputs/resume-schema.json';

async function getResumeSchema() {
  try {
    const resumeSchema = await fs.readFile(RESUME_SCHEMA_PATH, 'utf8');
    return resumeSchema;
  } catch (error) {
      console.error('Error reading resume schema:', error);
      throw error;
  }
}

async function getResumDocxText(resumeDocxPath){
    try {
        const fileBuffer = await fs.readFile(resumeDocxPath);
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return result.value;
    } catch (error) {
        console.error('Error reading resume docx:', error);
        throw error;
    }
}

async function getResumeDataPrompt(resumeDocxPath) {
    try {
        const resumeDocxText = await getResumDocxText(resumeDocxPath);
        const resumeSchema = await getResumeSchema()
        const resumeSchemaString = JSON.stringify(resumeSchema, null, 2);

        const prompt = `
        Please convert the following resume text 
        into a JSON object that conforms to the 
        provided resume schema. 
        Please return only the stringified JSON object string
        without any other text.

        The resume text starts here:
            ${resumeDocxText}
        The resume text ends here.

        The resume schema starts here:
            ${resumeSchemaString}
        The resume schema ends here.
        `;
        return prompt;
    } catch (error) {
        console.error('Error creating resume data prompt:', error);
        throw error;
    }
}


async function saveResumeDocxJson(resumeDocxDataPath, resumeDocxJson) {
    try {
        await fs.writeFile(resumeDocxDataPath, resumeDocxJson);
    } catch (error) {
        console.error(`Error saving resume data:`, error);
        throw error;
    }
}

// function to process DOCX resume at resumeDocxPath 
// and return extracted structure as a resumeDocxData object
async function processDocxResume(resumeDocxPath) {
    try {
        // Retrieve the prompt text from the DOCX file
        const promptText = await getResumeDataPrompt(resumeDocxPath);

        // Initialize the API client
        const client = new Client({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Define model and parameters
        // model "claude-3-sonnet-20240229"; is not supported on this API
        const model = "claude-2.1";
        const maxTokens = 4000;
        const temperature = 0;
    
        // log the start time
        const startTimeMilllis = Date.now();
        console.log(`prompt sent to ${model}`);
   
        // send the prompt to the model and await the response
        const response = await client.completions.create({
            model: model,
            max_tokens_to_sample: maxTokens, // Use max_tokens instead of max_tokens_to_sample
            temperature: temperature,
            // system: "You are an expert at using resume schemas to convert resume text into structured resume objects.",
            prompt: "\n\nHuman:" + promptText + "\n\nAssistant:"
        });

        // Extract the structured resume data from the response
        const prefix = " Here is the stringified JSON resume object conforming to the provided schema:\n\n";
        const resumeDocxJson = response.completion.replace(prefix,'');
        const resumeDocxJsonObj = JSON.parse(resumeDocxJson);
        const formattedResumeDocxJson = JSON.stringify(resumeDocxJsonObj, null, 4);

        // Calculate and log the elapsed time for processing the resume
        const elapsedSeconds = ((Date.now() - startTimeMilllis)/1000).toFixed(2);
        console.log(`resume processed in ${elapsedSeconds} seconds`);

        // Return the structured resume data
        return formattedResumeDocxJson;
    } catch (error) {
        // Catch and log any errors that occur during the processing of the resume
        console.error('Error processing resume:', error);
        throw error;
    }
}

async function main() {
// Call the processDocxResume function
    try {

        const resumeDocxPath = './inputs/proj-mngr-resume.docx';
        const resumeDocxDataPath = './outputs/proj-mngr-resume-docx.json';

        const resumeDocxJson = await processDocxResume(resumeDocxPath);

        // Save the structured resume data to the specified path 
        // and wait for the operation to complete
        await saveResumeDocxJson(resumeDocxDataPath, resumeDocxJson);
      
  } catch (error) {
      console.error('Error processing resume:', error);
      throw error;
  }
}

main();