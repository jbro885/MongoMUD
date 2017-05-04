var comms = require('./comms.js')
var wait = require('wait.for');
var config = require('./config.js')
var ifun = require('./ifun.js')

module.exports.movePlayer = movePlayer; // Look Around
module.exports.playersInRoom = getActivePlayersInRoom; // List who is in a room
module.exports.playerGet = playerGetObjectFromRoom; // Take Something
module.exports.playerDrop= playerDropObjectInRoom; // Drop Something
module.exports.playerGive = playerGiveToPlayer; // Drop Somethingdb.players
module.exports.Clone = Clone; // Create a new Object Instance
module.exports.Destroy = Destroy; // Destroy an Object Instance
module.exports.hasA = playerHasA; // Destroy an Object Instance

//For manipulating objects



function getActivePlayersInRoom(playerObj,roomName)
{
    var db = playerObj.db;
    var playerCollection = db.collection(config.PLAYERS_COLLECTION_NAME);
    //This one needs an index
    var cursor = wait.forMethod(playerCollection,'find',{location:roomName,
        lastcommand:{$gt:Date.now()-120000}},
        {_id:1,username:1});

    var playerList;
    if(cursor != null) {
        playerList =  wait.forMethod(cursor,'toArray');
    }

    return playerList;

}

function movePlayer(playerObj,roomObj,command,destination)
{
    var db = playerObj.db
    comms.tellPlayer(playerObj, "you go " + command) ; //Do we want this? REVIEW

    var playerCollection = db.collection(config.PLAYERS_COLLECTION_NAME);
   console.log("Moving to " + destination)
    //Get the description of the new room
    var roomCollection = db.collection(config.ROOMS_COLLECTION_NAME);
    var newRoomObj = wait.forMethod(roomCollection,"findOne",{_id:String(destination)});
    if( newRoomObj == undefined ) {
      comms.tellPlayer(playerObj,"The way is blocked");
     return;
  }
  //console.log(newRoomObj);
 
    wait.forMethod(playerCollection,"update",{_id: playerObj._id},{$inc:{moves:1},$set:{location:String(destination),
                                                                         previousLocation: playerObj.location,
                                                                         lastDirection: command}});
    ifun.look(playerObj,newRoomObj);

    //Tell the room I've left 
    if(roomObj) { comms.tellRoom( playerObj, roomObj._id,playerObj.username + " leaves " + command);}
    //Tell the new room I've arrived 
    comms.tellRoom( playerObj, newRoomObj._id,playerObj.username + " arrives ");
}


//Player, Rooms and Objects are all a kind of Container Object really.


//There is a good case for 2 Phase commits here @TALK_TOPIC
//Or not if we don't care
//And there is probably a good way to do them
//Also all this is value neutral so if object have attributes it all works
//We could combine to a move object to object function
//But the comms makes that tricky

function playerGetObjectFromRoom( playerObj, roomObj, what)
{
    //See if it's here
    //We cannot work with the in-memory copy as we have a nice race condition then @TALK_TOPIC
    //We need to use the DB
    //We only want the first one too
    var db = playerObj.db
    var roomCollection = db.collection(config.ROOMS_COLLECTION_NAME);
    var playerCollection = db.collection(config.PLAYERS_COLLECTION_NAME);
    //Query to see if this room has an object of that type
    //If so set it to null, we can't use $pull as that will take all of them
    //We also need to get the details of the one we pulled @TALK_TOPIC
    var query = { "_id" : roomObj._id , "objects.nm": what }
    var stuckquery = { "_id" : roomObj._id , "objects": { "$elemMatch" : { "nm": what, "sticky": true }}}
    var update={$unset:{"objects.$":true}}
    var fields= {"objects.$":1}

    if(wait.forMethod(roomCollection,"findOne",stuckquery) != null)
    {
        comms.tellPlayer(playerObj, "You are unable to take the " + what + " from here") ;
        return;
    }
    var object =   wait.forMethod(roomCollection,"findAndModify",query,[],update,{fields:fields});

    if(object.value == null) {
        comms.tellPlayer(playerObj, "There is no " + what + " here") ;
        return;
    }


    wait.forMethod(roomCollection,"update",{ "_id" : roomObj._id },{$pull:{objects:null}});


    //Now save the object in the player.


    wait.forMethod(playerCollection,"update",{_id: playerObj._id},{$push:{objects:object.value.objects[0]}});
    comms.tellPlayer(playerObj, "You take the " + what) ;
    comms.tellRoom(playerObj, roomObj._id, playerObj.username + " takes the " + what);

}


