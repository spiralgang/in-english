const dotenv = require('dotenv');
dotenv.config();
const port = process.env.PORT;

async function main() {
  try {
    console.log(`Server running on port ${port}`);
    console.log("hello world");
  } catch (error) {
    console.error('Error:', error);
  }
}

main();