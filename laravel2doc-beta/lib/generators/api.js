const fs = require("fs");
const path = require("path");

/**
 * Generate API documentation from project info
 * @param {Object} projectInfo Project information
 * @param {string} outputDir Output directory
 */
async function generateAPIDocumentation(projectInfo, outputDir) {
  // Create API documentation directory
  const apiDir = path.join(outputDir, "api");
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  // Parse route files to extract endpoints
  const endpoints = [];

  if (projectInfo.routeFiles) {
    projectInfo.routeFiles.forEach((routeFile) => {
      // Extract standard routes
      extractStandardRoutes(routeFile, endpoints);

      // Extract resource routes
      extractResourceRoutes(routeFile, endpoints);

      // Extract API resource routes
      extractApiResourceRoutes(routeFile, endpoints);

      // Extract route groups
      extractRouteGroups(routeFile, endpoints);
    });
  }

  // Generate API documentation
  generateApiDocs(projectInfo, endpoints, apiDir);

  return {
    files: [path.join(apiDir, "api.md"), path.join(apiDir, "index.html")],
  };
}

/**
 * Extract standard routes from route file
 */
function extractStandardRoutes(routeFile, endpoints) {
  const routeMatches = routeFile.content.matchAll(
    /Route::(get|post|put|patch|delete|options|any)\(\s*['"]([^'"]+)['"]\s*,\s*(?:(?:\[?([^\]]+)\]?|['"]([^'"]+)['"]))(?:(?:->name\(['"]([^'"]+)['"]\))|(?:->middleware\([^)]+\))?)?/g
  );

  for (const match of routeMatches) {
    const method = match[1].toUpperCase();
    const path = match[2];
    const handler = match[3] || match[4] || "Closure";
    const routeName = match[5] || null;

    endpoints.push({
      method,
      path,
      handler,
      routeName,
      description: generateRouteDescription(method, path),
      routeFile: routeFile.name,
    });
  }
}

/**
 * Extract resource routes from route file
 */
