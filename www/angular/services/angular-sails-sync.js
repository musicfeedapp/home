'use strict'

/*//////////////////////////////

	Sync Angular and Sails model
	instances via the socket connection


	1.	Sync front ← back 	GET
		Query <modelName> instances from Sails's backend
		(filtered by <queryParams>) and define a $scope
		variable — an [array] collection — with these
		returned instances

	2.	Sync front ← back 	ON
		Subscribe (with ON query) to socket events (created,
		updated, destroyed) on the backend concerning our queried
		model instances to update the corresponding angular model
		instances accordingly
		(possible due to Sails' autoSubscribe feature)
	
	3.	Sync front → back 	POST/DELETE
		Watch the angular scope collection of model instances
		for additions/removals and update the backend accordingly

	4.	Sync front → back 	PUT
		Watch each instance in angular collection for attribute
		changes and persist their changes on the backend with
		PUT queries.

	@param 	modelName 	{string} 	the name of the model in the backend to sync.
	@param 	$scope 		{object} 	the scope where to attach the bounded model.
	@param 	options 	{object}	
	{
		APIPrefix		{string}	API endpoint path prefix. eg: “/api/”
		queryParams		{object}	query parameters to filter/sort the requested
									model instances. check the Sails' Waterline ORM
									“where” clause doc to see what you can specify
		primaryKey 		{string}	model primary key property, usually “id” or “slug”
		scopeVarExpr	{string}	string expression of scope variable name that will store
									the model instance collection, in dot notation. eg:
									'some.variable' would refer to $scope.some.variable
		resolvedData	{object}	we may pass in the syncable model instances data
									to avoid requesting it from the backend again
									since it happens often that we already have
									the data provided by the angular route resolver
		watchCollection {boolean}	specify whether to watch the scope collection
									for instance additions/removals
		watchInstances 	{boolean}	specify whether to watch each instance in the
									scope collection for attribute changes
	}

//////////////////////////////*/



