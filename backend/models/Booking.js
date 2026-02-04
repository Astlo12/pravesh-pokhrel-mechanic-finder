const { getCollection, ObjectId } = require('../config/database');

class Booking {
  static collection() {
    return getCollection('bookings');
  }

  static async create(bookingData) {
    const collection = this.collection();
    const result = await collection.insertOne({
      ...bookingData,
      // Store customer location explicitly
      customer_latitude: bookingData.latitude,
      customer_longitude: bookingData.longitude,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });
    return result.insertedId;
  }

  static async findById(id) {
    const collection = this.collection();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await collection.findOne({ _id: objectId });
  }

  static async findByCustomerId(customerId) {
    const collection = this.collection();
    const objectId = typeof customerId === 'string' ? new ObjectId(customerId) : customerId;
    return await collection.find({ customer_id: objectId })
      .sort({ created_at: -1 })
      .toArray();
  }

  static async findByMechanicId(mechanicId) {
    const collection = this.collection();
    const objectId = typeof mechanicId === 'string' ? new ObjectId(mechanicId) : mechanicId;
    return await collection.find({ mechanic_id: objectId })
      .sort({ created_at: -1 })
      .toArray();
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

module.exports = Booking;

