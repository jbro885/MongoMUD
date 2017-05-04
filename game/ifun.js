/////////////////////////

//Internal Basics - Look, Examine - extension of player behaviour


var comms = require('./comms.js')
var objects = require('./objects.js')
var wait = require('wait.for');
var config = require('./config.js')
var parser = require('./parser.js')
var narrator = require('./narrate.js')
var config = require('./config.js')

module.exports.look = ifunLook; // Look Around
module.exports.examine = ifunExamine; // Look at a thing
module.exports.help = ifunHelp; // List Commands
module.exports.botState = ifunBotState; // List Commands

function generateState(playerObj, roomObj) {
    var state = {};
    var builtIn = [];
    for (var verb in parser.verbs) {
        builtIn.push(parser.verbs[verb].us)
    }
      if(!roomObj)
    {   
        console.log("PLAYER IN UNKNOWN LOCATION:" + playerObj.location);
        var message = "You feel yourself being dragged through space and time!";
        comms.tellPlayer( playerObj, message )
        objects.movePlayer(playerObj,roomObj,'magically',config.START_ROOM); //Destination is a room _id
        return true;
    }
   
    var exits = roomObj.ex;
    var players = [];
    var playerList = objects.playersInRoom(playerObj,roomObj._id)

    playerList.forEach(function(element, index, array) {
        if (element != null && element._id.toString() != playerObj._id.toString()) {
            players.push({_id: element._id, username: element.username});
        }
    });

    var inventory = [];
    var objectsCarried = playerObj.objects;
    if (!objectsCarried) {
        objectsCarried = [];
    }

    objectsCarried.forEach(function(element, index, array) {
        if (element != null) {
            var o = element.nm;
            inventory.push(o);
        }
    })

    state['location'] = {};

    // ////////////////
    //If there are no other players here - we might spawn a random object at this point

    if(players.length == 0 && (roomObj.objects==null ||roomObj.objects.length==0 )) {
        for(po=0;po<config.RANDOM_OBJECTS.length;po++)
        {
         if(Math.random() < config.RANDOM_OBJECTS[po][0]) {

        //Random things that can appear

         objects.Clone(playerObj,roomObj,config.RANDOM_OBJECTS[po][1],false);
         //And reload the room
         var roomCollection = playerObj.db.collection(config.ROOMS_COLLECTION_NAME);
         roomObj = wait.forMethod(roomCollection, "findOne", {_id : playerObj.location});
         break
         }
        }
     }



    ///////////////////////////////////
    if (roomObj) {
        var roomObjects = [];
        var objectsHere = roomObj.objects;

        if (!objectsHere) {
            objectsHere = [];
        }

        objectsHere.forEach(function(element, index, array) {
            if (element != null) {
                roomObjects.push({key: element.nm, desc: element.sd});
            }
        })

        state.location.id = roomObj._id;
        if(roomObj.ld) {
          state.location.desc = roomObj.ld;
          state.location.name = roomObj.sd;
        } else {
         console.log(JSON.stringify(roomObj)); 
          var desc = narrator.describe(roomObj.waynames)
          state.location.desc  = desc[0] +  narrator.describeNearbyObjects(roomObj.nearby)
          state.location.name = desc[1]
        }

        state.location.previous = playerObj.previousLocation;
        state.lastDirection = playerObj.lastDirection;
        state['roomObjects'] = roomObjects;
    }

    state['inventory'] = inventory;
    state['playerId'] = playerObj._id;
    state['builtIn'] = builtIn;
    state['exits'] = exits;
    state['players'] = players;
    state['geo'] = roomObj.p;


    return state;
}

function ifunBotState(playerObj, roomObj, arg) {
    var state = generateState(playerObj, roomObj, arg);
    state.messageType = 'state';

    var objectsArray = [];
    state.roomObjects.forEach(function(element) {
        if (element.desc) {
            objectsArray.push(element.key);
        }
    });

    state.roomObjects = objectsArray;
    comms.tellPlayer(playerObj,JSON.stringify(state));
}

