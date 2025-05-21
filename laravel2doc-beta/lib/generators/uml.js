const fs = require("fs");
const path = require("path");

/**
 * Generate comprehensive UML diagrams from project info with interactive features
 * @param {Object} projectInfo Project information
 * @param {string} outputDir Output directory
 * @returns {Object} Generated file paths
 */
async function generateUML(projectInfo, outputDir) {
  // Create UML directory if it doesn't exist
  const umlDir = path.join(outputDir, "uml");
  if (!fs.existsSync(umlDir)) {
    fs.mkdirSync(umlDir, { recursive: true });
  }

  // Generate class diagram data structure
  const diagramData = {
    models: generateModelData(projectInfo.models),
    controllers: generateControllerData(projectInfo.controllers || []),
    services: generateServiceData(projectInfo.services || []),
    relationships: projectInfo.relationships,
    directories: extractDirectoryStructure(projectInfo),
  };

  // Write diagram data as JSON for dynamic filtering
  fs.writeFileSync(
    path.join(umlDir, "diagram_data.json"),
    JSON.stringify(diagramData, null, 2)
  );

  // Generate static mermaid diagram for models only (default view)
  const modelsDiagram = generateMermaidDiagram(diagramData, {
    entityTypes: ["models"],
  });
  fs.writeFileSync(path.join(umlDir, "models_diagram.md"), modelsDiagram);

  // Generate full diagram with all entity types
  const fullDiagram = generateMermaidDiagram(diagramData, {
    entityTypes: ["models", "controllers", "services"],
  });
  fs.writeFileSync(path.join(umlDir, "full_diagram.md"), fullDiagram);

  // Create interactive HTML file
  const htmlContent = generateInteractiveHTML(projectInfo, diagramData);
  fs.writeFileSync(path.join(umlDir, "index.html"), htmlContent);

  return {
    files: [
      path.join(umlDir, "diagram_data.json"),
      path.join(umlDir, "models_diagram.md"),
      path.join(umlDir, "full_diagram.md"),
      path.join(umlDir, "index.html"),
    ],
  };
}

/**
 * Extract directory structure from project info
 * @param {Object} projectInfo Project information
 * @returns {Object} Directory structure
 */
function extractDirectoryStructure(projectInfo) {
  const directories = {};

  // Process models
  projectInfo.models.forEach((model) => {
    const filePath = model.filePath || "";
    const dir = path.dirname(filePath);

    if (!directories[dir]) {
      directories[dir] = { models: [] };
    }

    directories[dir].models.push(model.name);
  });

  // Process controllers if available
  if (projectInfo.controllers) {
    projectInfo.controllers.forEach((controller) => {
      const filePath = controller.filePath || "";
      const dir = path.dirname(filePath);

      if (!directories[dir]) {
        directories[dir] = { controllers: [] };
      } else if (!directories[dir].controllers) {
        directories[dir].controllers = [];
      }

      directories[dir].controllers.push(controller.name);
    });
  }

  return directories;
}

/**
 * Generate model data for diagrams
 * @param {Array} models Model information
 * @returns {Array} Processed model data
 */