angular.module('appServices').factory('sailsSync', ['$q', '$rootScope', '$location', '$route', '$timeout', function($q, $rootScope, $location, $route, $timeout) {

	return function( modelName, $scope, options ) {
		
		var deferred = $q.defer(),
			defaults = {
				APIPrefix          : '/api/',
				queryParams        : {},
				primaryKey         : 'slug',
				scopeVarExpr       : modelName+'s',
				resolvedData       : null,
				watchCollection    : false,
				watchInstances     : false,
				getModelAttributes : false
			},
			o = angular.extend( defaults, options ),
			do_debug = true,
			modelListeners = {},
			instanceWatchers = {};


		//``````````````````````````````
		//	1.	Assign data to a scope variable
		//		to store the model collection
		//

			//	if collection data is passed in
			//
			if ( o.resolvedData )
				_resolveData( o.resolvedData );


			//	if not GET it from Sails backend
			//
			else
				_request( 'get', o.APIPrefix+modelName, o.queryParams ).then(function( promise ) {

					_resolveData( promise.body );
				
				});

		function _resolveData( data ) {

			if ( data.error )
				return;

			if ( !Array.isArray( data ) )
				data = [data];
			
			
			_setScopeVar( $scope, o.scopeVarExpr, data );     //  1.
			
			_subscribe();                                     //  2.

			if ( o.watchCollection ) _watchCollection();      //  3.

			if ( o.watchInstances ) _watchInstances( data );  //  4.


			deferred.resolve();
			
		};

		//``````````````````````````````
		//	2. 	Hook to socket event to
		//		update the model collection
		//
		function _subscribe() {

			//	we wan't to prevent initiating
			//	another listener when we already
			//	have a listener for <modelName>
			//	events binded to this o.scopeVarExpr
			//
			if (
				modelName in io.socket.$events && o.scopeVarExpr in modelListeners &&
				io.socket.$events[ modelName ] == modelListeners[ o.scopeVarExpr ]
			)
				return;

			modelListeners[ o.scopeVarExpr ] = function( msg ) {
				
				var collection = _getScopeVar( $scope, o.scopeVarExpr ),
					actions = {
						
						created: function() {
							
							_updateCollection( msg.id );
							
						},
						
						updated: function() {
							
							var instanceToRefresh = collection.find( function( instance ) {
									return msg.id === instance[ o.primaryKey ];
								});

							//``````````````````````````````
							//	if there's a property in msg.data named
							//	equally to the o.primaryKey then msg.id is old
							//	and we should also update the $location path
							//
							if ( o.primaryKey in msg.data ) {

								_updateLocationPath( msg.id, msg.data[ o.primaryKey ]  );

								msg.id = msg.data[ o.primaryKey ];
							
							}

							_updateCollection( msg.id, instanceToRefresh );

						},
						
						destroyed: function() {

							var deletedInstance = collection.find(function( instance ) {
								return msg.id === instance[ o.primaryKey ];
							});

							_debug( '_subscribe(): ON message: “destroyed” instance:', deletedInstance );

							if ( deletedInstance )
								$scope.$apply(function() {
									collection.splice( collection.indexOf( deletedInstance ), 1 );
								});

						}
						
					};

				if ( typeof actions[ msg.verb ] == 'function' )
					actions[ msg.verb ]();
				
			};

			io.socket.on( modelName, modelListeners[ o.scopeVarExpr ] );

		};
		function _updateCollection( primaryKey, instanceToRefresh ) {
			
			var collection = _getScopeVar( $scope, o.scopeVarExpr ),
				queryParams = {};
				queryParams[ o.primaryKey ] = primaryKey;
			
			//``````````````````````````````
			//	reGET instance from backend
			//	to reflect any new embedded
			//	associations data
			//
			_request( 'get', o.APIPrefix+modelName, queryParams ).then( function( promise ) {

				if ( promise.res.statusCode < 200 || 300 <= promise.res.statusCode )
					return;
				
				var dbInstance = Array.isArray( promise.body ) ? promise.body.shift() : promise.body;
				
				$scope.$apply(function() {
					
					if ( instanceToRefresh )
						angular.extend( instanceToRefresh, dbInstance );
					
					else
						collection.push( dbInstance );

				});

			});
			
		};

		//``````````````````````````````
		//	3.	Watch the collection for
		//		instance additions / removals.
		//		POST the added,
		//		DELETE the removed.
		//
		function _watchCollection() {

			var collection = _getScopeVar( $scope, o.scopeVarExpr );
			
			_debug( '_watchCollection(): watch $scope.'+o.scopeVarExpr+':', collection );

			$scope.$watchCollection( o.scopeVarExpr, function( newCollection, oldCollection ) {

				newCollection = newCollection || [];
				oldCollection = oldCollection || [];

				var addedInstances   = newCollection.diff( oldCollection ),
					removedInstances = oldCollection.diff( newCollection );

				if ( removedInstances.length ) _debug( '_watchCollection(): removed '+modelName+' instance(s): ', removedInstances );
				if ( addedInstances.length )   _debug( '_watchCollection(): added '  +modelName+' instance(s): ', addedInstances );

				removedInstances.forEach( function( instance ) {

					var instanceIndex = oldCollection.indexOf( instance );
					
					_debug( '_watchCollection(): DELETE instance: ', instance, o.APIPrefix+modelName+'/'+instance[ o.primaryKey ] );
					_debug( '_watchCollection(): DELETE instance: instanceIndex:', instanceIndex, instanceWatchers[ instanceIndex ] );


					//	safely remove registered
					//	instance watcher
					//
					if ( instanceIndex in instanceWatchers && typeof instanceWatchers[ instanceIndex ] == 'function' )
						instanceWatchers[ instanceIndex ]();


					if ( o.primaryKey in instance )
						_request( 'get', o.APIPrefix+modelName+'/'+instance[ o.primaryKey ] ).then( function( promise ) {
							
							_debug( '_watchCollection(): found instance to DELETE: ', promise.body, promise.res );

							if (
								200 <= promise.res.statusCode &&
								300 > promise.res.statusCode &&
								promise.body &&
								!( 'error' in promise.body )
							)
								io.socket.delete( o.APIPrefix+modelName+'/'+instance[ o.primaryKey ], function( body, res ) {

									_debug( '_watchCollection(): DELETEd instance: ', body, res );

								});
								
						});
				
				});
	
				addedInstances.forEach( function( instance ) {

					//	a new instance would not
					//	have a DB-generated id
					//
					if ( 'id' in instance )
						return;

					_debug( '_watchCollection(): POST '+modelName+' instance: ', instance, '→ '+o.APIPrefix+modelName );

					_request( 'post', o.APIPrefix+modelName, instance ).then(

						//	successful POST
						//
						function( promise ){

							_debug( '_watchCollection(): succeeded to POST newly added '+modelName+' instance:', promise );

							angular.extend( instance, promise.body );

							//	reGET POSTed instance
							//	from backend to reflect any newly
							//	created associations data
							//
							_request( 'get', o.APIPrefix+modelName+'/'+promise.body[ o.primaryKey ] )
								.then( function( promise ) {
									
									_debug( '_watchCollection(): succeeded to GET back newly POSTed '+modelName+' instance (with associations):', promise );
									
									angular.extend( instance, promise.body );
								
								});

						},

						//	failed POST
						//
						function( promise ){

							_debug( '_watchCollection(): '+promise.res.statusCode+': failed to POST newly added instance:', promise );
							
						});

					_watchInstances( addedInstances );
					
				});
			
			});
		
		};

		//``````````````````````````````
		//	4.	Watch each model instance
		//		in the collection for attribute
		//		changes to PUT on the backend.
		//
		function _watchInstances( instances ) {

			var collection = _getScopeVar( $scope, o.scopeVarExpr );

			instances.forEach( function( instance ) {
			
				var instanceIndex = collection.indexOf( instance ),
					instanceSelector = o.scopeVarExpr+'['+ instanceIndex +']',
					updateWaiter,
					updateWait = 500,
					olderInstance = null,
					preventLoop = false;

				_debug( '_watchInstances(): watch $scope.'+instanceSelector+':', instance );

				//	register instance watcher
				//
				instanceWatchers[ instanceIndex ] = $scope.$watch( instanceSelector, function( newInstance, oldInstance ) {

					if ( preventLoop )
						return preventLoop = false;

					//``````````````````````````````
					//	Throttle updates to the backend
					//	
					//	since $timeout.cancel aborts the
					//	previously throttled PUT action and
					//	disposes the oldInstance we cache
					//	the oldInstance as olderInstance
					//
					oldInstance   = olderInstance ? angular.copy( olderInstance ) : oldInstance;
					olderInstance = olderInstance || angular.copy( oldInstance );

					if (
						!newInstance || !oldInstance ||
						angular.equals( oldInstance, newInstance ) ||
						(
							//	is an update FROM backend
							oldInstance.updatedAt && newInstance.updatedAt &&
							oldInstance.updatedAt !== newInstance.updatedAt
						)
					)
						return;

					_debug( '_watchInstances(): throttling update:', oldInstance, '→', newInstance );

					$timeout.cancel( updateWaiter );
					updateWaiter = $timeout(

						// 	waiting for timer to execute this:
						//
						function(){

							//	reset cahed olderInstance
							//
							olderInstance = null;

					
							var APIEndpoint = o.APIPrefix+modelName+'/'+oldInstance[ o.primaryKey ],
								attributeUpdates = _changedAttributes( oldInstance, newInstance );

							//	PUT the attribute updates
							//	on the backend:
							//
							_request( 'put', APIEndpoint, attributeUpdates ).then(
								
								//	successful PUT
								function( promise ){

									var dbInstance = promise.body;

									_debug( '_watchInstances(): succeeded to PUT '+modelName+' instance:', promise );

									//	update location path
									//	if primaryKey updated
									//
									if ( oldInstance[ o.primaryKey ] != dbInstance[ o.primaryKey ] )
										_updateLocationPath( oldInstance[ o.primaryKey ], dbInstance[ o.primaryKey ] );
									
									//	update instance if primaryKey
									//	changed on the backend
									//	(eg. new title → new slug)
									//
									if ( instance[ o.primaryKey ] != dbInstance[ o.primaryKey ] ) {
										instance[ o.primaryKey ] = dbInstance[ o.primaryKey ];
										preventLoop = true;
									}

								},

								// failed PUT
								function( promise ){

									_debug( '_watchInstances(): '+promise.res.statusCode+': failed to PUT '+modelName+' instance:', promise );
									
									//``````````````````````````````
									//	the instance does not reflect
									//	from the backend — we must
									//	be typing in a new instance
									//
									if ( promise.res.statusCode == 404 ) {
									
										_request( 'post', o.APIPrefix+modelName, newInstance ).then(
											
											//	successful POST
											//
											function( promise ) {
													
												_debug( '_watchInstances(): successfully POSTed new '+modelName+' instance:', promise );

												angular.extend( instance, promise.body );
												preventLoop = true;

												//	reGET POSTed instance
												//	from backend to reflect any newly
												//	created associations data
												//
												_request( 'get', o.APIPrefix+modelName+'/'+promise.body[ o.primaryKey ] )
													.then( function( promise ) {
														
														var dbInstance = promise.body;

														_debug( '_watchInstances(): succeeded to GET back newly POSTed '+modelName+' instance (with associations):', dbInstance );
														
														if ( dbInstance[ o.primaryKey ] )
															_updateLocationPath( '', dbInstance[ o.primaryKey ] );

														angular.extend( instance, dbInstance );
														preventLoop = true;
													
													});
												
											},

											//	failed POST
											//
											function( promise ) {
												
												//	getting status 500 instead 400
												//	when duplicate entry of primaryKey attribute

												_debug( '_watchInstances(): '+promise.res.statusCode+': failed to POST new '+modelName+' instance', newInstance, promise );
												
											});
									
									//``````````````````````````````
									//	validation error — revert bad
									//	attributes from oldInstance
									//
									} else if (
										promise.res.statusCode == 400 ||
										(
											//	TODO:
											//	in case of duplicate primaryKey
											//	entry we get status 500 instead
											//	of 400 with a raw mongodb error
											//	object with code 11000 — validate
											//	primaryKey attribute in Sails config
											//	model lifecycle callback
											//
											promise.res.statusCode == 500 &&
											promise.body.error &&
											promise.body.error.raw &&
											promise.body.error.raw.code == '11000'
										)
									) {

										/*
											//	can't predict which
											//	field exatly was invalid
											//
											if ( promise.res.statusCode == 500 ) {
												instance[ o.primaryKey ] = oldInstance[ o.primaryKey ];
												return preventLoop = true;
											}

											//	works only with 400 response
											//
											var revertedAttributes = {};

											for ( var att in promise.body.error.invalidAttributes )
												revertedAttributes[ att ] = oldInstance[ att ];
											
											angular.extend( instance, revertedAttributes );
										*/

										if ( instance[ o.primaryKey ] != oldInstance[ o.primaryKey ] )
											_updateLocationPath( instance[ o.primaryKey ], oldInstance[ o.primaryKey ] );

										angular.extend( instance, oldInstance );
										preventLoop = true;

									}

								});

					
						}, updateWait );


				}, true);
				//
				//	true == ‘equality’ watch
				//	@see teropa.info/blog/2014/01/26/the-three-watch-depths-of-angularjs.html

			});

		};
		function _changedAttributes( oldInstance, newInstance ) {

			var union   = _.union( _.keys( newInstance ), _.keys( oldInstance ) ),
				updated = {};

			_.each( union, function( key ) {
				
				if ( !_.isEqual( oldInstance[ key ], newInstance[ key ] ) )
					updated[ key ] = newInstance[ key ] || '';

			});

			return updated;

		};

		//``````````````````````````````
		//	5.	Get model's defined
		//		attributes from the back
		//		for the front to use
		//

			if ( o.getModelAttributes )
				_getModelAttributes();

		function _getModelAttributes() {

			_request( 'get', '/api/'+modelName+'/model' ).then( function( promise ) {
				
				if ( promise.res.statusCode < 200 || 300 <= promise.res.statusCode )
					return;

				$scope.modelAttributes = promise.body;

			});

		};


		//``````````````````````````````//
		//			Utilities			//
		//..............................//


		//``````````````````````````````
		//	Internal request function.
		//	makes standard socket requests
		//	and returns promises.
		//	
		//	@param 	APIEndpoint 			APIEndpoint of the request.
		//	@param 	queryParams 	query restriction
		//	@returns {Deferred.promise|*}
		//	@private
		//
		function _request( verb, APIEndpoint, queryParams ) {

			var deferred = $q.defer();
			
			queryParams = queryParams || {};

			io.socket[verb]( APIEndpoint, queryParams, function( body, res ){

				if ( res.statusCode < 200 || 300 <= res.statusCode )
					return deferred.reject({ body: body, res: res });

				deferred.resolve({ body: body, res: res });

			});

			return deferred.promise;

		};

		//``````````````````````````````
		//	get/set the $scope variable that
		//	stores our model collection
		//	
		//	@see 	stackoverflow.com/a/6394168
		//	@param	$scope		{object} 	the scope where the model belongs to
		//	@param	paramRef	{string} 	modelName ‘pluralized’ OR a dot notation of
		//									scope var reference  eg. ('a.b.cde' → $scope.a.b.cde)
		//	@param	value		{array} 	new value (model collection) for $scope var
		//
		function _getScopeVar( $scope, paramRef ) {
		
			return paramRef.split('.').reduce(function(obj, i){ return obj[i]; }, $scope);
		
		};
		function _setScopeVar( $scope, paramRef, value ) {
		
			if ( typeof paramRef == 'string' )
				return _setScopeVar($scope, paramRef.split('.'), value);
				
			else if ( paramRef.length == 1 && value !== undefined )
				return $scope[paramRef[0]] = value;
				
			else if ( paramRef.length == 0 )
				return $scope;
				
			else
				return _setScopeVar($scope[paramRef[0]], paramRef.slice(1), value);
		
		};
		function _updateLocationPath( oldPrimaryKey, newPrimaryKey ) {

			var currRoute = $route.current,
				currPath = $location.$$path.toLowerCase(),
				replacePath = false,
				PKRouteParam = new RegExp( '(:'+o.primaryKey+'[\?]?)', 'gi' ),
				newPath = currRoute.$$route.originalPath.replace( PKRouteParam, function( match ) {
					
					var routePathWithOldPrimaryKey = currRoute.$$route.originalPath
														.replace( PKRouteParam, oldPrimaryKey )
														.replace( /\/$/, '' ) // remove possible trailing slash
														.toLowerCase();

					//	1. found o.primaryKey in current route params and
					//	2. current path is the route path with the old slug
					//		↓
					//	so it's safe to assume that the location path needs to be updated indeed
					//
					if (
						match &&
						routePathWithOldPrimaryKey == currPath
					)
						replacePath = true;
					
					//	replace the match with
					//	the new instance identifier
					//
					return newPrimaryKey;

				});

			_debug( '_updateLocationPath():', replacePath, currPath, '→', newPath );

			if ( replacePath ) {

				currRoute.params[ o.primaryKey ] = newPrimaryKey;
				currRoute.pathParams[ o.primaryKey ] = newPrimaryKey;

				$location.path( newPath ).replace();

				var offReInstateRoute = $scope.$on( '$locationChangeSuccess', function() {
					$route.current = currRoute;
					offReInstateRoute();
				});

			}

		};

		function _debug() {

			if ( do_debug )
				console.debug.apply( console, arguments );

		};


		return deferred.promise;

	};
	
}]);