function ifunHelp(playerObj,roomObj,arg)
{
    var state = generateState(playerObj, roomObj, arg);
    var verbList = state.builtIn.join(', ');
    var exits = Object.keys(state.exits).join(', ');

    comms.tellPlayer(playerObj,"Verbs: " + verbList);
    comms.tellPlayer(playerObj,"Exits: " + exits);

    var objectsArray = [];
    state.roomObjects.forEach(function(element) {
        if (element.desc) {
            objectsArray.push(element.desc);
        }
    });

    var objectsHere = objectsArray.join(', ');
    var playersList = [];
    for (var player in state.players) {
        playersList.push(state.players[player].username)
    }

    var playersHere = playersList.join(', ');
    var inventory = state.inventory.join(', ');

    comms.tellPlayer(playerObj,"Inventory: " + inventory);
    comms.tellPlayer(playerObj,"Players: " + playersHere);
    comms.tellPlayer(playerObj,"Room objects: " + objectsHere);
}

function ifunLook(playerObj,roomObj,arg) {

    var state = generateState(playerObj, roomObj, arg);

    if(!state.location.id)
    {
        var message = "This is the void, it's a big empty space with nothing in it, how did you get here?";
        comms.tellPlayer( playerObj, message )
        message = "You feel yourself being dragged through time and space?";
        comms.tellPlayer( playerObj, message )
        objects.movePlayer(playerObj,roomObj,'magically',config.START_ROOM); //Destination is a room _id
        return true;
    }

    comms.tellPlayer( playerObj, state.location.desc ) ;

    //List all Objects present - have to deal with nulls
    var objectsHere = state.roomObjects;

    var first=true
    if(objectsHere) {

         for(var o=0;o<objectsHere.length;o++){
            if(objectsHere[o])
            {
                if(first==true)
                {
                    comms.tellPlayer(playerObj,"You can see:");
                    first=false;
                }
                comms.tellPlayer(playerObj,objectsHere[o].desc);
            }
        }
    }

    //Add a list of Players present
    var playerList = state.players;

    playerList.forEach(function(element, index, array) {
        if(element._id.toString() != playerObj._id.toString() )
        {
            comms.tellPlayer( playerObj, element.username+" is here");
        }
    })

    return true;
}

function ifunExamine(playerObj,roomObj,what)
{
    //Check the room first
    //Is it a thing

    var objectsHere = roomObj.objects;
    if(objectsHere && objectsHere.length) {
        for(var o=0;o<objectsHere.length;o++){
            console.log("-"+what+"- -"+objectsHere[o].nm+"-")
            if(objectsHere[o].nm == what) {
                //Look up the detailed description
               
                var objectCollection = playerObj.db.collection(config.OBJECT_COLLECTION_NAME);
                var objectObj = wait.forMethod(objectCollection,"findOne",{_id: objectsHere[o].ob});
                if(objectObj) {
                    comms.tellPlayer( playerObj, objectObj.ld )
                }

                //Tell Room
                comms.tellRoom(playerObj, roomObj._id, playerObj.username + " examines the " + objectsHere[o].nm)
                return true;
            }
        }
    }
    
    objectsHere = playerObj.objects;
    if(objectsHere && objectsHere.length) {
        for(var o=0;o<objectsHere.length;o++){
            if(objectsHere[o].nm == what) {
                //Look up the detailed description
               
                var objectCollection = playerObj.db.collection(config.OBJECT_COLLECTION_NAME);
                var objectObj = wait.forMethod(objectCollection,"findOne",{_id: objectsHere[o].ob});
                if(objectObj) {
                    comms.tellPlayer( playerObj, objectObj.ld )
                }

                //Tell Room
                comms.tellRoom(playerObj, roomObj._id, playerObj.username + " examines the " + objectsHere[o].nm)
                return true;
            }
        }
    }
    
    //TODO - Examining a person and seeing at least what they are carrying
    
    return false;
}

