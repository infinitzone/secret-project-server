const express = require('express');
const cors = require('cors');
require("dotenv").config();


// Create express app
const app = express();
const PORT = process.env.PORT || 3000;

// Inbuilt middleware
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


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
app.post('/dekho/user/register', register);
app.post('/dekho/user/login', login);

//....................................
//          Manage Video
//....................................
const videoUploadRouter = require('./routes-controller/manage-video/video.upload');

app.use('/video/upload', requireAuth, videoUploadRouter);
app.put('/video/edit', requireAuth, (req, res) => {
  res.send('Video edited successfully!');
});
app.delete('/video/delete', requireAuth, (req, res) => {
  res.send('Video deleted successfully!');
});

// ....................................
//       Video Watch
// ....................................
const { streamVideo } = require('./routes-controller/manage-video/video.watch');
app.get('/watch/:videoId', streamVideo);

// .....................................
//       Video Feed
// .....................................
const feedRoutes = require('./routes-controller/feed/feed.routes');
app.use('/video/fetch', feedRoutes);


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});