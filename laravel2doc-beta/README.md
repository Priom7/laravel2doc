# Laravel2Doc

Automatically generate comprehensive documentation for Laravel applications, including Entity Relationship Diagrams (ERD), UML Class Diagrams, Sequence Diagrams, API Documentation, and more.

<!-- ![Laravel2Doc Demo](https://via.placeholder.com/800x400?text=Laravel2Doc+Demo) -->

## Features

- 📊 **Entity Relationship Diagrams (ERD)**: Visual representation of your database schema
- 📝 **UML Class Diagrams**: Object-oriented view of your models and their relationships
- 🔄 **Sequence Diagrams**: Flow of interactions between components
- 📚 **API Documentation**: Comprehensive documentation of your API endpoints
- 🚀 **Interactive Interface**: Browse all documentation through a user-friendly web interface
- 🔍 **Automatic Analysis**: No configuration needed - just install and run

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

### UML Class Diagrams

- Models with properties and methods
- Relationships between models
- Inheritance hierarchies

### Sequence Diagrams

- Controller actions and their interactions
- Common operations like create, read, update, delete
- Flow of data between components

### API Documentation

- Endpoints with HTTP methods
- Controller handlers and parameters
- Route definitions

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Created by [priom7](https://github.com/priom7)