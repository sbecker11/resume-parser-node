# resume-parser-node

Converts an MS Word resume file from inputs/resume.docx
to plain text. Then create a prompt with instructions 
to extract structured data from the text that conforms
to a given resume schema at inputs/resume-schema.json
Use the prompt to an LLM and save the resulting 
resume data to outputs/resume-docx.json

```npm run start```

## Langchain installation
npm install langchain
npm i @langchain/core


npm install langchain.prompts FAILS
npm install langchain_core.messages FAILS