function playerHasA(playerObj,roomObj,what)
{

    var carried = playerObj.objects
    var objid=null
    for(var o=0;carried && o<carried.length && objid==null;o++)
    {
        if(carried[o] && (carried[o].nm == what || (carried[o].contains && carried[o].contains(what))))
        { 
            
            return true;
        }
    }
    return false;
}

function playerDropObjectInRoom( playerObj, roomObj, what)
{
    //See if it's here
    //We cannot work with the in-memory copy as we have a nice race condition then @TALK_TOPIC
    //We need to use the DB
    //We only want the first one too
    var db = playerObj.db
    var roomCollection = db.collection(config.ROOMS_COLLECTION_NAME);
    var playerCollection = db.collection(config.PLAYERS_COLLECTION_NAME);


    //First see if I have it - again, we cannot assume our current player object is
    //wholly accurate as we may race ourselves
    //Safety over speed

    var query = { "_id" : playerObj._id , "objects.nm": what }
    var update={$unset:{"objects.$":true}}
    var fields= {"objects.$":1}

    var carried = playerObj.objects
    var objid=null
    for(var o=0;carried && o<carried.length && objid==null;o++)
    {
        if(carried[o] && (carried[o].nm == what || (carried[o].contains && carried[o].contains(what))) && carried[o].sticky==true)
        { 
            comms.tellPlayer(playerObj, "One does not simply drop a " + what) ;
            return;
        }
    }

    var object =   wait.forMethod(playerCollection,"findAndModify",query,[],update,{fields:fields});

    if(object.value == null) {
        comms.tellPlayer(playerObj, "You are not carrying a " + what) ;
        return;
    }

    //Not removing the nulls here as we update the player object every turn anyway
    //Let's do it there - hinky code structure  but more efficient
    //wait.forMethod(playerCollection,"update",query,{$pull:{objects:null}});


    //Now add the object to the room


    wait.forMethod(roomCollection,"update",{_id: roomObj._id},{$push:{objects:object.value.objects[0]}});
    comms.tellPlayer(playerObj, "You drop the " + what) ;
    comms.tellRoom(playerObj, roomObj._id, playerObj.username + " drops a " + what);

}

