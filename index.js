var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');
var methodOverride = require('method-override');
var mongoose = require('mongoose');
var uuid = require('node-uuid');
var app = express();
var server = require('http').createServer(app);
var port = process.env.PORT || 80;

app.use(methodOverride());
app.use(errorHandler());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());

app.use(express.static(__dirname + '/public/'));

mongoose.connect('mongodb://localhost/tanlira');

var MapObjectSchema = new mongoose.Schema({
  id: String,
  type: String,
  loc: {
    type: {type: String},
    coordinates: Array
  },
  date: Date
});

var MapObject = mongoose.model('MapObject', MapObjectSchema);

app.all('/getobjall', function(req,res) {
  console.log('hi')
  MapObject.find().exec(function (err,objs) {
    if(err) return res.send(err);
    res.json(objs);
  });
});

app.post('/getobj', function(req, res) {
  console.log(req.body);
  MapObject.
    find({'loc': {
      $geoWithin: {$centerSphere: [
        [parseFloat(req.body.loc[0]),parseFloat(req.body.loc[1])], req.body.distance/6371
      ]}
    }}).
    exec(function (err, objs) {
      if(err) return res.send(err);
      console.log(objs);
      res.json(objs);
    });
});

app.post('/createobj', function(req, res, next) {
  console.log(req.body);
  new MapObject({
    id: uuid.v4(),
    type: req.body.type,
    loc: {
      type: "Point",
      coordinates:  req.body.loc
    },
    date: Date.now()
  }).save(function (err, obj, count) {
    if(err) return res.send(err);
    res.json({
      response: "ok"
    })});
});

app.post('/updateobj', function(req, res) {
  res.send('update object')
});

app.post('/deleteobj', function(req, res) {
  MapObject.
    remove({"id": req.body.id});
});

server.listen(port);