function generateModelData(models) {
  return models.map((model) => {
    const processedModel = {
      name: model.name,
      properties: [],
      methods: [],
      filePath: model.filePath,
      namespace: extractNamespace(model.content),
    };

    // Extract properties from fillable, guarded, casts, etc.
    const fillableMatch = model.content.match(
      /protected\s+\$fillable\s*=\s*\[([\s\S]*?)\]/
    );
    const guardedMatch = model.content.match(
      /protected\s+\$guarded\s*=\s*\[([\s\S]*?)\]/
    );
    const castsMatch = model.content.match(
      /protected\s+\$casts\s*=\s*\[([\s\S]*?)\]|protected\s+\$casts\s*=\s*\{([\s\S]*?)\}/
    );
    const tableMatch = model.content.match(
      /protected\s+\$table\s*=\s*['"]([^'"]+)['"]/
    );

    // Add table name if available
    if (tableMatch) {
      processedModel.tableName = tableMatch[1];
    }

    // Process fillable properties
    if (fillableMatch) {
      const fillable = fillableMatch[1]
        .split(",")
        .map((item) => item.trim().replace(/['"]/g, ""))
        .filter((item) => item.length > 0);

      fillable.forEach((prop) => {
        processedModel.properties.push({
          name: prop,
          type: "fillable",
          dataType: extractDataTypeFromCasts(prop, castsMatch),
        });
      });
    }

    // Extract methods from the model
    const methodMatches = [
      ...model.content.matchAll(/public\s+function\s+(\w+)\s*\(([^)]*)\)/g),
    ];

    methodMatches.forEach((match) => {
      const methodName = match[1];
      const params = match[2];

      // Skip relationship methods as they'll be shown in relationships
      if (
        ![
          "hasOne",
          "hasMany",
          "belongsTo",
          "belongsToMany",
          "morphTo",
          "morphMany",
          "morphOne",
        ].some(
          (rel) =>
            model.content.includes(`this->${rel}`) &&
            model.content.includes(`function ${methodName}`)
        )
      ) {
        processedModel.methods.push({
          name: methodName,
          params: params.trim(),
        });
      }
    });

    return processedModel;
  });
}

/**
 * Generate controller data for diagrams
 * @param {Array} controllers Controller information
 * @returns {Array} Processed controller data
 */
function generateControllerData(controllers) {
  return controllers.map((controller) => {
    const processedController = {
      name: controller.name,
      methods: [],
      filePath: controller.filePath,
      namespace: extractNamespace(controller.content),
    };

    // Extract methods from the controller
    const methodMatches = [
      ...controller.content.matchAll(
        /public\s+function\s+(\w+)\s*\(([^)]*)\)/g
      ),
    ];

    methodMatches.forEach((match) => {
      const methodName = match[1];
      const params = match[2];

      processedController.methods.push({
        name: methodName,
        params: params.trim(),
      });
    });

    return processedController;
  });
}

/**
 * Generate service data for diagrams
 * @param {Array} services Service information
 * @returns {Array} Processed service data
 */
function generateServiceData(services) {
  return services.map((service) => {
    const processedService = {
      name: service.name,
      methods: [],
      filePath: service.filePath,
      namespace: extractNamespace(service.content),
    };

    // Extract methods from the service
    const methodMatches = [
      ...service.content.matchAll(/public\s+function\s+(\w+)\s*\(([^)]*)\)/g),
    ];

    methodMatches.forEach((match) => {
      const methodName = match[1];
      const params = match[2];

      processedService.methods.push({
        name: methodName,
        params: params.trim(),
      });
    });

    return processedService;
  });
}

/**
 * Extract namespace from class content
 * @param {string} content Class content
 * @returns {string} Namespace
 */
function extractNamespace(content) {
  const namespaceMatch = content.match(/namespace\s+([^;]+);/);
  return namespaceMatch ? namespaceMatch[1] : "";
}

/**
 * Extract data type from casts
 * @param {string} property Property name
 * @param {RegExpMatchArray} castsMatch Casts match
 * @returns {string} Data type
 */
function extractDataTypeFromCasts(property, castsMatch) {
  if (!castsMatch) return "";

  const castsContent = castsMatch[1] || castsMatch[2] || "";
  const propRegex = new RegExp(`['"]${property}['"]\\s*=>\\s*['"]([^'"]+)['"]`);
  const typeMatch = castsContent.match(propRegex);

  return typeMatch ? typeMatch[1] : "";
}

/**
 * Generate Mermaid diagram from diagram data
 * @param {Object} diagramData Diagram data
 * @param {Object} options Diagram options
 * @returns {string} Mermaid diagram
 */
