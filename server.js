const express = require('express');
const redis = require('redis');

const app = express();
const port = process.env.PORT || 8000;

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || '6379';
const redisClient = redis.createClient(redisPort, redisHost);

function getUserTokenBucket(ip) {
  return new Promise((resolve, reject) => {
    redisClient.hgetall(ip, function (err, tokenBucket) {
      if (err) {
        reject(err);
      } else {
        if (tokenBucket) {
          tokenBucket.tokens = parseFloat(tokenBucket.tokens);
        }
        resolve(tokenBucket);
      }
    });
  });
}

function rateLimit(req, res, next) {
  const windowMilliseconds = 60000;
  const windowMaxRequests = 5;
  const now = Date.now();
  getUserTokenBucket(req.ip)
    .then((tokenBucket) => {
      if (!tokenBucket) {
        tokenBucket = { tokens: windowMaxRequests, last: now };
      }
    })
    .catch((err) => {
      next();
    });
}

app.use(rateLimit);

app.get('/', function (req, res) {
  res.status(200).json({
    timestamp: new Date().toString()
  });
});

app.use('*', function (req, res, next) {
  res.status(404).json({
    err: "Path " + req.originalUrl + " does not exist"
  });
});

app.listen(port, function() {
  console.log("== Server is running on port", port);
});
