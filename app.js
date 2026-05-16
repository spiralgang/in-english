const https = require('https');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;
const sslKeyPath = process.env.SSL_KEY_PATH;
const sslCertPath = process.env.SSL_CERT_PATH;

let db;

app.use(express.json());

app.get('/api/products', async (req, res) => {
  try {
    const products = await db.collection('products').find({}).toArray();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await db
      .collection('products')
      .findOne({ _id: new MongoClient.ObjectId(productId) });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error });
  }
});

async function startServer() {
  try {
    const client = new MongoClient(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db();

    const server = https.createServer(
      {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      },
      app
    );

    server.listen(port, () => {
      console.log(`Server is running on https://localhost:${port}`);
    });
  } catch (error) {
    console.error('Server failed to start', error);
    process.exit(1);
  }
}

startServer();
