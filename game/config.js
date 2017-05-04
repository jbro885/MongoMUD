module.exports.MESSAGES_COLLECTION_NAME = 'message';
module.exports.NOTIFICATION_COLLECTION_NAME = 'messageNotification';
module.exports.PLAYERS_COLLECTION_NAME = 'users';
module.exports.ROOMS_COLLECTION_NAME = 'rooms';
module.exports.OBJECT_COLLECTION_NAME = 'objects';
module.exports.SEQUENCE_COLLECTION_NAME = 'sequences';




//Where new players start
module.exports.START_ROOM = "/town/square/fountain";
//Things that can pop up randomly
//[probability,objects]
module.exports.RANDOM_OBJECTS = [[0.05,"a_cola_can"],[0.05,"gold coin"]]

String.prototype.title = function() {
    return this.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] == obj) {
            return true;
        }
    }
    return false;
}

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

