


//Behaviours of the specific Player Object

var comms = require('./comms.js')
var objects = require('./objects.js')
var wait = require('wait.for');
var config = require('./config.js')
var ifun = require('./ifun.js')
var request = require("request");

module.exports.tryDirection = tryDirection; // Look Around
module.exports.say = say; // Player informs others in the room
module.exports.emote = emote; // Player informs others in the room
module.exports.inventory = inventory; // Player informs others in the room
module.exports.teleport = wizTeleport;
module.exports.visit = wizVisit;


//MAY CHANGE BACK OT DSC NEED LAT/LONG INDEX THOUGH

function wizVisit(playerObj,roomObj,destination)
{
   if( destination.length < 2)
   {
      comms.tellPlayer(playerObj, "You need to use visit street,town,country  ") ;
      return true;
   }
   var uri="https://maps.googleapis.com/maps/api/geocode/json?address=";
   uri=uri+encodeURI(destination);
   uri=uri+"&key=AIzaSyBotgkwNpOvEnPLarM_826PSIAuCyensxw"


   //var host ='http://www.datasciencetoolkit.org';
   //var uri = host + "/street2coordinates/" + encodeURI(destination);
   
   //uri = "http://nominatim.openstreetmap.org/search/" + encodeURI(destination) + "?"
   //uri=uri  + encodeURI('format=json')
 
   console.log("wizVisit");



   var reply = wait.for(request,uri)
   var data = JSON.parse(reply.body);
   console.log(data)
 
        location = data.results[0]

        if(location && location.geometry)
        {
            comms.tellPlayer(playerObj, "Hopefully taking you to somewhere near ") ;
            comms.tellPlayer(playerObj, location.formatted_address) ;
            var db = playerObj.db
            var roomCollection = db.collection(config.ROOMS_COLLECTION_NAME);

            var locus = [ parseFloat(location.geometry.location.lng),parseFloat(location.geometry.location.lat) ];
            var qnear = { p: { "$near":locus }, "waynames.type" : {$exists:true},"waynames.name" : { $type: 2} }
            console.log(qnear)
            var newRoomObj= wait.forMethod(roomCollection,"findOne",qnear);
            console.log(newRoomObj);
              
            objects.movePlayer(playerObj,roomObj,"magically",newRoomObj._id); //Destination is a room _id
            return true;
          }
        
   comms.tellPlayer(playerObj, "Cannot locate " + destination) ;
   return true;
}



function wizTeleport(playerObj,roomObj,destination)
{

    objects.movePlayer(playerObj,roomObj,"magically",destination); //Destination is a room _id
    return true;
}

//Query the players current location to see if direction is a valid move

function tryDirection(playerObj,roomObj,direction)
{

    if(roomObj == null || roomObj.ex==null || roomObj.ex[direction]==null ) return false; //No room
    objects.movePlayer(playerObj,roomObj,direction,roomObj.ex[direction]); //Destination is a room _id
    return true;
}

function say(playerObj,roomObj,args)
{
    comms.tellPlayer(playerObj, "You say "+ args) ;
    comms.tellRoom(playerObj, roomObj._id, playerObj.username + " says " + args);
    return true;
}

//Change this or remove it - it's a stopgap for now
//emote yawn loudly for example doesnt work
function emote(playerObj,roomObj,args)
{
    comms.tellPlayer(playerObj, "You  "+ args) ;
    comms.tellRoom(playerObj, roomObj._id, playerObj.username + " " +args+"s");
    return true;
}

//Change this or remove it - it's a stopgap for now
//emote yawn loudly for example doesnt work
function inventory(playerObj,roomObj,args)
{
    var carried = playerObj.objects;
    console.log(objects);
    if(!carried || carried.length == 0)
    {
        comms.tellPlayer(playerObj,"You aren't carrying anything");
        return;
    } 
        comms.tellPlayer(playerObj,"You have: ");
        for(var o=0;o<carried.length;o++)
        {
            if(carried[o] != null) {
                comms.tellPlayer(playerObj,carried[o].sd)    
            }
        }
    
    return true;
}