function generateMermaidDiagram(diagramData, options = {}) {
  const { entityTypes = ["models"], directory = null } = options;
  let mermaidDiagram = `classDiagram\n`;

  // Add models to diagram
  if (entityTypes.includes("models")) {
    diagramData.models.forEach((model) => {
      // Skip models not in the selected directory if directory filter is applied
      if (directory && !model.filePath.includes(directory)) return;

      mermaidDiagram += `  class ${model.name} {\n`;

      // Add tableName if available
      if (model.tableName) {
        mermaidDiagram += `    <<Table: ${model.tableName}>>\n`;
      }

      // Add properties
      model.properties.forEach((prop) => {
        const dataType = prop.dataType ? `: ${prop.dataType}` : "";
        mermaidDiagram += `    +${prop.name}${dataType}\n`;
      });

      // Add methods
      model.methods.forEach((method) => {
        mermaidDiagram += `    +${method.name}(${method.params})\n`;
      });

      mermaidDiagram += `  }\n`;
    });
  }

  // Add controllers if requested
  if (entityTypes.includes("controllers") && diagramData.controllers) {
    diagramData.controllers.forEach((controller) => {
      // Skip controllers not in the selected directory if directory filter is applied
      if (directory && !controller.filePath.includes(directory)) return;

      mermaidDiagram += `  class ${controller.name} {\n`;
      mermaidDiagram += `    <<Controller>>\n`;

      // Add methods
      controller.methods.forEach((method) => {
        mermaidDiagram += `    +${method.name}(${method.params})\n`;
      });

      mermaidDiagram += `  }\n`;
    });
  }

  // Add services if requested
  if (entityTypes.includes("services") && diagramData.services) {
    diagramData.services.forEach((service) => {
      // Skip services not in the selected directory if directory filter is applied
      if (directory && !service.filePath.includes(directory)) return;

      mermaidDiagram += `  class ${service.name} {\n`;
      mermaidDiagram += `    <<Service>>\n`;

      // Add methods
      service.methods.forEach((method) => {
        mermaidDiagram += `    +${method.name}(${method.params})\n`;
      });

      mermaidDiagram += `  }\n`;
    });
  }

  // Add relationships
  if (entityTypes.includes("models")) {
    diagramData.relationships.forEach((rel) => {
      // Skip relationships not in the selected directory if directory filter is applied
      const sourceModel = rel.sourceModel.replace(/::class$/, "");
      const targetModel = rel.targetModel.replace(/::class$/, "");

      let arrow;
      let relationshipName = rel.relationshipName.toLowerCase();

      switch (rel.relationshipType) {
        case "hasOne":
          arrow = "-->";
          break;
        case "hasMany":
          arrow = "--*";
          break;
        case "belongsTo":
          arrow = "<--";
          break;
        case "belongsToMany":
          arrow = "<--*";
          break;
        default:
          arrow = "-->";
      }

      mermaidDiagram += `  ${sourceModel} ${arrow} ${targetModel} : ${relationshipName}\n`;
    });
  }

  return mermaidDiagram;
}

/**
 * Generate interactive HTML for UML diagrams
 * @param {Object} projectInfo Project information
 * @param {Object} diagramData Diagram data
 * @returns {string} HTML content
 */
