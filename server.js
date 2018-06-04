const express = require('express');
const redis = require('redis');

const app = express();
const port = process.env.PORT || 8000;

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || '6379';
const redisClient = redis.createClient(redisPort, redisHost);

const windowMilliseconds = 60000;
const windowMaxRequests = 5;

function getUserTokenBucket(ip) {
  return new Promise((resolve, reject) => {
    redisClient.hgetall(ip, function (err, tokenBucket) {
      if (err) {
        reject(err);
      } else {
        if (tokenBucket) {
          tokenBucket.tokens = parseFloat(tokenBucket.tokens);
        } else {
          tokenBucket = { tokens: windowMaxRequests, last: Date.now() };
        }
        resolve(tokenBucket);
      }
    });
  });
}

function saveUserTokenBucket(ip, tokenBucket) {
  return new Promise((resolve, reject) => {
    redisClient.hmset(ip, tokenBucket, function (err, response) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function rateLimit(req, res, next) {
  let userHasSufficientTokens = true;
  getUserTokenBucket(req.ip)
    .then((tokenBucket) => {
      const timestamp = Date.now();
      const elapsedMilliseconds = timestamp - tokenBucket.last;
      const refreshRate = windowMaxRequests / windowMilliseconds;
      tokenBucket.tokens += elapsedMilliseconds * refreshRate;
      tokenBucket.tokens = Math.min(tokenBucket.tokens, windowMaxRequests);

      if (tokenBucket.tokens < 1) {
        userHasSufficientTokens = false;
      } else {
        tokenBucket.tokens -= 1;
      }
      tokenBucket.last = timestamp;

      return saveUserTokenBucket(req.ip, tokenBucket);
    })
    .then(() => {
      if (userHasSufficientTokens) {
        next();
      } else {
        res.status(429).json({
          error: "Too many requests per minute"
        });
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
