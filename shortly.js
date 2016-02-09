var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var bcrypt = require('bcrypt-nodejs');

var app = express();

var currentUser = {

};

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'nyan cat',
  resave: true,
  saveUninitialized: true
}));

var checkAuth = function(req, res, next) {
  console.log('req method', req.method);
  console.log('req url ', req.url);
  console.log('req session ', req.session);
  console.log('Id ...........', req.session.userId);
  if (!req.session.userId) {
    res.redirect('login');
  } else {
    next();
  }
};

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', checkAuth,
function(req, res) {
  res.render('index');
});

app.get('/create', checkAuth,
function(req, res) {
  res.render('index');
});

app.get('/links', checkAuth,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.post('/create', checkAuth,
function(req, res) {
  res.redirect('links');
});


app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

app.post('/login',
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var hash = bcrypt.hashSync(password);




  //////////////
  var u = Users.query();
  u.where({username: username.trim()}).select().then(function(resp) {
    // console.log('resp: ', resp);
    if (resp[0]) {
      var hashedPass = resp[0].password;
      if (bcrypt.compareSync(password, hashedPass)) {
        console.log('req.session changed');
        req.session.userId = resp[0].id;
        req.session.save();
        res.redirect('/');
      } else {
        console.log('wrong password');
        res.redirect('/login');
      }
    } else {
      res.redirect('/login');
    }
  });
  ////////////
  



});

app.post('/signup', 
function(req, res) {
  console.log('signup post received');
  var username = req.body.username;
  var password = req.body.password;


  new User({ username: username.trim(), password: password }).query({where: {username: username}}).fetchAll().then(function(model) {
    if (model.length) {
      res.redirect('/signup');
    } else {
      Users.create({
        username: username,
        password: password,
      })
      .then(function(newUser) {
        // res.send(200, newUser);
        console.log('req.session changed 2');

        req.session.userId = newUser.id;
        req.session.save();
        res.redirect('/');
      });
    }
  });


});



app.post('/logout', checkAuth,
function(req, res) {
  console.log(' inside here ?');
  // req.session.userId = 10;
  // req.session.regenerate();
  req.session.destroy(function() {
    res.redirect('/login');
  });
  // res.redirect('/login');
});


//.query({where: {username: username}})



/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
