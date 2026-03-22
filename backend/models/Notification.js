const { getCollection, ObjectId } = require('../config/database');

class Notification {
  static collection() {
    return getCollection('notifications');
  }

  static async create(data) {
    const collection = this.collection();
    const userId = data.user_id;
    const doc = {
      user_id: typeof userId === 'string' ? new ObjectId(userId) : userId,
      title: data.title,
      body: data.body || '',
      type: data.type || 'general',
      link: data.link != null ? data.link : null,
      meta: data.meta != null ? data.meta : null,
      read: false,
      read_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const result = await collection.insertOne(doc);
    return result.insertedId;
  }

  static async findForUser(userId, options = {}) {
    const collection = this.collection();
    const oid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const limit = Math.min(parseInt(options.limit, 10) || 30, 100);
    const skip = parseInt(options.skip, 10) || 0;
    const query = { user_id: oid };
    if (options.unreadOnly === true || options.unreadOnly === 'true') {
      query.read = false;
    }
    return await collection.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
  }

  static async countUnread(userId) {
    const collection = this.collection();
    const oid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return await collection.countDocuments({ user_id: oid, read: false });
  }

  static async markRead(userId, notificationId) {
    const collection = this.collection();
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const nid = typeof notificationId === 'string' ? new ObjectId(notificationId) : notificationId;
    const now = new Date();
    const result = await collection.updateOne(
      { _id: nid, user_id: uid },
      { $set: { read: true, read_at: now, updated_at: now } }
    );
    return result.modifiedCount > 0;
  }

  static async markAllRead(userId) {
    const collection = this.collection();
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const now = new Date();
    const result = await collection.updateMany(
      { user_id: uid, read: false },
      { $set: { read: true, read_at: now, updated_at: now } }
    );
    return result.modifiedCount;
  }

  static async findById(id) {
    const collection = this.collection();
    const oid = typeof id === 'string' ? new ObjectId(id) : id;
    return await collection.findOne({ _id: oid });
  }
}

module.exports = Notification;
