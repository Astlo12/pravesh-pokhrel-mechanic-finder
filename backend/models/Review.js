const { getCollection, ObjectId } = require('../config/database');

class Review {
  static collection() {
    return getCollection('reviews');
  }

  static async create(reviewData) {
    const collection = this.collection();
    const result = await collection.insertOne({
      ...reviewData,
      created_at: new Date(),
      updated_at: new Date()
    });
    return result.insertedId;
  }

  static async findByBookingId(bookingId) {
    const collection = this.collection();
    const oid = typeof bookingId === 'string' ? new ObjectId(bookingId) : bookingId;
    return await collection.findOne({ booking_id: oid });
  }

  /** All reviews by this customer for the given booking ObjectIds */
  static async findByCustomerForBookings(customerId, bookingObjectIds) {
    const collection = this.collection();
    const custOid = typeof customerId === 'string' ? new ObjectId(customerId) : customerId;
    if (!bookingObjectIds.length) return [];
    return await collection
      .find({
        customer_id: custOid,
        booking_id: { $in: bookingObjectIds },
      })
      .toArray();
  }

  static async findByMechanicId(mechanicId, limit = 10) {
    const collection = this.collection();
    const objectId = typeof mechanicId === 'string' ? new ObjectId(mechanicId) : mechanicId;
    return await collection.find({ mechanic_id: objectId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  static async updateMechanicRating(mechanicId) {
    const collection = this.collection();
    const objectId = typeof mechanicId === 'string' ? new ObjectId(mechanicId) : mechanicId;
    const reviews = await collection.find({ mechanic_id: objectId }).toArray();
    
    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    const Mechanic = require('./Mechanic');
    await Mechanic.update(mechanicId, {
      rating: parseFloat(averageRating.toFixed(2)),
      total_reviews: reviews.length
    });
  }
}

module.exports = Review;

