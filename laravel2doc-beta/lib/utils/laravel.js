const fs = require("fs");
const path = require("path");
const glob = require("glob");
const dir = path.resolve(process.cwd(), "laravel2doc");
/**
 * Check if the current directory is a Laravel project
 * @returns {boolean} True if Laravel project is detected
 */
function isLaravelProject() {
  try {
    // Check for key Laravel files/directories
    const hasArtisan = fs.existsSync(path.join(process.cwd(), "artisan"));
    const hasAppDir = fs.existsSync(path.join(process.cwd(), "app"));
    const hasComposerJson = fs.existsSync(
      path.join(process.cwd(), "composer.json")
    );

    if (hasComposerJson) {
      const composerJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "composer.json"), "utf8")
      );
      // Check if it requires laravel/framework
      if (composerJson.require && composerJson.require["laravel/framework"]) {
        return true;
      }
    }

    return hasArtisan && hasAppDir;
  } catch (err) {
    return false;
  }
}

/**
 * Extract information from a Laravel project
 * @returns {Object} Project information
 */
async function extractLaravelInfo() {
  const projectInfo = {
    name: "Unknown Laravel Project",
    version: "Unknown",
    models: [],
    controllers: [],
    routes: [],
    migrations: [],
    relationships: [],
  };
 
  generateMainIndex(dir);

  // Generate styles

  generateStyles(dir);

  // Get project name from composer.json
  try {
    const composerJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "composer.json"), "utf8")
    );
    projectInfo.name = composerJson.name || projectInfo.name;
  } catch (err) {
    // Ignore errors if composer.json doesn't exist or can't be parsed
  }

  // Extract Laravel version
  try {
    const composerLock = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "composer.lock"), "utf8")
    );
    const laravelPackage = composerLock.packages.find(
      (pkg) => pkg.name === "laravel/framework"
    );
    if (laravelPackage) {
      projectInfo.version = laravelPackage.version;
    }
  } catch (err) {
    // Ignore errors if composer.lock doesn't exist or can't be parsed
  }

  // Extract models
  const modelFiles = glob.sync("app/Models/**/*.php", { cwd: process.cwd() });
  projectInfo.models = modelFiles.map((file) => {
    return {
      name: path.basename(file, ".php"),
      path: file,
      content: fs.readFileSync(path.join(process.cwd(), file), "utf8"),
    };
  });

  // Extract controllers
  const controllerFiles = glob.sync("app/Http/Controllers/**/*.php", {
    cwd: process.cwd(),
  });
  projectInfo.controllers = controllerFiles.map((file) => {
    return {
      name: path.basename(file, ".php"),
      path: file,
      content: fs.readFileSync(path.join(process.cwd(), file), "utf8"),
    };
  });

  // Extract migrations
  const migrationFiles = glob.sync("database/migrations/**/*.php", {
    cwd: process.cwd(),
  });
  projectInfo.migrations = migrationFiles.map((file) => {
    return {
      name: path.basename(file, ".php"),
      path: file,
      content: fs.readFileSync(path.join(process.cwd(), file), "utf8"),
    };
  });

  // Extract routes from route files
  const routeFiles = glob.sync("routes/**/*.php", { cwd: process.cwd() });
  projectInfo.routeFiles = routeFiles.map((file) => {
    return {
      name: path.basename(file, ".php"),
      path: file,
      content: fs.readFileSync(path.join(process.cwd(), file), "utf8"),
    };
  });

  // Parse model relationships
  projectInfo.relationships = parseModelRelationships(projectInfo.models);

  return projectInfo;
}

/**
 * Parse model relationships from model files
 * @param {Array} models List of models
 * @returns {Array} Relationships between models
 */
