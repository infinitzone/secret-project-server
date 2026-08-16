const express = require('express');
const { getFeed } = require('./feed.controller');

const router = express.Router();

// GET /dekho/video/feed?limit=20&cursor=...
router.get('/feed', getFeed);

module.exports = router;