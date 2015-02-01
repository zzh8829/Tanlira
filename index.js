var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');
var methodOverride = require('method-override');
var mongoose = require('mongoose');
var request = require('request');
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
    type: {type: String, default: "Point"},
    coordinates: {type: Array, default: [0,0]},
  },

  upvote: {type: Number, default: 0},
  downvote: {type: Number, default: 0},
  comment: Array,
  image: Array,

  date: {type: Date, default: Date.now}
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

app.post('/addobj', function(req, res, next) {
  console.log("addobj")
  console.log(req.body);
  new MapObject({
    id: uuid.v4(),
    type: req.body.type,
    loc: {
      type: "Point",
      coordinates:  [parseFloat(req.body.loc[0]),parseFloat(req.body.loc[1])]
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
  MapObject.remove({"id": req.body.id},function (err, result) {
    if(err) return res.send(err);
    res.json({
      response: "ok"
    });
  });
});

app.post('/addcomment', function(req, res) {
  MapObject.update(
    {"id": req.body.id},
    {$push: {'comment' : req.body.comment}},
    {upsert:true},
    function(err, obj) {
      if(err) return res.send(err);
      res.json({
        response: "ok"
      })
    }
  );
});

app.post('/addimage', function(req, res) {
  MapObject.update(
    {"id": req.body.id},
    {$push: {'image': req.body.image}},
    {upsert:true},
    function(err, obj) {
      if(err) return res.send(err);
      res.json({
        response: "ok"
      })
    }
  );
});

app.post('/upvote', function(req, res) {
  MapObject.update(
    {"id": req.body.id},
    {$inc: {'upvote': 1}},
    {upsert: true},
    function(err, obj) {
      if(err) return res.send(err);
      res.json({
        response: "ok"
      })
    }
  );
});

app.post('/downvote', function(req, res) {
  MapObject.update(
    {"id": req.body.id},
    {$inc: {'downvote': 1}},
    {upsert: true},
    function(err, obj) {
      if(err) return res.send(err);
      res.json({
        response: "ok"
      })
    }
  );
});

app.post('/searchloc', function(req, res) {
  var headers = {
    'X-Mashape-Key':'Gg7E1Gdy0zmshSAYOZPX4drho6OEp1XTKSUjsnWVCEMKBfZlA1',
    'Accept':'application/json'
  }

  request.get({
      url: 'https://montanaflynn-geocoder.p.mashape.com/address?address=' + req.body.address.replace(/ /g, '+'),
      headers: headers}, function(err, him, body) {
        if(err) return res.send(err);
        res.json(JSON.parse(body));
      });
});

server.listen(port);

