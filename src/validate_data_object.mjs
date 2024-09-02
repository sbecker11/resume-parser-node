import Ajv from "ajv";
import { promises as fs } from "fs";
import path from "path";

const ajv = new Ajv();

async function validateDataObject(dataFilePath, schemaFilePath) {
    try {
        // Read the data and schema files
        const data = JSON.parse(await fs.readFile(dataFilePath, "utf8"));
        const schema = JSON.parse(await fs.readFile(schemaFilePath, "utf8"));

        // Compile the schema
        const validate = ajv.compile(schema);

        // Validate the data against the schema
        const valid = validate(data);
        if (valid) {
            console.log(`data object ${dataFilePath} is valid against schema ${schemaFilePath}`);
        } else {
            console.error(`Validation error: ${validate.errors.map(err => err.message).join(", ")}`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
        console.error("Usage: node src/validate_data_object.mjs inputs/<schemaFilePath> outputs/<dataFilePath>");
        process.exit(1);
    }

    const [schemaFilePath, dataFilePath] = args;

    await validateDataObject(dataFilePath, schemaFilePath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}