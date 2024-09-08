
import os from 'os';
import dotenv from 'dotenv';
import { Document } from "langchain/document";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { ChatAnthropic } from "@langchain/anthropic"; // uopdated to reference OpenAI
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from "@langchain/core/output_parsers";
import fs from 'fs/promises';
import { processResumeWithSkills } from './resume_skills_updater.mjs';


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
      const processedContentStr = await processContentStr(aiMessage.content);
      jsonOutputObj = JSON.parse(processedContentStr);
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

  // verity that these files are readable
  const requiredReadOnlyFiles = [
    './inputs/data-engineer.docx',
    './inputs/skills.xlsx'
  ];

  for ( const file of requiredReadOnlyFiles ) {
    try {
      await fs.access(file, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`File ${file} is missing or not readable`);
    }
  }

  // verify that these files are both readable and writeable
  const requiredReadWriteableFiles = [
    './inputs/resume-schema.json',
  ];

  for ( const file of requiredReadWriteableFiles ) {
    try {
      // check if the file is both readable and writeable
      await fs.access(file, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
        console.error(`Error accessing file ${file}:`, error);
        throw new Error(`File ${file} is missing or not readable or writeable`);
    }
  }

  // use langchain and an LLM to extract 
  // the resume data that conformes to the 
  // given resume schema from a resume docx file
  // and save it to a new resume data file.
  await processResume(
    './outputs/data-engineer.json', // the writeable output resume data file
    './inputs/data-engineer.docx',  // the read-only input resume docx file
    './inputs/resume-schema.json' // the read-only resume schema file
  );

  // Read the given resume schema and if needed update it
  // to include a new "skills" property for each work 
  // experience entry and save the updated resume schema
  // to its original file.
  // Then extract skills from the given skill.xlsx file
  // and load the newly created resume data file. 
  // Use the skills associated with each work experience entry
  // to update its "skills" property. Finally, verify that
  // the updated resume data is valid against the possibly 
  // updated resume schmem and if valid save the updated 
  // resume data to the same file.

  await processResumeWithSkills(
    './inputs/resume-schema.json', // the read/writable resume schema file
    './outputs/data-engineer.json', // the read/writeable resume data file
    './inputs/skills.xlsx' // the read-only skills spreadsheet file
  );
}

main().catch(console.error);