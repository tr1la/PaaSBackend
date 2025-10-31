const serieService = require("../services/serie.service");

class SerieController {
  // [POST] /series
  // async createSerie(req, res) {
  //   try {
  //     const data = req.body;
  //     const file = req.file || null;
  //     //   // Taking userID
  //     const userId = req.user?.userId;
  //
  //     const newSerie = await serieService.createSerie(data, userId, file);

  //     return res.status(201).json(newSerie);
  //   } catch (err) {
  //     console.error("Error in createSerie:", err);
  //     return res.status(500).json({ message: "Internal Server Error" });
  //   }
  // }

  async createSerie(req, res) {
    try {
      const data = req.body;
      const file = req.file || null;
      //   // Taking userID
      const userId = req.user?.userId;
      const idToken = req.user?.idToken;
      const newSerie = await serieService.createSerie(
        data,
        userId,
        idToken,
        file
      );

      return res.status(201).json(newSerie);
    } catch (err) {
      console.error("Error in createSerie:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // [GET] /series
  async getAllSeries(req, res) {
    try {
      const series = await serieService.getAllSeries(req.query);
      return res.status(200).json(series);
    } catch (err) {
      console.error("Error in getAllSeries:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  // [GET] /series/user
  async getAllSeriesByUser(req, res) {
    try {
      const userId = req.user?.userId;
      const series = await serieService.getAllSeriesByUser(userId);
      return res.status(200).json(series);
    } catch (err) {
      console.error("Error in getAllSeriesByUser:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  // [GET] /series/:id
  async getSerieById(req, res) {
    try {
      const serieId = req.params.id;
      const serie = await serieService.getSerieById(serieId);
      if (!serie) {
        return res.status(404).json({ message: "Serie not found" });
      }
      return res.status(200).json(serie);
    } catch (err) {
      console.error("Error in getSerieById:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  async searchSeriesByTitle(req, res) {
    try {
      const keyword = req.query.keyword;

      if (!keyword || keyword.trim() === "") {
        return res.status(400).json({ message: "Thiếu từ khóa tìm kiếm" });
      }

      const results = await serieService.searchSeriesByTitle(keyword);
      return res.status(200).json(results);
    } catch (err) {
      console.error("Error in searchSeriesByTitle:", err);
      return res.status(500).json({ message: "Lỗi khi tìm kiếm series" });
    }
  }
  // [GET] /series/:id/subcribed
  async getSerieSubcribe(req, res) {
    try {
      const userId = req.user?.userId;
      const series = await serieService.getSerieSubcribe(userId);
      return res.status(200).json(series);
    } catch (err) {
      console.error("Error in getSerieSubcribe:", err);
      return res.status(500).json({ message: "Get Serie Subcribe Error" });
    }
  }

  // [PATCH] /series/:id
  async updateSerie(req, res) {
    try {
      const id = req.params.id;
      const data = req.body;
      const file = req.file;
      const userId = req.user?.userId;
      const idToken = req.user?.idToken;
      const updatedSerie = await serieService.updateSerie(
        id,
        data,
        userId,
        idToken,
        file
      );
      if (!updatedSerie) {
        return res.status(404).json({ message: "Serie not found" });
      }
      return res.status(200).json(updatedSerie);
    } catch (err) {
      console.error("Error in updateSerie:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // [POST] /series/:id/subscribe
  async subscribeSerie(req, res) {
    try {
      const serieId = req.params.id;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;

      if (!userId || !userEmail) {
        return res.status(400).json({ message: "Thiếu thông tin người dùng" });
      }

      const result = await serieService.subscribeSerie(
        serieId,
        userId,
        userEmail
      );

      if (result.alreadySubscribed) {
        return res.status(200).json({
          message: "Bạn đã đăng ký series này rồi.",
          result,
        });
      }

      return res.status(200).json({
        message:
          "Đăng ký nhận thông báo thành công. Vui lòng kiểm tra email để xác nhận.",
        result,
      });
    } catch (err) {
      console.error("Error in subcribeSerie:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  //[]
  async unsubscribeSerie(req, res) {
    try {
      const serieId = req.params.id;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;

      if (!userId || !userEmail) {
        return res.status(400).json({ message: "Thiếu thông tin người dùng" });
      }

      const result = await serieService.unsubscribeSerie(
        serieId,
        userId,
        userEmail
      );

      if (result.pendingConfirmation) {
        return res.status(400).json({
          result,
        });
      }
      return res.status(200).json({
        result,
      });
    } catch (err) {
      console.error("Error in unsubscribeSerie:", err);
      return res.status(500).json({ message: "Đã xảy ra lỗi khi hủy đăng ký" });
    }
  }

  // [DELETE] /series/:id
  async deleteSerie(req, res) {
    try {
      const deletedSerie = await serieService.deleteSerie(req.params.id);
      if (!deletedSerie) {
        return res.status(404).json({ message: "Serie not found" });
      }
      if (deletedSerie.success === false && deletedSerie.warning) {
        return res.status(400).json({ message: deletedSerie.warning });
      }
      return res.status(200).json({ message: "Serie deleted successfully" });
    } catch (err) {
      console.error("Error in deleteSerie:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

module.exports = new SerieController();
