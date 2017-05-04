
use mud;

db.createCollection('messageNotification');
db.runCommand( { convertToCapped: 'messageNotification', size: 1048576 } )
db.messageNotification.createIndex({ts:1, dt:1, to:1});
db.message.createIndex({ts:1});

db.apiKeys.insert({ "_id" : "apikeyforbot", "active" : true, "hosts" : [ "localhost" ] });

db.rooms.drop()
db.rooms.save({_id:"/town/square/fountain",ld:"You are at the north end the town square next to a fountain you can go south from here.",ex:{s:"/town/square/south"}})
db.rooms.save({_id:"/town/square/south",ld:"You are at the south end the town square, to the north is a fountain",ex:{n:"/town/square/fountain"}})


db.objects.drop()
db.users.update({},{$unset:{objects:true}},true,true)
db.users.createIndex({location:1,lastcommand:-1})
db.users.createIndex({username:1})



//Version one lets have a DSL
//I'd love to use javascript BUT...

//verifyArgs - check any additional params
//tellPlayer - What to say to the player
//tellRoom - What to tell everyone else
//cloneObjectPlayer - Create an object on the player TODO
//cloneObjectRoom - Create an object in the roomß TODO
//destroyThis - Destroy this object TODO


db.objects.save({_id:"thirst",sticky:true,nm:"thirst",sd: "A powerful thirst",ld:"it's a thirst like you have never felt, you really "
+"can't concentrate on much until you assuage it"})

db.objects.save({_id:"gold_coin",nm:"coin",sd:"A small gold coin,
    ld:"Its a very old coin, the images worn smooth as it passed through many hands",
    verbs: ["bite"], actions : { bite: { verifyArgs: "coin",
        tellPlayer: "You bite the coin, it's soft, almost certainly real gold",
        tellRoom:   "bites the coin",
        verifyThisCarried: true}}})



db.objects.save({_id:"a_cola_can",nm:["can","full can","coke","cola"],sd:"A can of cola",
    ld:"A can of some generic, supermarket brand of cola, probably one that tastes not quite right",
    verbs: ["drink"], 
    actions : { drink: { verifyArgs: ["cola","can","coke"],
        tellPlayer: "You drink the cola and feel refreshed.",
        tellRoom:   "drinks from a can",
        cloneObjectPlayer: ["a_empty_can"],
        destroyThis: true,
        destroyCarried: 'thirst',
        verifyThisCarried: true}}})

db.objects.save({_id:"a_empty_can",nm:["empty can","can"],sd:"An empty cola can",
    ld:"A can that once held generic, supermarket brand of cola",
    verbs: ["drink"], actions : { drink: { verifyArgs: ["cola","can","coke"],
        tellPlayer: "it's empty.",
        tellRoom:   "looks into an empty can like they wish it wasn't empty",
        verifyThisCarried: true}}})


//On rebuild move all users back to fountain

db.users.update({},{$set:{location:"/town/square/fountain"}},{multi:true})


//Convert a template to an object instance

drink = db.objects.findOne({_id:"a_cola_can"},{ld:0,actions:0})
drink.ob=drink._id;

seqno = db.sequences.findAndModify({
    query:{_id:'objectSeq'},
    upsert:true,
    new:true,
    update:{$inc:{count:1}},
    fields:{count:1}
}).count
drink._id=drink._id+"#"+seqno


db.rooms.update({_id:"/town/square/south"},{$push:{objects:drink}})



//Mission 1 find a can of coke

thirst = db.objects.findOne({_id:"thirst"},{ld:0,actions:0})
thirst.ob=thirst._id;

seqno = db.sequences.findAndModify({
    query:{_id:'objectSeq'},
    upsert:true,
    new:true,
    update:{$inc:{count:1}},
    fields:{count:1}
}).count

thirst._id=thirst._id+"#"+seqno


db.users.update({username:"john"},{$push:{objects:thirst}})



