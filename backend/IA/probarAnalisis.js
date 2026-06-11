require("dotenv").config({ quiet: true });

const { analyzeLegalTextWithOpenAI } = require("./analizadorOpenAI");

const sampleText = `
En la causa nro 1234/26 se investiga el hecho ocurrido el 12/05/2026.
El imputado Juan Perez fue citado a audiencia el 20/05/2026.
Debera presentar documentacion antes del vencimiento del plazo.
`;

async function main() {
  const result = await analyzeLegalTextWithOpenAI(sampleText);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
