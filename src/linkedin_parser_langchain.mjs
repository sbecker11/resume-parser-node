
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

async function processLinkedinResume(
    inputLinkedinSchemaPath,
    inputLinkedinResumeDocxPath, 
    outputLinkedinResumeDataPath) {

      console.log(`Received inputLinkedinSchemaPath:      ${inputLinkedinSchemaPath}`);
      console.log(`Received inputLinkedinResumeDocxPath:  ${inputLinkedinResumeDocxPath}`);
      console.log(`Received outputLinkedinResumeDataPath: ${outputLinkedinResumeDataPath}`);
  
    if (!inputLinkedinSchemaPath.includes('inputs') || !inputLinkedinSchemaPath.endsWith('json')) {
      throw new Error('inputLinkedinSchemaPath must be a json file in the inputs directory');
    }
    if (!inputLinkedinResumeDocxPath.includes('inputs') || !inputLinkedinResumeDocxPath.endsWith('.docx')) {
      throw new Error('inputLinkedinResumeDocxPath must be a docx file in the inputs directory');
    }
    if (!outputLinkedinResumeDataPath.includes('outputs') || !outputLinkedinResumeDataPath.endsWith('.json')) {
      throw new Error('outputLinkedinResumeDataPath must be a json file in the outputs directory');
    }

    // Load the resume
    const loader = new DocxLoader(inputLinkedinResumeDocxPath);
    const [doc] = await loader.load();
    resumeText = doc.pageContent;
        
    // Load the schema first looking at the raw text
    let schemaObj = null;
    let schemaText = null;
    try {
        const rawSchemaString = await fs.readFile(inputLinkedinSchemaPath, 'utf-8');
        schemaObj = JSON.parse(rawSchemaString);
        schemaText = JSON.stringify(schemaObj,null,2);
    } catch (error) {
        console.error('Error processing resume:', error);
    }
      
    // Create a prompt template
    const promptTemplate = new PromptTemplate({
      template: "Convert the following ResumeText to a JSON object that conforms to the provided ResumeSchema:\n\nResumeTextStart:\n{resumeText}\n:ResumeTextEnd\nResumeSchemaStart:\n{schemaText}\n:ResumeSchemaEnd\nJSON output:",
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
      const processedContentStr = await processContentStr(aiMessage.content);
      jsonOutputObj = JSON.parse(processedContentStr);
    } else if ( contentType == 'object' ) {
      jsonOutputObj = aiMessage.content;
    } else { 
      throw new Error(`Unexpected contentType ${contentType} from AI model`);
    }

    // Save the result
    await fs.writeFile(outputLinkedinResumeDataPath, JSON.stringify(jsonOutputObj, null, 2));
  
    // declare success
    console.log("Resume processed and saved to " + outputLinkedinResumeDataPath);
}

async function processContentStr(contentStr) {

  if ( contentStr.indexOf("{") == 0 ) {
    if ( contentStr.lastIndexOf("}") == contentStr.length - 1 ) {
      console.log(`contentStr is already a JSON object: ${contentStr}`);
      return contentStr;
    }
  }
  // Extract the structured resume data from the response
  // by skipping the prefix and suffix
  const prefixes = [
    "```json\n",
    "Here is the resume text converted to a JSON object string conforming to the provided schema:\n\n```json",
    "Here is the stringified JSON resume object conforming to the provided schema:\n\n```json",
    "Here is the JSON resume object string conforming to the provided schema:\n\n```json"
  ];

  let resumeDocxJsonStr = null;
  for ( const prefix of prefixes ) {
    const prefixIndex = contentStr.indexOf(prefix);
    if ( prefixIndex >= 0 ) {
      console.log(`Found prefix ${prefix} in contentStr at prefixIndex: ${prefixIndex}`);
      const startIndex = prefixIndex + prefix.length;
      console.log(`startIndex: ${startIndex}`);
      const suffix = '```'
      const endIndex = contentStr.indexOf(suffix, startIndex);
      if ( endIndex < 0 ) {
        endIndex = contentStr.length;
        console.log(`Failed to find suffix ${suffix} in contentStr so using end of contentStr`);
      }
      console.log(`startIndex: ${startIndex}, endIndex: ${endIndex}`);
      resumeDocxJsonStr = contentStr.substring(startIndex, endIndex);
      console.log(`resumeDocxJsonStr: ${resumeDocxJsonStr}`);
      break;
    }
  }
 
  if ( !resumeDocxJsonStr ) {
    throw new Error('Failed to extract JSON resume object from AI response:\n' + contentStr);
  }

  return resumeDocxJsonStr;
}

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  // Set default values
  const inputLinkedinSchemaPath =       args[0] || './inputs/linkedin-schema.json';
  const inputLinkedinResumeDocxPath =   args[1] || './inputs/linkedin-resume.docx';
  const outputLinkedinResumeDataPath =  args[2] || './outputs/linkedin-resume.json';

  // Function to print usage
  function printUsage() {
    console.log('Usage: node linkedin_parser_langchain.mjs <inputLinkedinSchemaPath> <inputLinkedinResumeDocxPath> <outputLinkedinResumeDataPath>');
    console.log('Example: node linkedin_parser_langchain.mjs ./inputs/resume-schema.json ./inputs/data-engineer.docx ./outputs/data-engineer-notlangchain.json');
  }

  // Check if all required arguments are provided
  if (args.length < 3) {
    console.error('Error: Missing required arguments.');
    printUsage();
    process.exit(1);
  }

  // Verify that the input files exist and are readable
  try {
    await fs.access(inputLinkedinSchemaPath, fs.constants.R_OK);
    await fs.access(inputLinkedinResumeDocxPath, fs.constants.R_OK);
  } catch (error) {
    console.error('Error: One or more input files are not readable.');
    printUsage();
    process.exit(1);
  }

  // Verify that the output file is writable
  try {
    await fs.access(outputLinkedinResumeDataPath, fs.constants.W_OK);
  } catch (error) {
    try {
      // Try to create the file if it doesn't exist
      await fs.writeFile(outputLinkedinResumeDataPath, '');
    } catch (writeError) {
      console.error('Error: Output file is not writable.');
      printUsage();
      process.exit(1);
    }
  }

  try {
    console.log(`Submitting inputLinkedinSchemaPath:      ${inputLinkedinSchemaPath}`);
    console.log(`Submitting inputLinkedinResumeDocxPath:  ${inputLinkedinResumeDocxPath}`);
    console.log(`Submitting outputLinkedinResumeDataPath: ${outputLinkedinResumeDataPath}`);

    await processLinkedinResume(inputLinkedinSchemaPath, inputLinkedinResumeDocxPath, outputLinkedinResumeDataPath);

  } catch (error) {
    console.error('Error processing resume:', error);
  }
}

// Call the main function
main().catch(console.error);