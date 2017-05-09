var cookieParser = require('cookie-parser');
var MongoClient = require('mongodb').MongoClient
var express = require('express');
var path = require('path');
var fs = require('fs');
var https = require('https');
var logger = require('morgan');
var bodyParser = require('body-parser');
var winston = require('winston');
var commandLineArgs = require('command-line-args');
var cluster = require('cluster');


winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { timestamp: function() {return new Date();}, 'formatter': customLogFormatter});

var optionList = [
  { name: 'help', type: Boolean, description: 'Dispay this message'},
  { name: 'debug', type: Boolean, description: 'Run the server in debug mode.  This will disable multiple processes from being spawned.'},
  { name: 'dbURI', type: String, defaultValue: 'mongodb://localhost', group: ['database'], description: 'The database server URI to connect to. Default: mongodb://localhost' },
  { name: 'port', type: Number, defaultValue: 3000, group: ['server'], description: 'The port on which to listen for requests. Default: 3000' },
  ]

var options = commandLineArgs(optionList)



if (options._all.help) {
  var numOpts = optionList.length;
  console.log("usage: node app.js <options>")
  for(o=0;o<numOpts;o++) {
  console.log("\t--"+optionList[o].name+"\t"+optionList[o].description);
  }
  process.exit();
}

var numProcesses = 1;

if (options.server.mode == 'http') {
  numProcesses = require('os').cpus().length;
}

// Debugging is easier with a single process!
if (cluster.isMaster && !options._all.debug) {
  for (var i = 0; i < numProcesses; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(deadWorker, code, signal) {
    // Restart the worker
    var worker = cluster.fork();

    // Note the process IDs
    var newPID = worker.process.pid;
    var oldPID = deadWorker.process.pid;

    // Log the event
    winston.info('worker '+oldPID+' died.');
    winston.info('worker '+newPID+' started.');
  });
}
else {
  var mongoUrl = options.database.dbURI;
  MongoClient.connect(mongoUrl, function (err, db) {

    if (err) {
      console.log('Error connecting to Mongo')
    }
    else {

      var app = express();

      //app.use(logger('dev'));
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({extended:true}));
      app.use(cookieParser());

      // Configuring Passport
      var passport = require('passport');
      var expressSession = require('express-session');
      var MongoDBStore = require('connect-mongo')(expressSession);

      var store = new MongoDBStore({url: mongoUrl});
      var session = expressSession({
        store: store,
        resave: true,
        secret: 'mySecretKey',
        rolling: true,
        saveUninitialized: false,
        cookie: {maxAge: 1200000 }  // 20 minutes
      });

      app.use(session);
      app.use(passport.initialize());
      app.use(passport.session());

      // Using the flash middleware provided by connect-flash to store messages in session
      // and displaying in templates
      var flash = require('connect-flash');
      app.use(flash());

      // Initialize Passport
      var initPassport = require('./passport/init');
      initPassport(passport, db);

      app.use(express.static(path.join(__dirname, './public')));
      app.set('views', __dirname+'/views');
      app.set('view engine', 'pug')

      // Ensure that all requests have a handle to the DB connection
      app.use(function (req, res, next) {
        req.database = db;
        next();
      });

      var routes = require('./routes/index')(passport);
      app.use('/', routes);

      // catch 404 and forward to error handler
      app.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
      });

      app.use(function(err, req, res, next) {
        if (res.headersSent) {
          return next(err);
        }

        res.render('error', {error: err});
      });

      app.set('port', options.server.port);

/* Use this if you have a cert and want https*/

/*
      var server = https.createServer({
        key: fs.readFileSync('ssl/key.pem'),
        cert: fs.readFileSync('ssl/certificate.pem')
      }, app).listen(app.get('port'), function () {
        winston.info('Server listening on port ' + server.address().port);
      });
*/
/*HTTP*/


app.get('*', function(request, response) {
   console.log(`!!!!!!!!! catch all :: ${request.originalUrl}`)
   console.dir(request.headers)
 });

       var server = app.listen(app.get('port'), function () {
         winston.info('Server listening on port ' + server.address().port);
       });

      // Only start the websocket notification component if we are in 'socket' mode which implies single process.
      if (options.server.mode == 'socket') {
        var notification = require('./routes/notification');
        notification(server, session, store, db);
      }
    }
  });
}

function customLogFormatter (options) {
  // Return string will be passed to logger.
  return options.timestamp().toTimeString() + ' ['+
         options.level.toUpperCase() +'] [' +
         process.pid + '] ' +
         (undefined !== options.message ? options.message : '') ;
}

