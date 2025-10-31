require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const { connectToDatabase } = require("./utils/mongodb");
const userRoutes = require("./routes/user.routes");
const serieRoutes = require("./routes/serie.routes");
// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Education Web API",
      version: "1.0.0",
      description: "API documentation for Education Web Backend",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Nhập JWT token từ Cognito vào đây khi cần test các API yêu cầu xác thực",
        },
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
  },
  apis: ["src/routes/*.js", "src/models/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Cấu hình Swagger UI để không yêu cầu xác thực
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: "list",
    filter: true,
  },
};

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, swaggerUiOptions)
);

// Routes

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, swaggerUiOptions)
);
app.use("/api/users", userRoutes);

app.use("/api/series", serieRoutes);

// Thêm route gốc để test API
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Education Web API",
    documentation: `http://localhost:${PORT}/api-docs`,
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Service is running" });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(
        `Swagger docs available at http://localhost:${PORT}/api-docs`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
