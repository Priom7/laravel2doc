const fs = require("fs");
const path = require("path");

/**
 * Generate ERD (Entity Relationship Diagram) from project models and ORM
 * @param {Object} projectInfo Project information
 * @param {string} outputDir Output directory
 */
async function generateERD(projectInfo, outputDir) {
  // Create directories if they don't exist
  const erdDir = path.join(outputDir, "erd");
  if (!fs.existsSync(erdDir)) {
    fs.mkdirSync(erdDir, { recursive: true });
  }

  // Generate mermaid ERD diagram based on models and relationships
  let mermaidContent = `erDiagram\n`;

  // Track processed models and their foreign keys
  const processedModels = new Set();
  const foreignKeys = new Map();

  // First pass: Process models and collect foreign keys
  projectInfo.models.forEach((model) => {
    const modelName = model.name.toLowerCase();
    if (processedModels.has(modelName)) return;
    processedModels.add(modelName);

    // Extract foreign keys from relationships
    extractForeignKeys(model, foreignKeys);
  });

  // Second pass: Generate entities with proper key annotations
  projectInfo.models.forEach((model) => {
    const modelName = model.name.toLowerCase();

    // Extract model attributes and column definitions
    const attributes = extractModelAttributes(model, foreignKeys);

    if (attributes.length > 0) {
      mermaidContent += `  ${modelName} {\n`;

      // Add default ID if not explicitly defined
      if (!attributes.some((attr) => attr.isPrimaryKey)) {
        mermaidContent += `    int id PK "Primary key"\n`;
      }

      // Add all attributes found in the model
      attributes.forEach((attr) => {
        let keyAnnotation = "";
        let comment = "";

        if (attr.isPrimaryKey) {
          keyAnnotation = " PK";
          comment = ' "Primary key"';
        } else if (attr.isForeignKey) {
          keyAnnotation = " FK";
          comment = ` "References ${attr.references}"`;
        }

        mermaidContent += `    ${attr.type} ${attr.name}${keyAnnotation}${comment}\n`;
      });

      // Check for timestamps and soft deletes based on model traits
      if (
        model.content.includes("use HasFactory") ||
        model.content.includes("use Timestamps") ||
        !model.content.includes("public $timestamps = false")
      ) {
        mermaidContent += `    datetime created_at\n`;
        mermaidContent += `    datetime updated_at\n`;
      }

      if (model.content.includes("use SoftDeletes")) {
        mermaidContent += `    datetime deleted_at\n`;
      }

      mermaidContent += `  }\n`;
    }
  });

  // Add relationships with proper cardinality
  projectInfo.relationships.forEach((rel) => {
    let sourceModel = cleanModelName(rel.sourceModel);
    let targetModel = cleanModelName(rel.targetModel);

    if (
      !processedModels.has(sourceModel) ||
      !processedModels.has(targetModel)
    ) {
      return;
    }

    // Determine relationship symbol and add optional labels
    const relationshipDetails = getRelationshipDetails(rel);
    const relationshipName = rel.relationshipName || "";

    mermaidContent += `  ${sourceModel} ${relationshipDetails.symbol} ${targetModel} : "${relationshipName}"\n`;
  });

  // Write ERD diagram to file
  fs.writeFileSync(path.join(erdDir, "database_erd.md"), mermaidContent);

  // Create HTML file to display the ERD
  const htmlContent = generateHtmlContent(
    projectInfo.name,
    projectInfo.version,
    mermaidContent
  );
  fs.writeFileSync(path.join(erdDir, "index.html"), htmlContent);

  // Return information about generated files
  return {
    files: [
      path.join(erdDir, "database_erd.md"),
      path.join(erdDir, "index.html"),
    ],
  };
}

/**
 * Extract foreign keys from model relationships
 * @param {Object} model The model object
 * @param {Map} foreignKeys Map to store foreign keys
 */
function extractForeignKeys(model, foreignKeys) {
  const modelName = model.name.toLowerCase();

  // Look for belongsTo relationships which imply foreign keys
  const belongsToMatches = [
    ...model.content.matchAll(
      /belongsTo\(\s*([^,)]+)(?:,\s*['"]([^'"]+)['"])?\s*\)/g
    ),
  ];

  belongsToMatches.forEach((match) => {
    let relatedModel = cleanModelName(match[1]);
    let foreignKeyName = match[2] || `${relatedModel}_id`; // Use provided foreign key name or default

    // Add to foreign keys map
    if (!foreignKeys.has(modelName)) {
      foreignKeys.set(modelName, []);
    }

    foreignKeys.get(modelName).push({
      name: foreignKeyName,
      references: relatedModel,
    });
  });

  // Also check for explicit foreign keys in $casts or manually defined relations
  const foreignKeyMatches = [...model.content.matchAll(/['"]([^'"]+_id)['"]/g)];
  foreignKeyMatches.forEach((match) => {
    const foreignKeyName = match[1];
    // Determine referenced model from key name
    const referencedModel = foreignKeyName.replace("_id", "");

    if (!foreignKeys.has(modelName)) {
      foreignKeys.set(modelName, []);
    }

    // Add if not already present
    if (!foreignKeys.get(modelName).some((fk) => fk.name === foreignKeyName)) {
      foreignKeys.get(modelName).push({
        name: foreignKeyName,
        references: referencedModel,
      });
    }
  });
}

