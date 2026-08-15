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
// Video upload route
const videoUploadRouter = require('./routes-controller/manage-video/video.upload');
app.use('/dekho/video/upload', requireAuth, videoUploadRouter);

// Video edit route
app.put('/dekho/video/edit', requireAuth, (req, res) => {
  // Handle video edit logic here
  res.send('Video edited successfully!');
});

// Video delete route
app.delete('/dekho/video/delete', requireAuth, (req, res) => {
  // Handle video delete logic here
  res.send('Video deleted successfully!');
});

// Watch video route
const { streamVideo } = require('./routes-controller/manage-video/video.watch');
app.get('/dekho/video/watch/:videoId', streamVideo);


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});