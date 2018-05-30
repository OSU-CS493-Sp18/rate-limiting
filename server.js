const express = require('express');

const app = express();
const port = process.env.PORT || 8000;

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
