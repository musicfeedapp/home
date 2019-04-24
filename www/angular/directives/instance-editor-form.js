'use strict'

/*//////////////////////////////

	Print model attribute
	inputs on add/edit screen

//////////////////////////////*/



angular.module('appDirectives').directive('instanceEditorForm', function( appGlobals, $route, $location ) {

	function link( $scope, element, attributes ) {

		$scope.modelName = attributes.modelName;
		$scope.attributesToExclude = ['id', 'createdAt', 'updatedAt']
										.concat(
											//	+ attribute names specified
											//	on directive element if any
											((
												attributes.excludeAttributes &&
												attributes.excludeAttributes.split(',')
											) || [] )
											.map( Function.prototype.call, String.prototype.trim )
										);

		//	get model attributes
		//	defined in Sails config
		//	@see ModelController.model action
		//
		io.socket.get( '/api/'+$scope.modelName+'/model', function( body, res ){

			if ( 200 <= res.statusCode && res.statusCode < 300 )
				$scope.$apply( function() {
				
					$scope.modelAttributes = appGlobals.orderModelAttributes( body );
				
				});
			
		});

	}

	return({
		scope: {
			instanceData: '=instanceData'
		},
		link: link,
		restrict: 'AC',
		template:
			'<label\
				ng-repeat="attribute in modelAttributes"\
				ng-if="instanceData && ( attribute.type || attribute.collection || attribute.model ) && attributesToExclude.indexOf( attribute.name ) == -1"\
				ng-include="inputTemplate"\
				ng-controller="modelAttributeInputController"\
				class="attribute attribute-{{ attribute.name }}"\
			></label>'
	});

});



//``````````````````````````````
//	Control each input
//
angular.module('appDirectives').controller('modelAttributeInputController', ['$scope', '$element', 'sailsSync', '$http', '$templateCache', function($scope, $element, sailsSync, $http, $templateCache){

	var att = $scope.attribute;

	//	Titlecase the label
	//
	$scope.label = att.name.charAt(0).toUpperCase() + att.name.slice(1);


	//``````````````````````````````//
    //			  TODO				//
    //	create a separate directive //
    //	 for associations <select>	//
    //..............................//


	//	Association's Select2 options
	//	@requires jQuery
	//
	if ( att.model || att.collection ) {

		$scope.select2Settings = {
	        'multiple': ( att.collection && true ),
	        'closeOnSelect': false,
	        'allowClear': true,
	        'simple_tags': true // suppress the ng-model to be an array of strings (and not an array of Select2 tag objects)
	        //'tags': ['tag1', 'tag2', 'tag3', 'tag4'] // Can be empty list.
	    };

	    //	bind <select> ng-model to
	    //	model instance attribute:
	    //	$scope.selectedValue → $scope.instanceData[ att.name ]
	    //	
	    $element.on('change', function( e ) {
	    	
	    	console.debug( e );

	   	});
		
		$scope.selectedValue = [];

	    //	get association model definition
	    //	( we need the primaryKey )
	    //
	    io.socket.get( '/api/'+( att.model || att.collection )+'/model', function( body, res ) {
			
			if ( res.statusCode < 200 || 300 <= res.statusCode )
	    		return;

	    	//	default model primaryKey
	    	//	is id, isn't it
	    	//
	    	var associationPK = 'id';

	    	//	look for custom primaryKey
	    	//	in defined model attributes
	    	//
	    	for ( var a in body )
	    		if ( a.primaryKey )
	    			associationPK = a;

	    	//	populate the select ng-model
	    	//	array with primaryKeys of
	    	//	associated instances
	    	//
	    	$scope.$apply( function() {
				$scope.instanceData[ att.name ].forEach( function( instance ) {

					$scope.selectedValue.push( instance[ associationPK ] );

				});
			});

		    //	get all (& listen for new)
		    //	selectable associations
		    //
	    	sailsSync( ( att.model || att.collection ), $scope, {
	    		primaryKey: associationPK,
	    		scopeVarExpr: 'assocChoices'
			});
		
		});

	}


	//	Load input template
	//	custom (override):    /angular/partials/model-attribute-inputs/<modelName>/<attributeName>.html
	//	default (fallback):   /angular/partials/model-attribute-inputs/<attributeType>.html
	//
	var modelAttributeTemplate = '/angular/partials/model-attribute-inputs/'+$scope.modelName+'/'+att.name+'.html',
		
		typeName =	( att.email && 'email'                 ) ||
					( att.type                             ) ||
					( att.model && 'assoc-one'       ) ||
					( att.collection && 'assoc-many' ),

		typeTemplate = '/angular/partials/model-attribute-inputs/'+typeName+'.html';


	(function( $scope, modelAttributeTemplate, typeTemplate ) {
		
		$http.get( modelAttributeTemplate )
			.success( function( templateContent ) {

				$templateCache.put( modelAttributeTemplate, templateContent );
				$scope.inputTemplate = modelAttributeTemplate;
			
			})
			.error( function(){
			
				$scope.inputTemplate = typeTemplate;
			
			});

	})( $scope, modelAttributeTemplate, typeTemplate );

}]);
