'use strict'

/*//////////////////////////////

    Phone route & controller
    
    /phone

//////////////////////////////*/



//``````````````````````````````
//  Configure the route
//
angular.module('app').config(['$routeProvider', function($routeProvider) {

    $routeProvider.when('/phone', { redirectTo: 'phone-6' });
    $routeProvider.when('/phone-6',
    {
        templateUrl: '/angular/routes/phone-6/phone-6.html',
        controller: 'PhoneController'
    });

    $routeProvider.when('/phone-dark', { redirectTo: 'phone-6-dark' });
    $routeProvider.when('/phone-6-dark',
    {
        templateUrl: '/angular/routes/phone-6/phone-6.html',
        controller: 'PhoneDarkController'
    });

}]);



var panes = [{
    text:  'Keep track of your friends and\n\
            favorite artists\' music posts'
    
    /*text:  'musicfeed let\'s you know when\n\
            your friends and favorite artists\n\
            post music on the web'*/

    /*text:  'New music appears in your feed\n\
            when your friends and favorite artists\n\
            post it on the web'*/

    /*text:  'Discover new music as soon as\n\
            your friends and favorite artists\n\
            post it on the web'*/
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
angular.module('appControllers').controller('PhoneController', ['$scope', '$q', '$timeout', '$animate', 'appGlobals', function( $scope, $q, $timeout, $animate, appGlobals ) {

    // $scope.showVideo = false;

    $scope.panes = panes;

}]);

angular.module('appControllers').controller('PhoneDarkController', ['$scope', '$q', '$timeout', '$animate', 'appGlobals', function( $scope, $q, $timeout, $animate, appGlobals ) {

    // $scope.showVideo = false;

    $scope.panes = panes;

}]);
