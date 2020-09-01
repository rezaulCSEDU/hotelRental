//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
var fs = require('fs');
var path = require('path');
var multer = require('multer');


var imgModel = require(__dirname+'/model');
var hotel = require(__dirname+'/hotel');
var room = require(__dirname+'/room');
var booking = require(__dirname+'/booking');

var roomRouter =require(__dirname+'/route/roomRoute');
var bookingRoom = require(__dirname+'/route/bookingRoute');
var addRoom = require(__dirname+'/adminAct/addRoom');
var addhotel = require(__dirname+'/adminAct/addHotel');

var imgUpload = require(__dirname+'/fileSaver/imgSaver');
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");


app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRETS,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://reza:105796@cluster0.ywkip.mongodb.net/userInfoDB', {
  useNewUrlParser: true,
  //useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);



const userSchema = new mongoose.Schema ({
  name : String,
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile.displayName);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
}else{
  res.redirect("/login");
}
});


app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){
  const user = new User({
    email : req.body.fullName,
    username: req.body.username
  });
  User.register(user, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.get('/addhotel', (req, res) => {
  imgModel.find({}, (err, items) => {
    if (err) {
      console.log(err);
    } else {
      res.render('hotels', {
        items: items
      });
    }
  });
});

app.post('/addhotel', imgUpload.single('image'), (req, res, next) => {
  console.log(req.file.filename);

  var obj = {
    name: req.body.name,
    desc: req.body.desc,
    img : req.file.filename
  }
  imgModel.create(obj, (err, item) => {
    if (err) {
      console.log(err);
    } else {
      // item.save();
      res.redirect('/addhotel');
    }
  });
});

app.get('/hotel',function(req,res){
  const newHotel={
    name : 'abc',
    location :' def'
  }
  hotel.create(newHotel,(err,item ) => {
    if(err){
      console.log(err);
    }else{
      console.log('hotel');
    }
  })
})

app.use(roomRouter);
app.use(bookingRoom);
app.use(addRoom);
app.use(addhotel);

app.listen(process.env.PORT || 3000, function() {});
