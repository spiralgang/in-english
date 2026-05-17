const express = require('express');
const app = express();
const port = process.env.PORT;

app.get('/', (req, res) => {
  try {
    res.send('hello world');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error');
  }
});

app.listen(port, () => {
  try {
    console.log(`Server listening on port ${port}`);
  } catch (error) {
    console.error('Error:', error);
  }
});