//This is the first complex parser function I've tried
function playerGiveToPlayer( playerObj, roomObj,what)
{
    //First parse out what an ensure this is a legal transaction
    //Give Object to Player or Give Player Object are valid versions
    //Give the Object to Player or Give Player the Object are also valid

    var words = what.trim().split(' ');
    var words = words.map(function(s) { return s.trim() })
    var playername=null
    var objname=null

    if(words.length < 2)
    {
        comms.tellPlayer(playerObj, "Give the what to who?") ;
        return false;
    }
    if(words.length == 2)
    {
        playername=words[0]
        objname=words[1]
    } else
        if(words.length == 3)
        {
            //Give Obj to Player
            if(words[1]=="to")
            {
                objname=words[0]
                playername=words[2]
            } else {
                //Give Player the Obj, Give Player a Obj
                objname=words[2]
                playername=words[0]
            }
        } else
            if(words.length == 4)
            {
                //Give (a|the) object to player
                if(words[2]=="to")
                {
                    objname=words[1]
                    playername=words[3]
                }
            }    
    if(playername == null || objname == null)
    {
        comms.tellPlayer(playerObj, "I didnt understand - try give <object> to <player> or give <player> <object>") ;
        return false;
    }


    //Now lets see if we have the thing and the target is here
    //Not checking race conditions here do that in the transfer

    var carried = playerObj.objects
    var objid=null
    for(var o=0;carried && o<carried.length && objid==null;o++)
    {

        if(carried[o] && (carried[o].nm == objname || (carried[o].contains && carried[o].contains(objname))) )
        {
            if(carried[0].sticky == true) {
                comms.tellPlayer(playerObj, "You cannot give away the " + what) ;
            return;
            }
            objid = carried[o]._id;
        }
    }


    if(objid == null)
    {
        comms.tellPlayer(playerObj, "You aren't carrying a "+objname) ;
        return false;
    }

   

    if(playername == playerObj.username)
    {
        comms.tellPlayer(playerObj, "You can't give it to yourself") ;
        return false;
    }
    var playersHere = getActivePlayersInRoom(playerObj, roomObj._id)
    var playerid=null
    for(var o=0;o<playersHere.length && playerid==null;o++)
    {
        if(playersHere[o] && playersHere[o].username.toLowerCase() == playername.toLowerCase())
        {
            playerid = playersHere[o]._id;
        }
    }

    if(playerid == null)
    {
        comms.tellPlayer(playerObj, playername + " isn't here") ;
        return false;
    }



    var db = playerObj.db
    var playerCollection = db.collection(config.PLAYERS_COLLECTION_NAME);


    //First see if I have it - again, we cannot assume our current player object is
    //wholly accurate as we may race ourselves
    //Safety over speed

    var query = { "_id" : playerObj._id , "objects.nm": objname }
    var update={$unset:{"objects.$":true}}
    var fields= {"objects.$":1}


    var object =   wait.forMethod(playerCollection,"findAndModify",query,[],update,{fields:fields});

    if(object.value == null) {
        return;
    }


    wait.forMethod(playerCollection,"update",{_id:playerid},{$push:{objects:object.value.objects[0]}});

    comms.tellPlayer(playerObj, "You pass the " + objname + " to " + playername) ;
    comms.tellOther(playerObj, playerid, playerObj.username + " gives you " + object.value.objects[0].sd ) ;
    comms.tellRoom(playerObj, roomObj._id, playerObj.username + " gives " + playername + " " + object.value.objects[0].sd,playername);


    return true;
}

function Destroy(playerObj,roomObj,what)
{
    
    var db = playerObj.db
    var playerCollection = db.collection(config.PLAYERS_COLLECTION_NAME);
    var roomCollection = db.collection(config.ROOMS_COLLECTION_NAME);

    var o = wait.forMethod(playerCollection,"update",{_id:playerObj._id},{$pull:{objects:{_id:what}}});
    o = wait.forMethod(roomCollection,"update",{_id:roomObj._id},{$pull:{objects:{_id:what}}});

}
//Bring an object into existence
function Clone(playerObj,roomObj,what,carried)
{

    var db = playerObj.db
    var sequenceCollection = db.collection(config.SEQUENCE_COLLECTION_NAME);
    var objectCollection = db.collection(config.OBJECT_COLLECTION_NAME);
    var roomCollection = db.collection(config.ROOMS_COLLECTION_NAME);
    var playerCollection = db.collection(config.PLAYERS_COLLECTION_NAME);
    
    //Use negated projection here so it works with new fields @TALKTOPIC
    var newObject = wait.forMethod(objectCollection,"findOne",{_id:what},{actions:0,ld:0});
    //console.log( newObject);
    if(!newObject) {
        console.log("ATTEMPT TO CLONE NON EXISTENT OBJECT " + what)
        return true;
    }
    newObject.ob=newObject._id;
    
    var seqQuery = {_id:'objectSeq'};
    var seqUpdate= {$inc:{count:1}};
    
    var seqObj =   wait.forMethod(sequenceCollection,"findAndModify",seqQuery,[],seqUpdate,{upsert:true,new:true});

   
    newObject._id=newObject._id+"#"+seqObj.value.count

    //Put it in the room or the player
    //This is SILENT function
    if(carried == true)
    {
        wait.forMethod(playerCollection,"update",{_id: playerObj._id},{$push:{objects:newObject}});
    } else {
        wait.forMethod(roomCollection,"update",{_id: roomObj._id},{$push:{objects:newObject}});
    }
}