//``````````````````````````````
//	utils / polyfills
//

if ( 'function' !== typeof Array.prototype.find )
	Object.defineProperty(Array.prototype, 'find', {
		enumerable: false,
		configurable: true,
		writable: true,
		value: function(predicate) {
			if (this == null) {
				throw new TypeError('Array.prototype.find called on null or undefined');
			}
			if (typeof predicate !== 'function') {
				throw new TypeError('predicate must be a function');
			}
			var list = Object(this);
			var length = list.length >>> 0;
			var thisArg = arguments[1];
			var value;

			for (var i = 0; i < length; i++) {
				if (i in list) {
					value = list[i];
					if (predicate.call(thisArg, value, i, list)) {
						return value;
					}
				}
			}
			return undefined;
		}
	});


if ( 'function' !== typeof Array.isArray )
	Array.isArray = function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};


if ( 'function' !== typeof Array.prototype.diff )
	Object.defineProperty(Array.prototype, 'diff', {
		enumerable: false,
		configurable: true,
		writable: true,
		value: function(a) {
			return this.filter(function(i) {
				return a.indexOf(i) < 0;
			});
		}
	});
	/*Array.prototype.diff = function(a) {
		return this.filter(function(i) {
			return a.indexOf(i) < 0;
		});
	};*/


if ( 'function' !== typeof Array.prototype.reduce )
	Array.prototype.reduce = function( callback ) {
		'use strict';
		if ( null === this || 'undefined' === typeof this ) {
			throw new TypeError(
				 'Array.prototype.reduce called on null or undefined' );
		}
		if ( 'function' !== typeof callback ) {
			throw new TypeError( callback + ' is not a function' );
		}
		var t = Object( this ), len = t.length >>> 0, k = 0, value;
		if ( arguments.length >= 2 ) {
			value = arguments[1];
		} else {
			while ( k < len && ! k in t ) k++; 
			if ( k >= len )
				throw new TypeError('Reduce of empty array with no initial value');
			value = t[ k++ ];
		}
		for ( ; k < len ; k++ ) {
			if ( k in t ) {
				 value = callback( value, t[k], k, t );
			}
		}
		return value;
	};
