const fs = require("fs");
const path = require("path");

/**
 * Generate sequence diagrams from project info with enhanced UI and features
 * @param {Object} projectInfo Project information
 * @param {string} outputDir Output directory
 * @param {Object} options Configuration options for diagram generation
 * @returns {Object} Information about generated files
 */
async function generateSequenceDiagrams(projectInfo, outputDir, options = {}) {
  // Default options
  const config = {
    theme: options.theme || "default", // mermaid theme: default, forest, dark, neutral
    includeTimestamps: options.includeTimestamps || true,
    showNotes: options.showNotes || true,
    animateDiagrams: options.animateDiagrams || true,
    groupByController: options.groupByController || true,
    ...options,
  };

  try {
    // Create sequence diagrams directory if it doesn't exist
    const sequenceDir = path.join(outputDir, "sequence");
    await fs.promises.mkdir(sequenceDir, { recursive: true });

    // Generate sequence diagrams for each controller
    const diagrams = [];
    const diagramsByController = {};

    // Track statistics for dashboard
    const stats = {
      totalDiagrams: 0,
      byType: {},
      byController: {},
    };

    console.log(
      `Generating sequence diagrams for ${projectInfo.controllers.length} controllers...`
    );

    for (const controller of projectInfo.controllers) {
      // Extract controller name without "Controller" suffix
      const controllerName = controller.name.replace(/Controller$/, "");
      diagramsByController[controllerName] = [];
      stats.byController[controllerName] = 0;

      // Extract action methods from controller
      const methodMatches = [
        ...controller.content.matchAll(
          /public\s+function\s+(\w+)\s*\([^)]*\)/g
        ),
      ];

      for (const match of methodMatches) {
        const methodName = match[1];

        // Skip constructor and other common methods
        if (["__construct", "middleware", "authorize"].includes(methodName)) {
          continue;
        }

        // Determine sequence based on common method types
        let sequenceType = "generic";
        if (
          methodName === "index" ||
          methodName === "all" ||
          methodName === "list"
        ) {
          sequenceType = "list";
        } else if (
          methodName === "show" ||
          methodName === "view" ||
          methodName === "get"
        ) {
          sequenceType = "show";
        } else if (
          methodName === "store" ||
          methodName === "create" ||
          methodName === "add"
        ) {
          sequenceType = "create";
        } else if (methodName === "update" || methodName === "edit") {
          sequenceType = "update";
        } else if (
          methodName === "destroy" ||
          methodName === "delete" ||
          methodName === "remove"
        ) {
          sequenceType = "delete";
        }

        // Extract model usage in the method
        const methodContent = controller.content.match(
          new RegExp(
            `public\\s+function\\s+${methodName}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)\\}`,
            "m"
          )
        );
        let usedModels = [];

        if (methodContent && methodContent[1]) {
          // Look for model references in the method body
          projectInfo.models.forEach((model) => {
            if (methodContent[1].includes(model.name)) {
              usedModels.push(model.name);
            }
          });
        }

        // Generate sequence diagram for the method
        let diagram;

        switch (sequenceType) {
          case "list":
            diagram = generateListSequence(
              controller.name,
              methodName,
              usedModels,
              config
            );
            break;
          case "show":
            diagram = generateShowSequence(
              controller.name,
              methodName,
              usedModels,
              config
            );
            break;
          case "create":
            diagram = generateCreateSequence(
              controller.name,
              methodName,
              usedModels,
              config
            );
            break;
          case "update":
            diagram = generateUpdateSequence(
              controller.name,
              methodName,
              usedModels,
              config
            );
            break;
          case "delete":
            diagram = generateDeleteSequence(
              controller.name,
              methodName,
              usedModels,
              config
            );
            break;
          default:
            diagram = generateGenericSequence(
              controller.name,
              methodName,
              usedModels,
              config
            );
        }

        const fileName = `${controller.name}_${methodName}.md`;
        await fs.promises.writeFile(path.join(sequenceDir, fileName), diagram);

        const diagramInfo = {
          id: `${controller.name}-${methodName}`,
          name: `${controller.name}::${methodName}`,
          controller: controllerName,
          method: methodName,
          type: sequenceType,
          description: getMethodDescription(
            sequenceType,
            controller.name,
            methodName
          ),
          fileName: fileName,
          models: usedModels,
          timestamp: new Date().toISOString(),
        };

        diagrams.push(diagramInfo);
        diagramsByController[controllerName].push(diagramInfo);

        // Update statistics
        stats.totalDiagrams++;
        stats.byType[sequenceType] = (stats.byType[sequenceType] || 0) + 1;
        stats.byController[controllerName]++;
      }
    }

    console.log(`Generated ${stats.totalDiagrams} sequence diagrams.`);

    // Create assets directory for JS and CSS
    const assetsDir = path.join(sequenceDir, "assets");
    await fs.promises.mkdir(assetsDir, { recursive: true });

    // Generate main CSS file
    const cssContent = generateCSS();
    await fs.promises.writeFile(path.join(assetsDir, "styles.css"), cssContent);

    // Generate JavaScript file for interactivity
    const jsContent = generateJavaScript();
    await fs.promises.writeFile(path.join(assetsDir, "script.js"), jsContent);

    // Create index file for sequence diagrams
    const indexContent = generateIndexHTML(
      projectInfo,
      diagrams,
      diagramsByController,
      stats,
      config
    );
    await fs.promises.writeFile(
      path.join(sequenceDir, "index.html"),
      indexContent
    );

    // Create individual diagram view pages
    for (const diagram of diagrams) {
      const diagramContent = generateDiagramViewHTML(
        projectInfo,
        diagram,
        config
      );
      await fs.promises.writeFile(
        path.join(sequenceDir, `view_${diagram.id}.html`),
        diagramContent
      );
    }

    // Create manifest.json with diagram metadata
    const manifest = {
      projectName: projectInfo.name,
      projectVersion: projectInfo.version,
      generatedAt: new Date().toISOString(),
      diagrams: diagrams,
      statistics: stats,
    };

    await fs.promises.writeFile(
      path.join(sequenceDir, "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );

    return {
      files: diagrams
        .map((d) => path.join(sequenceDir, d.fileName))
        .concat([
          path.join(sequenceDir, "index.html"),
          path.join(assetsDir, "styles.css"),
          path.join(assetsDir, "script.js"),
          path.join(sequenceDir, "manifest.json"),
        ])
        .concat(
          diagrams.map((d) => path.join(sequenceDir, `view_${d.id}.html`))
        ),
    };
  } catch (error) {
    console.error("Error generating sequence diagrams:", error);
    throw error;
  }
}

function getMethodDescription(type, controller, method) {
  const descriptions = {
    list: `Retrieves a collection of resources from ${controller}`,
    show: `Retrieves a specific resource from ${controller}`,
    create: `Creates a new resource in ${controller}`,
    update: `Updates an existing resource in ${controller}`,
    delete: `Removes a resource from ${controller}`,
    generic: `Handles ${method} operation in ${controller}`,
  };

  return descriptions[type] || descriptions.generic;
}

function generateListSequence(controller, method, models, config) {
  const modelName = models.length > 0 ? models[0] : "Model";

  return `sequenceDiagram
    autonumber
    participant C as Client
    participant R as Route
    participant ${controller} as ${controller}
    participant ${modelName} as ${modelName}
    participant DB as Database
    
    C->>R: GET /resource
    R->>+${controller}: ${method}()
    ${controller}->>+${modelName}: all() / get() / paginate()
    ${modelName}->>+DB: SELECT * FROM table
    DB-->>-${modelName}: Return records
    ${modelName}-->>-${controller}: Collection of models
    ${controller}-->>-R: Return JSON response
    R-->>C: 200 OK with data
    
    ${
      config.showNotes
        ? `Note over ${controller},${modelName}: This sequence retrieves a list of resources`
        : ""
    }
  `;
}

function generateShowSequence(controller, method, models, config) {
  const modelName = models.length > 0 ? models[0] : "Model";

  return `sequenceDiagram
    autonumber
    participant C as Client
    participant R as Route
    participant ${controller} as ${controller}
    participant ${modelName} as ${modelName}
    participant DB as Database
    
    C->>R: GET /resource/{id}
    R->>+${controller}: ${method}(id)
    ${controller}->>+${modelName}: find(id) / findOrFail(id)
    ${modelName}->>+DB: SELECT * FROM table WHERE id = ?
    DB-->>-${modelName}: Return record
    ${modelName}-->>-${controller}: Model instance
    ${controller}-->>-R: Return JSON response
    R-->>C: 200 OK with data
    
    ${
      config.showNotes
        ? `Note over ${controller},${modelName}: This sequence retrieves a specific resource by ID`
        : ""
    }
  `;
}

function generateCreateSequence(controller, method, models, config) {
  const modelName = models.length > 0 ? models[0] : "Model";

  return `sequenceDiagram
    autonumber
    participant C as Client
    participant R as Route
    participant ${controller} as ${controller}
    participant V as Validator
    participant ${modelName} as ${modelName}
    participant DB as Database
    
    C->>R: POST /resource
    R->>+${controller}: ${method}(request)
    ${controller}->>+V: validate(request)
    V-->>-${controller}: validated data
    ${controller}->>+${modelName}: create(data)
    ${modelName}->>+DB: INSERT INTO table
    DB-->>-${modelName}: Return new record
    ${modelName}-->>-${controller}: New model instance
    ${controller}-->>-R: Return JSON response
    R-->>C: 201 Created with data
    
    ${
      config.showNotes
        ? `Note over ${controller},${modelName}: This sequence creates a new resource`
        : ""
    }
  `;
}

function generateUpdateSequence(controller, method, models, config) {
  const modelName = models.length > 0 ? models[0] : "Model";

  return `sequenceDiagram
    autonumber
    participant C as Client
    participant R as Route
    participant ${controller} as ${controller}
    participant V as Validator
    participant ${modelName} as ${modelName}
    participant DB as Database
    
    C->>R: PUT /resource/{id}
    R->>+${controller}: ${method}(request, id)
    ${controller}->>+V: validate(request)
    V-->>-${controller}: validated data
    ${controller}->>+${modelName}: find(id)
    ${modelName}->>+DB: SELECT * FROM table WHERE id = ?
    DB-->>-${modelName}: Return record
    ${modelName}-->>-${controller}: Model instance
    ${controller}->>+${modelName}: update(data)
    ${modelName}->>+DB: UPDATE table SET ... WHERE id = ?
    DB-->>-${modelName}: Success
    ${modelName}-->>-${controller}: Updated model
    ${controller}-->>-R: Return JSON response
    R-->>C: 200 OK with data
    
    ${
      config.showNotes
        ? `Note over ${controller},${modelName}: This sequence updates an existing resource`
        : ""
    }
  `;
}

function generateDeleteSequence(controller, method, models, config) {
  const modelName = models.length > 0 ? models[0] : "Model";

  return `sequenceDiagram
    autonumber
    participant C as Client
    participant R as Route
    participant ${controller} as ${controller}
    participant ${modelName} as ${modelName}
    participant DB as Database
    
    C->>R: DELETE /resource/{id}
    R->>+${controller}: ${method}(id)
    ${controller}->>+${modelName}: find(id)
    ${modelName}->>+DB: SELECT * FROM table WHERE id = ?
    DB-->>-${modelName}: Return record
    ${modelName}-->>-${controller}: Model instance
    ${controller}->>+${modelName}: delete()
    ${modelName}->>+DB: DELETE FROM table WHERE id = ?
    DB-->>-${modelName}: Success
    ${modelName}-->>-${controller}: Success
    ${controller}-->>-R: Return JSON response
    R-->>C: 204 No Content
    
    ${
      config.showNotes
        ? `Note over ${controller},${modelName}: This sequence removes a resource`
        : ""
    }
  `;
}

function generateGenericSequence(controller, method, models, config) {
  const modelName = models.length > 0 ? models[0] : "Model";

  return `sequenceDiagram
    autonumber
    participant C as Client
    participant R as Route
    participant ${controller} as ${controller}
    participant ${modelName} as ${modelName}
    participant DB as Database
    
    C->>R: Request
    R->>+${controller}: ${method}()
    Note over ${controller}: Process request
    alt Uses database
      ${controller}->>+${modelName}: operation()
      ${modelName}->>+DB: Database query
      DB-->>-${modelName}: Return data
      ${modelName}-->>-${controller}: Return result
    else Direct response
      Note over ${controller}: Process without database
    end
    ${controller}-->>-R: Return response
    R-->>C: Response
    
    ${config.showNotes ? `Note over ${controller}: Generic operation flow` : ""}
  `;
}

function generateCSS() {
  return `
:root {
  --primary-color: #3490dc;
  --secondary-color: #38c172;
  --danger-color: #e3342f;
  --success-color: #38c172;
  --warning-color: #f6993f;
  --info-color: #6574cd;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
  --background-color: #ffffff;
  --text-color: #333333;
  --border-color: #dee2e6;
  --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  --transition-speed: 0.3s;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --background-color: #1a202c;
    --text-color: #f7fafc;
    --border-color: #4a5568;
    --light-color: #2d3748;
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background-color);
  transition: background-color var(--transition-speed);
  padding: 0;
  margin: 0;
}

header {
  background-color: var(--primary-color);
  color: white;
  padding: 1rem 2rem;
  text-align: center;
  box-shadow: var(--box-shadow);
  position: sticky;
  top: 0;
  z-index: 1000;
}

header h1 {
  margin: 0;
  font-size: 2rem;
}

header h2 {
  font-weight: 300;
  font-size: 1.2rem;
  margin-top: 0.5rem;
}

nav {
  background-color: var(--light-color);
  padding: 0.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

nav .controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-box {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  min-width: 250px;
}

.select-box {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(1px);
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: white;
}

.btn-info {
  background-color: var(--info-color);
  color: white;
}

.btn-blue {
  background-color: var(--light-color);
  color: #dfdddd;
}

main {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: var(--light-color);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--box-shadow);
  text-align: center;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1rem;
  color: var(--text-color);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 2rem;
}

.tab {
  padding: 1rem 2rem;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  font-weight: 500;
}

.tab.active {
  border-bottom: 3px solid var(--primary-color);
  color: var(--primary-color);
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

.diagram-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.diagram-card {
  background-color: var(--light-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--box-shadow);
  transition: transform 0.3s;
}

.diagram-card:hover {
  transform: translateY(-5px);
}

.diagram-header {
  background-color: var(--primary-color);
  color: white;
  padding: 1rem;
  position: relative;
}

.diagram-badge {
  position: absolute;
  right: 1rem;
  top: 1rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-list {
  background-color: var(--info-color);
}

.badge-show {
  background-color: var(--success-color);
}

.badge-create {
  background-color: var(--secondary-color);
}

.badge-update {
  background-color: var(--warning-color);
}

.badge-delete {
  background-color: var(--danger-color);
}

.badge-generic {
  background-color: var(--dark-color);
}

.diagram-body {
  padding: 1rem;
}

.diagram-title {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.diagram-description {
  color: #b7a9a9;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.diagram-footer {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background-color: rgba(0,0,0,0.03);
}

.diagram-models {
  font-size: 0.8rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.model-tag {
  background-color: var(--info-color);
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.diagram-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  text-decoration: none;
}

.view-btn {
  background-color: var(--info-color);
}

.diagram-container {
  margin-bottom: 3rem;
  padding: 2rem;
  background-color: var(--light-color);
  border-radius: 8px;
  box-shadow: var(--box-shadow);
}

.diagram-container h3 {
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.diagram-view {
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
}

.index-container {
  margin-bottom: 3rem;
}

.diagram-list {
  list-style-type: none;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
}

.diagram-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.diagram-list li:last-child {
  border-bottom: none;
}

.diagram-list a {
  color: var(--primary-color);
  text-decoration: none;
}

.diagram-list a:hover {
  text-decoration: underline;
}

footer {
  background-color: var(--light-color);
  text-align: center;
  padding: 1.5rem;
  margin-top: 3rem;
  border-top: 1px solid var(--border-color);
}

.theme-toggle {
  background-color: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  margin-left: 1rem;
}

/* Responsive styles */
@media (max-width: 768px) {
  nav {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  nav .controls {
    flex-direction: column;
  }
  
  .dashboard {
    grid-template-columns: 1fr;
  }
  
  .diagram-grid {
    grid-template-columns: 1fr;
  }
  
  main {
    padding: 1rem;
  }
}

/* Animation for diagram loading */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mermaid {
  animation: fadeIn 1s;
}

/* Accessible focus styling */
button:focus, a:focus, input:focus, select:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Tooltip styling */
.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip .tooltip-text {
  visibility: hidden;
  width: 200px;
  background-color: var(--dark-color);
  color: white;
  text-align: center;
  border-radius: 6px;
  padding: 0.5rem;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
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


/* Print styles */
@media print {
  header, nav, footer, .diagram-actions {
    display: none;
  }
  
  body {
    background-color: white;
  }
  
  .diagram-container {
    box-shadow: none;
    margin: 0;
    padding: 0;
  }
}
  `;
}

function generateJavaScript() {
  return `
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Mermaid
  mermaid.initialize({
    startOnLoad: true,
    theme: localStorage.getItem('diagramTheme') || 'default',
    securityLevel: 'loose',
    flowchart: { curve: 'basis' },
    sequence: { 
      mirrorActors: false,
      showSequenceNumbers: true,
      actorMargin: 80,
      boxMargin: 10,
      noteMargin: 10,
      messageMargin: 35,
      messageAlign: 'center'
    }
  });
  
  // Theme toggle functionality
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '🌙';
      } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '☀️';
      }
    });
    
    // Set initial theme based on localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.classList.add('dark-mode');
      themeToggle.innerHTML = '☀️';
    } else {
      document.body.classList.remove('dark-mode');
      themeToggle.innerHTML = '🌙';
    }
  }
  
  // Tab functionality
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove active class from all tabs and tab contents
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      this.classList.add('active');
      const tabId = this.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      
      // Save active tab to localStorage
      localStorage.setItem('activeTab', tabId);
    });
  });
  
  // Set active tab based on localStorage or default to first tab
  const savedTab = localStorage.getItem('activeTab');
  if (savedTab && document.getElementById(savedTab)) {
    document.querySelector(\`[data-tab="\${savedTab}"]\`).click();
  } else if (tabs.length > 0) {
    tabs[0].click();
  }
  
  // Search functionality
  const searchInput = document.getElementById('search-diagrams');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const diagramCards = document.querySelectorAll('.diagram-card');
      
      diagramCards.forEach(card => {
        const title = card.querySelector('.diagram-title').textContent.toLowerCase();
        const description = card.querySelector('.diagram-description').textContent.toLowerCase();
        const controller = card.getAttribute('data-controller').toLowerCase();
        const method = card.getAttribute('data-method').toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm) || 
            controller.includes(searchTerm) || method.includes(searchTerm)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
  
  // Filter by type functionality
  const typeFilter = document.getElementById('filter-type');
  if (typeFilter) {
    typeFilter.addEventListener('change', function() {
      const selectedType = this.value;
      const diagramCards = document.querySelectorAll('.diagram-card');
      
      diagramCards.forEach(card => {
        if (selectedType === 'all' || card.getAttribute('data-type') === selectedType) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
  
  // Filter by controller functionality
  const controllerFilter = document.getElementById('filter-controller');
  if (controllerFilter) {
    controllerFilter.addEventListener('change', function() {
      const selectedController = this.value;
      const diagramCards = document.querySelectorAll('.diagram-card');
      
      diagramCards.forEach(card => {
        if (selectedController === 'all' || card.getAttribute('data-controller') === selectedController) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
  
  // Print functionality
  const printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', function() {
      window.print();
    });
  }
  
  // Export functionality
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      const diagramId = this.getAttribute('data-diagram');
      const diagramSvg = document.querySelector('.mermaid svg');
      
      if (diagramSvg) {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = diagramSvg.width.baseVal.value;
        canvas.height = diagramSvg.height.baseVal.value;
        
        // Create image from SVG
        const img = new Image();
        const svgData = new XMLSerializer().serializeToString(diagramSvg);
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        
        img.onload = function() {
          // Draw image to canvas
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // Export as PNG
          const pngData = canvas.toDataURL('image/png');
          
          // Create download link
          const downloadLink = document.createElement('a');
          downloadLink.href = pngData;
          downloadLink.download = diagramId + '.png';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        };
      }
    });
  }
  
  // Diagram theme switcher
  const diagramThemeSelect = document.getElementById('diagram-theme');
  if (diagramThemeSelect) {
    diagramThemeSelect.value = localStorage.getItem('diagramTheme') || 'default';
    
    diagramThemeSelect.addEventListener('change', function() {
      const theme = this.value;
      localStorage.setItem('diagramTheme', theme);
      
      // Reload page to apply new theme
      window.location.reload();
    });
  }
  
  // Show/hide notes
  const toggleNotes = document.getElementById('toggle-notes');
  if (toggleNotes) {
    toggleNotes.addEventListener('click', function() {
      const notes = document.querySelectorAll('.note');
      notes.forEach(note => {
        note.style.display = note.style.display === 'none' ? 'block' : 'none';
      });
      this.textContent = this.textContent.includes('Hide') ? 'Show Notes' : 'Hide Notes';
    });
  }
  
  // Animation controls
  const toggleAnimation = document.getElementById('toggle-animation');
  if (toggleAnimation) {
    toggleAnimation.addEventListener('click', function() {
      const messages = document.querySelectorAll('.messageLine0, .messageLine1');
      if (this.textContent.includes('Enable')) {
        messages.forEach(message => {
          message.style.animation = 'drawLine 1.5s linear forwards';
          message.style.strokeDasharray = '1000';
          message.style.strokeDashoffset = '1000';
        });
        this.textContent = 'Disable Animation';
      } else {
        messages.forEach(message => {
          message.style.animation = 'none';
          message.style.strokeDasharray = '0';
          message.style.strokeDashoffset = '0';
        });
        this.textContent = 'Enable Animation';
      }
    });
  }
  
  // Copy diagram as text
  const copyTextBtn = document.getElementById('copy-text');
  if (copyTextBtn) {
    copyTextBtn.addEventListener('click', function() {
      const diagramContent = document.getElementById('diagram-source-code');
      if (diagramContent) {
        navigator.clipboard.writeText(diagramContent.textContent)
          .then(() => {
            const originalText = copyTextBtn.textContent;
            copyTextBtn.textContent = 'Copied!';
            setTimeout(() => {
              copyTextBtn.textContent = originalText;
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy text: ', err);
          });
      }
    });
  }
  
  // Statistics chart
  const statsChart = document.getElementById('stats-chart');
  if (statsChart && window.Chart) {
    const statsData = JSON.parse(statsChart.getAttribute('data-stats'));
    
    new Chart(statsChart, {
      type: 'bar',
      data: {
        labels: Object.keys(statsData.byType),
        datasets: [{
          label: 'Diagrams by Type',
          data: Object.values(statsData.byType),
          backgroundColor: [
            '#3490dc', '#38c172', '#e3342f', '#f6993f', '#6574cd', '#9561e2'
          ]
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }
  
  // Controller distribution chart
  const controllerChart = document.getElementById('controller-chart');
  if (controllerChart && window.Chart) {
    const controllerData = JSON.parse(controllerChart.getAttribute('data-stats'));
    
    new Chart(controllerChart, {
      type: 'doughnut',
      data: {
        labels: Object.keys(controllerData.byController),
        datasets: [{
          data: Object.values(controllerData.byController),
          backgroundColor: [
            '#3490dc', '#38c172', '#e3342f', '#f6993f', '#6574cd', '#9561e2',
            '#f66d9b', '#ffed4a', '#4dc0b5', '#9561e2', '#f6993f', '#e3342f'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
});
  `;
}

function generateIndexHTML(
  projectInfo,
  diagrams,
  diagramsByController,
  stats,
  config
) {
  const controllerOptions = Object.keys(diagramsByController)
    .map((controller) => `<option value="${controller}">${controller}</option>`)
    .join("\n        ");

  // Group diagrams by type for the By Type tab
  const diagramsByType = {};
  const sequenceTypes = [
    "list",
    "show",
    "create",
    "update",
    "delete",
    "generic",
  ];

  sequenceTypes.forEach((type) => {
    diagramsByType[type] = diagrams.filter((d) => d.type === type);
  });

  // Diagram cards for All tab
  const allDiagramCards = diagrams
    .map((diagram) => generateDiagramCard(diagram))
    .join("\n      ");

  // Diagram cards for By Type tab
  const typeTabContent = sequenceTypes
    .map((type) => {
      const typeDiagrams = diagramsByType[type] || [];
      if (typeDiagrams.length === 0) return "";

      return `
      <div class="type-section">
        <h3>${capitalizeFirstLetter(type)} Operations (${
        typeDiagrams.length
      })</h3>
        <div class="diagram-grid">
          ${typeDiagrams
            .map((diagram) => generateDiagramCard(diagram))
            .join("\n          ")}
        </div>
      </div>
      `;
    })
    .join("\n      ");

  // Diagram cards for By Controller tab
  const controllerTabContent = Object.keys(diagramsByController)
    .map((controller) => {
      const controllerDiagrams = diagramsByController[controller] || [];
      if (controllerDiagrams.length === 0) return "";

      return `
      <div class="controller-section">
        <h3>${controller} Controller (${controllerDiagrams.length})</h3>
        <div class="diagram-grid">
          ${controllerDiagrams
            .map((diagram) => generateDiagramCard(diagram))
            .join("\n          ")}
        </div>
      </div>
      `;
    })
    .join("\n      ");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sequence Diagrams - ${projectInfo.name}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
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

  <header>
    <h1>Sequence Diagrams</h1>
    <h2>${projectInfo.name} (Laravel ${projectInfo.version})</h2>
  </header>
  
  <nav>
    <div class="controls">
      <input type="text" id="search-diagrams" class="search-box" placeholder="Search diagrams...">
      <select id="filter-type" class="select-box">
        <option value="all">All Types</option>
        <option value="list">List</option>
        <option value="show">Show</option>
        <option value="create">Create</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
        <option value="generic">Generic</option>
      </select>
      <select id="filter-controller" class="select-box">
        <option value="all">All Controllers</option>
        ${controllerOptions}
      </select>
    </div>
    <div class="controls">
      <select id="diagram-theme" class="select-box">
        <option value="default">Theme: Default</option>
        <option value="forest">Theme: Forest</option>
        <option value="dark">Theme: Dark</option>
        <option value="neutral">Theme: Neutral</option>
      </select>
      <button class="btn btn-blue theme-toggle" id="theme-toggle">🌙</button>
    </div>
  </nav>
  
  <main>
    <div class="dashboard">
      <div class="stat-card">
        <div class="stat-number">${stats.totalDiagrams}</div>
        <div class="stat-label">Total Diagrams</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${Object.keys(stats.byController).length}</div>
        <div class="stat-label">Controllers</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.byType.create || 0}</div>
        <div class="stat-label">Create Operations</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.byType.list || 0}</div>
        <div class="stat-label">List Operations</div>
      </div>
    </div>
    
    <div class="chart-container" style="display: flex; gap: 2rem; margin-bottom: 2rem;">
      <div style="flex: 1; background-color: var(--light-color); padding: 1rem; border-radius: 8px;">
        <h3>Diagram Types Distribution</h3>
        <canvas id="stats-chart" data-stats='${JSON.stringify(stats)}'></canvas>
      </div>
      <div style="flex: 1; background-color: var(--light-color); padding: 1rem; border-radius: 8px;">
        <h3>Controller Distribution</h3>
        <canvas id="controller-chart" data-stats='${JSON.stringify(
          stats
        )}'></canvas>
      </div>
    </div>
    
    <div class="tabs">
      <div class="tab active" data-tab="all-diagrams">All Diagrams</div>
      <div class="tab" data-tab="by-type">By Type</div>
      <div class="tab" data-tab="by-controller">By Controller</div>
    </div>
    
    <div id="all-diagrams" class="tab-content active">
      <div class="diagram-grid">
        ${allDiagramCards}
      </div>
    </div>
    
    <div id="by-type" class="tab-content">
      ${typeTabContent}
    </div>
    
    <div id="by-controller" class="tab-content">
      ${controllerTabContent}
    </div>
  </main>
  
  <footer>
    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    <p>Sequence Diagram Generator for Laravel</p>
  </footer>
  
  <script src="assets/script.js"></script>
