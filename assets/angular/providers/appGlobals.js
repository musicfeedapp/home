'use strict'

/*//////////////////////////////

	Angular app providers

//////////////////////////////*/



angular.module('appProviders').provider('appGlobals', function() {
	
	this.$get = function () {
		return {

			/*gmapDefaults: {
				zoom: 12,
				center: {
					latitude: 59.437031, // viru square
					longitude: 24.753596 // viru square
				},
				markerOptions: {
					icon: {
						url: '/images/location-pin.svg',
						scaledSize: {
							width: 48,
							height: 48
						}
					}
				}
			},*/

			modelAttributesOrder: ['name', 'slug' /*and then the rest of the attributes*/ ],


			//``````````````````````````````//
			//			Utilities			//
			//..............................//


			routeResolver: function( resolveURL, requireParams ) {
				return {

					//``````````````````````````````
					//	“data” will be injectable
					//	dependency in the route controller
					//
					'data': function( $route, $q ) {

						var deferred = $q.defer(),
							queryParams = $route.current.params || {};
						
						if (
							resolveURL &&
							(
								!requireParams ||
								!angular.equals( queryParams, {} )
							)
						)
							io.socket.request( resolveURL, queryParams, function( body, res ) {
								deferred.resolve( body );
							});
						
						else
							deferred.resolve( null );
						
						return deferred.promise;
									
					}
					
				};
			},

			orderModelAttributes: function( modelAttributes, order ) {

				//	copy model attributes over to an array
				//	so we could sort their order (when applicable)
				//
				var modelAttributesArr = [],
					order = order || this.modelAttributesOrder || [];

				for ( var attr in modelAttributes )
					modelAttributesArr.push( angular.extend( modelAttributes[ attr ], { name: attr } ) );

				//	order the attributes
				//
				if ( order )
					modelAttributesArr.sort(function (a, b) {
						
						if ( order.indexOf(a.name) != -1 ) {

							if ( order.indexOf(b.name) != -1 ) {

								if ( order.indexOf(a.name) > order.indexOf(b.name) )
									return 1;
								
								if ( order.indexOf(a.name) < order.indexOf(b.name) )
									return -1;

							} else
								return -1;
						
						} else if ( order.indexOf(b.name) != -1 )
							return 1;
						
						return 0;
						
					});

				return modelAttributesArr;

			},

			pathToPascalCase: function(input) {
			    var output = input.toLowerCase().replace(/[-_/](.)/g, function(match, group1) {
			        return group1.toUpperCase();
			    });
			    return output.charAt(0).toUpperCase() + output.slice(1);
			}
			

		};
	};

});


