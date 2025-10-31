// No need for ObjectId since we're using string IDs (cognitoUserId)
const { connectToDatabase } = require("../utils/mongodb");
const { COLLECTION_NAME } = require("../models/user.model");

/**
 * User Service - Handles business logic for user-related operations
 */
class UserService {
  /**
   * Create a new user
   * @param {Object} userData - User data to save
   * @returns {Promise<Object>} Created user object
   */
  async createUser(userData) {
    const db = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // Check if cognitoUserId exists
    if (!userData.cognitoUserId) {
      throw new Error("cognitoUserId is required");
    }

    // Set timestamps
    userData.createdAt = new Date();
    userData.updatedAt = new Date();

    // Simply check if user already exists with cognitoUserId as _id
    const existingUser = await collection.findOne({
      _id: userData.cognitoUserId,
    });

    if (existingUser) {
      // If user exists, update information
      return this.updateUserByCognitoId(userData.cognitoUserId, userData);
    }

    // If user does not exist, create new using cognitoUserId as _id
    // We don't need to keep a separate cognitoUserId field since it's the same as _id
    const { cognitoUserId, ...restUserData } = userData;

    const result = await collection.insertOne({
      _id: cognitoUserId,
      ...restUserData,
      serie_subcribe: [],
    });

    if (!result.acknowledged) {
      throw new Error("Failed to create user");
    }

    return {
      _id: cognitoUserId,
      ...restUserData,
      serie_subcribe: [],
    };
  }

  /**
   * Get user by database ID
   * @param {string} userId - Database user ID (which should be cognitoUserId)
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async getUserById(userId) {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // Since we're using cognitoUserId as _id, we don't need ObjectId conversion
      return await collection.findOne({ _id: userId });
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  /**
   * Get user by Cognito user ID
   * @param {string} cognitoUserId - Cognito user ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async getUserByCognitoId(cognitoUserId) {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // Since cognitoUserId is now the document _id, we can query by _id directly
      return await collection.findOne({ _id: cognitoUserId });
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  /**
   * Update user information by database ID
   * @param {string} userId - Database user ID (which should be cognitoUserId)
   * @param {Object} userData - User data to update
   * @returns {Promise<Object|null>} Updated user object or null
   */
  async updateUser(userId, userData) {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // Don't allow updating these fields directly
      delete userData._id;
      delete userData.cognitoUserId; // Protect the Cognito ID link
      delete userData.createdAt;

      // Update the timestamp
      userData.updatedAt = new Date();

      const result = await collection.findOneAndUpdate(
        { _id: userId }, // No need for ObjectId since we're using cognitoUserId as _id
        { $set: userData },
        { returnDocument: "after" }
      );

      return result;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  /**
   * Update user information by Cognito user ID
   * @param {string} cognitoUserId - Cognito user ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object|null>} Updated user object or null
   */
  async updateUserByCognitoId(cognitoUserId, userData) {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // Don't allow updating these fields directly
      delete userData._id; // _id can't be updated
      delete userData.createdAt; // don't allow changing creation date

      // Update the timestamp
      userData.updatedAt = new Date();

      // Update or insert user document with cognitoUserId as _id
      const result = await collection.findOneAndUpdate(
        { _id: cognitoUserId },
        { $set: userData },
        { returnDocument: "after", upsert: true }
      );

      return result;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }
}

module.exports = new UserService();