</body>
</html>
  `;
}

function generateDiagramViewHTML(projectInfo, diagram, config) {
  const dir = path.resolve(process.cwd(), "laravel2doc");
  const filePath = path.join(
    dir, // Remove /lib from the path
    "sequence", // Add sequence directory // Add generators directory
    diagram.fileName
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found::  ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${diagram.name} - Sequence Diagram</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
</head>
<body>
  <header>
  ${projectInfo}, ${diagram}, ${config}
    <h1>${diagram.name}ehtrhrhjtrhtrh</h1>
    <h2>${projectInfo.name} (Laravel ${projectInfo.version})</h2>
  </header>
  
  <nav>
    <div class="controls">
      <button class="btn btn-primary" onclick="window.location.href='index.html'">
        <i class="fas fa-arrow-left"></i> Back to Index
      </button>
    </div>
    <div class="controls">
      <select id="diagram-theme" class="select-box">
        <option value="default">Theme: Default</option>
        <option value="forest">Theme: Forest</option>
        <option value="dark">Theme: Dark</option>
        <option value="neutral">Theme: Neutral</option>
      </select>
      <button class="btn btn-blue theme-toggle" id="theme-toggle">🌙</button>
    </div>
  </nav>
  
  <main>
    <div class="diagram-details" style="background-color: var(--light-color); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3>${diagram.name}</h3>
        <span class="diagram-badge badge-${
          diagram.type
        }">${diagram.type.toUpperCase()}</span>
      </div>
      
      <p><strong>Description:</strong> ${diagram.description}</p>
      
      <div style="margin-top: 1rem;">
        <p><strong>Controller:</strong> ${diagram.controller}</p>
        <p><strong>Method:</strong> ${diagram.method}</p>
        <p><strong>Models:</strong> 
          ${
            diagram.models.length > 0
              ? diagram.models
                  .map((model) => `<span class="model-tag">${model}</span>`)
                  .join(" ")
              : "None specified"
          }
        </p>
      </div>
    </div>
    
    <div class="diagram-actions" style="margin-bottom: 1rem; display: flex; gap: 0.5rem;">
      <button class="btn btn-primary" id="print-btn">
        <i class="fas fa-print"></i> Print
      </button>
      <button class="btn btn-info" id="export-btn" data-diagram="${diagram.id}">
        <i class="fas fa-download"></i> Export as PNG
      </button>
      <button class="btn btn-secondary" id="copy-text">
        <i class="fas fa-copy"></i> Copy as Text
      </button>
      <button class="btn btn-blue" id="toggle-notes">
        <i class="fas fa-sticky-note"></i> Hide Notes
      </button>
      <button class="btn btn-blue" id="toggle-animation">
        <i class="fas fa-film"></i> Enable Animation
      </button>
    </div>
    
    <div class="diagram-zoom" style="margin-bottom: 1rem; display: flex; gap: 0.5rem;">
      <button class="btn btn-blue" id="zoom-in">
        <i class="fas fa-search-plus"></i> Zoom In
      </button>
      <button class="btn btn-blue" id="zoom-out">
        <i class="fas fa-search-minus"></i> Zoom Out
      </button>
      <button class="btn btn-blue" id="zoom-reset">
        <i class="fas fa-sync"></i> Reset Zoom
      </button>
    </div>
    
    <div class="diagram-view" style="overflow: auto;">
      <div class="mermaid" style="transform-origin: top left; transition: transform 0.3s;">
  ${fileContent}
      </div>
    </div>
    
    <div style="margin-top: 2rem; background-color: var(--light-color); padding: 1.5rem; border-radius: 8px;">
      <h3>Diagram Source Code</h3>
      <pre id="diagram-source-code" style="background-color: rgba(0,0,0,0.05); padding: 1rem; border-radius: 4px; overflow: auto; max-height: 300px;">
      ${fs
        .readFileSync(path.join(dir, "/", "sequence", diagram.fileName), "utf8")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>
    </div>
  </main>
  
  <footer>
    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    <p>Sequence Diagram Generator for Laravel</p>
  </footer>
  
  <script src="assets/script.js"></script>
</body>
</html>
  `;
}

function generateDiagramCard(diagram) {
  return `
      <div class="diagram-card" data-controller="${
        diagram.controller
      }" data-method="${diagram.method}" data-type="${diagram.type}">
        <div class="diagram-header">
          <div class="diagram-badge badge-${
            diagram.type
          }">${diagram.type.toUpperCase()}</div>
          <h4>${diagram.controller}</h4>
        </div>
        <div class="diagram-body">
          <div class="diagram-title">${diagram.method}</div>
          <div class="diagram-description">${diagram.description}</div>
        </div>
        <div class="diagram-footer">
          <div class="diagram-models">
            ${diagram.models
              .map((model) => `<span class="model-tag">${model}</span>`)
              .join(" ")}
            ${
              diagram.models.length === 0
                ? '<span style="font-style: italic; opacity: 0.7;">No models</span>'
                : ""
            }
          </div>
          <div class="diagram-actions">
            <a href="view_${
              diagram.id
            }.html" class="action-btn view-btn" title="View Diagram">
              <i class="fas fa-eye"></i>
            </a>
          </div>
        </div>
      </div>
  `;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = {
  generateSequenceDiagrams,
};
