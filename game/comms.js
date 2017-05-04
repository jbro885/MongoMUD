//////////////////////////
//
// Low level message passing to players and rooms

var wait = require('wait.for');
var config = require('./config.js')
var objects = require('./objects.js')
var mongoDB = require('mongodb');

module.exports.tellOther = tellOther;
module.exports.tellPlayer = tellPlayer;
module.exports.tellRoom = tellRoom;


//Tell everyone in the room except player (May be extended to tell all objects in future too)
//We can pass regexen in for roomName too!
function tellRoom(playerObj,roomName,msg,dontTell)
{
    var playersInRoom = objects.playersInRoom(playerObj,roomName)
    
    for(var p=0;p<playersInRoom.length;p++)
    {
        var otherPlayer = playersInRoom[p];
        otherPlayer.db=playerObj.db; //A little hacky REVIEW
        if( otherPlayer._id.toString() != playerObj._id.toString() && otherPlayer.username != dontTell) {
            tellPlayer(otherPlayer,msg);
        }
    }
}

//Pass a message to a single player
//TODO - possibly remove 'from' in these to save space
function tellPlayer(playerObj,msg)
{
    var db = playerObj.db
    var messageTimestamp = new Date();
    var userid = playerObj['_id'].toString();
    var collection = db.collection(config.MESSAGES_COLLECTION_NAME);
    
    var doc= { ts: messageTimestamp, from: userid, to: userid, content: msg}
    wait.forMethod(collection,"insertOne",doc);

    var notificationCollection = db.collection(config.NOTIFICATION_COLLECTION_NAME);
    var message = {to: userid, ts: new mongoDB.Timestamp(0, messageTimestamp/1000), dt: messageTimestamp};
    
    wait.forMethod(notificationCollection,"insertOne",message);
}

function tellOther(playerObj,otherID,msg)
{
    var db = playerObj.db
    var messageTimestamp = new Date();

    var userid = otherID.toString();
    console.log(">>>>tellOther " + otherID + " :" + msg)
    var collection = db.collection(config.MESSAGES_COLLECTION_NAME);
    
    var doc= { ts: messageTimestamp, from: userid, to: userid, content: msg}
    wait.forMethod(collection,"insertOne",doc);

    var notificationCollection = db.collection(config.NOTIFICATION_COLLECTION_NAME);
    var message = {to: userid, ts: new mongoDB.Timestamp(0, messageTimestamp/1000), dt: messageTimestamp};
    
    wait.forMethod(notificationCollection,"insertOne",message);
}
