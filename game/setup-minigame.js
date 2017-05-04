
use mud;

//There is a .js config file with some things to set too.

//Notification collections

db.createCollection('messageNotification');
db.runCommand( { convertToCapped: 'messageNotification', size: 1048576 } )
db.messageNotification.createIndex({ts:1, dt:1, to:1});
db.message.createIndex({ts:1});


db.users.createIndex({location:1,lastcommand:-1})
db.users.createIndex({username:1})

//Old bot based testing

db.apiKeys.insert({ "_id" : "apikeyforbot", "active" : true, "hosts" : [ "localhost" ] });

//Object functions



var getNextObjectNo =  function() {
    return  db.sequences.findAndModify({
        query:{_id:'objectSeq'},
        upsert:true,
        new:true,
        update:{$inc:{count:1}},
        fields:{count:1}
    }).count
}

var cloneObject = function(objectname,location) {
    thing = db.objects.findOne({_id:objectname},{ld:0,actions:0})
    thing.ob = thing._id;
    seqno = getNextObjectNo()
    thing._id = thing.ob + "#" + seqno
    db.rooms.updateOne({_id:location},{$push:{objects:thing}})

}



// Rooms in the game
db.rooms.drop()

db.rooms.save({_id:"/town/square/fountain",
    ld:"You are at the north end the town square next to a fountain you can go south from here.",
    ex:{s:"/town/square/south"}})

db.rooms.save({_id:"/town/square/south",
    ld:"You are at the south end the town square,to the north is a fountain, the town hall is to the east",
    ex:{n:"/town/square/fountain", e: "/town/hall"}})

db.rooms.save({_id:"/town/hall",
                ld: "You are in the town hall, this is where everyone hears the news. a door to the west leads to the town square",
                ex:{ w: "/town/square/south"}})





//Version one lets have a DSL
//I'd love to use javascript BUT...

//verifyArgs - check any additional params
//tellPlayer - What to say to the player
//tellRoom - What to tell everyone else
//cloneObjectPlayer - Create an object on the player 
//cloneObjectRoom - Create an object in the room
//destroyThis - Destroy this object 
//destroyCarried - Desttroy an object on the player
//verifyThisCarried - Ensure this object is being carried

//Object Templates
db.objects.drop()

db.objects.save({_id:"townfountain",
                sticky:true, 
                nm:"fountain",
                sd:"A tinkling fountain",
                ld:"A stone basin about 10 feet across with a jet of water in the middle"
})

cloneObject("townfountain","/town/square/fountain")


db.objects.save({_id:"gold_coin",nm:"coin",sd:"A small gold coin",
    ld:"Its a very old coin, the images worn smooth as it passed through many hands",
    verbs: ["bite"], actions : { bite: { verifyArgs: "coin",
        tellPlayer: "You bite the coin, it's soft, almost certainly real gold",
        tellRoom:   "bites the coin",
        verifyThisCarried: true}}})

cloneObject("gold_coin","/town/square/south")



