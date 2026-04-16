const ChatReadState = require('../models/ChatReadState');
const { getCollection, ObjectId } = require('../config/database');

jest.mock('../config/database', () => {
  const mockObjectId = jest.fn((id) => ({ mockedObjectId: id }));

  return {
    getCollection: jest.fn(),
    ObjectId: mockObjectId
  };
});

describe('ChatReadState Model', () => {
  let mockCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      updateOne: jest.fn(),
      findOne: jest.fn()
    };

    getCollection.mockReturnValue(mockCollection);
  });

  describe('collection', () => {
    it('should return booking_chat_read_state collection', () => {
      ChatReadState.collection();
      expect(getCollection).toHaveBeenCalledWith('booking_chat_read_state');
    });
  });

  describe('upsertRead', () => {
    it('should upsert read state using string ids converted to ObjectId', async () => {
      mockCollection.updateOne.mockResolvedValue({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0
      });

      await ChatReadState.upsertRead('user123', 'booking123');

      expect(ObjectId).toHaveBeenCalledWith('user123');
      expect(ObjectId).toHaveBeenCalledWith('booking123');
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);

      const [filter, updateDoc, options] = mockCollection.updateOne.mock.calls[0];

      expect(filter).toEqual({
        user_id: { mockedObjectId: 'user123' },
        booking_id: { mockedObjectId: 'booking123' }
      });

      expect(updateDoc.$set.user_id).toBeUndefined();
      expect(updateDoc.$setOnInsert).toMatchObject({
        user_id: { mockedObjectId: 'user123' },
        booking_id: { mockedObjectId: 'booking123' }
      });

      expect(updateDoc.$set.last_read_at).toBeInstanceOf(Date);
      expect(updateDoc.$set.updated_at).toBeInstanceOf(Date);
      expect(updateDoc.$setOnInsert.created_at).toBeInstanceOf(Date);

      expect(options).toEqual({ upsert: true });
    });

    it('should use provided object ids without converting', async () => {
      mockCollection.updateOne.mockResolvedValue({
        acknowledged: true
      });

      const userObjId = { custom: 'userObjId' };
      const bookingObjId = { custom: 'bookingObjId' };

      await ChatReadState.upsertRead(userObjId, bookingObjId);

      expect(ObjectId).not.toHaveBeenCalled();

      const [filter, updateDoc, options] = mockCollection.updateOne.mock.calls[0];

      expect(filter).toEqual({
        user_id: userObjId,
        booking_id: bookingObjId
      });

      expect(updateDoc.$setOnInsert).toMatchObject({
        user_id: userObjId,
        booking_id: bookingObjId
      });

      expect(options).toEqual({ upsert: true });
    });
  });

  describe('getLastRead', () => {
    it('should return last_read_at when document exists', async () => {
      const mockDate = new Date('2026-04-11T10:00:00.000Z');

      mockCollection.findOne.mockResolvedValue({
        user_id: { mockedObjectId: 'user123' },
        booking_id: { mockedObjectId: 'booking123' },
        last_read_at: mockDate
      });

      const result = await ChatReadState.getLastRead('user123', 'booking123');

      expect(ObjectId).toHaveBeenCalledWith('user123');
      expect(ObjectId).toHaveBeenCalledWith('booking123');
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        user_id: { mockedObjectId: 'user123' },
        booking_id: { mockedObjectId: 'booking123' }
      });
      expect(result).toEqual(mockDate);
    });

    it('should return null when document does not exist', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await ChatReadState.getLastRead('user123', 'booking123');

      expect(result).toBeNull();
    });

    it('should return null when last_read_at does not exist', async () => {
      mockCollection.findOne.mockResolvedValue({
        user_id: { mockedObjectId: 'user123' },
        booking_id: { mockedObjectId: 'booking123' }
      });

      const result = await ChatReadState.getLastRead('user123', 'booking123');

      expect(result).toBeNull();
    });

    it('should use provided object ids without converting', async () => {
      const userObjId = { custom: 'userObjId' };
      const bookingObjId = { custom: 'bookingObjId' };
      const mockDate = new Date('2026-04-11T12:00:00.000Z');

      mockCollection.findOne.mockResolvedValue({
        user_id: userObjId,
        booking_id: bookingObjId,
        last_read_at: mockDate
      });

      const result = await ChatReadState.getLastRead(userObjId, bookingObjId);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        user_id: userObjId,
        booking_id: bookingObjId
      });
      expect(result).toEqual(mockDate);
    });
  });
});