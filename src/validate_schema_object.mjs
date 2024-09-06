import Ajv from "ajv";
import { promises as fs } from "fs";
import path from "path";

const ajv = new Ajv({ allErrors: true });

async function validateSchemaObject(schemaFilePath) {
    try {
        // Read the data and schema files
        const schema = JSON.parse(await fs.readFile(schemaFilePath, "utf8"));

        // Compile the schema
        const validate = ajv.compile(schema);

        const validate = (data) => {
            const validate = ajv.compile(authSchema);
            const valid = validate(data);
            if (!valid) {
              console.log(validate.errors);
              throw new Error("Validation failed");
            }
            return data    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.error("Usage: node src/validate_schema_object.mjs inputs/<schemaFilePath>");
        process.exit(1);
    }

    const [schemaFilePath] = args;

    await validateSchemaObject(schemaFilePath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}