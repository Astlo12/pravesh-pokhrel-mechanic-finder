const ChatMessage = require('../models/ChatMessage');
const { getCollection, ObjectId } = require('../config/database');

jest.mock('../config/database', () => {
  const mockObjectId = jest.fn((id) => ({ mockedObjectId: id }));

  return {
    getCollection: jest.fn(),
    ObjectId: mockObjectId
  };
});

describe('ChatMessage Model', () => {
  let mockCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      insertOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn()
    };

    getCollection.mockReturnValue(mockCollection);
  });

  describe('collection', () => {
    it('should return booking_chat_messages collection', () => {
      ChatMessage.collection();
      expect(getCollection).toHaveBeenCalledWith('booking_chat_messages');
    });
  });

  describe('create', () => {
    it('should create a chat message with trimmed body', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'msg123'
      });

      const result = await ChatMessage.create({
        booking_id: 'booking1',
        sender_user_id: 'user1',
        sender_role: 'mechanic',
        body: '   Hello customer   '
      });

      expect(ObjectId).toHaveBeenCalledWith('booking1');
      expect(ObjectId).toHaveBeenCalledWith('user1');
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];

      expect(insertedDoc).toMatchObject({
        booking_id: { mockedObjectId: 'booking1' },
        sender_user_id: { mockedObjectId: 'user1' },
        sender_role: 'mechanic',
        body: 'Hello customer'
      });

      expect(insertedDoc.created_at).toBeInstanceOf(Date);

      expect(result).toMatchObject({
        _id: 'msg123',
        booking_id: { mockedObjectId: 'booking1' },
        sender_user_id: { mockedObjectId: 'user1' },
        sender_role: 'mechanic',
        body: 'Hello customer'
      });

      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should default sender_role to customer when role is not mechanic', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'msg124'
      });

      const result = await ChatMessage.create({
        booking_id: 'booking2',
        sender_user_id: 'user2',
        sender_role: 'admin',
        body: 'Test message'
      });

      expect(result.sender_role).toBe('customer');
    });

    it('should throw error when body is empty', async () => {
      await expect(
        ChatMessage.create({
          booking_id: 'booking1',
          sender_user_id: 'user1',
          sender_role: 'customer',
          body: '   '
        })
      ).rejects.toThrow('Message body is required');

      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should throw error when body is missing', async () => {
      await expect(
        ChatMessage.create({
          booking_id: 'booking1',
          sender_user_id: 'user1',
          sender_role: 'customer'
        })
      ).rejects.toThrow('Message body is required');

      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should throw error when body exceeds max length', async () => {
      const longText = 'a'.repeat(2001);

      await expect(
        ChatMessage.create({
          booking_id: 'booking1',
          sender_user_id: 'user1',
          sender_role: 'customer',
          body: longText
        })
      ).rejects.toThrow('Message too long (max 2000 characters)');

      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should accept object ids without converting', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'msg125'
      });

      const bookingObjId = { custom: 'bookingObjId' };
      const userObjId = { custom: 'userObjId' };

      const result = await ChatMessage.create({
        booking_id: bookingObjId,
        sender_user_id: userObjId,
        sender_role: 'customer',
        body: 'Hi there'
      });

      expect(ObjectId).not.toHaveBeenCalled();
      expect(result.booking_id).toEqual(bookingObjId);
      expect(result.sender_user_id).toEqual(userObjId);
    });
  });

  describe('findByBookingId', () => {
    it('should find messages by booking id with ascending created_at sort', async () => {
      const messages = [
        { _id: '1', body: 'First' },
        { _id: '2', body: 'Second' }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(messages);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      const result = await ChatMessage.findByBookingId('booking123');

      expect(ObjectId).toHaveBeenCalledWith('booking123');
      expect(mockCollection.find).toHaveBeenCalledWith({
        booking_id: { mockedObjectId: 'booking123' }
      });
      expect(sortMock).toHaveBeenCalledWith({ created_at: 1 });
      expect(limitMock).toHaveBeenCalledWith(200);
      expect(result).toEqual(messages);
    });

    it('should use provided limit when valid', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      await ChatMessage.findByBookingId('booking123', { limit: 50 });

      expect(limitMock).toHaveBeenCalledWith(50);
    });

    it('should clamp limit to maximum 500', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      await ChatMessage.findByBookingId('booking123', { limit: 999 });

      expect(limitMock).toHaveBeenCalledWith(500);
    });

    it('should default to 200 when limit is 0', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      await ChatMessage.findByBookingId('booking123', { limit: 0 });

      expect(limitMock).toHaveBeenCalledWith(200);
    });

    it('should default to 200 when limit is invalid', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      await ChatMessage.findByBookingId('booking123', { limit: 'abc' });

      expect(limitMock).toHaveBeenCalledWith(200);
    });
  });

  describe('countUnreadAfter', () => {
    it('should count unread messages after given date excluding own messages', async () => {
      const lastRead = new Date('2026-04-10T10:00:00.000Z');
      mockCollection.countDocuments.mockResolvedValue(4);

      const result = await ChatMessage.countUnreadAfter(
        'booking1',
        'user1',
        lastRead
      );

      expect(ObjectId).toHaveBeenCalledWith('booking1');
      expect(ObjectId).toHaveBeenCalledWith('user1');
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({
        booking_id: { mockedObjectId: 'booking1' },
        sender_user_id: { $ne: { mockedObjectId: 'user1' } },
        created_at: { $gt: lastRead }
      });
      expect(result).toBe(4);
    });

    it('should use epoch date when lastRead is invalid', async () => {
      mockCollection.countDocuments.mockResolvedValue(2);

      await ChatMessage.countUnreadAfter('booking1', 'user1', 'invalid-date');

      const query = mockCollection.countDocuments.mock.calls[0][0];

      expect(query.booking_id).toEqual({ mockedObjectId: 'booking1' });
      expect(query.sender_user_id).toEqual({
        $ne: { mockedObjectId: 'user1' }
      });
      expect(query.created_at.$gt).toBeInstanceOf(Date);
      expect(query.created_at.$gt.getTime()).toBe(0);
    });

    it('should use epoch date when lastRead is an invalid Date object', async () => {
      mockCollection.countDocuments.mockResolvedValue(1);

      await ChatMessage.countUnreadAfter(
        'booking1',
        'user1',
        new Date('invalid')
      );

      const query = mockCollection.countDocuments.mock.calls[0][0];
      expect(query.created_at.$gt.getTime()).toBe(0);
    });

    it('should not convert ids when object ids are already provided', async () => {
      mockCollection.countDocuments.mockResolvedValue(3);

      const bookingObjId = { booking: 'obj' };
      const userObjId = { user: 'obj' };
      const lastRead = new Date('2026-04-10T10:00:00.000Z');

      await ChatMessage.countUnreadAfter(bookingObjId, userObjId, lastRead);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({
        booking_id: bookingObjId,
        sender_user_id: { $ne: userObjId },
        created_at: { $gt: lastRead }
      });
    });
  });
});