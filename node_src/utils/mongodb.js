require("dotenv").config({ path: __dirname + "/../../.env" });
const { MongoClient } = require("mongodb");
const path = require("path");
const uri = process.env.MONGODB_URI;
const fs = require("fs");
// Export client to be reused throughout the application
let dbConnection = null;
let client = null;
const clientOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  tls: true,
  retryWrites: false,
  authMechanism: "SCRAM-SHA-1", // DocumentDB dùng SCRAM-SHA-1
};

async function ensureSSLCertificate() {
  const certPath = path.join(__dirname, "..", "global-bundle.pem");

  try {
    // Check if certificate already exists
    if (fs.existsSync(certPath)) {
      console.log(`SSL certificate found: ${certPath}`);
      return certPath;
    }

    console.log("Downloading AWS DocumentDB SSL certificate...");

    const https = require("https");
    const certUrl =
      "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem";

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(certPath);

      https
        .get(certUrl, (response) => {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            console.log(`SSL certificate downloaded: ${certPath}`);
            resolve(certPath);
          });
        })
        .on("error", (err) => {
          fs.unlink(certPath, () => {}); // Delete the file on error
          console.error("Failed to download SSL certificate:", err);
          reject(err);
        });
    });
  } catch (error) {
    console.error("SSL certificate setup error:", error);
    return null;
  }
}

const connectToDatabase = async () => {
  if (dbConnection) return dbConnection;

  try {
    console.log("Connecting to DocumentDB...");

    const certPath = await ensureSSLCertificate();

    if (certPath && fs.existsSync(certPath)) {
      clientOptions.tlsCAFile = certPath;
      console.log("Using SSL certificate file for DocumentDB connection");
    } else {
      console.warn("SSL certificate not found, connection may fail");
    }
    client = new MongoClient(uri, clientOptions);
    await client.connect();
    console.log("Connected to DocumentDB");

    dbConnection = client.db("e-learn");

    return dbConnection;
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    throw err;
  }
};

module.exports = {
  connectToDatabase,
  client,
};
