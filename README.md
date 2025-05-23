
# Laravel2Doc (Live Now — May 2025)

[![npm version](https://img.shields.io/npm/v/@priom7/laravel2doc?color=blue)](https://www.npmjs.com/package/@priom7/laravel2doc)
[![npm downloads](https://img.shields.io/npm/dt/@priom7/laravel2doc?label=Downloads&color=green)](https://www.npmjs.com/package/@priom7/laravel2doc)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E=14.0.0-brightgreen)](https://nodejs.org/)
[![Made by priom7](https://img.shields.io/badge/Made%20by-priom7-blueviolet)](https://github.com/priom7)

> Automatically generate beautiful, interactive documentation for Laravel projects in seconds.

---

### ⭐ Feel free to leave a star and follow for updates!
### 📣 Feedback is always welcome — suggest features you'd like to see!

📖 **Read the article**:  
<a href="https://medium.com/@priom7197/laravel2doc-generate-sequence-diagrams-from-your-laravel-application-in-seconds-1-2-84bf8ac8a193">
  <img src="https://img.shields.io/badge/Read%20Article-%23000000?style=for-the-badge&logo=medium&logoColor=white" alt="Read Article">
</a>

---

## ✨ Features

- 📊 **ERD** — Entity Relationship Diagrams
- 📝 **UML** — Class Diagrams for Models
- 🔄 **Sequence Diagrams** — Component interaction flows
- 📚 **API Docs** — Endpoints, controllers, routes
- 🚀 **Interactive Viewer** — Browse via built-in web interface
- 🔍 **Zero Config** — Auto-analyzes Laravel project structure

---

## 📦 Installation

### Global:

```bash
npm install -g @priom7/laravel2doc
````

### Local (within a Laravel project):

```bash
cd your-laravel-project
npm install @priom7/laravel2doc
```

---

## 🚀 Usage

Inside your Laravel project:

```bash
npx laravel2doc
```

This generates documentation in the `laravel2doc/` folder and launches a web viewer.

### ⚙️ Options

| Flag                 | Description                       | Default       |
| -------------------- | --------------------------------- | ------------- |
| `-p, --port <num>`   | Port for local server             | `3333`        |
| `-o, --output <dir>` | Directory to output documentation | `laravel2doc` |

### 🧪 Demo Mode

Try it outside a Laravel project to see a live example:

```bash
npx laravel2doc
```

---

## 🧾 Generated Documentation

### 📊 Entity Relationship Diagram (ERD)

* Tables, columns, data types
* Primary/foreign keys, relationships

<div align="center">
   <img src="https://github.com/Priom7/laravel2doc/blob/main/erd-sample.png" alt="ERD Sample" width="100%">
</div>

---

### 🏗 UML Class Diagram

* Model properties, methods
* Relationships and inheritance

<div align="center">
   <img src="https://github.com/Priom7/laravel2doc/blob/main/uml-sample.png" alt="UML Sample" width="100%">
</div>

---

### 🔄 Sequence Diagrams

* Controller method flows
* CRUD interaction flow

<div align="center">
   <img src="https://github.com/Priom7/laravel2doc/blob/main/sequence-sample.png" alt="Sequence Sample" width="100%">
</div>

---

### 🌐 API Documentation

* Routes, HTTP methods, controllers
* Parameter and handler mappings

<div align="center">
   <img src="https://github.com/Priom7/laravel2doc/blob/main/api-sample.png" alt="API Sample" width="100%">
</div>

---

## 🧠 How It Works

1. **Scans** Laravel models for relationships and attributes
2. **Parses** migrations to reconstruct DB schema
3. **Analyzes** controllers and route files
4. **Generates** Mermaid-based diagrams and structured API docs
5. **Serves** everything via a local web interface

---

## 🛠 Requirements

* Node.js 14+
* Laravel 8+ project

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit a pull request or feature request.

---

## 👨‍💻 Author

Created by [@priom7](https://github.com/priom7)
Md Sharif Alam

---

> 🌟 Found it useful? Give it a ⭐ on GitHub and share with Laravel developers!


