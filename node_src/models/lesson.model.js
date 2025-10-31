const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "lessons";

const lessonSchema = {
  lesson_title: { type: String, required: true, trim: true },
  lesson_video: { type: String, trim: true },
  lesson_documents: { type: [String], default: [] },
  lesson_description: { type: String, default: "" },

  lesson_serie: { type: ObjectId, ref: "series" },

  isPublish: { type: Boolean, default: false },

  createdAt: { type: Date, default: new Date() },
  updatedAt: { type: Date, default: new Date() },
};

module.exports = {
  lessonSchema,
  COLLECTION_NAME,
};
