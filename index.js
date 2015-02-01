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

var find_markers = function(lat, lng, dist, cb) {
  MapObject.
    find({'loc': {
      $geoWithin: {$centerSphere: [
        [parseFloat(lng), parseFloat(lat)], dist
      ]}
    }}).exec(cb);
}

app.post('/getobj', function(req, res) {
  console.log(req.body);
  find_markers(parseFloat(req.body.loc[1]), parseFloat(req.body.loc[0]), req.body.distance/6371, function (err, objs) {
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
     MapObject.find({"id":req.body.id},function (err,obj){
        if(err) return res.send(err);
        res.json(obj[0]);
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
  console.log('upvoting');
  MapObject.update(
    {"id": req.body.id},
    {$inc: {'upvote': 1}},
    {upsert: true},
    function(err, obj) {
      if(err) return res.send(err);
      MapObject.find({"id":req.body.id},function (err,obj){
        if(err) return res.send(err);
        res.json(obj[0]);
      })
    }
  );
});

app.post('/downvote', function(req, res) {
  console.log('downvoting');
  MapObject.update(
    {"id": req.body.id},
    {$inc: {'downvote': 1}},
    {upsert: true},
    function(err, obj) {
      if(err) return res.send(err);
     MapObject.find({"id":req.body.id},function (err,obj){
        if(err) return res.send(err);
        res.json(obj[0]);
      })
    }
  );
});

var getloc = function(address, callback) {
   var headers = {
    'X-Mashape-Key':'Gg7E1Gdy0zmshSAYOZPX4drho6OEp1XTKSUjsnWVCEMKBfZlA1',
    'Accept':'application/json'
  }

  request.get({
      url: 'https://montanaflynn-geocoder.p.mashape.com/address?address=' + address.replace(/ /g, '+'),
      headers: headers}, function(err, him, body) {
        callback(err,him,body);
      });
}

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

app.get('/location', function(req, res) {
  var headers = {
    'X-Mashape-Key':'Gg7E1Gdy0zmshSAYOZPX4drho6OEp1XTKSUjsnWVCEMKBfZlA1',
    'Accept':'application/json'
  }

  var ip = req.headers['x-forwarded-for'] || 
       req.connection.remoteAddress || 
       req.socket.remoteAddress ||
       req.connection.socket.remoteAddress;

  request.get({
      url: 'https://montanaflynn-geocoder.p.mashape.com/ip?ip=' + ip,
      headers: headers}, function(err, him, body) {
        if(err) return res.send(err);
        res.json(JSON.parse(body));
      });
});

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}


var twilioSid = 'AC06b0d099349ffab12bfd1e77b653f70a';
var twilioToken = '011a3b8b14061ce2abaeacb0e2a84a86';
var twilioClient = require('twilio')(twilioSid,twilioToken);

app.post('/twilio', function(req, res) {
  console.log(req.body);
  
  text = req.body.Body;
  textlo = text.toLowerCase()
  
  ret = {
    to: req.body.From,
    from: req.body.To
  };
  
  if(textlo.startsWith("map")) {
    getloc(text.substring(3), function(err, him, body) {
      if(err) ret.body = err;
      else {
        s = JSON.parse(body);
        if ('error' in s){
          ret.body = "Sorry, we could not locate this address.";
          console.log(ret);
          twilioClient.messages.create(ret);
        }
        else {
          find_markers(s.latitude, s.longitude, 1/6347, function(err, data) {
            if (err) {
              console.log(err);
            }
            gurl = 'https://maps.googleapis.com/maps/api/staticmap?center=' + s.latitude + "," + s.longitude;
            gurl = gurl + '&zoom=15&size=512x512';

              var label = {
                fountain: 'F',
                washroom: 'W',
                hotdog: 'H',
                vending: 'V',
                foodtruck: 'T',
              };

              var color = {
                fountain: 'blue',
                washroom: 'brown',
                hotdog: 'orange',
                vending: 'red',
                foodtruck: 'yellow',
              };

            for (var i = 0; i < data.length; i++) {
              var obj = data[i];
              gurl = gurl + '&markers=label:' + label[obj.type] + '%7C' + 'color:' + color[obj.type] + '%7C' + obj.loc.coordinates[1].toFixed(6) + ',' +  obj.loc.coordinates[0].toFixed(6);
            }
            console.log(gurl);
            ret.mediaUrl = gurl;
            twilioClient.messages.create(ret);
          });
        }
      }
    });
  } else if(textlo.startsWith("locate")) {
    getloc(text.substring(6), function(err,him,body) {
      if(err) ret.body = err;
      else {
        s = JSON.parse(body);
        if ('error' in s)
          ret.body = "Sorry, we could not locate this address.";
        else 
          ret.body = "Latitude:" + s.latitude + ", Longitude:" + s.longitude;
      }
      console.log(ret);
      twilioClient.messages.create(ret);
    });
  } else {// if(textlo.startsWith("find")) {
    ret.body = 'Please text +16476910706 with map/locate + "address" to access our machine learning database';
    twilioClient.messages.create(ret);
  }

  res.send("ok");
});

server.listen(port);

