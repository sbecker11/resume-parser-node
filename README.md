# resume-parser-node
uses a resume-schema.json to convert a resume.pdf/docx file into resume-pdf/docx.json

## proj-mngr resume tests  
### use anthropic claude to extract json structure from a pdf file
```node src/resume_parser.mjs inputs/proj-mngr.pdf outputs/proj-mngr-pdf.json```

### use anthropic claude to extract json structure from a docx file
```node src/resume_parser.mjs inputs/proj-mngr.docx outputs/proj-mngr-docx.json```

### verify that the extracted json files are -nearly- identical  
```diff outputs/proj-mngr-pdf.json outputs/proj-mngr-docx.json```

## data-engineer resume tests   
### use anthropic claude to extract json structure from a pdf file
```node src/resume_parser.mjs inputs/data-engineer.pdf outputs/data-engineer-pdf.json```

### use anthropic claude to extract json structure from a docx file
```node src/resume_parser.mjs inputs/data-engineer.docx outputs/data-engineer-docx.json```

### verify that the extracted json files are -nearly- identical  
```diff outputs/data-engineer-pdf.json outputs/data-engineer-docx.json```


<!-- ### compute the json-schema of the json file from the pdf json file
```node compute_json_schema.mjs outputs/proj-mngr-pdf.json outputs/proj-mngr-pdf-schema.json```

### compute the json-schema of the json file from the docx json file
```node compute_json_schema.py outputs/proj-mngr-docx.json outputs/proj-mngr-docx-schema.json```

### verify that the json-schema files are -nearly- identical
```diff outputs/proj-mngr-pdf-schema.json outputs/proj-mngr-docx-schema.json``` -->

## validate the proj-mngr-pdf.json data object against the resume schema
```node validate_data_object.py outputs/resume-pdf.json inputs/resume-schema.json```

## validate the proj-mngr-docx.json data object against the resume schema
```node validate_data_object.py outputs/resume-docx.json inputs/resume-schema.json ```