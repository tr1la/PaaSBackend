const { ObjectId } = require("mongodb");
const { uploadViaCloudFront, deleteViaCloudFront } = require("../utils/s3");
const { v4: uuidv4 } = require("uuid");
const { connectToDatabase } = require("../utils/mongodb");
const {
  createTopic,
  deleteTopic,
  subscribeToSerie,
  unsubscribeFromTopic,
} = require("../utils/sns");
class SerieService {
  async createSerie(data, userId, idToken, file) {
    try {
      //S3 upload
      let imageUrl = "";
      if (file) {
        const uniqueName = `${uuidv4()}_${file.originalname}`;
        imageUrl = await uploadViaCloudFront(
          idToken,
          file.buffer,
          uniqueName,
          file.mimetype,
          `files/user-${userId}/thumbnail`
        );
      }

      const db = await connectToDatabase();
      const serieCollection = db.collection("series");

      const newSerie = {
        ...data,
        serie_thumbnail: imageUrl,
        isPublish: data.isPublish ?? false,
        serie_user: userId,
        serie_lessons: data.serie_lessons ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
        serie_subcribe_num: 0,
      };

      const result = await serieCollection.insertOne(newSerie);

      const insertedSerieId = result.insertedId.toString();
      //SNS Topic create
      const topicArn = await createTopic(`serie_${insertedSerieId}`);

      // 👉 Cập nhật document series để lưu ARN
      await serieCollection.updateOne(
        { _id: result.insertedId },
        { $set: { serie_sns: topicArn } }
      );

      return { _id: result.insertedId, ...newSerie, serie_sns: topicArn };
    } catch (err) {
      console.error("Error in createSerie:", err);
      throw err;
    }
  }

  async searchSeriesByTitle(keyword) {
    try {
      const db = await connectToDatabase();
      const serieCollection = db.collection("series");

      const query = {
        $text: { $search: keyword },
        isPublish: true,
      };

      // Tùy chọn: sắp xếp theo độ phù hợp
      const projection = {
        score: { $meta: "textScore" },
      };

      const results = await serieCollection
        .find(query, { projection })
        .sort({ score: { $meta: "textScore" } }) // Sắp xếp theo độ phù hợp
        .toArray();

      return results;
    } catch (err) {
      console.error("Error in searchSeriesByTitle:", err);
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
  async getAllSeries(query = {}) {
    try {
      const db = await connectToDatabase();
      const serieCollection = db.collection("series");

      if (query._id) {
        query._id = new ObjectId(query._id);
      }
      return await serieCollection.find(query).toArray();
    } catch (err) {
      console.error("Error in getAllSeries:", err);
      throw err;
    }
  }
  async getAllSeriesByUser(userId) {
    try {
      const db = await connectToDatabase();
      const serieCollection = db.collection("series");

      const series = await serieCollection
        .find({ serie_user: userId })
        .toArray();
      return series;
    } catch (err) {
      console.error("Error in getAllSeriesByUser:", err);
      throw err;
    }
  }

  async getSerieById(id) {
    try {
      const db = await connectToDatabase();
      const serieCollection = db.collection("series");

      if (!ObjectId.isValid(id)) {
        throw new Error("Invalid id format");
      }
      return await serieCollection.findOne({ _id: new ObjectId(id) });
    } catch (err) {
      console.error("Error in getSerieById:", err);
      throw err;
    }
  }

  async getSerieSubcribe(userId) {
    try {
      const db = await connectToDatabase();
      const userCollection = db.collection("users");
      const serieCollection = db.collection("series");

      // Lấy mảng ID của các series mà user đã subscribe
      const user = await userCollection.findOne(
        { _id: userId },
        { projection: { serie_subcribe: 1 } }
      );

      if (!user || !user.serie_subcribe || user.serie_subcribe.length === 0) {
        return {
          message: "Bạn chưa đăng ký Serie nào!",
          serieEmpty: true,
        };
      }

      // Convert chuỗi ID sang ObjectId
      const serieIds = user.serie_subcribe.map((id) => new ObjectId(id));

      // Tìm tất cả các series tương ứng với ID
      const subscribedSeries = await serieCollection
        .find({ _id: { $in: serieIds } })
        .toArray();

      return subscribedSeries;
    } catch (error) {
      throw new Error(`Error getting subscribe list: ${error.message}`);
    }
  }
  async updateSerie(id, data, userId, idToken, file) {
    try {
      const db = await connectToDatabase();
      const serieCollection = db.collection("series");
      if (typeof data.isPublish === "string") {
        data.isPublish = data.isPublish === "true";
      }
      data.updatedAt = new Date();

      const currentSerie = await serieCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!currentSerie) {
        return null;
      }

      if (file) {
        // Xóa thumbnail cũ nếu có
        if (currentSerie.serie_thumbnail) {
          await deleteViaCloudFront(currentSerie.serie_thumbnail);
        }

        // Upload file mới lên S3
        const uniqueName = `${uuidv4()}_${file.originalname}`;
        const newImageUrl = await uploadViaCloudFront(
          idToken,
          file.buffer,
          uniqueName,
          file.mimetype,
          `files/user-${userId}/thumbnail`
        );

        // Gán lại giá trị thumbnail mới cho data update
        data.serie_thumbnail = newImageUrl;
      }

      const updateResult = await serieCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
      );

      if (updateResult.matchedCount === 0) {
        return null;
      }

      const updatedSerie = await serieCollection.findOne({
        _id: new ObjectId(id),
      });
      return updatedSerie;
    } catch (err) {
      console.error("Error in updateSerie:", err);
      throw err;
    }
  }

