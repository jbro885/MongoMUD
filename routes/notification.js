var cookieParser = require('cookie-parser');
var passport = require('passport');

var MESSAGES_COLLECTION_NAME = 'message';
var NOTIFICATION_COLLECTION_NAME = 'messageNotification';

module.exports = function(server, session, store, db) {

    var io = require('socket.io').listen(server);

    io.set('authorization', function (handshakeData, callback) {

        if (handshakeData && handshakeData.headers && handshakeData.headers.cookie) {

            var parser = cookieParser('mySecretKey');
            parser(handshakeData, {}, function (err) {
                if (err) {
                    return callback('ERROR PARSING COOKIE', false);
                }

                var sessionId = handshakeData.signedCookies['connect.sid'];

                store.get(sessionId, function (err, session) {

                    if (err || !session || !session.passport || !session.passport.user || !session.passport.user) {
                        callback('NOT_LOGGED_IN', false);
                        console.log('not logged in', session.passport.user);
                    }
                    else {
                        console.log('logged in');
                        handshakeData.session = session;
                        callback(null, true);
                    }
                });
            })
        }
        else {
            callback('NO LOGIN COOKIE', false); // error first, 'authorized' boolean second
        }
    });

    io.use(function (socket, next) {
        session(socket.handshake, {}, next);
    });

    io.on('connection', function (socket) {
        console.log('a user connected. User: ' + socket.handshake.session.passport.user);
        var date = new Date();
        //date.setMinutes(new Date().getMinutes() - 2);
        passport.deserializeUser(socket.handshake.session.passport.user, function (err, user) {

            socket.join(socket.handshake.session.passport.user); // We are using room of socket io
            console.log('joined: ' + socket.handshake.session.passport.user);

            var query = {to: socket.handshake.session.passport.user, ts: {$gte :date}};
            var options = {tailable: true, awaitData: true, numberOfRetries: Number.MAX_VALUE, noCursorTimeout: true};

            var collection = db.collection(NOTIFICATION_COLLECTION_NAME);
            var cursor = collection.find(query, options).stream();

            cursor.on('data', function(document) {
                console.log('got document: ' + JSON.stringify(document));
                db.collection(MESSAGES_COLLECTION_NAME).find({ts: {$gte: date}, to: socket.handshake.session.passport.user}).toArray(function(err, docs) {
                    if (docs.length > 0) {
                        console.log('Emiting: ' +JSON.stringify(docs));
                        io.sockets.in(socket.handshake.session.passport.user).emit('message', JSON.stringify(docs))
                    }
                });
                date = new Date();
            });

            cursor.on('close', function() {
                console.log('cursor closed');
            });

            socket.on('disconnect', function() {
                console.log('closing cursor');
                cursor.close();
            });
        });
    });
}
