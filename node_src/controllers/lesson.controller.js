const lessonService = require("../services/lesson.service");

class LessonController {
  // [POST] /lessons
  async createLesson(req, res) {
    try {
      const data = req.body;
      const files = req.files || {};
      const userId = req.user?.userId;
      const idToken = req.user?.idToken; // files: { video: [...], document: [...] }
      const { seriesId } = req.params;
      data.lesson_serie = seriesId;
      // Lấy file đầu tiên trong mỗi mảng nếu có (vì multer fields trả về mảng)
      const formattedFiles = {
        video: files.lesson_video ? files.lesson_video[0] : null,
        document: files.lesson_documents || [],
      };

      const newLesson = await lessonService.createLesson(
        { ...data },
        userId,
        idToken,
        formattedFiles
      );
      return res.status(201).json(newLesson);
    } catch (err) {
      console.error("Error in createLesson:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // [GET] /lessons
  async getAllLessons(req, res) {
    try {
      const { seriesId } = req.params;
      const lessons = await lessonService.getAllLessonsBySerie(seriesId);
      return res.status(200).json(lessons);
    } catch (err) {
      console.error("Error in getAllLessons:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // [GET] /lessons/:id
  async getLessonById(req, res) {
    try {
      const { seriesId, lessonId } = req.params;
      const lesson = await lessonService.getLessonById(seriesId, lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      return res.status(200).json(lesson);
    } catch (err) {
      console.error("Error in getLessonById:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // [PUT] /lessons/:id
  async updateLesson(req, res) {
    try {
      const { seriesId, lessonId } = req.params;
      const data = req.body;
      const files = req.files;
      const userId = req.user?.userId;
      const idToken = req.user?.idToken;
      const updated = await lessonService.updateLesson(
        seriesId,
        lessonId,
        data,
        userId,
        idToken,
        files
      );

      if (!updated) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      return res.status(200).json(updated);
    } catch (err) {
      console.error("Error in updateLesson:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // [DELETE] /lessons/:id
  async deleteLesson(req, res) {
    try {
      const { seriesId, lessonId } = req.params;
      const deleted = await lessonService.deleteLesson(seriesId, lessonId);
      if (!deleted) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      return res.status(200).json({ message: "Lesson deleted successfully" });
    } catch (err) {
      console.error("Error in deleteLesson:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async deleteDocumentByUrl(req, res) {
    try {
      const { seriesId, lessonId } = req.params;
      const { docUrl } = req.body;
      if (!docUrl) {
        return res.status(400).json({ message: "docUrl is required" });
      }
      await lessonService.deleteDocumentByUrl(seriesId, lessonId, docUrl);
      return res.status(200).json({ message: "Document deleted successfully" });
    } catch (err) {
      if (err.message === "Lesson không tồn tại.") {
        return res.status(404).json({ message: "Lesson not found" });
      }
      if (err.message === "Document URL không tồn tại trong lesson.") {
        return res
          .status(400)
          .json({ message: "Document not found in lesson" });
      }
      console.error("Error in deleteDocumentByUrl:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

module.exports = new LessonController();
