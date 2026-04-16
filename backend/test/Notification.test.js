const Notification = require('../models/Notification');
const { getCollection, ObjectId } = require('../config/database');

jest.mock('../config/database', () => {
  const mockObjectId = jest.fn((id) => ({ mockedObjectId: id }));

  return {
    getCollection: jest.fn(),
    ObjectId: mockObjectId
  };
});

describe('Notification Model', () => {
  let mockCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      insertOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
      findOne: jest.fn()
    };

    getCollection.mockReturnValue(mockCollection);
  });

  describe('collection', () => {
    it('should return notifications collection', () => {
      Notification.collection();
      expect(getCollection).toHaveBeenCalledWith('notifications');
    });
  });

  describe('create', () => {
    it('should create notification with default values', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'notif123'
      });

      const result = await Notification.create({
        user_id: 'user123',
        title: 'New Booking',
        body: 'You have a new booking request'
      });

      expect(ObjectId).toHaveBeenCalledWith('user123');

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];

      expect(insertedDoc).toMatchObject({
        user_id: { mockedObjectId: 'user123' },
        title: 'New Booking',
        body: 'You have a new booking request',
        type: 'general',
        link: null,
        meta: null,
        read: false,
        read_at: null
      });

      expect(insertedDoc.created_at).toBeInstanceOf(Date);
      expect(insertedDoc.updated_at).toBeInstanceOf(Date);

      expect(result).toBe('notif123');
    });

    it('should accept object id without converting', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'notif124'
      });

      const userObjId = { custom: 'userObjId' };

      await Notification.create({
        user_id: userObjId,
        title: 'Test'
      });

      expect(ObjectId).not.toHaveBeenCalled();
    });
  });

  describe('findForUser', () => {
    it('should return notifications sorted by created_at desc', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      await Notification.findForUser('user123');

      expect(ObjectId).toHaveBeenCalledWith('user123');
      expect(sortMock).toHaveBeenCalledWith({ created_at: -1 });
      expect(limitMock).toHaveBeenCalledWith(30);
    });

    it('should apply unreadOnly filter', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      await Notification.findForUser('user123', { unreadOnly: true });

      expect(mockCollection.find).toHaveBeenCalledWith({
        user_id: { mockedObjectId: 'user123' },
        read: false
      });
    });

    it('should clamp limit to max 100', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      await Notification.findForUser('user123', { limit: 500 });

      expect(limitMock).toHaveBeenCalledWith(100);
    });

    it('should apply skip correctly', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      await Notification.findForUser('user123', { skip: 10 });

      expect(skipMock).toHaveBeenCalledWith(10);
    });
  });

  describe('countUnread', () => {
    it('should count unread notifications', async () => {
      mockCollection.countDocuments.mockResolvedValue(5);

      const result = await Notification.countUnread('user123');

      expect(ObjectId).toHaveBeenCalledWith('user123');
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({
        user_id: { mockedObjectId: 'user123' },
        read: false
      });
      expect(result).toBe(5);
    });
  });

  describe('markRead', () => {
    it('should mark notification as read', async () => {
      mockCollection.updateOne.mockResolvedValue({
        modifiedCount: 1
      });

      const result = await Notification.markRead('user123', 'notif123');

      expect(ObjectId).toHaveBeenCalledWith('user123');
      expect(ObjectId).toHaveBeenCalledWith('notif123');

      const [filter, updateDoc] = mockCollection.updateOne.mock.calls[0];

      expect(filter).toEqual({
        _id: { mockedObjectId: 'notif123' },
        user_id: { mockedObjectId: 'user123' }
      });

      expect(updateDoc.$set.read).toBe(true);
      expect(updateDoc.$set.read_at).toBeInstanceOf(Date);
      expect(result).toBe(true);
    });

    it('should return false if not modified', async () => {
      mockCollection.updateOne.mockResolvedValue({
        modifiedCount: 0
      });

      const result = await Notification.markRead('user123', 'notif123');

      expect(result).toBe(false);
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockCollection.updateMany.mockResolvedValue({
        modifiedCount: 3
      });

      const result = await Notification.markAllRead('user123');

      expect(ObjectId).toHaveBeenCalledWith('user123');

      const [filter, updateDoc] = mockCollection.updateMany.mock.calls[0];

      expect(filter).toEqual({
        user_id: { mockedObjectId: 'user123' },
        read: false
      });

      expect(updateDoc.$set.read).toBe(true);
      expect(result).toBe(3);
    });
  });

  describe('findById', () => {
    it('should find notification by id', async () => {
      const notif = { _id: 'notif123', title: 'Test' };
      mockCollection.findOne.mockResolvedValue(notif);

      const result = await Notification.findById('notif123');

      expect(ObjectId).toHaveBeenCalledWith('notif123');
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: { mockedObjectId: 'notif123' }
      });
      expect(result).toEqual(notif);
    });

    it('should use object id without converting', async () => {
      const notifId = { custom: 'notifObjId' };
      const notif = { _id: notifId };

      mockCollection.findOne.mockResolvedValue(notif);

      const result = await Notification.findById(notifId);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(result).toEqual(notif);
    });
  });
});