function parseModelRelationships(models) {
  const relationships = [];

  // Define relationship patterns to look for
  const relationshipPatterns = [
    {
      type: "hasOne",
      regex:
        /public\s+function\s+(\w+)\s*\(\s*\)\s*{\s*return\s+\$?this->hasOne\s*\(\s*([^,)]+)/g,
    },
    {
      type: "hasMany",
      regex:
        /public\s+function\s+(\w+)\s*\(\s*\)\s*{\s*return\s+\$?this->hasMany\s*\(\s*([^,)]+)/g,
    },
    {
      type: "belongsTo",
      regex:
        /public\s+function\s+(\w+)\s*\(\s*\)\s*{\s*return\s+\$?this->belongsTo\s*\(\s*([^,)]+)/g,
    },
    {
      type: "belongsToMany",
      regex:
        /public\s+function\s+(\w+)\s*\(\s*\)\s*{\s*return\s+\$?this->belongsToMany\s*\(\s*([^,)]+)/g,
    },
    {
      type: "morphTo",
      regex:
        /public\s+function\s+(\w+)\s*\(\s*\)\s*{\s*return\s+\$?this->morphTo\s*\(/g,
    },
    {
      type: "morphMany",
      regex:
        /public\s+function\s+(\w+)\s*\(\s*\)\s*{\s*return\s+\$?this->morphMany\s*\(\s*([^,)]+)/g,
    },
    {
      type: "morphOne",
      regex:
        /public\s+function\s+(\w+)\s*\(\s*\)\s*{\s*return\s+\$?this->morphOne\s*\(\s*([^,)]+)/g,
    },
  ];

  models.forEach((model) => {
    relationshipPatterns.forEach((pattern) => {
      const matches = [...model.content.matchAll(pattern.regex)];

      matches.forEach((match) => {
        const relationshipName = match[1];
        const relatedModel = match[2]
          ? match[2].replace(/['"]/g, "").split("\\").pop()
          : "Unknown";

        relationships.push({
          sourceModel: model.name,
          relationshipType: pattern.type,
          relationshipName: relationshipName,
          targetModel: relatedModel,
        });
      });
    });
  });

  return relationships;
}

function generateMainIndex(dir) {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laravel2Doc - Documentation</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="navbar">
    <div class="navbar-title">Laravel2Doc</div>
    <div class="navbar-links">
      <a href="erd/">ERD</a>
      <a href="uml/">UML</a>
      <a href="sequence/">Sequence</a>
      <a href="api/">API</a>
    </div>
  </div>

  <header>
    <h1>Laravel2Doc</h1>
    <h2>Example Laravel Application Documentation</h2>
  </header>
  
  <main>
    <div class="introduction">
      <h3>Welcome to Laravel2Doc</h3>
      <p>
        This is a demonstration of the Laravel2Doc package, which automatically generates comprehensive documentation for Laravel applications.
        Since this is running outside a Laravel project, we're showing you example documentation to demonstrate the features.
      </p>
      <p>
        In a real Laravel project, Laravel2Doc would automatically analyze your code and generate documentation based on your models, controllers, migrations, and more.
      </p>
    </div>
    
    <div class="doc-cards">
      <div class="doc-card">
        <h3>Entity Relationship Diagrams</h3>
        <p>Visual representation of your database schema, showing tables, columns, and relationships.</p>
        <a href="erd/" class="card-button">View ERD</a>
      </div>
      
      <div class="doc-card">
        <h3>UML Class Diagrams</h3>
        <p>Object-oriented view of your application's models and their relationships.</p>
        <a href="uml/" class="card-button">View UML</a>
      </div>
      
      <div class="doc-card">
        <h3>Sequence Diagrams</h3>
        <p>Flow of interactions between components for common operations in your application.</p>
        <a href="sequence/" class="card-button">View Sequence Diagrams</a>
      </div>
      
      <div class="doc-card">
        <h3>API Documentation</h3>
        <p>Comprehensive documentation of your application's API endpoints and their parameters.</p>
        <a href="api/" class="card-button">View API Docs</a>
      </div>
    </div>
  </main>
  
  <footer>
    <p>Generated by Laravel2Doc - <a href="https://github.com/priom7/laravel2doc">GitHub</a></p>
  </footer>
</body>
</html>
  `;

  fs.writeFileSync(path.join(dir, "index.html"), htmlContent);
}

function generateStyles(dir) {
  const cssContent = `
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 0;
  background-color: #f8f9fa;
}

.navbar {
  background-color: #2c3e50;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar-title {
  font-size: 1.5rem;
  font-weight: bold;
}

.navbar-links a {
  color: white;
  text-decoration: none;
  margin-left: 1.5rem;
  transition: color 0.3s;
}

.navbar-links a:hover {
  color: #3498db;
}

header {
  text-align: center;
  padding: 2rem 1rem;
  background-color: #3498db;
  color: white;
}

header h1 {
  margin: 0;
  font-size: 2.5rem;
}

header h2 {
  margin: 0.5rem 0 0;
  font-weight: normal;
  font-size: 1.2rem;
}

main {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.introduction {
  background-color: white;
  padding: 1.5rem;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.doc-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.doc-card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.doc-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.card-button {
  display: inline-block;
  background-color: #3498db;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  text-decoration: none;
  margin-top: 1rem;
  transition: background-color 0.3s;
}

.card-button:hover {
  background-color: #2980b9;
}

footer {
  text-align: center;
  padding: 1rem;
  background-color: #2c3e50;
  color: white;
  margin-top: 2rem;
}

footer a {
  color: #3498db;
  text-decoration: none;
}

.diagram-container {
  background-color: white;
  padding: 1.5rem;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  overflow-x: auto;
}

.legend {
  background-color: white;
  padding: 1.5rem;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.markdown-body {
  background-color: white;
  padding: 1.5rem;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.markdown-body hr {
  margin: 2rem 0;
  border: 0;
  border-top: 1px solid #eee;
}

.markdown-body code {
  background-color: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
}

.index-container {
  background-color: white;
  padding: 1.5rem;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.diagram-list {
  columns: 2;
  column-gap: 2rem;
  list-style-type: none;
  padding: 0;
}

.diagram-list li {
  margin-bottom: 0.5rem;
}

.diagram-list a {
  text-decoration: none;
  color: #3498db;
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    padding: 1rem;
  }
  
  .navbar-links {
    margin-top: 1rem;
  }
  
  .navbar-links a {
    margin-left: 0.75rem;
    margin-right: 0.75rem;
  }
  
  .diagram-list {
    columns: 1;
  }
}
  `;

  fs.writeFileSync(path.join(dir, "styles.css"), cssContent);
}

module.exports = {
  isLaravelProject,
  extractLaravelInfo,
};
