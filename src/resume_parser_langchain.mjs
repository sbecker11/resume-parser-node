
import os from 'os';
import dotenv from 'dotenv';
import { Document } from "langchain/document";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { ChatAnthropic } from "@langchain/anthropic"; // uopdated to reference OpenAI
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from "@langchain/core/output_parsers";
import fs from 'fs/promises';

// npm install @langchain/core
// npm install @langchain/community
// npm install @langchain/anthropic 

dotenv.config();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if ( !ANTHROPIC_API_KEY ) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

let resumeText = null;

async function processResume(
  resumeOutputJsonPath, 
  resumeInputDocxPath, 
  resumeInputSchemaPath) {
  
    // Load the resume
    const loader = new DocxLoader(resumeInputDocxPath);
    const [doc] = await loader.load();
    resumeText = doc.pageContent;
        
    // Load the schema first looking at the raw text
    let schemaObj = null;
    let schemaText = null;
    try {
        const rawSchemaString = await fs.readFile(resumeInputSchemaPath, 'utf-8');
        schemaObj = JSON.parse(rawSchemaString);
        schemaText = JSON.stringify(schemaObj,null,2);
    } catch (error) {
        console.error('Error processing resume:', error);
    }
      
    // Create a prompt template
    const promptTemplate = new PromptTemplate({
      template: "Convert the following resume text to a JSON object that conforms to the provided schema:\n\nResume text:\n{resumeText}\n\nSchema:\n{schemaText}\n\nJSON output:",
      inputVariables: ["resumeText", "schemaText"],
    });
  
    // Set up the language model
    const modelType= "claude-3-sonnet-20240229";
    const modelTemparature = 0.2;
    const modelMaxTokens = 4096;

    // Create the prompt
    const prompt = await promptTemplate.format({
      resumeText: resumeText,
      schemaText: schemaText,
    });
  
    // Create the model
    const llm = new ChatAnthropic({
      api_key: ANTHROPIC_API_KEY,
      temperature: modelTemparature,
      model: modelType,
      maxTokens: modelMaxTokens,
    });

    const startMillis = Date.now();
    console.log(`prompt sent to ${modelType}`);

    // here we go
    const aiMessage = await llm.invoke(prompt);
    const contentType = typeof aiMessage.content;
    console.log(`contentType: ${contentType}`);

    const elapsedSeconds =((Date.now() - startMillis) / 1000).toFixed(2);
    console.log(`resume processed in ${elapsedSeconds} seconds`);

    // process the outpout
    let jsonOutputObj = null;
    if ( contentType === 'string' ) {
      jsonOutputObj = JSON.parse(aiMessage.content);
    } else if ( contentType == 'object' ) {
      jsonOutputObj = aiMessage.content;
    } else { 
      throw new Error(`Unexpected contentType ${contentType} from AI model`);
    }

    // Save the result
    await fs.writeFile(resumeOutputJsonPath, JSON.stringify(jsonOutputObj, null, 2));
  
    // declare success
    console.log("Resume processed and saved to " + resumeOutputJsonPath);
}
  

// the main function call to process the resume
processResume(
    './outputs/data-engineer.json',
    './inputs/data-engineer.docx', 
    './inputs/resume-schema.json'
  ).catch(error => {
    console.error('Error calling processResume:', error);
  });