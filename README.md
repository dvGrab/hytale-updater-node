# Hytale Server Updater

The **Hytale Server Updater** is a lightweight update tool written in **Node.js / TypeScript** that allows you to keep your Hytale server up to date with a single click.

The updater automatically checks the latest available `server.zip` and compares it with your local server version.  
If your server is outdated or missing, the updater will **download and extract** the newest version directly into the path defined in your **`config.json`**.

---

## Features

- One-click server updates  
- Automatic version comparison  
- Downloads and extracts the latest server files  
- Simple configuration via `config.json`  
- Standalone executable (compiled with Deno)

---

## Download

🚧 *Coming soon*

---

## Build

To build the project from source:

- Clone the repository
- Install dependencies: **npm install**
- Run the build: **tsc**
- Execute **source/index.js** or execute **compile.bat**

## Config 
```json
{
    "server_path": "path"
}