/**
 * Extract model attributes with proper key information
 * @param {Object} model Model object with content
 * @param {Map} foreignKeys Map of foreign keys by model
 * @returns {Array} Array of attribute objects
 */
function extractModelAttributes(model, foreignKeys) {
  const modelName = model.name.toLowerCase();
  const attributes = [];

  // Extract fillable attributes
  const fillableMatch = model.content.match(
    /protected\s+\$fillable\s*=\s*\[([\s\S]*?)\]/
  );
  if (fillableMatch) {
    const fillableAttrs = fillableMatch[1].match(/'([^']+)'/g) || [];
    fillableAttrs.forEach((attr) => {
      const attrName = attr.replace(/'/g, "");
      attributes.push({
        name: attrName,
        type: inferAttributeType(attrName),
        isPrimaryKey: attrName === "id",
        isForeignKey: attrName.endsWith("_id"),
        references: attrName.endsWith("_id")
          ? attrName.replace("_id", "")
          : null,
      });
    });
  }

  // Extract casts
  const castsMatch =
    model.content.match(/protected\s+\$casts\s*=\s*\[([\s\S]*?)\]/) ||
    model.content.match(/protected\s+\$casts\s*=\s*\{([\s\S]*?)\}/);
  if (castsMatch) {
    const castEntries = [
      ...castsMatch[1].matchAll(/'([^']+)'\s*=>\s*'([^']+)'/g),
    ];
    castEntries.forEach((entry) => {
      const attrName = entry[1];
      const castType = entry[2];

      // Update existing attribute or add new one
      const existingAttr = attributes.find((a) => a.name === attrName);
      if (existingAttr) {
        existingAttr.type = mapCastTypeToErdType(castType);
      } else {
        attributes.push({
          name: attrName,
          type: mapCastTypeToErdType(castType),
          isPrimaryKey: attrName === "id",
          isForeignKey: attrName.endsWith("_id"),
          references: attrName.endsWith("_id")
            ? attrName.replace("_id", "")
            : null,
        });
      }
    });
  }

  // Check for custom primary key
  const primaryKeyMatch = model.content.match(
    /protected\s+\$primaryKey\s*=\s*'([^']+)'/
  );
  if (primaryKeyMatch) {
    const pkName = primaryKeyMatch[1];

    // Mark existing attribute as PK or add new one
    const existingPk = attributes.find((a) => a.name === pkName);
    if (existingPk) {
      existingPk.isPrimaryKey = true;
    } else {
      attributes.push({
        name: pkName,
        type: "int",
        isPrimaryKey: true,
        isForeignKey: false,
        references: null,
      });
    }

    // Also unmark the default 'id' if it's not the primary key
    const defaultId = attributes.find((a) => a.name === "id" && a.isPrimaryKey);
    if (defaultId && pkName !== "id") {
      defaultId.isPrimaryKey = false;
    }
  }

  // Add foreign keys from relationships if not already present
  if (foreignKeys.has(modelName)) {
    foreignKeys.get(modelName).forEach((fk) => {
      const existingFk = attributes.find((a) => a.name === fk.name);
      if (existingFk) {
        existingFk.isForeignKey = true;
        existingFk.references = fk.references;
      } else {
        attributes.push({
          name: fk.name,
          type: "int",
          isPrimaryKey: false,
          isForeignKey: true,
          references: fk.references,
        });
      }
    });
  }

  return attributes;
}

/**
 * Infer attribute type based on attribute name
 * @param {string} attrName Attribute name
 * @returns {string} Inferred type
 */
function inferAttributeType(attrName) {
  if (attrName === "id" || attrName.endsWith("_id")) {
    return "int";
  } else if (attrName.includes("email")) {
    return "string";
  } else if (attrName.includes("password")) {
    return "string";
  } else if (attrName.includes("date") || attrName.includes("time")) {
    return "datetime";
  } else if (attrName.includes("is_") || attrName.includes("has_")) {
    return "boolean";
  } else if (
    attrName.includes("count") ||
    attrName.includes("amount") ||
    attrName.includes("price") ||
    attrName.includes("total")
  ) {
    return "float";
  } else if (attrName.includes("uuid")) {
    return "string";
  } else {
    return "string";
  }
}

