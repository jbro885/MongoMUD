var winston = require('winston');
var ObjectID = require('mongodb').ObjectID
var gameEngine = require('../game/engine.js')
var mongoDB = require('mongodb');

var MESSAGES_COLLECTION_NAME = 'message';
var NOTIFICATION_COLLECTION_NAME = 'messageNotification';


var getMessageById = function (req, res) {
    var db = req.database;
    var collection = db.collection(MESSAGES_COLLECTION_NAME);

    var messageId = req.params.id;
    var oid = "";

    try {
        oid = new ObjectID(messageId);
    }
    catch (e) {
        winston.error('Can\'t parse Object ID');
    }

    collection.find({_id: oid}).toArray(function(err, docs) {
        if (docs.length > 0) {
            return res.send(docs[0]).end();
        }
        else {
            return res.status(404).end();
        }
    });
};

var deleteMessage = function (req, res) {
    var db = req.database;
    var collection = db.collection(MESSAGES_COLLECTION_NAME);

    var messageId = req.params.id;
    var oid = "";

    try {
        oid = new ObjectID(messageId);
    }
    catch (e) {
        winston.error('Can\'t parse Object ID');
    }

    collection.deleteOne({_id: oid}, function(err, result) {
        if (!err) {
            if (result.deletedCount == 1) {
                return res.sendStatus(204);
            }
            else {
                return res.sendStatus(404);
            }
        }
        else {
            next(err);
        }
    });
};

var postMessage = function (req, res) {
    if (req.isAuthenticated()) {
        var doc = req.body;

        if (doc) {
            req.user.db = req.database
            if (gameEngine.playerInput(req.user, doc.content) == true) {
                return res.status(201).end();
            }
        }
        else {
            winston.error('No message specified in body');
            return res.status(400).end();
        }
    }
    else {
        return res.status(401).end();
    }
};

var getMessagesLongPoll = function (req, res, next) {
    //winston.info('Recieved request');

    if (req.isAuthenticated()) {
        var db = req.database;

        var queryTs = req.query.time;
        var date = new Date();

        if (queryTs) {
            date = new Date(queryTs);
        }

        var query = {to: req.session.passport.user, ts: {$gte: new mongoDB.Timestamp(0, date/1000)}, dt: {$gte: date}};
        var options = {oplogReplay: true, tailable: true, awaitData: true, numberOfRetries: Number.MAX_VALUE, noCursorTimeout: true};

        //Mark the user as still active


        var collection = db.collection(NOTIFICATION_COLLECTION_NAME);
        //winston.info('Got notification collection object');
        var cursor = collection.find(query, options).stream();
        //winston.info('Got cursor object from notification collection');
        var responseSent = false;

        var timeout = setTimeout(function () {
            var responseDoc = {};
            responseDoc.serverTime = new Date();
            cursor.close();
            //winston.info('timeout triggered');
            responseSent = true;
            return res.status(200).send(responseDoc);

        }, 5000);

        cursor.on('data', function (document) {
           
            cursor.close();
            clearTimeout(timeout);

            db.collection(MESSAGES_COLLECTION_NAME).find({
                ts: {$gte: date},
                to: req.session.passport.user
            }).toArray(function (err, docs) {
                if (err) {
                    winston.error("Error from MongoDB cursor. Error: " + err);
                    next(err);
                    return;
                }        
             
                if (docs.length > 0 && responseSent == false) {
                
                    var last_ts = new Date(docs[docs.length - 1].ts);
                    last_ts.setMilliseconds(last_ts.getMilliseconds() + 1);
                    var responseDoc = {};
                    responseDoc.serverTime = last_ts;
                    responseDoc.messages = docs;
                    return res.status(200).send(responseDoc);
                }
                else {
                    var responseDoc = {};
                    responseDoc.serverTime = new Date();
                    return res.status(200).send(responseDoc);
               
                }
            });
        });
    }
    else {
        return res.status(401).end();
    }
}

//module.exports.getMessages = getMessages;
module.exports.getMessageById = getMessageById;
module.exports.deleteMessage = deleteMessage;
module.exports.postMessage = postMessage;
module.exports.getMessages = getMessagesLongPoll;
