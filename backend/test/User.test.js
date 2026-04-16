const User = require('../models/User');
const { getCollection, ObjectId } = require('../config/database');

jest.mock('../config/database', () => {
  const mockObjectId = jest.fn((id) => ({ mockedObjectId: id }));

  return {
    getCollection: jest.fn(),
    ObjectId: mockObjectId
  };
});

describe('User Model', () => {
  let mockCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn()
    };

    getCollection.mockReturnValue(mockCollection);
  });

  describe('collection', () => {
    it('should return users collection', () => {
      User.collection();
      expect(getCollection).toHaveBeenCalledWith('users');
    });
  });

  describe('create', () => {
    it('should create user with timestamps', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'user123'
      });

      const userData = {
        name: 'Suraj',
        email: 'suraj@test.com',
        password: 'hashedpassword'
      };

      const result = await User.create(userData);

      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];

      expect(insertedDoc).toMatchObject({
        name: 'Suraj',
        email: 'suraj@test.com',
        password: 'hashedpassword'
      });

      expect(insertedDoc.created_at).toBeInstanceOf(Date);
      expect(insertedDoc.updated_at).toBeInstanceOf(Date);

      expect(result).toBe('user123');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = { email: 'suraj@test.com' };

      mockCollection.findOne.mockResolvedValue(user);

      const result = await User.findByEmail('suraj@test.com');

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        email: 'suraj@test.com'
      });

      expect(result).toEqual(user);
    });
  });

  describe('findById', () => {
    it('should find user by string id', async () => {
      const user = { _id: { mockedObjectId: 'user123' } };

      mockCollection.findOne.mockResolvedValue(user);

      const result = await User.findById('user123');

      expect(ObjectId).toHaveBeenCalledWith('user123');
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: { mockedObjectId: 'user123' }
      });

      expect(result).toEqual(user);
    });

    it('should find user by object id without converting', async () => {
      const userObjId = { custom: 'userObjId' };
      const user = { _id: userObjId };

      mockCollection.findOne.mockResolvedValue(user);

      const result = await User.findById(userObjId);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: userObjId
      });

      expect(result).toEqual(user);
    });
  });

  describe('update', () => {
    it('should update user and set updated_at', async () => {
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await User.update('user123', {
        name: 'Updated Name'
      });

      expect(ObjectId).toHaveBeenCalledWith('user123');

      const [filter, updateDoc] = mockCollection.updateOne.mock.calls[0];

      expect(filter).toEqual({
        _id: { mockedObjectId: 'user123' }
      });

      expect(updateDoc.$set.name).toBe('Updated Name');
      expect(updateDoc.$set.updated_at).toBeInstanceOf(Date);

      expect(result).toEqual({
        matchedCount: 1,
        modifiedCount: 1
      });
    });

    it('should use object id without converting', async () => {
      const userObjId = { custom: 'userObjId' };

      mockCollection.updateOne.mockResolvedValue({});

      await User.update(userObjId, { name: 'Test' });

      expect(ObjectId).not.toHaveBeenCalled();

      const [filter] = mockCollection.updateOne.mock.calls[0];

      expect(filter).toEqual({
        _id: userObjId
      });
    });
  });

  describe('findAdmins', () => {
    it('should return all admin users', async () => {
      const admins = [
        { name: 'Admin1', user_type: 'admin' },
        { name: 'Admin2', user_type: 'admin' }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(admins);

      mockCollection.find.mockReturnValue({
        toArray: toArrayMock
      });

      const result = await User.findAdmins();

      expect(mockCollection.find).toHaveBeenCalledWith({
        user_type: 'admin'
      });

      expect(result).toEqual(admins);
    });
  });
});