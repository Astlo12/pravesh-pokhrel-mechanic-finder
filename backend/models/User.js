const { getCollection, ObjectId } = require('../config/database');

class User {
  static collection() {
    return getCollection('users');
  }

  static async create(userData) {
    const collection = this.collection();
    const result = await collection.insertOne({
      ...userData,
      created_at: new Date(),
      updated_at: new Date()
    });
    return result.insertedId;
  }

  static async findByEmail(email) {
    const collection = this.collection();
    return await collection.findOne({ email });
  }

  static async findById(id) {
    const collection = this.collection();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await collection.findOne({ _id: objectId });
  }

  static async update(id, updateData) {
    const collection = this.collection();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await collection.updateOne(
      { _id: objectId },
      { $set: { ...updateData, updated_at: new Date() } }
    );
  }
}

module.exports = User;

