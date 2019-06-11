//
// debug server
//
'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);

app.use(express.static('docs', {
  index: 'index.html'
}));

http.listen(3000, function () {
  console.log('HTTP listening on *:3000');
});