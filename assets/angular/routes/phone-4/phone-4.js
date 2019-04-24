'use strict'

/*//////////////////////////////

    Phone route & controller
    
    /phone

//////////////////////////////*/



//``````````````````````````````
//  Configure the route
//
angular.module('app').config(['$routeProvider', function($routeProvider) {

    $routeProvider.when('/phone-4',
    {
        templateUrl: '/angular/routes/phone-4/phone-4.html',
        controller: 'Phone4Controller'
    });

    $routeProvider.when('/phone-4-dark',
    {
        templateUrl: '/angular/routes/phone-4/phone-4.html',
        controller: 'Phone4DarkController'
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
angular.module('appControllers').controller('Phone4Controller', ['$scope', '$q', '$timeout', '$animate', 'appGlobals', function( $scope, $q, $timeout, $animate, appGlobals ) {

    $scope.panes = panes;

}]);

angular.module('appControllers').controller('Phone4DarkController', ['$scope', '$q', '$timeout', '$animate', 'appGlobals', function( $scope, $q, $timeout, $animate, appGlobals ) {

    $scope.panes = panes;

}]);
