'use strict'

/*//////////////////////////////

	$scope.model = {
		hasMoreInfo: TRUE,
		label: 'My Label'
	};
	<a wrap-if="model.hasMoreInfo" href="/moreinfo">{{model.label}}</a>
		↓
	<a href="/moreinfo">{{model.label}}</a>


	$scope.model = {
		hasMoreInfo: FALSE,
		label: 'My Label'
	};
	<a wrap-if="model.hasMoreInfo" href="/moreinfo">{{model.label}}</a>
		↓
	{{model.label}}


	@see stackoverflow.com/a/23398021

//////////////////////////////*/



angular.module('appDirectives').directive('wrapIf', function() {

    return {
        link: function( $scope, element, attributes ) {

            $scope.$watch( attributes['wrapIf'], function( value ) {

                if ( !value )
                    element.replaceWith( element.contents() );

            });

        }
    };

});
