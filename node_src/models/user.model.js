/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - cognitoUserId
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB document ID (same as cognitoUserId)
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         name:
 *           type: string
 *           description: User's name from Cognito
 *         gender:
 *           type: string
 *           description: User's gender
 *         birthdate:
 *           type: string
 *           format: date
 *           description: User's birthdate
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: User last update timestamp
 *       example:
 *         _id: f9da15cc-40d1-7044-5c3b-7fad7567ee03
 *         email: phamtatthanh22@gmail.com
 *         name: Phạm Tất Thành
 *         gender: male
 *         birthdate: 2025-05-18
 *         createdAt: 2025-05-18T10:30:00Z
 *         updatedAt: 2025-05-18T10:30:00Z
 */

const userSchema = {
  // _id will be set to cognitoUserId, so we don't need a separate cognitoUserId field
  email: { type: String, unique: true },
  name: { type: String },
  gender: { type: String },
  birthdate: { type: String },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  updatedAt: {
    type: Date,
    default: new Date(),
  },
};

module.exports = {
  userSchema,
  COLLECTION_NAME: "users",
};
