'use strict'

/*//////////////////////////////

	Home route & controller
	
	/

//////////////////////////////*/



//``````````````````````````````
//	Configure the route
//
angular.module('app').config(['$routeProvider', function($routeProvider) {

	$routeProvider.when('/',
	{
		templateUrl: '/angular/routes/home/home.html',
		controller: 'HomeController'
	});

}]);



//``````````````````````````````
//	The controller
//
angular.module('appControllers').controller('HomeController', ['$scope', 'appGlobals', function($scope, appGlobals) {

	$scope.panes = [{
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

}]);