function generateInteractiveHTML(projectInfo, diagramData) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interactive UML Diagrams - ${projectInfo.name}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
  <link rel="stylesheet" href="../styles.css">
  <style>
    :root {
      --primary-color: #3490dc;
      --secondary-color: #2d3748;
      --bg-color: #f8fafc;
      --panel-bg: #ffffff;
      --border-color: #e2e8f0;
      --text-color: #333;
      --text-muted: #718096;
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --primary-color: #4299e1;
        --secondary-color: #a0aec0;
        --bg-color: #1a202c;
        --panel-bg: #2d3748;
        --border-color: #4a5568;
        --text-color: #f7fafc;
        --text-muted: #cbd5e0;
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text-color);
      background-color: var(--bg-color);
      margin: 0;
      padding: 0;
      transition: background-color 0.3s ease;
    }
    
    .container {
      display: grid;
      grid-template-columns: 250px 1fr;
      grid-template-rows: auto 1fr;
      grid-template-areas:
        "header header"
        "sidebar content";
      height: 100vh;
    }
    
    @media (max-width: 768px) {
      .container {
        grid-template-columns: 1fr;
        grid-template-areas:
          "header"
          "sidebar"
          "content";
      }
      
      .sidebar {
        max-height: 300px;
        overflow-y: auto;
      }
    }
    
    header {
      grid-area: header;
      background: var(--primary-color);
      color: white;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .header-title {
      margin: 0;
    }
    
    .header-controls {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    
    .theme-toggle {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1.2rem;
    }
    
    .sidebar {
      grid-area: sidebar;
      background: var(--panel-bg);
      border-right: 1px solid var(--border-color);
      padding: 1rem;
      overflow-y: auto;
    }
    
    .content {
      grid-area: content;
      padding: 1rem;
      overflow: auto;
    }
    
    .filter-section {
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1rem;
    }
    
    .filter-section h3 {
      margin-top: 0;
      color: var(--primary-color);
    }
    
    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    input[type="checkbox"] {
      cursor: pointer;
    }
    
    label {
      cursor: pointer;
      user-select: none;
    }
    
    select {
      width: 100%;
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      background-color: var(--panel-bg);
      color: var(--text-color);
    }
    
    .button {
      background-color: var(--primary-color);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 1rem;
      transition: background-color 0.2s ease;
    }
    
    .button:hover {
      background-color: #2779bd;
    }
    
    .diagram-container {
      background: var(--panel-bg);
      border-radius: 5px;
      overflow: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
      height: 100%;
      position: relative;
    }
    
    .diagram-controls {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: flex;
      gap: 0.5rem;
      z-index: 10;
    }
    
    .zoom-button {
      background-color: var(--panel-bg);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: bold;
      user-select: none;
    }
    
    .zoom-button:hover {
      background-color: var(--primary-color);
      color: white;
    }
    
    .mermaid {
      font-size: 14px;
      padding: 1rem;
    }
    
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 1.2rem;
      color: var(--text-muted);
    }
    
    .entity-count {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-left: 0.5rem;
    }
.navbar {
  background-color: #2c3e50;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  font-family: 'Segoe UI', sans-serif;
}

.navbar-title {
  font-size: 1.6rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.navbar-links a {
  color: white;
  text-decoration: none;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  transition: background 0.3s, color 0.3s;
}

.navbar-links a:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #1abc9c;
}

.github-link {
  background-color: #b43355;
  color: #2c3e50;
  font-weight: 500;
}

.github-link:hover {
  background-color: #bdc3c7;
  color: #2c3e50;
}

    
    .search-box {
      width: 100%;
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      margin-bottom: 1rem;
      background-color: var(--panel-bg);
      color: var(--text-color);
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
</head>
<body>
<!-- Add Font Awesome CDN if not already included -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

<div class="navbar">
  <div class="navbar-title">
    <i class="fas fa-code-branch"></i> Laravel2Doc
  </div>
  <div class="navbar-links">
    <a href="https://laravel2doc.netlify.app/"><i class="fas fa-house"></i> Home</a>
    <a href="../erd/"><i class="fas fa-project-diagram"></i> ERD</a>
    <a href="../uml/"><i class="fas fa-sitemap"></i> UML</a>
    <a href="../sequence/"><i class="fas fa-stream"></i> Sequence</a>
    <a href="../api/"><i class="fas fa-plug"></i> API</a>
    <a href="https://github.com/Priom7/laravel2doc" target="_blank" class="github-link">
      <i class="fab fa-github"></i> GitHub
    </a>
  </div>
</div>

  <div class="container">
    <header>
      <div>
        <h1 class="header-title">UML Explorer</h1>
        <h2 class="header-subtitle">${projectInfo.name} (Laravel ${
    projectInfo.version || "Unknown"
  })</h2>
      </div>
      <div class="header-controls">
        <button id="export-png" class="button">Export PNG</button>
        <button id="theme-toggle" class="theme-toggle">🌙</button>
      </div>
    </header>
    
    <div class="sidebar">
      <input type="text" id="search-box" class="search-box" placeholder="Search entities...">
      
      <div class="filter-section">
        <h3>Entity Types</h3>
        <div class="checkbox-group" id="entity-types">
          <div class="checkbox-item">
            <input type="checkbox" id="models-checkbox" checked>
            <label for="models-checkbox">Models <span class="entity-count">(${
              diagramData.models.length
            })</span></label>
          </div>
          <div class="checkbox-item">
            <input type="checkbox" id="controllers-checkbox">
            <label for="controllers-checkbox">Controllers <span class="entity-count">(${
              diagramData.controllers ? diagramData.controllers.length : 0
            })</span></label>
          </div>
          <div class="checkbox-item">
            <input type="checkbox" id="services-checkbox">
            <label for="services-checkbox">Services <span class="entity-count">(${
              diagramData.services ? diagramData.services.length : 0
            })</span></label>
          </div>
        </div>
      </div>
      
      <div class="filter-section">
        <h3>Filter by Directory</h3>
        <select id="directory-select">
          <option value="">All Directories</option>
          ${Object.keys(diagramData.directories)
            .map((dir) => `<option value="${dir}">${dir}</option>`)
            .join("")}
        </select>
      </div>
      
      <div class="filter-section">
        <h3>Detail Level</h3>
        <div class="checkbox-group">
          <div class="checkbox-item">
            <input type="checkbox" id="show-properties" checked>
            <label for="show-properties">Show Properties</label>
          </div>
          <div class="checkbox-item">
            <input type="checkbox" id="show-methods" checked>
            <label for="show-methods">Show Methods</label>
          </div>
          <div class="checkbox-item">
            <input type="checkbox" id="show-relationships" checked>
            <label for="show-relationships">Show Relationships</label>
          </div>
        </div>
      </div>
      
      <button id="apply-filters" class="button">Apply Filters</button>
    </div>
    
    <div class="content">
      <div class="diagram-container">
        <div class="diagram-controls">
          <div class="zoom-button" id="zoom-in">+</div>
          <div class="zoom-button" id="zoom-out">-</div>
          <div class="zoom-button" id="zoom-reset">↺</div>
        </div>
        <div id="diagram" class="mermaid"></div>
      </div>
    </div>
  </div>
  
  <script>
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: false
      }
    });
    
    // Store the diagram data
    const diagramData = ${JSON.stringify(diagramData)};
    
    // DOM elements
    const diagramEl = document.getElementById('diagram');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const modelsCheckbox = document.getElementById('models-checkbox');
    const controllersCheckbox = document.getElementById('controllers-checkbox');
    const servicesCheckbox = document.getElementById('services-checkbox');
    const directorySelect = document.getElementById('directory-select');
    const showPropertiesCheckbox = document.getElementById('show-properties');
    const showMethodsCheckbox = document.getElementById('show-methods');
    const showRelationshipsCheckbox = document.getElementById('show-relationships');
    const themeToggle = document.getElementById('theme-toggle');
    const searchBox = document.getElementById('search-box');
    const exportPngBtn = document.getElementById('export-png');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    
    // Track zoom level
    let zoomLevel = 1;
    
    // Generate and render diagram
    function renderDiagram() {
      diagramEl.innerHTML = '<div class="loading">Generating diagram...</div>';
      
      // Get selected entity types
      const entityTypes = [];
      if (modelsCheckbox.checked) entityTypes.push('models');
      if (controllersCheckbox.checked) entityTypes.push('controllers');
      if (servicesCheckbox.checked) entityTypes.push('services');
      
      // Get selected directory
      const directory = directorySelect.value;
      
      // Get search term
      const searchTerm = searchBox.value.trim().toLowerCase();
      
      // Generate mermaid diagram based on filters
      let mermaidDiagram = 'classDiagram\\n';
      
      // Filter and add models to diagram
      if (entityTypes.includes('models')) {
        diagramData.models.forEach(model => {
          // Skip models not in the selected directory if directory filter is applied
          if (directory && !model.filePath?.includes(directory)) return;
          
          // Skip models that don't match the search term
          if (searchTerm && !model.name.toLowerCase().includes(searchTerm)) return;
          
          mermaidDiagram += \`  class \${model.name} {\\n\`;
          
          // Add tableName if available
          if (model.tableName) {
            mermaidDiagram += \`    <<Table: \${model.tableName}>>\\n\`;
          }
          
          // Add properties if showing properties
          if (showPropertiesCheckbox.checked && model.properties) {
            model.properties.forEach(prop => {
              const dataType = prop.dataType ? \`: \${prop.dataType}\` : '';
              mermaidDiagram += \`    +\${prop.name}\${dataType}\\n\`;
            });
          }
          
          // Add methods if showing methods
          if (showMethodsCheckbox.checked && model.methods) {
            model.methods.forEach(method => {
              mermaidDiagram += \`    +\${method.name}(\${method.params})\\n\`;
            });
          }
          
          mermaidDiagram += \`  }\\n\`;
        });
      }
      
      // Add controllers if requested
      if (entityTypes.includes('controllers') && diagramData.controllers) {
        diagramData.controllers.forEach(controller => {
          // Skip controllers not in the selected directory if directory filter is applied
          if (directory && !controller.filePath?.includes(directory)) return;
          
          // Skip controllers that don't match the search term
          if (searchTerm && !controller.name.toLowerCase().includes(searchTerm)) return;
          
          mermaidDiagram += \`  class \${controller.name} {\\n\`;
          mermaidDiagram += \`    <<Controller>>\\n\`;
          
          // Add methods if showing methods
          if (showMethodsCheckbox.checked && controller.methods) {
            controller.methods.forEach(method => {
              mermaidDiagram += \`    +\${method.name}(\${method.params})\\n\`;
            });
          }
          
          mermaidDiagram += \`  }\\n\`;
        });
      }
      
      // Add services if requested
      if (entityTypes.includes('services') && diagramData.services) {
        diagramData.services.forEach(service => {
          // Skip services not in the selected directory if directory filter is applied
          if (directory && !service.filePath?.includes(directory)) return;
          
          // Skip services that don't match the search term
          if (searchTerm && !service.name.toLowerCase().includes(searchTerm)) return;
          
          mermaidDiagram += \`  class \${service.name} {\\n\`;
          mermaidDiagram += \`    <<Service>>\\n\`;
          
          // Add methods if showing methods
          if (showMethodsCheckbox.checked && service.methods) {
            service.methods.forEach(method => {
              mermaidDiagram += \`    +\${method.name}(\${method.params})\\n\`;
            });
          }
          
          mermaidDiagram += \`  }\\n\`;
        });
      }
      
      // Add relationships if showing relationships
      if (showRelationshipsCheckbox.checked && entityTypes.includes('models')) {
        diagramData.relationships.forEach(rel => {
          const sourceModel = rel.sourceModel.replace(/::class$/, '');
          const targetModel = rel.targetModel.replace(/::class$/, '');
          
          // Skip relationships where either model doesn't match search term
          if (searchTerm && 
              !sourceModel.toLowerCase().includes(searchTerm) && 
              !targetModel.toLowerCase().includes(searchTerm)) {
            return;
          }
          
          let arrow;
          let relationshipName = rel.relationshipName.toLowerCase();
          
          switch (rel.relationshipType) {
            case 'hasOne':
              arrow = '-->';
              break;
            case 'hasMany':
              arrow = '--*';
              break;
            case 'belongsTo':
              arrow = '<--';
              break;
            case 'belongsToMany':
              arrow = '<--*';
              break;
            default:
              arrow = '-->';
          }
          
          mermaidDiagram += \`  \${sourceModel} \${arrow} \${targetModel} : \${relationshipName}\\n\`;
        });
      }
      
      // Render mermaid diagram
      try {
        mermaid.render('mermaid-diagram', mermaidDiagram).then(result => {
          diagramEl.innerHTML = result.svg;
          // Apply zoom
          const svgElement = diagramEl.querySelector('svg');
          if (svgElement) {
            svgElement.style.transform = \`scale(\${zoomLevel})\`;
            svgElement.style.transformOrigin = 'top left';
          }
        });
      } catch (error) {
        diagramEl.innerHTML = \`<div class="loading">Error generating diagram: \${error.message}</div>\`;
      }
    }
    
    // Apply filters and render diagram
    applyFiltersBtn.addEventListener('click', renderDiagram);
    
    // Toggle theme
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      themeToggle.textContent = isDark ? '☀️' : '🌙';
      // Update mermaid theme based on current theme
      mermaid.initialize({
        theme: isDark ? 'dark' : 'default'
      });
      
      // Re-render diagram with new theme
      renderDiagram();
    });
    
    // Handle zoom controls
    zoomInBtn.addEventListener('click', () => {
      zoomLevel += 0.1;
      const svgElement = diagramEl.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = 'scale(' + zoomLevel + ')';
      }
    });
    
    zoomOutBtn.addEventListener('click', () => {
      zoomLevel = Math.max(0.1, zoomLevel - 0.1);
      const svgElement = diagramEl.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = 'scale(' + zoomLevel + ')';
      }
    });
    
    zoomResetBtn.addEventListener('click', () => {
      zoomLevel = 1;
      const svgElement = diagramEl.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = 'scale(' + zoomLevel + ')';
      }
    });
    
    // Export diagram as PNG
    exportPngBtn.addEventListener('click', () => {
      const svgElement = diagramEl.querySelector('svg');
      if (!svgElement) return;
      
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const svgRect = svgElement.getBoundingClientRect();
      
      // Set canvas dimensions to match SVG
      canvas.width = svgRect.width * 2; // Higher resolution
      canvas.height = svgRect.height * 2; // Higher resolution
      
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2); // Scale for higher resolution
      
      // Create image from SVG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      img.onload = () => {
        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw SVG on canvas
        ctx.drawImage(img, 0, 0);
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'uml-diagram.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
    
    // Handle search input with debounce
    let searchTimeout;
    searchBox.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(renderDiagram, 300);
    });
    
    // Initialize and render diagram
    renderDiagram();
    
    // Check for system dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-theme');
      themeToggle.textContent = '☀️';
    }
    
    // Listen for changes in the system color scheme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (e.matches) {
        document.body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
      } else {
        document.body.classList.remove('dark-theme');
        themeToggle.textContent = '🌙';
      }
      
      // Update mermaid theme based on system preference
      mermaid.initialize({
        theme: e.matches ? 'dark' : 'default'
      });
      
      // Re-render diagram with new theme
      renderDiagram();
    });
  </script>
</body>
</html>
  `;
}

module.exports = {
  generateUML,
};
