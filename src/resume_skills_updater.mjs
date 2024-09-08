// resumeSkillsUpdater.mjs
import xlsx from 'xlsx';
import fs from 'fs/promises';
import Ajv from 'ajv';

const ajv = new Ajv();

async function updateResumeWithSkills(resumeObj, excelPath) {
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  if (!Array.isArray(data)) {
    throw new Error('Data is not an array or is undefined.');
  }  

  // will hold list of skills for each companyName
  const companySkillsMap = new Map();

  // each row contains a skill with non-empty columns used to 
  // determine which companies the skill should be added to
  data.slice(1).forEach((row, index) => {
    // console.log(`Processing row ${index + 2}:`, row); // Debugging statement to log the row being processed

    const skillName = row['CompanyName'];
    if (!skillName) {
      console.warn(`Row ${index + 2} is missing a skill name and will be skipped.`);
      return; // Skip to the next row
    }
    // console.log(`row:${index+2} skillName:${skillName}`);
    // Get company names from the keys of the row
    const companies = Object.keys(row).filter(key => key !== 'CompanyName' && key !== '__rowNum__');
    companies.forEach(company => {
      if (row[company]) {
        // Add skill to the company's list of skills 
        //(create the list if it doesn't exist)
        if (!companySkillsMap.has(company)) {
          companySkillsMap.set(company, []);
        }
        companySkillsMap.get(company).push(skillName);
      }
      const numSkills = companySkillsMap.get(company).length;
      // console.log(`Number of skills for ${company}: ${numSkills}`);
    });
  });

  // now update the skills property of each company in the resumeObj
  resumeObj.workExperience = resumeObj.workExperience.map(item => {
    const companyName = item.companyName;
    const skills = companySkillsMap.get(companyName);
    // console.log(`${companyName}.skills:${skills}`);
    return {
      ...item,
      skills: skills || undefined
    };
  });

  return resumeObj;
}

function validateResume(schema, resumeObj) {
  const validate = ajv.compile(schema);
  const valid = validate(resumeObj);

  if (!valid) {
    console.error('Resume validation failed:', validate.errors);
    throw new Error('Resume validation failed');
  }

  console.log('Resume successfully validated against the schema.');
}

export async function processResumeWithSkills(resumeSchemaPath, resumePath, excelPath) {
  const resumeSchemaObj = JSON.parse(await fs.readFile(resumeSchemaPath, 'utf-8'));
  const resumeObj = JSON.parse(await fs.readFile(resumePath, 'utf-8'));

  const updatedResumeObj = await updateResumeWithSkills(resumeObj, excelPath);
  
  // Validate the updated resume against the schema
  validateResume(resumeSchemaObj, updatedResumeObj);

  // Write updated resume back to file
  await fs.writeFile(resumePath, JSON.stringify(updatedResumeObj, null, 2));
  console.log('Resume updated successfully with skills information and validated against the schema.');
}

// Example usage
// processResume('path/to/resumeSchema.json', 'path/to/resume.json', 'path/to/company-skills.xlsx');

async function main() {

  // verity that these files are readable
  const requiredReadOnlyFiles = [
    './inputs/resume-schema.json',
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
    './outputs/data-engineer.json'
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

  // Extract skills from the given skill.xlsx file and use
  // the skill associated with eahc companyName to update the
  // "skills" property of that company in the resume data file.
  // Then validated the updated resume data against the 
  // resume schmem and if valid save the updated 
  // resume data to the same file.

  await processResumeWithSkills(
    './inputs/resume-schema.json', // the read/writable resume schema file
    './outputs/data-engineer.json', // the read/writeable resume data file
    './inputs/skills.xlsx' // the read-only skills spreadsheet file
  );
}

main().catch(console.error);