/**
 * @swagger
 * tags:
 *   name: Series
 *   description: Serie management
 */

/**
 * @swagger
 * /api/series:
 *   post:
 *     summary: Create a new serie
 *     tags: [Series]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               serie_title:
 *                 type: string
 *               serie_category:
 *                 type: string
 *               serie_description:
 *                 type: string
 *               serie_thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Serie created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/series:
 *   get:
 *     summary: Get all series
 *     tags: [Series]
 *     responses:
 *       200:
 *         description: List of series
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
 *                     $ref: '#/components/schemas/Serie'
 */
/**
 * @swagger
 * /api/series/subscribed:
 *   get:
 *     summary: Get all series subscribed by the current user
 *     tags: [Series]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of series subscribed by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Serie'
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *       500:
 *         description: Internal Server Error
 */
/**
 * @swagger
 * /api/series/created:
 *   get:
 *     summary: Get all series created by the current user
 *     tags: [Series]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's series
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Serie'
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /api/series/{id}:
 *   get:
 *     summary: Get a serie by ID
 *     tags: [Series]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Serie ID
 *     responses:
 *       200:
 *         description: Serie data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Serie'
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /api/series/search:
 *   get:
 *     summary: Search series by title
 *     tags: [Series]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         required: true
 *         description: Keyword to search in series titles
 *     responses:
 *       200:
 *         description: List of series that match the search keyword
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Serie'
 *       400:
 *         description: Missing search keyword
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /api/series/{id}:
 *   patch:
 *     summary: Partially update a serie by ID (including optional thumbnail upload)
 *     tags: [Series]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Serie ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               serie_title:
 *                 type: string
 *               serie_description:
 *                 type: string
 *               serie_category:
 *                 type: string
 *               isPublish:
 *                 type: boolean
 *               serie_thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Serie updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /api/series/{id}/subscribe:
 *   post:
 *     summary: Subscribe to a serie to receive notifications
 *     tags: [Series]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Serie ID to subscribe to
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully subscribed to serie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 result:
 *                   type: object
 *       400:
 *         description: Missing or invalid user information
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /api/series/{id}/unsubscribe:
 *   post:
 *     summary: Unsubscribe from a serie
 *     tags: [Series]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Serie ID to unsubscribe from
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully unsubscribed from the serie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Missing or invalid user information
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /api/series/{id}:
 *   delete:
 *     summary: Delete a serie by ID
 *     tags: [Series]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Serie ID
 *     responses:
 *       200:
 *         description: Serie deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */

const express = require("express");
const multer = require("multer");
const router = express.Router();

const serieController = require("../controllers/serie.controller");
const { authenticateJWT } = require("../middlewares/auth.middleware"); // JWT authentication middleware
const lessonRoutes = require("./lesson.routes");
// Configure multer for file upload handling (using memory storage)
const upload = multer();

// Routes

router.post(
  "/",
  authenticateJWT,
  upload.single("serie_thumbnail"),
  serieController.createSerie
);
router.patch(
  "/:id",
  authenticateJWT,
  upload.single("serie_thumbnail"),
  serieController.updateSerie
);

router.post("/:id/subscribe", authenticateJWT, serieController.subscribeSerie);
router.post(
  "/:id/unsubscribe",
  authenticateJWT,
  serieController.unsubscribeSerie
);

router.delete("/:id", authenticateJWT, serieController.deleteSerie);

// Get all series (with optional query filters)
router.get("/", serieController.getAllSeries);

//Get series subcribe
router.get("/subscribed", authenticateJWT, serieController.getSerieSubcribe);
// Get all series of a user
router.get("/created", authenticateJWT, serieController.getAllSeriesByUser);

// Search series by title
router.get("/search", serieController.searchSeriesByTitle);

// Get serie by ID
router.get("/:id", serieController.getSerieById);

router.use("/:seriesId/lessons", lessonRoutes);
module.exports = router;
