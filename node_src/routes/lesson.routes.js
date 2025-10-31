/**
 * @swagger
 * tags:
 *   name: Lessons
 *   description: Lesson management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Lesson:
 *       type: object
 *       required:
 *         - lesson_title
 *         - lesson_serie
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique ID of the lesson
 *         lesson_title:
 *           type: string
 *           description: Title of the lesson
 *         lesson_description:
 *           type: string
 *           description: Description of the lesson
 *         lesson_serie:
 *           type: string
 *           description: ID of the series the lesson belongs to
 *         lesson_video:
 *           type: string
 *           description: URL or path to lesson video
 *         lesson_documents:
 *           type: array
 *           items:
 *             type: string
 *           description: List of URLs or paths to supporting documents
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 */

/**
 * @swagger
 * /api/series/{seriesId}/lessons/:
 *   post:
 *     summary: Create a new lesson in a series
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seriesId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the series that the lesson belongs to
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               lesson_title:
 *                 type: string
 *                 description: Title of the lesson
 *               lesson_description:
 *                 type: string
 *                 description: Description of the lesson content
 *               lesson_video:
 *                 type: string
 *                 format: binary
 *                 description: Video file for the lesson
 *               lesson_documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Supporting document files for the lesson
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/series/{seriesId}/lessons/:
 *   get:
 *     summary: Get all lessons in a series
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seriesId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the series
 *     responses:
 *       200:
 *         description: List of lessons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lesson'
 */

/**
 * @swagger
 * /api/series/{seriesId}/lessons/{lessonId}:
 *   get:
 *     summary: Get a lesson by ID within a series
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seriesId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the series
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Lesson data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /api/series/{seriesId}/lessons/{lessonId}:
 *   patch:
 *     summary: Partially update a lesson by ID within a series (including optional file upload)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seriesId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the series
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               lesson_title:
 *                 type: string
 *               lesson_description:
 *                 type: string
 *               lesson_video:
 *                 type: string
 *                 format: binary
 *               lesson_documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /api/series/{seriesId}/lessons/{lessonId}:
 *   delete:
 *     summary: Delete a lesson by ID within a series
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seriesId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the series
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /api/series/{seriesId}/lessons/{lessonId}/documents:
 *   delete:
 *     summary: Delete a document from a lesson by its URL
 *     description: Removes a specific document from a lesson's documents by its URL. Requires authentication.
 *     tags:
 *       - Lessons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seriesId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the series
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the lesson
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               docUrl:
 *                 type: string
 *                 description: The URL of the document to delete
 *             required:
 *               - docUrl
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (e.g., document not found)
 *       401:
 *         description: Unauthorized (no or invalid token)
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */

const express = require("express");
const multer = require("multer");
const router = express.Router({ mergeParams: true });
const lessonController = require("../controllers/lesson.controller");
const { authenticateJWT } = require("../middlewares/auth.middleware");

const upload = multer(); // in-memory

// Create lesson (upload 2 files: video, document)
router.post(
  "/",
  authenticateJWT,
  upload.fields([
    { name: "lesson_video", maxCount: 1 },
    { name: "lesson_documents", maxCount: 10 },
  ]),
  lessonController.createLesson
);

// Update lesson by ID
router.patch(
  "/:lessonId",
  authenticateJWT,
  upload.fields([
    { name: "lesson_video", maxCount: 1 },
    { name: "lesson_documents", maxCount: 10 },
  ]),
  lessonController.updateLesson
);

// Get all lessons
router.get("/", authenticateJWT, lessonController.getAllLessons);

// Get lesson by ID
router.get("/:lessonId", authenticateJWT, lessonController.getLessonById);

// Delete lesson by ID
router.delete("/:lessonId", authenticateJWT, lessonController.deleteLesson);

// Delete lesson by ID
router.delete(
  "/:lessonId/documents",
  authenticateJWT,
  lessonController.deleteDocumentByUrl
);

module.exports = router;
