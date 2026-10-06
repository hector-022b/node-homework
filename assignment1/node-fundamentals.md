# Node.js Fundamentals

## What is Node.js?

Node.js is a runtime environment that lets JavaScript run outside of a web browser. It allows JavaScript to be used on a computer or server to do things like work with files, create servers, and build backend applications.

## How does Node.js differ from running JavaScript in the browser?

JavaScript in the browser works to interact with web pages, such as changing the DOM or responding to user actions. While Node.js runs JavaScript outside the browser, so it can work with files, servers, environment variables, and other backend tools that browser JavaScript normally cannot access.

## What is the V8 engine, and how does Node use it?

V8 is the JavaScript engine originally built for Chrome. Node uses that same engine outside the browser to read and run JavaScript, while adding extra abilities like file and network access.

## What are some key use cases for Node.js?

Some key use cases for Node.js are building web APIs and servers, creating command-line tools, making real-time apps like chat applications, and creating scripts or build tools to automate tasks.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

CommonJS and ES Modules are two different ways to import and export code between files. CommonJS uses require() to import code and module.exports to export it. ES Modules use import and export.

**CommonJS (default in Node.js):**

```js
const { add } = require("./mathUtils");

module.exports = { add };
```

**ES Modules (supported in modern Node.js):**

```js
import { add } from "./mathUtils.js";

export { add };
```
