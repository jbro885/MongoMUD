var app = angular.module('mdbMUD', ['ngResource','luegg.directives'])
    .factory('Message', function($resource) {
        return $resource('/message/:id', null,
            {
                'save':  {method:'POST'},
                'query': {method:'GET', isArray:true},
            });
});


/*This directive allows us to pass a function in on an enter key to do what we want.
 */
app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
 
                event.preventDefault();
            }
        });
    };
});


app.controller('messageCtrl', function($scope, $timeout, Message) {

    $scope.messages = [];

    $scope.send = function() {
        Message.save($scope.message, function() {
           $scope.message.content = '';
        });
    };

    var socket = io.connect('http://localhost:3000');

    socket.on('connect', function() {

    })

    socket.on('message', function(data) {
        $scope.messages = $scope.messages.concat(JSON.parse(data));
        $scope.$apply();
    })

    var getLastMessages = function() {
        var loadDate = new Date();
        loadDate.setMinutes(new Date().getMinutes() - 2);
        var serverMessage = Message.query({ time: loadDate }, true,  function() {
            $scope.messages = $scope.messages.concat(serverMessage);
        })
    };
    Message.save({content:"look"});
    getLastMessages();
});