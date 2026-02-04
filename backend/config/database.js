const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://FindMechPrabesh:1234@findmech.utd02vz.mongodb.net/?appName=FindMech';
const DB_NAME = process.env.DB_NAME || 'findmech';

let client;
let db;

const connectDB = async () => {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      console.log('✅ MongoDB connected successfully');
    }
    
    if (!db) {
      db = client.db(DB_NAME);
    }
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
};

// Get database instance
const getDB = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
};

// Get collections
const getCollection = (collectionName) => {
  const database = getDB();
  return database.collection(collectionName);
};

module.exports = {
  connectDB,
  getDB,
  getCollection,
  ObjectId,
  client
};
