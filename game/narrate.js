module.exports.describe = describe; // Look Around
module.exports.describeNearbyObjects = describeNearbyObjects; // Look at a
// thing

function safeGet(object, key) {
    if (object[key])
        return object[key]
    else
        return null
}

var dirmap = {
        'n' : 'North',
        'ne' : 'Northeast',
        'e' : 'East',
        'se' : 'Southeast',
        's' : 'South',
        'sw' : 'Southwest',
        'w' : 'West',
        'nw' : 'Northwest'
}


function describeWayDirs(w) {
    var dw = ""
    var dirs = w['dirs']
    if (dirs.length > 1) {
        // Ordering matters, look for exists in the order below.
        var first = true
        var dirlist = [ 'n', 's', 'e', 'w', 'ne', 'se', 'sw', 'nw' ];
        for (var dri=0;dri<dirlist.length;dri++) {
            var dr = dirlist[dri]
                if (dirs.contains(dr))  {
                    if (first == false) {
                        dw = dw + " and " + dirmap[dr]
                    } else {
                        dw = dw + " " + dirmap[dr]
                        first = false
                    }
                }     
        }
    } else if (dirs.length == 1) {
        // get the lone key from the first and only thing in the array - i.e.
        // one direction

        dw = dw + " " + dirmap[dirs[0]]
    } else {
        console.log(w)
        console.log("No Dirs?")
    }
    return dw
}

function mapType(type, w) {
    if (type == null) {
        type = "narrrow track"
    }
    // Grammar mutation - TODO Move to a hash
    else if (type == 'service') {
        type = 'service road'
    } else if (type == 'residential') {
        type = 'street'
    } else if (type == 'tertiary') {
        var junc = safeGet(w, 'junction')
        if (junc) {
            type = junc
        } else {
            type = 'minor road'
        }
    } else if (type == 'footway') {
        type = 'footpath'
    } else if (type == 'unclassified') {
        type = 'minor road'
    }
    else if (type == 'primary') {
        type = 'road'
    }
    else if (type == 'taxi') {
        type = 'taxi rank'
    }
    type = type.replace('_', ' ')
    return type
}

//Describe where I am
//location data is a list of ways meeting at this location and the directions
//you can go on each
//Each has a type, a name, may be a bridge etc
function describe(locationdata) {
    
    var numnames = 0 // How many things with names have
    var d = ""
        var firstloc = null
        // We go through the location data twice, because we describe all the Named
        // Ways
        // Then we describe all the unnamed ways like paths
        for (var wi=0;wi<locationdata.length;wi++) {
            var w = locationdata[wi]
            var name = safeGet(w, 'name') // Does this Way have a name? Mill Road etc.
            if (name) {
                if (numnames == 0) {
                    d = "You are "
                    if(name.toLowerCase().indexOf('street') > -1)
                    {
                        d = d + " on"
                    } else {
                        d = d + " in"
                    }
                    d= d + " " + name
                    if (safeGet(w, 'bridge')) {
                        d = d + " on a bridge"
                    }
                    firstloc = name
                    d = d + " which leads"
                    d = d + describeWayDirs(w)
                    numnames = numnames + 1
                } else if (numnames == 1) {
                    d = d + ", " + name + " goes"
                    d = d + describeWayDirs(w) + " from here"
                    numnames = numnames + 1
                } else {
                    d = d + ", and " + name + " goes to the"
                    d = d + describeWayDirs(w)
                }
            }
        }
    // Add info about any unnamed ways, like paths
    var numtypes = 0
    console.log(JSON.stringify(locationdata))
    for (wi=0;wi<locationdata.length;wi++) {
        w = locationdata[wi]
        name = safeGet(w, 'name')
        var type = safeGet(w, 'type')
        var type = mapType(type, w)
        
        if (numnames == 0) {
            d = "You are standing on "
        } 
        if (name == null) {
            if(numnames != 0) {
                        d=d+", " 
        }
            if (numtypes == 0) {
                if (firstloc == null) {
                    firstloc = addArticle(type).title()
                }
                d = d + addArticle(type) 
                if(numnames == 0) 
                {
                    d=d+ " which"
                }
                d= d + " goes"
                d = d + describeWayDirs(w) + " from here"
                if (safeGet(w, 'bridge')) {
                    d = d + " over a bridge"
                }
                first_type = type;
                numtypes = numtypes + 1
            } else if (numtypes == 1) {
                if (first_type == type) {
                    // Not great if we have 1 X and 2 Y'
                    d = d + " there is another " + type + " which heads to the"
                } else {
                    d = d + " there is also " + addArticle(type)
                    + " which goes"
                }
                d = d + describeWayDirs(w)
                numtypes = numtypes + 1
            } else {
                d = d + " in addition " + addArticle(type) + " goes to the"
                d = d + describeWayDirs(w)
            }
        }
    }
    if (numtypes > 0) {
        d = d + ". "
    }
    return [ d, firstloc ]
}

function addArticle(what) {
    if (what.slice(-1) == 's' || what.slice(-3) == 'ing') {
        return 'some ' + what.toLowerCase()
    } else if (what.charAt(0) in [ 'a', 'e', 'i', 'o', 'u' ]) {
        return 'an ' + what.toLowerCase()
    } else {
        return 'a ' + what.toLowerCase()
    }
}

function describeNearbyObjects(what) {
    var rv = ""
        if (!what || what.length == 0) {
            return ""
        }
    var eachdir = {}
    for (var obji=0;obji< what.length;obji++) {
        var obj = what[obji]
        var dir = obj['d']
        var item = obj['n']
        if (safeGet(eachdir, dir)) {
            if (safeGet(eachdir[dir], item)) {
                eachdir[dir][item] = eachdir[dir][item] + 1
            } else {
                eachdir[dir][item] = 1
            }
        } else {
            eachdir[dir] = {}
            eachdir[dir][item] = 1
        }
    }

    for ( var d in eachdir) {
        rv = rv + " To your " + dirmap[d] + " you can see "
        var c = 0
        var l = Object.keys(eachdir[d]).length

        for ( var t in eachdir[d]) {
            var mt=mapType(t);
            if (c > 0) {
                if (c == l - 1) {
                    rv = rv + ", and "
                } else {
                    rv = rv + ", "
                }
            }
            if (eachdir[d][t] == 1) {
                rv = rv + addArticle(mt)
            } else if (eachdir[d][t] == 2) {
                rv = rv + "two " + mt + "s"
            } else if (eachdir[d][t] < 4) {
                rv = rv + "several " + mt + "s"
            } else {
                rv = rv + "many " + mt + "s"
            }

            c = c + 1
        }
        rv = rv + "."
    }
    return rv
}
/*
 * nearby = [ { "d" : "sw", "n" : "bus stop" }, { "d" : "sw", "n" : "convenience
 * store" } ]
 * 
 * waynames = [ { "dirs" : [ { "e" : -1 } ], "type" : "path", "name" : null }, {
 * "dirs" : [ { "sw" : "1077644134" }, { "n" : "1090904168" } ], "bridge" :
 * null, "junction" : null, "name" : "Brora Crescent", "type" : "residential" } ]
 * 
 * desc = describe(waynames) neardesc = describeNearbyObjects(nearby)
 * console.log(desc[0]) console.log(neardesc)
 */

