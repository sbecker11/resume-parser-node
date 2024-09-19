import 'dotenv/config';
import { promises as fs } from 'fs';
import mammoth from 'mammoth';
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if ( !ANTHROPIC_API_KEY ) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
}

async function getResumeSchema(resumeSchemaPath) {
  try {
    const resumeSchema = await fs.readFile(resumeSchemaPath, 'utf8');
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

async function getResumeDataPrompt(resumeDocxPath, resumeSchemaPath) {
    try {
        const resumeDocxText = await getResumDocxText(resumeDocxPath);
        const resumeSchema = await getResumeSchema(resumeSchemaPath);
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
        const resumeDocxJsonStr = JSON.stringify(resumeDocxJson, null, 2);
        await fs.writeFile(resumeDocxDataPath, resumeDocxJsonStr);
        console.log("Resume processed and saved to " + resumeDocxDataPath);
    } catch (error) {
        console.error(`Error saving resume data:`, error);
        throw error;
    }
}

// function to process DOCX resume at resumeDocxPath 
// and return extracted structure as a resumeDocxData object
async function processDocxResume(resumeDocxPath, resumeSchemaPath) {
    try {
        // Retrieve the prompt text from the DOCX file
        const promptText = await getResumeDataPrompt(resumeDocxPath, resumeSchemaPath);

        // Create an instance of the Anthropic SDK
        const anthropic = new Anthropic({ 
            apiKey: ANTHROPIC_API_KEY 
        });

        // Define modelType and model parameters
        // model "claude-3-sonnet-20240229", "claude-3-opus-20240229" not supported on this API
        const modelType= "claude-2.1";
        const modelMaxTokens = 4000;
        const modelTemperature = 0;

        // log the start time
        const startMillis = Date.now();
        console.log(`prompt sent to ${modelType}`);
   
        // send the prompt to the model and await the response
        const response = await anthropic.messages.create({
            model: modelType,
            max_tokens: modelMaxTokens,
            temperature: modelTemperature,
            messages: [{ role: "user", content: promptText }]
        });

        // Calculate and log the elapsed time for processing the resume
        const elapsedSeconds = ((Date.now() - startMillis) / 1000).toFixed(2);
        console.log(`resume processed in ${elapsedSeconds} seconds`);

        // Extract the content from the response
        const text = response.content[0].text;

        // Extract the structured resume data from the response
        const prefixes = [
            "Here is the stringified JSON resume object conforming to the provided schema:\n\n```json",
            "Here is the JSON resume object string conforming to the provided schema:\n\n```json",
            " Here is the JSON resume object string conforming to the provided schema:\n\n```json",
            "Here is the resume text converted to a JSON object string conforming to the provided schema:\n\n```json"
        ];
        let resumeDocxJsonStr = null;
        for ( let prefix of prefixes ) {
            if ( text.includes(prefix) ) {
                resumeDocxJsonStr = text.replace(prefix,'');
                break;
            }
        }
        if ( !resumeDocxJsonStr ) {
            throw new Error(`Unexpected text format: ${text}`);
        }
        if ( resumeDocxJsonStr.includes('```') ) {
            resumeDocxJsonStr = resumeDocxJsonStr.replace('```','');
        }

        try {
            // Return the structured resume data
            const resumeDocxJsonObj = JSON.parse(resumeDocxJsonStr);
            return resumeDocxJsonObj;
        } catch (error) {
            console.error('Error processing resume:', error);
            throw error;
        }
    } catch (error) {
        // Catch and log any errors that occur during the processing of the resume
        console.error('Error processing resume:', error);
        throw error;
    }
}

async function main() {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    // Set default values
    const resumeSchemaPath = args[0] || './inputs/linkedin-schema.json';
    const resumeDocxPath = args[1] || './inputs/data-engineer.docx';
    const resumeDocxDataPath = args[2] || './outputs/data-engineer.json';
  
    // Call the processDocxResume function
    try {
        console.log(`Using resume schema path: ${resumeSchemaPath}`);
        console.log(`Using resume docx path: ${resumeDocxPath}`);
        console.log(`Using resume docx data path: ${resumeDocxDataPath}`);
        
        await fs.access(resumeSchemaPath, fs.constants.R_OK);
        await fs.access(resumeDocxPath, fs.constants.R_OK);

        await processDocxResume(resumeSchemaPath, resumeDocxPath, resumeDocxDataPath);

    } catch (error) {
        console.error('Error processing resume:', error);
    }
}

// Call the main function
main();

