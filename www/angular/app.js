'use strict'

/*//////////////////////////////

    angular app bootstrapping

//////////////////////////////*/



//``````````````````````````````
//  Declare the App with dependencies
//  and the sub-modules
//
angular.module('app', [
    'ngRoute',
    'ngAnimate',
    
    'appServices',
    'appProviders',
    'appDirectives',
    'appControllers',
    
    // 'smart-table',
    // 'ui.select2',
    // 'angular-loading-bar',
    // 'google-maps'
]);

angular.module('appServices', [] );
angular.module('appProviders', [] );
angular.module('appDirectives', [] );
angular.module('appControllers', [] );



//``````````````````````````````
//  Configure
//
angular.module('app').config(['$locationProvider'/*, 'cfpLoadingBarProvider'*/, function( $locationProvider/*, cfpLoadingBarProvider*/ ) {

    //  Utilize the HTML 5 History API
    //
    $locationProvider.html5Mode( true );

    // cfpLoadingBarProvider.includeSpinner = false;

}]);



//``````````````````````````````
//  Run on app init
//
angular.module('app').run(['$rootScope', '$route', '$location', '$window', function( $rootScope, $route, $location, $window ) {

    //``````````````````````````````
    //  Define some useful root scope
    //  variables and methods
    //
    $rootScope.host = window.location.host;
    $rootScope.protocol = window.location.protocol;
    $rootScope.navState = 'home';

    $rootScope.go = function( path ) {
        $location.path( path );
    };


    $rootScope
        .$on('$routeChangeSuccess', function( evt, curr, prev ) {
        
            //``````````````````````````````
            //  Set dynamic {{ viewClass }}
            //  on ng-view derived from the
            //  controller name. eg:
            //  FilmDetailsController → .film-details
            //
            if ( $route.current.$$route && $route.current.$$route.controller )
                $rootScope.viewClass = $route.current.$$route.controller
                                            .replace(/controller/gi, '')
                                            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                                            .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
                                            .toLowerCase();
        
            //``````````````````````````````
            //  Trigger ‘routeChangeSuccess’
            //  event for jQuery to catch
            //
            /*angular.element( document ).triggerHandler('routeChangeSuccess');*/
        
        });


    //``````````````````````````````
    //  Watch server connection
    //
    if ( navigator ) {

        $rootScope.online = navigator.onLine;
        
        $window.addEventListener('offline', function() {
            $rootScope.$apply(function() {
                $rootScope.online = false;
            });
        }, false );
        
        $window.addEventListener("online", function() {
            $rootScope.$apply(function() {
                $rootScope.online = true;
            });
        }, false );

    }
    
}]);

