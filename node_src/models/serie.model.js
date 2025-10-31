/**
 * @swagger
 * components:
 *   schemas:
 *     Serie:
 *       type: object
 *       required:
 *         - serie_title
 *         - serie_category
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId of the serie
 *         serie_title:
 *           type: string
 *           description: Title of the serie
 *         serie_thumbnail:
 *           type: string
 *           description: Thumbnail URL of the serie
 *         serie_description:
 *           type: string
 *           description: Description of the serie
 *         serie_category:
 *           type: string
 *           description: Category of the serie
 *         serie_user:
 *           type: string
 *           description: User ID who created the serie
 *         isPublish:
 *           type: boolean
 *           description: Whether the serie is published
 *         serie_lessons:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of lesson IDs belonging to this serie
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         _id: 66502c7f9ab9c3aa6ed8e591
 *         serie_title: JavaScript for Beginners
 *         serie_thumb: https://example.com/thumb.jpg
 *         serie_description: A comprehensive guide to learn JS
 *         serie_category: Programming
 *         serie_user: 66502c4b9ab9c3aa6ed8e123
 *         isPublish: true
 *         createdAt: 2025-05-18T08:00:00Z
 *         updatedAt: 2025-05-18T08:05:00Z
 */
const { ObjectId } = require("mongodb");
const COLLECTION_NAME = "series";

const serieSchema = {
  serie_title: { type: String, required: true, trim: true },
  serie_thumbnail: { type: String, trim: true }, // không bắt buộc
  serie_description: { type: String },
  serie_category: { type: String, required: true },
  serie_user: { type: String, ref: "users" },

  serie_lessons: { type: [ObjectId], default: [] },
  isPublish: { type: Boolean, default: false },
  createdAt: { type: Date, default: new Date() },
  updatedAt: { type: Date, default: new Date() },
};

module.exports = {
  serieSchema,
  COLLECTION_NAME,
};
