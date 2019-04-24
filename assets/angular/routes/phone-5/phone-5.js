'use strict'

/*//////////////////////////////

    Phone route & controller
    
    /phone

//////////////////////////////*/



//``````````````````````````````
//  Configure the route
//
angular.module('app').config(['$routeProvider', function($routeProvider) {

    $routeProvider.when('/phone-5',
    {
        templateUrl: '/angular/routes/phone-5/phone-5.html',
        controller: 'Phone5Controller'
    });

    $routeProvider.when('/phone-5-dark',
    {
        templateUrl: '/angular/routes/phone-5/phone-5.html',
        controller: 'Phone5DarkController'
    });

}]);



var panes = [{
    text:  'Keep track of your friends and\n\
            favorite artists\' music posts'
},{
    text:  'Listen to tracks and watch videos\n\
            directly in your feed'
},{
    text:  'Heart your biggest faves and share\n\
            your love for the music'
},{
    text:  'Remove tracks you dont like so\n\
            musicfeed can learn your preferences'
}];



//``````````````````````````````
//  The controllers
//
angular.module('appControllers').controller('Phone5Controller', ['$scope', '$q', '$timeout', '$animate', 'appGlobals', function( $scope, $q, $timeout, $animate, appGlobals ) {

    $scope.panes = panes;

}]);

angular.module('appControllers').controller('Phone5DarkController', ['$scope', '$q', '$timeout', '$animate', 'appGlobals', function( $scope, $q, $timeout, $animate, appGlobals ) {

    $scope.panes = panes;

}]);
