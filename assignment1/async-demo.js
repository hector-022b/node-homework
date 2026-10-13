const fs = require('fs');
const path = require('path');


// Write a sample file for demonstration
const sampleFile = path.join(__dirname, 'sample-files', 'sample.txt');

fs.writeFileSync(sampleFile, 'Hello, async world!');

// 1. Callback style
fs.readFile(sampleFile, 'utf8', (err, data) => {
  if (err) {
    console.log('Error reading file:', err.message);
    return;
  }

  console.log('Callback:', data);
});

// Callback hell example (test and leave it in comments):
/*
Callback hell happens when multiple asynchronous callbacks
are nested inside each other, making the code harder to read
and maintain.

Example:

fs.readFile(sampleFile, 'utf8', (err, data) => {
  if (err) return;

  fs.writeFile('output.txt', data, (err) => {
    if (err) return;

    fs.readFile('output.txt', 'utf8', (err, result) => {
      if (err) return;

      console.log(result);
    });
  });
});
*/


// 2. Promise style
const readFilePromise = new Promise((resolve, reject) => {
  fs.readFile(sampleFile, 'utf8', (err, data) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(data);
  });
});

readFilePromise
  .then((data) => {
    console.log('Promise:', data);
  })
  .catch((err) => {
    console.log('Error reading file:', err.message);
  });


// 3. Async/Await style
async function readFileAsync() {
  try {
    const data = await fs.promises.readFile(sampleFile, 'utf8');
    console.log('Async/Await:', data);
  } catch (err) {
    console.log('Error reading file:', err.message);
  }
}

readFileAsync();