/**
 * Map Laravel cast type to ERD type
 * @param {string} castType Laravel cast type
 * @returns {string} ERD type
 */
function mapCastTypeToErdType(castType) {
  const typeMap = {
    integer: "int",
    int: "int",
    float: "float",
    double: "float",
    decimal: "float",
    string: "string",
    boolean: "boolean",
    bool: "boolean",
    object: "json",
    array: "json",
    json: "json",
    date: "datetime",
    datetime: "datetime",
    timestamp: "datetime",
    uuid: "string",
  };

  return typeMap[castType.toLowerCase()] || "string";
}

/**
 * Clean model name by removing namespace and ::class
 * @param {string} modelName Raw model name
 * @returns {string} Cleaned model name
 */
function cleanModelName(modelName) {
  return modelName
    .replace(/^.*[\\\/]/, "") // Remove namespace
    .replace(/::class$/, "") // Remove ::class suffix
    .replace(/^App\\Models\\/, "") // Remove common Laravel namespace
    .replace(/^['"]+|['"]+$/g, "") // Remove quotes
    .toLowerCase(); // Convert to lowercase
}

/**
 * Get relationship details for mermaid diagram
 * @param {Object} relationship Relationship information
 * @returns {Object} Relationship symbol and labels
 */
function getRelationshipDetails(relationship) {
  const relationshipMap = {
    hasOne: {
      symbol: "||--o|",
      label: "1 to 1",
    },
    hasMany: {
      symbol: "||--|{",
      label: "1 to many",
    },
    belongsTo: {
      symbol: "}|--||",
      label: "belongs to",
    },
    belongsToMany: {
      symbol: "}|--|{",
      label: "many to many",
    },
    morphTo: {
      symbol: "}o--|{",
      label: "polymorphic",
    },
    morphOne: {
      symbol: "||--o|",
      label: "morph one",
    },
    morphMany: {
      symbol: "||--o{",
      label: "morph many",
    },
    hasManyThrough: {
      symbol: "||..o{",
      label: "many through",
    },
    hasOneThrough: {
      symbol: "||..o|",
      label: "one through",
    },
  };

  return (
    relationshipMap[relationship.relationshipType] || {
      symbol: "||--o|",
      label: "relates to",
    }
  );
}

/**
 * Generate HTML content for ERD visualization with improved styling
 * @param {string} projectName Project name
 * @param {string} version Laravel version
 * @param {string} mermaidContent Mermaid diagram content
 * @returns {string} HTML content
 */
function generateHtmlContent(projectName, version, mermaidContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entity Relationship Diagram - ${projectName}</title>
 <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
  <link rel="stylesheet" href="../styles.css">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      border-bottom: 2px solid #3498db;
      margin-bottom: 30px;
      padding-bottom: 20px;
    }
    
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
    }
    
    h2 {
      color: #3498db;
      font-weight: normal;
    }
    
    .diagram-container {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
    }
    
    .legend {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 15px 25px;
      margin-top: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .legend h3 {
      color: #2c3e50;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    
    .legend ul {
      list-style-type: none;
      padding-left: 0;
      display: flex;
      flex-wrap: wrap;
    }
    
    .legend li {
      margin-right: 30px;
      margin-bottom: 10px;
      background-color: #fff;
      padding: 5px 15px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

    
    .legend strong {
      color: #3498db;
    }
    
    .mermaid {
      font-size: 16px;
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
    <h1>Entity Relationship Diagram</h1>
    <h2>${projectName} (Laravel ${version})</h2>
  </header>
  
  <main>
    <div class="diagram-container">
      <div class="mermaid">
${mermaidContent}
      </div>
    </div>
    
    <div class="legend">
      <h3>Relationship Legend</h3>
      <ul>
        <li><strong>||--o|</strong>: One-to-One</li>
        <li><strong>||--|{</strong>: One-to-Many</li>
        <li><strong>}|--||</strong>: Belongs-To</li>
        <li><strong>}|--|{</strong>: Many-to-Many</li>
        <li><strong>||--o{</strong>: Polymorphic</li>
        <li><strong>||..o{</strong>: Has-Many-Through</li>
      </ul>
      <h3>Key Legend</h3>
      <ul>
        <li><strong>PK</strong>: Primary Key</li>
        <li><strong>FK</strong>: Foreign Key</li>
      </ul>
    </div>
  </main>
  
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      securityLevel: 'loose',
      er: {
        diagramPadding: 20,
        layoutDirection: 'TB',
        minEntityWidth: 100,
        minEntityHeight: 75,
        entityPadding: 15
      }
    });
  </script>
</body>
</html>`;
}

module.exports = {
  generateERD,
};
