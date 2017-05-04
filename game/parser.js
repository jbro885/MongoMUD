/////////////////////

//Handle parsing what the player types

var comms = require('./comms.js')
var objects = require('./objects.js')
var wait = require('wait.for');
var ifun = require('./ifun.js')
var config = require('./config.js')
var player = require('./player.js')
var custom = require('./custom.js')

var verbs = {
    examine : {
        fn : ifun.examine,
        us : "examine <thing>"
    },
    look : {
        fn : ifun.look,
        us : "look"
    },
    say : {
        fn : player.say,
        us : "say <anything>"
    },
    emote : {
        fn : player.emote,
        us : "emote <anything>"
    },
    help : {
        fn : ifun.help,
        us : "help"
    },
    inventory : {
        fn : player.inventory,
        us : "inventory"
    },
    get : {
        fn : objects.playerGet,
        us : "get <object>"
    },
    drop : {
        fn : objects.playerDrop,
        us : "drop <object>"
    },
    give : {
        fn : objects.playerGive,
        us : "give <object> to <player>"
    },
    botstate: {
        fn: ifun.botState,
        us: "botState"
    },
    visit: {
        fn: player.visit,
        us: "visit <address>"
    }
}

var alias = {
    i : "inventory",
    north : "n",
    south : "s",
    east : "e",
    west : "w",
    up : "u",
    down : "d",
    ex : "examine",
    exa : "examine",
    take : "get",
    put : "drop"
};

module.exports.parseCommand = parseCommand;
module.exports.verbs = verbs;

// Every time a player sends us something this gets called
function parseCommand(playerObj, command) {
    var parsed = false; // Did we understand it at all?

    comms.tellPlayer(playerObj, ">" + command.trim());

    var words = command.trim().split(' ');
    var verb = words[0].trim().toLowerCase()
    var arg = command.substring(verb.length).trim().toLowerCase()

    if (alias[verb])
        verb = alias[verb]; // Lookup for alternate versions

    // Update the last action time
    var playerCollection = playerObj.db
            .collection(config.PLAYERS_COLLECTION_NAME);
    // Code in here to remove null (dropped) objects too - clean up code from
    // dropObject

    wait.forMethod(playerCollection, "update", {
        _id : playerObj._id
    }, {
        $pull : {
            objects : null
        },
        $set : {
            lastcommand : Date.now()
        }
    });

    // Every time the player types a command we want to know where they are
    // As so much will depend on that so let's get the room they are in (which
    // holds all the objects in there too)
    // 90% will depend on the room, it's contents and the player object itself

    var roomCollection = playerObj.db.collection(config.ROOMS_COLLECTION_NAME);
    var roomObj = wait.forMethod(roomCollection, "findOne", {
        _id : String(playerObj.location) });

    if(!roomObj)
    {
        console.log("PLAYER IN UNKNOWN LCOATION:" + playerObj.location);
        var message = "You feel yourself being dragged through space and time!";
        comms.tellPlayer( playerObj, message )
        objects.movePlayer(playerObj,roomObj,'magically',config.START_ROOM); //Destination is a room _id
        return true;
    }
    // For now simple - but we need to handle where these don't work
    // And pass to more specific handlers
    // Might return false because you for example tried to get something non
    // existent
    if (verbs[verb]) {
        parsed = true;
        if (verbs[verb].fn(playerObj, roomObj, arg) == true)
            return true;
    }

    // Check if they typed a valid direction to move
    if (player.tryDirection(playerObj, roomObj, verb) == true) {
        parsed = true;
        return true;
    }

    // Now we need to check if any object we have in the room
    // or are carrying defined the verb they typed

    // Carried comes before environment
    var carried = playerObj.objects;
    for (var o = 0; carried && o < carried.length; o++) {
        if (carried[o] && carried[o].verbs
                && carried[o].verbs.indexOf(verb) > -1) {
            if (custom.tryVerb(playerObj, roomObj, carried[o], verb, arg, true) == true)
                return true;
        }
    }
    // Carried comes before environment
    var present = roomObj.objects;
    for (var o = 0; present && o < present.length; o++) {
        if (present[o] && present[o].verbs
                && present[o].verbs.indexOf(verb) > -1) {
            if (custom
                    .tryVerb(playerObj, roomObj, present[o], verb, arg, false) == true)
                return true;
        }
    }

    // Test function - Wizards ONLY - TODO - enforce this
    if (playerObj.wizard == true || true) {

        if (verb == "clone") {
            objects.Clone(playerObj, roomObj, arg, true);
            return true;
        }

        if (verb == "visit") {
            //Got to the location of a player
            //TODO
        }
        if (verb == "teleport") {
            player.teleport(playerObj, roomObj, arg);
            console.log("teleport to " + arg)
            return true;
        }
    }
    if (parsed == false) {
        comms.tellPlayer(playerObj, "Sorry, I don't know how to do that");
    }
    return true;
}
