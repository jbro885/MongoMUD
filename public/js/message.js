var app = angular.module('mdbMUD', ['ngResource','luegg.directives'])
    .factory('Message', function($resource) {
        return $resource('/message/:id', null,
            {
                'save':  {method:'POST'},
                'query': {method:'GET'},
                'get':   {method:'GET'}
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

    var getMessages = function() {
        var serverMessage = Message.query({ time: $scope.lastPollDate }, true,  function() {
            if (serverMessage.hasOwnProperty("messages")) {
                $scope.messages = $scope.messages.concat(serverMessage.messages);
            }

            $scope.lastPollDate = serverMessage.serverTime;
            getMessages()
        }, function(errorResult) {

            if (errorResult.status === 401) {
                window.location.replace("/login");
            }
            else
            {
                setTimeout(function () {
                    getMessages();
                }, 5000);
            }
        })
    };

    // Initial call
    $scope.lastPollDate = new Date();
    $scope.lastPollDate.setMinutes(new Date().getMinutes() - 2);
    Message.save({content:"look"});
    getMessages();

});