function extractResourceRoutes(routeFile, endpoints) {
  const resourceMatches = routeFile.content.matchAll(
    /Route::resource\(\s*['"]([^'"]+)['"]\s*,\s*['"]?([^,)"']+)['"]?(?:,\s*\[?['"]?only['"]?\s*=>\s*\[([^\]]+)\]\]?)?(?:,\s*\[?['"]?except['"]?\s*=>\s*\[([^\]]+)\]\]?)?/g
  );

  for (const match of resourceMatches) {
    const path = match[1];
    const handler = match[2];
    const only = match[3]
      ? match[3]
          .split(/[,\s]+/)
          .map((m) => m.replace(/['"]/g, "").trim())
          .filter(Boolean)
      : null;
    const except = match[4]
      ? match[4]
          .split(/[,\s]+/)
          .map((m) => m.replace(/['"]/g, "").trim())
          .filter(Boolean)
      : null;

    // Get singular name for descriptions
    const singularName = path.endsWith("s") ? path.slice(0, -1) : path;

    // Define all resource routes
    const resourceRoutes = [
      {
        method: "GET",
        suffix: "",
        action: "index",
        description: `List all ${path}`,
      },
      {
        method: "GET",
        suffix: "/create",
        action: "create",
        description: `Show form to create a new ${singularName}`,
      },
      {
        method: "POST",
        suffix: "",
        action: "store",
        description: `Store a new ${singularName}`,
      },
      {
        method: "GET",
        suffix: "/{id}",
        action: "show",
        description: `Show a specific ${singularName}`,
      },
      {
        method: "GET",
        suffix: "/{id}/edit",
        action: "edit",
        description: `Show form to edit ${singularName}`,
      },
      {
        method: "PUT/PATCH",
        suffix: "/{id}",
        action: "update",
        description: `Update a specific ${singularName}`,
      },
      {
        method: "DELETE",
        suffix: "/{id}",
        action: "destroy",
        description: `Delete a specific ${singularName}`,
      },
    ];

    // Add routes based on 'only' and 'except' options
    for (const route of resourceRoutes) {
      if (
        (only && !only.includes(route.action)) ||
        (except && except.includes(route.action))
      ) {
        continue;
      }

      endpoints.push({
        method: route.method,
        path: `/${path}${route.suffix}`,
        handler: `${handler}@${route.action}`,
        description: route.description,
        routeFile: routeFile.name,
        group: "Resource",
      });
    }
  }
}

/**
 * Extract API resource routes from route file (no create/edit forms)
 */
function extractApiResourceRoutes(routeFile, endpoints) {
  const apiResourceMatches = routeFile.content.matchAll(
    /Route::apiResource\(\s*['"]([^'"]+)['"]\s*,\s*['"]?([^,)"']+)['"]?(?:,\s*\[?['"]?only['"]?\s*=>\s*\[([^\]]+)\]\]?)?(?:,\s*\[?['"]?except['"]?\s*=>\s*\[([^\]]+)\]\]?)?/g
  );

  for (const match of apiResourceMatches) {
    const path = match[1];
    const handler = match[2];
    const only = match[3]
      ? match[3]
          .split(/[,\s]+/)
          .map((m) => m.replace(/['"]/g, "").trim())
          .filter(Boolean)
      : null;
    const except = match[4]
      ? match[4]
          .split(/[,\s]+/)
          .map((m) => m.replace(/['"]/g, "").trim())
          .filter(Boolean)
      : null;

    // Get singular name for descriptions
    const singularName = path.endsWith("s") ? path.slice(0, -1) : path;

    // Define all API resource routes (no create/edit forms)
    const apiResourceRoutes = [
      {
        method: "GET",
        suffix: "",
        action: "index",
        description: `List all ${path}`,
      },
      {
        method: "POST",
        suffix: "",
        action: "store",
        description: `Store a new ${singularName}`,
      },
      {
        method: "GET",
        suffix: "/{id}",
        action: "show",
        description: `Show a specific ${singularName}`,
      },
      {
        method: "PUT/PATCH",
        suffix: "/{id}",
        action: "update",
        description: `Update a specific ${singularName}`,
      },
      {
        method: "DELETE",
        suffix: "/{id}",
        action: "destroy",
        description: `Delete a specific ${singularName}`,
      },
    ];

    // Add routes based on 'only' and 'except' options
    for (const route of apiResourceRoutes) {
      if (
        (only && !only.includes(route.action)) ||
        (except && except.includes(route.action))
      ) {
        continue;
      }

      endpoints.push({
        method: route.method,
        path: `/${path}${route.suffix}`,
        handler: `${handler}@${route.action}`,
        description: route.description,
        routeFile: routeFile.name,
        group: "API Resource",
      });
    }
  }
}

/**
 * Extract route groups from route file
 */
function extractRouteGroups(routeFile, endpoints) {
  // Simplified approach for route groups
  const groupMatches = routeFile.content.matchAll(
    /Route::group\(\[\s*'prefix'\s*=>\s*['"]([^'"]+)['"]/g
  );

  for (const match of groupMatches) {
    const prefix = match[1];
    // Mark endpoints within this group
    // This is a simplified approach - a full parser would need to analyze the scope
    endpoints.forEach((endpoint) => {
      if (
        endpoint.routeFile === routeFile.name &&
        endpoint.path.startsWith(`/${prefix}`)
      ) {
        endpoint.group = prefix;
      }
    });
  }
}

/**
 * Generate a human-readable description for a route
 */
function generateRouteDescription(method, path) {
  // Extract resource name from path
  const parts = path.split("/").filter(Boolean);
  const resource = parts[parts.length - 1] || "resource";

  switch (method) {
    case "GET":
      if (path.includes("/{") || path.includes("/:"))
        return `Retrieve a specific ${resource}`;
      return `List ${resource}`;
    case "POST":
      return `Create a new ${resource}`;
    case "PUT":
    case "PATCH":
      return `Update a specific ${resource}`;
    case "DELETE":
      return `Delete a specific ${resource}`;
    default:
      return `${method} ${path}`;
  }
}

/**
 * Generate API documentation files
 */
function generateApiDocs(projectInfo, endpoints, apiDir) {
  // Group endpoints logically
  const groupedEndpoints = {};

  // First by route file
  endpoints.forEach((endpoint) => {
    if (!groupedEndpoints[endpoint.routeFile]) {
      groupedEndpoints[endpoint.routeFile] = [];
    }
    groupedEndpoints[endpoint.routeFile].push(endpoint);
  });

  // Generate markdown
  let apiMarkdown = `# API Documentation\n\n`;
  apiMarkdown += `## Project: ${projectInfo.name}\n\n`;
  apiMarkdown += `Laravel Version: ${projectInfo.version || "Unknown"}\n\n`;
  apiMarkdown += `Generated: ${new Date().toLocaleString()}\n\n`;

  // Table of contents
  apiMarkdown += `## Table of Contents\n\n`;
  Object.keys(groupedEndpoints).forEach((routeFile) => {
    apiMarkdown += `- [${routeFile}](#${routeFile
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")})\n`;
  });
  apiMarkdown += `\n`;

  // Add endpoints by route file
  Object.keys(groupedEndpoints).forEach((routeFile) => {
    apiMarkdown += `## ${routeFile}\n\n`;

    // Group by resource/prefix within route file
    const resourceGroups = {};

    groupedEndpoints[routeFile].forEach((endpoint) => {
      const groupKey = endpoint.group || "Other";
      if (!resourceGroups[groupKey]) {
        resourceGroups[groupKey] = [];
      }
      resourceGroups[groupKey].push(endpoint);
    });

    // Output each group
    Object.keys(resourceGroups).forEach((groupKey) => {
      if (groupKey !== "Other") {
        apiMarkdown += `### ${groupKey}\n\n`;
      }

      // Output endpoints table
      apiMarkdown += `| Method | Endpoint | Handler | Description |\n`;
      apiMarkdown += `|--------|----------|---------|-------------|\n`;

      resourceGroups[groupKey].forEach((endpoint) => {
        apiMarkdown += `| ${endpoint.method} | ${endpoint.path} | ${endpoint.handler} | ${endpoint.description} |\n`;
      });

      apiMarkdown += `\n`;

      // Detailed endpoint documentation
      resourceGroups[groupKey].forEach((endpoint) => {
        apiMarkdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
        apiMarkdown += `**Handler:** ${endpoint.handler}\n\n`;
        apiMarkdown += `**Description:** ${endpoint.description}\n\n`;

        // Extract controller method info if available
        extractControllerMethodInfo(projectInfo, endpoint, apiMarkdown);

        apiMarkdown += "---\n\n";
      });
    });
  });

  // Write API documentation to file
  fs.writeFileSync(path.join(apiDir, "api.md"), apiMarkdown);

  // Create HTML file with improved styling
  const htmlContent = generateHtmlDoc(projectInfo, apiMarkdown);
  fs.writeFileSync(path.join(apiDir, "index.html"), htmlContent);
}

/**
 * Extract controller method information
 */
function extractControllerMethodInfo(projectInfo, endpoint, apiMarkdown) {
  const handlerParts = endpoint.handler.split("@");
  if (handlerParts.length !== 2) return;

  const controllerName = handlerParts[0].trim();
  const methodName = handlerParts[1].trim();

  const controller = projectInfo.controllers?.find(
    (c) => c.name === controllerName || c.name === `${controllerName}Controller`
  );

  if (!controller) return;

  // Extract method content and parameters
  const methodMatch = controller.content.match(
    new RegExp(
      `(?:public|protected|private)\\s+function\\s+${methodName}\\s*\\(([^)]*)\\)(?:\\s*:[^{]*)?\\s*{([^}]*)}`,
      "s"
    )
  );

  if (methodMatch) {
    const params = methodMatch[1]
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);
    const methodBody = methodMatch[2];

    if (params.length > 0) {
      apiMarkdown += `**Parameters:**\n\n`;

      params.forEach((param) => {
        // Extract type hint and param name
        const paramParts = param.split(" ").filter((p) => p);
        let paramName = paramParts[paramParts.length - 1].replace("$", "");
        let paramType = paramParts.length > 1 ? paramParts[0] : "mixed";

        apiMarkdown += `- \`${paramName}\` (${paramType})\n`;
      });

      apiMarkdown += "\n";
    }

    // Try to extract validation rules
    const validationMatches = methodBody.match(
      /validate\(\s*\$request->all\(\)\s*,\s*\[([\s\S]*?)\]\s*\)/
    );

    if (validationMatches) {
      apiMarkdown += `**Validation Rules:**\n\n`;
      apiMarkdown += "```php\n";
      apiMarkdown += validationMatches[0];
      apiMarkdown += "\n```\n\n";
    }

    // Check if the method returns a response
    if (
      methodBody.includes("return response()->json(") ||
      methodBody.includes("return JsonResponse")
    ) {
      apiMarkdown += `**Returns:** JSON Response\n\n`;
    }
  }
}

// ...existing code...

/**
 * Generate HTML documentation
 */
function generateHtmlDoc(projectInfo, apiMarkdown) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - ${projectInfo.name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
  <style>
    :root {
      --primary-color: #3490dc;
      --secondary-color: #38c172;
      --dark-color: #2d3748;
      --light-color: #f8fafc;
      --get-color: #3490dc;
      --post-color: #38c172;
      --put-color: #f6993f;
      --patch-color: #f6993f;
      --delete-color: #e3342f;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: var(--primary-color);
      color: white;
      padding: 1rem;
      border-radius: 5px;
      margin-bottom: 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    h1, h2, h3 {
      color: var(--dark-color);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
      border: 1px solid #ddd;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border: 1px solid #ddd;
    }
    th {
      background-color: var(--light-color);
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
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

    code {
      background: #f4f4f4;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: Consolas, Monaco, 'Andale Mono', monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 1rem;
      border-radius: 5px;
      overflow-x: auto;
    }
    hr {
      border: 0;
      height: 1px;
      background: #ddd;
      margin: 2rem 0;
    }
    .method {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      display: inline-block;
      min-width: 70px;
      text-align: center;
    }
    .method-get { background-color: var(--get-color); }
    .method-post { background-color: var(--post-color); }
    .method-put, .method-patch { background-color: var(--put-color); }
    .method-delete { background-color: var(--delete-color); }
    
    #api-content ul {
      padding-left: 20px;
    }
    #api-content li {
      margin-bottom: 5px;
    }
    
    /* Interactive elements */
    .search-container {
      margin-bottom: 1.5rem;
      position: sticky;
      top: 80px;
      z-index: 99;
      background: white;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    #search {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }
    .endpoint-container {
      margin-bottom: 2rem;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow: hidden;
    }
    .endpoint-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background-color: var(--light-color);
      cursor: pointer;
    }
    .endpoint-header h3 {
      margin: 0;
      display: flex;
      align-items: center;
    }
    .endpoint-content {
      padding: 0.75rem;
      display: none;
    }
    .endpoint-content.active {
      display: block;
    }
    .try-it {
      background-color: var(--secondary-color);
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .try-it:hover {
      opacity: 0.9;
    }
    .try-it-form {
      margin-top: 1rem;
      padding: 1rem;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
    }
    .form-group input, .form-group textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .form-group textarea {
      height: 100px;
    }
    .response-container {
      margin-top: 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
      display: none;
    }
    .response-header {
      padding: 0.5rem;
      background-color: var(--light-color);
      display: flex;
      justify-content: space-between;
    }
    .response-body {
      padding: 0.5rem;
      overflow-x: auto;
    }
    .collapse-icon {
      margin-right: 8px;
      transition: transform 0.3s;
    }
    .endpoint-header.active .collapse-icon {
      transform: rotate(90deg);
    }
    #dark-mode-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--dark-color);
      color: white;
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .dark-mode {
      background-color: #1a202c;
      color: #f7fafc;
    }
    .dark-mode header {
      background-color: #2d3748;
    }
    .dark-mode table, .dark-mode th, .dark-mode td {
      border-color: #4a5568;
    }
    .dark-mode th, .dark-mode .endpoint-header {
      background-color: #2d3748;
      color: #f7fafc;
    }
    .dark-mode tr:nth-child(even) {
      background-color: #2d3748;
    }
    .dark-mode code, .dark-mode pre {
      background-color: #2d3748;
      color: #f7fafc;
    }
    
    @media (max-width: 768px) {
      table {
        display: block;
        overflow-x: auto;
      }
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

  <header>
    <h1>API Documentation</h1>
    <h2>${projectInfo.name || "Laravel Project"} (Laravel ${
    projectInfo.version || "Unknown"
  })</h2>
  </header>
  
  <div class="search-container">
    <input type="text" id="search" placeholder="Search endpoints, methods, or descriptions...">
  </div>
  
  <main class="markdown-body">
    <div id="api-content">
      ${enhancedMarkdownToHtml(apiMarkdown, true)}
    </div>
  </main>
  
  <button id="dark-mode-toggle">🌓</button>

  <script>
    hljs.highlightAll();
    
    // Add method color classes
    document.querySelectorAll('table td:first-child').forEach(cell => {
      const method = cell.textContent.trim().toLowerCase();
      const methods = method.split('/');
      
      if (methods.length) {
        const mainMethod = methods[0].toLowerCase();
        if (['get', 'post', 'put', 'patch', 'delete'].includes(mainMethod)) {
          cell.innerHTML = \`<span class="method method-\${mainMethod}">\${cell.textContent}</span>\`;
        }
      }
    });
    
    // Interactive search
    const search = document.getElementById('search');
    search.addEventListener('input', function() {
      const value = this.value.toLowerCase();
      const endpoints = document.querySelectorAll('.endpoint-container');
      
      endpoints.forEach(endpoint => {
        const text = endpoint.textContent.toLowerCase();
        const match = text.includes(value);
        endpoint.style.display = match ? 'block' : 'none';
      });
    });
    
    // Toggle endpoint details
    document.querySelectorAll('.endpoint-header').forEach(header => {
      header.addEventListener('click', function() {
        this.classList.toggle('active');
        const content = this.nextElementSibling;
        content.classList.toggle('active');
      });
    });
    
    // Try It functionality
    document.querySelectorAll('.try-it').forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        const container = this.closest('.endpoint-container');
        const content = container.querySelector('.endpoint-content');
        
        if (!content.classList.contains('active')) {
          container.querySelector('.endpoint-header').click();
        }
        
        // Create form if it doesn't exist
        if (!container.querySelector('.try-it-form')) {
          const method = container.getAttribute('data-method');
          const endpoint = container.getAttribute('data-endpoint');
          
          const form = document.createElement('div');
          form.className = 'try-it-form';
          form.innerHTML = \`
            <h4>Test Request</h4>
            <div class="form-group">
              <label>URL</label>
              <input type="text" class="url-input" value="\${window.location.origin}\${endpoint}" readonly>
            </div>
            \${method !== 'GET' ? \`
              <div class="form-group">
                <label>Request Body (JSON)</label>
                <textarea class="body-input">{}</textarea>
              </div>
            \` : ''}
            <div class="form-group">
              <button type="button" class="send-request">Send Request</button>
            </div>
            <div class="response-container">
              <div class="response-header">
                <span class="response-status"></span>
                <span class="response-time"></span>
              </div>
              <div class="response-body">
                <pre><code class="language-json response-code"></code></pre>
              </div>
            </div>
          \`;
          
          content.appendChild(form);
          
          // Add event listener to send button
          form.querySelector('.send-request').addEventListener('click', async function() {
            const urlInput = form.querySelector('.url-input');
            const bodyInput = form.querySelector('.body-input');
            const responseContainer = form.querySelector('.response-container');
            const responseStatus = form.querySelector('.response-status');
            const responseTime = form.querySelector('.response-time');
            const responseCode = form.querySelector('.response-code');
            
            const url = urlInput.value;
            const body = bodyInput ? bodyInput.value : null;
            
            const startTime = Date.now();
            
            try {
              responseContainer.style.display = 'block';
              responseStatus.textContent = 'Loading...';
              responseTime.textContent = '';
              responseCode.textContent = '';
              
              // Note: In a real implementation, you would make actual API calls
              // For demo purposes, we're just simulating a response
              const response = {
                status: 200,
                statusText: 'OK',
                data: { 
                  message: "This is a simulated response for demonstration.",
                  method: method,
                  url: url,
                  receivedBody: body ? JSON.parse(body) : null
                }
              };
              
              const endTime = Date.now();
              const time = endTime - startTime;
              
              setTimeout(() => {
                responseStatus.textContent = \`Status: \${response.status} \${response.statusText}\`;
                responseTime.textContent = \`Time: \${time}ms\`;
                responseCode.textContent = JSON.stringify(response.data, null, 2);
                hljs.highlightElement(responseCode);
              }, 500); // Simulate network delay
              
            } catch (error) {
              responseStatus.textContent = 'Error';
              responseCode.textContent = error.toString();
              hljs.highlightElement(responseCode);
            }
          });
        }
      });
    });
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    darkModeToggle.addEventListener('click', function() {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
    
    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
    }
  </script>
</body>
</html>
  `;
}

/**
 * Enhanced markdown to HTML converter with interactive features
 */
function enhancedMarkdownToHtml(markdown, interactive = true) {
  let html = markdown;

  // Headers
  html = html.replace(/^# (.*?)$/gm, '<h1 id="$1">$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2 id="$1">$1</h2>');

  // If interactive mode, we'll handle H3 endpoints differently
  if (!interactive) {
    html = html.replace(/^### (.*?)$/gm, '<h3 id="$1">$1</h3>');
  }

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Inline code
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");

  // Code blocks
  html = html.replace(
    /```(.*?)\n([\s\S]*?)\n```/g,
    '<pre><code class="language-$1">$2</code></pre>'
  );

  // Process tables (more robust approach)
  const tableRegex = /\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n)+)/g;
  html = html.replace(tableRegex, (match, headerRow, bodyRows) => {
    // Process header
    const headers = headerRow
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    const headerHtml = headers.map((header) => `<th>${header}</th>`).join("");

    // Process body rows
    const rows = bodyRows.trim().split("\n");
    const rowsHtml = rows
      .map((row) => {
        const cells = row
          .split("|")
          .map((cell) => cell.trim())
          .filter(Boolean);
        return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
      })
      .join("");

    return `<table>
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>`;
  });

  // Lists
  html = html.replace(/^- (.*?)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>\n)+/g, "<ul>$&</ul>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr>");

  if (interactive) {
    // Transform ### Endpoint headers to interactive blocks
    const sections = html.split(/(?=<h3 id="[^"]+">)/g);

    // Process the first part (intro and TOC)
    let processedHtml = sections[0];

    // Process endpoints
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const headerMatch = section.match(/<h3 id="([^"]+)">([^<]+)<\/h3>/);

      if (headerMatch) {
        const id = headerMatch[1];
        const title = headerMatch[2];
        const methodMatch = title.match(/^([A-Z\/]+)\s+(.*)/);

        if (methodMatch) {
          const method = methodMatch[1];
          const endpoint = methodMatch[2];
          const mainMethod = method.split("/")[0].toLowerCase();

          // Replace the section with an interactive container
          const newSection = `
          <div class="endpoint-container" data-method="${method}" data-endpoint="${endpoint}">
            <div class="endpoint-header">
              <h3><span class="collapse-icon">▶</span><span class="method method-${mainMethod}">${method}</span> ${endpoint}</h3>
              <button class="try-it">Try it</button>
            </div>
            <div class="endpoint-content">
              ${section.replace(/<h3 id="[^"]+">([^<]+)<\/h3>/, "")}
            </div>
          </div>
          `;

          processedHtml += newSection;
        } else {
          processedHtml += section;
        }
      } else {
        processedHtml += section;
      }
    }

    html = processedHtml;
  }

  // Paragraphs (excluding elements that don't need p tags)
  html = html.replace(/^(?!<h|<ul|<pre|<table|<hr|<div)(.*?)$/gm, "<p>$1</p>");

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");

  return html;
}

// ...existing code...

module.exports = {
  generateAPIDocumentation,
  markdownToHtml: enhancedMarkdownToHtml,
};
