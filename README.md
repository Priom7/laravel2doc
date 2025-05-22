# Laravel2Doc (Live Now, MAY 2025)
### ⭐ Feel Free to leave a star and follow for updates
## Feedback is always welcome, and please do feel free to request more features you might want to see in future implementations. 
Read the Article Here: Laravel2Doc - Generate Sequence Diagrams from Your Laravel Application in Seconds -   <a href="https://medium.com/@priom7197/laravel2doc-generate-sequence-diagrams-from-your-laravel-application-in-seconds-1-2-84bf8ac8a193">
        <img src="https://img.shields.io/badge/Read%20Article-%23000000?style=for-the-badge&logo=medium&logoColor=white" alt="Read Article">
      </a>
---
Automatically generate comprehensive documentation for Laravel applications, including Entity Relationship Diagrams (ERD), UML Class Diagrams, Sequence Diagrams, API Documentation, and more.


## Features

- 📊 **Entity Relationship Diagrams (ERD)**: Visual representation of your database schema
- 📝 **UML Class Diagrams**: Object-oriented view of your models and their relationships
- 🔄 **Sequence Diagrams**: Flow of interactions between components
- 📚 **API Documentation**: Comprehensive documentation of your API endpoints
- 🚀 **Interactive Interface**: Browse all documentation through a user-friendly web interface
- 🔍 **Automatic Analysis**: No configuration needed - just install and run

  <div align="center">
   <img src="https://github.com/Priom7/laravel2doc/blob/main/dashboard-sample.png" alt="Cover Banner" width="100%" height="auto"> 
</div>

## Installation

### Global Installation

```bash
npm install -g @priom7/laravel2doc
```

### Local Installation (within a Laravel project)

```bash
cd your-laravel-project
npm install @priom7/laravel2doc
```

## Usage

### Within a Laravel Project

Navigate to your Laravel project root directory and run:

```bash
npx laravel2doc
```

This will analyze your Laravel project and generate documentation in the `laravel2doc` directory. It will also start a web server to view the documentation.

### Options

- `-p, --port <number>`: Port to serve documentation on (default: 3333)
- `-o, --output <dir>`: Output directory (default: 'laravel2doc')

### Demo Mode

If you run Laravel2Doc outside a Laravel project, it will generate example documentation to demonstrate its features:

```bash
npx laravel2doc
```

## Generated Documentation

Laravel2Doc generates the following documentation:

### Entity Relationship Diagrams (ERD)

- Database tables with columns and data types
- Primary keys and foreign keys
- Relationships between tables
    <div align="center">
   <img src="https://github.com/Priom7/laravel2doc/blob/main/erd-sample.png" alt="Cover Banner" width="100%" height="auto"> 
</div>

### UML Class Diagrams

- Models with properties and methods
- Relationships between models
- Inheritance hierarchies
     <div align="center">
   <img src="https://github.com/Priom7/laravel2doc/blob/main/uml-sample.png" alt="Cover Banner" width="100%" height="auto"> 
</div>

### Sequence Diagrams

- Controller actions and their interactions
- Common operations like create, read, update, delete
- Flow of data between components
     <div align="center">
   <img src="https://github.com/Priom7/laravel2doc/blob/main/sequence-sample.png" alt="Cover Banner" width="100%" height="auto"> 
</div>

### API Documentation

- Endpoints with HTTP methods
- Controller handlers and parameters
- Route definitions
     <div align="center">
   <img src="https://github.com/Priom7/laravel2doc/blob/main/api-sample.png" alt="Cover Banner" width="100%" height="auto"> 
</div>

## How It Works

Laravel2Doc analyzes your Laravel project by:

1. Scanning model files to extract relationships and properties
2. Analyzing migrations to build database schema
3. Parsing controllers to understand application flow
4. Examining route files to document API endpoints
5. Generating interactive documentation with Mermaid diagrams

## Requirements

- Node.js 14+
- Laravel 8+ project (for Laravel-specific documentation)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Created by [priom7](https://github.com/priom7)
- Md Sharif Alam 
