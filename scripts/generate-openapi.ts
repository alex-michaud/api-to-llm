import bun from 'bun';
import swaggerJSDoc from 'swagger-jsdoc';

const destinationPath = './docs/openapi.json';
import packageJson from '../package.json' assert { type: 'json' };

async function main() {
  const options = {
    definition: {
      openapi: '3.1.0',
      info: {
        title: 'API to LLMs',
        version: packageJson.version,
        description: 'API to interact with Large Language Models (LLMs)',
      },
    },
    apis: ['./src/api/**/*.ts'],
  };

  const openapiSpec = swaggerJSDoc(options);

  await bun.write(destinationPath, JSON.stringify(openapiSpec, null, 2));
}

main()
  .then(() => {
    console.log(
      `✅ OpenAPI JSON (${packageJson.version}) saved in ${destinationPath}`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error generating OpenAPI spec:', error);
    process.exit(1);
  });