  async subscribeSerie(id, userId, userEmail) {
    try {
      const db = await connectToDatabase();
      const serieCollection = db.collection("series");
      const userCollection = db.collection("users");

      const serie = await serieCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!serie || !serie.serie_sns) {
        throw new Error("Serie not found");
      }

      const user = await userCollection.findOne({ _id: userId });
      if (!user) {
        throw new Error("User not found");
      }

      if (user.serie_subcribe && user.serie_subcribe.includes(id)) {
        return {
          message: "Bạn đã đăng ký series này rồi.",
          alreadySubscribed: true,
        };
      } else {
        await subscribeToSerie(serie.serie_sns, userEmail);
      }

      // Add serieId to the user's serie_subcribe array, avoid duplicates, and return updated document
      const userUpdate = await userCollection.findOneAndUpdate(
        { _id: userId },
        {
          $addToSet: { serie_subcribe: id },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: "after" }
      );

      await serieCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: { serie_subcribe_num: 1 },
          $set: { updatedAt: new Date() },
        }
      );
      return userUpdate;
    } catch (error) {
      throw new Error(`Error subcribing: ${error.message}`);
    }
  }

  async unsubscribeSerie(seriesId, userId, userEmail) {
    try {
      const db = await connectToDatabase();
      const serieCollection = db.collection("series");
      const userCollection = db.collection("users");

      const serie = await serieCollection.findOne({
        _id: new ObjectId(seriesId),
      });

      if (!serie || !serie.serie_sns) {
        throw new Error("Serie not found");
      }

      const user = await userCollection.findOne({ _id: userId });
      if (!user) {
        throw new Error("User not found");
      }

      if (!user.serie_subcribe || !user.serie_subcribe.includes(seriesId)) {
        return {
          message: "Bạn chưa đăng ký serie này.",
          user,
        };
      }

      // Gọi tới SNS để hủy subscription
      const result = await unsubscribeFromTopic(serie.serie_sns, userEmail);

      if (result.pendingConfirmation) {
        return result;
      }
      // Xóa seriesId khỏi user.serie_subcribe
      const userUpdate = await userCollection.findOneAndUpdate(
        { _id: userId },
        {
          $pull: { serie_subcribe: seriesId },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: "after" }
      );

      // Giảm số lượng người đăng ký của series
      await serieCollection.updateOne(
        { _id: new ObjectId(seriesId) },
        {
          $inc: { serie_subcribe_num: -1 },
          $set: { updatedAt: new Date() },
        }
      );

      return {
        message:
          "Bạn đã hủy đăng ký thành công. Từ nay bạn sẽ không nhận thông báo nữa!",
        user: userUpdate.value,
      };
    } catch (error) {
      throw new Error(`Error unsubscribing: ${error.message}`);
    }
  }
  async deleteSerie(id) {
    try {
      const db = await connectToDatabase();
      const serieCollection = db.collection("series");
      const userCollection = db.collection("users");
      // Lấy dữ liệu serie để biết được URL ảnh
      const serie = await serieCollection.findOne({ _id: new ObjectId(id) });
      if (!serie) {
        throw new Error("Serie không tồn tại.");
      }
      if (serie.serie_lessons && serie.serie_lessons.length > 0) {
        return {
          success: false,
          warning: "Không thể xóa serie khi vẫn còn bài học trong serie này.",
        };
      }

      await userCollection.updateMany(
        { serie_subcribe: id }, // tìm tất cả user có chứa id trong mảng
        {
          $pull: { serie_subcribe: id }, // xóa id đó khỏi mảng
          $set: { updatedAt: new Date() },
        }
      );

      if (serie.serie_sns) {
        await deleteTopic(serie.serie_sns);
      }

      const result = await serieCollection.deleteOne({
        _id: new ObjectId(id),
      });
      // Nếu xóa thành công và có ảnh thì xóa ảnh
      if (result.deletedCount > 0 && serie.serie_thumbnail) {
        await deleteViaCloudFront(serie.serie_thumbnail);
      }
      console.log("Delete Sucess");
      return result.deletedCount > 0;
    } catch (err) {
      console.error("Error in deleteSerie:", err);
      throw err;
    }
  }
}

module.exports = new SerieService();
