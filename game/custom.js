/////////////////////

//all the code for custom object definitions

var config = require('./config.js')
var wait = require('wait.for');
var comms = require('./comms.js')
var objects = require('./objects.js')
var util = require('util');
module.exports.tryVerb = tryVerb; 



function destroyCarried( playerObj, roomObj, what)
{
    //See if it's here
    //We cannot work with the in-memory copy as we have a nice race condition then @TALK_TOPIC
    //We need to use the DB
    //We only want the first one too
    var db = playerObj.db
    var playerCollection = db.collection(config.PLAYERS_COLLECTION_NAME);


    //First see if I have it - again, we cannot assume our current player object is
    //wholly accurate as we may race ourselves
    //Safety over speed
    console.log("Destroying carrired" + what)
    var query = { "_id" : playerObj._id , "objects.nm": what }
    var update={$unset:{"objects.$":true}}
    var fields= {"objects.$":1}


    var object =   wait.forMethod(playerCollection,"findAndModify",query,[],update,{fields:fields});
    console.log(object);
   return;
}



function tryVerb(playerObj,roomObj,activeObj,verb,arg,carried)
{
    console.log("CUSTOM ACTION " + verb + " on " + activeObj._id)
    var objectCollection = playerObj.db.collection(config.OBJECT_COLLECTION_NAME);

    var project={_id:0}
    project["actions."+verb]=1
    var objectObj = wait.forMethod(objectCollection,"findOne",{_id: activeObj.ob},project);
    if(!objectObj || !objectObj.actions) return false;
    var actions = objectObj.actions[verb];
    if(!actions) return false
    console.log(actions)

    //Verify args - check what they followed it up with, like was it our name
    //This object needs you to name it - 'read leaflet' 'wield sword'
    //May add placeholders in here so you can apply it to a thing

    if(actions.verifyArgs)
    {
        if (util.isArray(actions.verifyArgs)) {
            if(!actions.verifyArgs.contains(arg)) {
                console.log("arg " + arg + " not this object")
                return false;
            }
        } else {
            if(actions.verifyArgs != arg) return false;
        }
    } 


    //TODO - handle this in a nicer way 
    if(actions.verifyThisCarried && !carried) 
    {
        comms.tellPlayer(playerObj,"You need to pick it up first") ;
        return true;
    }

  //Make sure I am carring other things
  if(actions.verifyCarried) 
    {
        nmlist = [].concat(actions.verifyCarried);

        for(var o=0;o<nmlist.length;o++)
        {
            if(! objects.hasA(nmlist[o])) {
                comms.tellPlayer(playerObj,"You need a " + nmlist[o]+ " for that") ;
                return true;
            }
        }
        return true;
    }
    //Verification checks first

    //Can be an array of things to create
    if(actions.cloneObjectPlayer)
    {
        if(actions.cloneObjectPlayer.constructor === Array)
        {
            for(var o=0;o<actions.cloneObjectPlayer.length;o++)
            {
                objects.Clone(playerObj,roomObj,actions.cloneObjectPlayer[o],true)
            }
        } else {
            objects.Clone(playerObj,roomObj,actions.cloneObjectPlayer,true)
        }
    }
    
    if(actions.cloneObjectRoom)
    {
        if(actions.cloneObjectRoom.constructor === Array)
        {

            for(var o=0;o<actions.cloneObjectRoom.length;o++)
            {
                objects.Clone(playerObj,roomObj,actions.cloneObjectRoom[o],false)
            }
        } else {
            objects.Clone(playerObj,roomObj,actions.cloneObjectRoom,false)
        }
    }


    if(actions.destroyThis)
    {
        objects.Destroy(playerObj,roomObj,activeObj._id)
    }

    //Destroy any onther objects, one instance of each
    if(actions.destroyCarried)
    {
        console.log("destroying carried " + actions.destroyCarried)
        objlist = [].concat(actions.destroyCarried);
        console.log(objlist);
        for(var o=0;o<objlist.length;o++)
        {
            console.log("" + o + "=" + objlist[o])
            destroyCarried(playerObj,roomObj,objlist[o])
        }
    }

    //Tell the player
    if(actions.tellPlayer) {
        comms.tellPlayer(playerObj, actions.tellPlayer) ;
    }
    if(actions.tellRoom) {
        comms.tellRoom(playerObj,roomObj._id, playerObj.username + " " + actions.tellRoom) ;
    }


    return true; //We handled it
}