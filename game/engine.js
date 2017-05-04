var wait = require('wait.for');
var parser = require('./parser.js')

module.exports.playerInput = playerInput;
//A little care we dont simply save the player object we have here
//As we added the db into it

function playerInput(playerObj,command)
{
    wait.launchFiber(parser.parseCommand,playerObj,command);
    return true;
}
