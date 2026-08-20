const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
require("dotenv").config();


// Create express app
const app = express();
const PORT = process.env.PORT || 3000;

// Inbuilt middleware
app.use(cors())
app.use(express.json({
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      // Malformed JSON – store error on the request so we can handle it later
      req.jsonParseError = e;
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// If a JSON parse error occurred, respond immediately and stop further processing
app.use((err, req, res, next) => {
  if (req.jsonParseError) {
    return res.status(400).json({
      error: 'Invalid JSON payload. Please ensure your request body is valid JSON.'
    });
  }
  next();
});

// Middleware
const requireAuth = require('./middleware/requireAuth');


// @@@@@@@@@@@@@@@@@@@@@@@
//        Routes
//@@@@@@@@@@@@@@@@@@@@@@@@
// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

//...................................
//          Manage Users
//...................................
// User registration route
const {login, register} = require('./routes-controller/manage-account/login-register');
const getUser = require("./routes-controller/user/user.routes");

app.use("/user", getUser);
app.post('/user/register', register);
app.post('/user/login', login);

//....................................
//          Manage Video
//....................................
const videoUploadRouter = require('./routes-controller/manage-video/video.upload');
const videoEditRouter = require('./routes-controller/manage-video/video.edit');
const videoDeleteRouter = require('./routes-controller/manage-video/video.delete');

app.use('/video/upload', videoUploadRouter);
app.use('/video/edit', videoEditRouter);
app.use('/video/delete', videoDeleteRouter);

//....................................
//            Video Activity
//....................................
const activityRoutes = require("./routes-controller/video-activity/activity.routes");

app.use("/video/activity", activityRoutes);

// ....................................
//            Video Watch
// ....................................
const { streamVideo } = require('./routes-controller/manage-video/video.watch');
app.get('/watch/:videoId', streamVideo);

// .....................................
//             Video Feed
// .....................................
const feedRoutes = require('./routes-controller/feed/feed.routes');
const { env } = require('process');
app.use('/video/fetch', feedRoutes);

//.....................................
//             Video Search
//.....................................
const searchRoutes = require("./routes-controller/search/search.routes");
app.use("/video/search", searchRoutes);  // mounts at /video/search


const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API",
      version: "1.0.0",
      description: `Documentation for ${process.env.APP_NAME}`,
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },

  apis: [
    path.join(__dirname, "routes-controller/**/*.js"),
  ],
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
