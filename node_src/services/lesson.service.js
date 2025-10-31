const { ObjectId } = require("mongodb");
const { uploadViaCloudFront, deleteViaCloudFront } = require("../utils/s3");
const { v4: uuidv4 } = require("uuid");
const { connectToDatabase } = require("../utils/mongodb");
const { publishToTopic } = require("../utils/sns");
class LessonService {
  async createLesson(data, userId, idToken, files) {
    try {
      let videoUrl = "";
      let documentUrls = [];

      if (files?.video) {
        const videoName = `${uuidv4()}_${files.video.originalname}`;
        videoUrl = await uploadViaCloudFront(
          idToken,
          files.video.buffer,
          videoName,
          files.video.mimetype,
          `files/user-${userId}/videos`
        );
      }

      // Upload nhiều document nếu có
      if (files?.document) {
        const documentsArray = Array.isArray(files.document)
          ? files.document
          : [files.document];

        for (const doc of documentsArray) {
          const docName = `${uuidv4()}_${doc.originalname}`;
          const documentUrl = await uploadViaCloudFront(
            idToken,
            doc.buffer,
            docName,
            doc.mimetype,
            `files/user-${userId}/docs`
          );
          documentUrls.push(documentUrl);
        }
      }

      const db = await connectToDatabase();
      const lessonCollection = db.collection("lessons");
      const seriesCollection = db.collection("series");
      const newLesson = {
        ...data,
        lesson_video: videoUrl,
        lesson_documents: documentUrls,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await lessonCollection.insertOne(newLesson);

      // Lấy id lesson vừa tạo
      const lessonId = result.insertedId;

      await seriesCollection.updateOne(
        { _id: new ObjectId(data.lesson_serie) },
        { $push: { serie_lessons: lessonId } }
      );
      const serie = await seriesCollection.findOne({
        _id: new ObjectId(data.lesson_serie),
      });
      const customMessage = `Bài học mới "${newLesson.lesson_title}" đã được thêm vào series "${serie.serie_title}". Truy cập ngay để xem nội dung!`;

      if (serie?.serie_sns) {
        await publishToTopic(
          serie.serie_sns,
          `New Lesson in "${serie.serie_title}"`,
          customMessage
        );
      }

      return { _id: result.insertedId, ...newLesson };
    } catch (err) {
      console.error("Error in createLesson:", err);
      throw err;
    }
  }

  async getAllLessonsBySerie(seriesId) {
    try {
      const db = await connectToDatabase();
      const lessonCollection = db.collection("lessons");

      const query = { lesson_serie: seriesId }; // Chỉ lọc theo lesson_serie
      return await lessonCollection.find(query).toArray();
    } catch (err) {
      console.error("Error in getAllLessonsBySerie:", err);
      throw err;
    }
  }

  async getLessonById(seriesId, lessonId) {
    try {
      const db = await connectToDatabase();
      const lessonCollection = db.collection("lessons");

      return await lessonCollection.findOne({
        _id: new ObjectId(lessonId),
        lesson_serie: seriesId,
      });
    } catch (err) {
      console.error("Error in getLessonById:", err);
      throw err;
    }
  }

  async updateLesson(seriesId, lessonId, data, userId, idToken, files) {
    try {
      const db = await connectToDatabase();
      const lessonCollection = db.collection("lessons");
      data.updatedAt = new Date();

      const currentLesson = await lessonCollection.findOne({
        _id: new ObjectId(lessonId),
      });
      if (!currentLesson) return null;

      // Xử lý video mới nếu có
      if (files?.lesson_video && files.lesson_video.length > 0) {
        // Xóa video cũ nếu có
        if (currentLesson.lesson_video) {
          await deleteViaCloudFront(currentLesson.lesson_video);
        }

        const videoFile = files.lesson_video[0];
        const videoName = `${uuidv4()}_${videoFile.originalname}`;
        const videoUrl = await uploadViaCloudFront(
          idToken,
          videoFile.buffer,
          videoName,
          videoFile.mimetype,
          `files/user-${userId}/videos`
        );

        data.lesson_video = videoUrl;
      }

      // Xử lý documents mới nếu có
      if (files?.lesson_documents && files.lesson_documents.length > 0) {
        // Xóa document cũ nếu có
        if (currentLesson.lesson_documents) {
          const docs = Array.isArray(currentLesson.lesson_documents)
            ? currentLesson.lesson_documents
            : [currentLesson.lesson_documents];
          for (const docUrl of docs) {
            await deleteViaCloudFront(docUrl);
          }
        }

        const documentUrls = [];
        for (const docFile of files.lesson_documents) {
          const docName = `${uuidv4()}_${docFile.originalname}`;
          const docUrl = await uploadViaCloudFront(
            idToken,
            docFile.buffer,
            docName,
            docFile.mimetype,
            `files/user-${userId}/docs`
          );
          documentUrls.push(docUrl);
        }

        data.lesson_documents = documentUrls;
      }

      // Cập nhật DB
      const updateResult = await lessonCollection.updateOne(
        { _id: new ObjectId(lessonId) },
        { $set: data }
      );

      if (updateResult.matchedCount === 0) return null;

      return await lessonCollection.findOne({
        _id: new ObjectId(lessonId),
      });
    } catch (err) {
      console.error("Error in updateLesson:", err);
      throw err;
    }
  }

  // async deleteDocumentByUrl(seriesId, lessonId, docUrl) {
  //   try {
  //     const db = await connectToDatabase();
  //     const lessonCollection = db.collection("lessons");

  //     const lesson = await lessonCollection.findOne({
  //       _id: new ObjectId(lessonId),
  //       lesson_serie: seriesId,
  //     });
  //     if (!lesson) {
  //       throw new Error("Lesson không tồn tại.");
  //     }

  //     let updatedDocuments;
  //     if (Array.isArray(lesson.lesson_documents)) {
  //       updatedDocuments = lesson.lesson_documents.filter(
  //         (url) => url !== docUrl
  //       );
  //       if (updatedDocuments.length === 0) {
  //         updatedDocuments = [];
  //       }
  //     } else if (lesson.lesson_documents === docUrl) {
  //       updatedDocuments = [];
  //     } else {
  //       throw new Error("Document URL không tồn tại trong lesson.");
  //     }

  //     await deleteFile(docUrl);

  //     const updateResult = await lessonCollection.updateOne(
  //       { _id: new ObjectId(lessonId), lesson_serie: seriesId },
  //       {
  //         $set: {
  //           lesson_documents: updatedDocuments,
  //           updatedAt: new Date(),
  //         },
  //       }
  //     );

  //     if (updateResult.matchedCount === 0) {
  //       throw new Error("Cập nhật lesson thất bại");
  //     }

  //     console.log("Delete document by URL success");
  //   } catch (err) {
  //     console.error("Error in deleteDocumentByUrl:", err);
  //     throw err;
  //   }
  // }

  async deleteLesson(seriesId, lessonId) {
    try {
      const db = await connectToDatabase();
      const lessonCollection = db.collection("lessons");

      // Find the lesson by both seriesId and lessonId
      const lesson = await lessonCollection.findOne({
        _id: new ObjectId(lessonId),
        lesson_serie: seriesId,
      });
      if (!lesson) {
        throw new Error("Lesson không tồn tại.");
      }

      const result = await lessonCollection.deleteOne({
        _id: new ObjectId(lessonId),
        lesson_serie: seriesId,
      });

      // Remove lessonId from serie_lessons in the series collection
      if (result.deletedCount > 0) {
        const seriesCollection = db.collection("series");
        await seriesCollection.updateOne(
          { _id: new ObjectId(seriesId) },
          { $pull: { serie_lessons: new ObjectId(lessonId) } }
        );
      }

      if (result.deletedCount > 0) {
        if (lesson.lesson_video) {
          await deleteViaCloudFront(lesson.lesson_video);
        }

        // Nếu lesson_documents là mảng (nhiều file) thì xóa từng file
        if (Array.isArray(lesson.lesson_documents)) {
          for (const docUrl of lesson.lesson_documents) {
            await deleteViaCloudFront(docUrl);
          }
        } else if (lesson.lesson_documents) {
          // Nếu chỉ có 1 document dưới dạng string
          await deleteViaCloudFront(lesson.lesson_documents);
        }
      }

      console.log("Delete Success");
      return result.deletedCount > 0;
    } catch (err) {
      console.error("Error in deleteLesson:", err);
      throw err;
    }
  }
}

module.exports = new LessonService();
