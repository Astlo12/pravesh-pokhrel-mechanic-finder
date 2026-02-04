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

