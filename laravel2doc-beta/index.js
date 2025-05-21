#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const { program } = require('commander');
const ora = require('ora');
const express = require('express');
const open = require('open');

const { generateERD } = require('./lib/generators/erd');
const { generateUML } = require('./lib/generators/uml');
const { generateSequenceDiagrams } = require('./lib/generators/sequence');
const { generateAPIDocumentation } = require('./lib/generators/api');
const { isLaravelProject, extractLaravelInfo } = require('./lib/utils/laravel');
const { generateDummyDocumentation } = require('./lib/generators/dummy');

// Package version from package.json
const packageVersion = require('./package.json').version;

// Display banner
console.log(
  chalk.green(
    figlet.textSync('Laravel2Doc', { horizontalLayout: 'full' })
  )
);
console.log(chalk.cyan(`v${packageVersion} - by MD SHARIF ALAM [@priom7]\n`));

program
  .version(packageVersion)
  .description('Generate comprehensive documentation for Laravel applications')
  .argument('[path]', 'Path to Laravel project root', process.cwd())
  .option('-p, --port <number>', 'Port to serve documentation on', 3333)
  .option('-o, --output <dir>', 'Output directory', 'laravel2doc')
  .parse(process.argv);

const options = program.opts();
const laravelPath = program.args[0] || process.cwd();

async function main() {
  const spinner = ora('Checking environment...').start();
  
  // Change to the specified Laravel project directory
  const originalDir = process.cwd();
  process.chdir(laravelPath);
  
  // Check if running inside a Laravel project
  const isLaravel = isLaravelProject();
  
  if (isLaravel) {
    spinner.text = 'Laravel project detected';
    spinner.succeed();
    await generateLaravelDocumentation(options.output, options.port, spinner);
  } else {
    spinner.text = 'Not a Laravel project, generating dummy documentation';
    spinner.succeed();
    await generateDummyDocumentation(options.output, options.port, spinner);
  }
  
  // Change back to original directory
  process.chdir(originalDir);
}

async function generateLaravelDocumentation(outputDir, port, spinner) {
  // Create output directory if it doesn't exist
  const fullOutputPath = path.resolve(process.cwd(), outputDir);
  if (!fs.existsSync(fullOutputPath)) {
    fs.mkdirSync(fullOutputPath, { recursive: true });
  }
  
  // Extract Laravel project information
  spinner.text = 'Analyzing Laravel project...';
  const projectInfo = await extractLaravelInfo();
  
  // Generate all documentation
  spinner.text = 'Generating ERD diagrams...';
  await generateERD(projectInfo, fullOutputPath);
  
  spinner.text = 'Generating UML diagrams...';
  await generateUML(projectInfo, fullOutputPath);
  
  spinner.text = 'Generating sequence diagrams...';
  await generateSequenceDiagrams(projectInfo, fullOutputPath);
  
  spinner.text = 'Generating API documentation...';
  await generateAPIDocumentation(projectInfo, fullOutputPath);
  
  spinner.text = 'Documentation generated successfully!';
  spinner.succeed();
  
  // Serve the documentation
  serveDocumentation(fullOutputPath, port);
}

function serveDocumentation(docPath, port) {
  const app = express();
  
  // Serve static files from the documentation directory
  app.use(express.static(docPath));
  
  // // Route all requests to index.html
  // app.get('*', (req, res) => {
  //   res.sendFile(path.join(docPath, 'index.html'));
  // });
  
  // Start the server
  app.listen(port, () => {
    console.log(chalk.green(`\n🚀 Documentation server started!`));
    console.log(chalk.cyan(`📚 View your documentation at: http://localhost:${port}`));
    console.log(chalk.yellow(`🔍 Documentation files are in: ${docPath}\n`));
    
    // Open browser automatically
    open(`http://localhost:${port}/sequence`);
  });
}

// Run the main function
main().catch(err => {
  console.error(chalk.red('\nError generating documentation:'));
  console.error(chalk.red(err.message));
  process.exit(1);
});