'use strict'

/*//////////////////////////////

    super simple carousel

    @see thecoded.com/swipe/examples/carousel.html
    @req hammer.js

//////////////////////////////*/



angular.module('appDirectives').directive('carousel', function() {

    if ( !Hammer )
        return console.error( 'missing Hammer.js' );

    function Carousel( $scope, $element, attributes ) {

        var $strip = $element.find('>ul'),
            numPanes = $scope.panes.length || attributes.numPanes || $element.find('>ul >li').length || 1,
            singlePaneOffset = -100 / numPanes,
            paneW = 0,
            hitarea = typeof attributes.hitarea !== 'undefined',
            autoplay = typeof attributes.autoplay !== 'undefined',
            bulletControl = typeof attributes.bulletControl !== 'undefined',
            impedeAutoPlayTimeout,
            autoPlayInt,
            autoPauseTime = attributes.autoPauseTime || 8000,
            mc = new Hammer.Manager(
                $element[0], {
                    preventDefault: true,
                    touchAction: 'none'
                }),
            panH = new Hammer.Pan({
                event: 'panh',
                direction: Hammer.DIRECTION_HORIZONTAL
            }),
            swipeH = new Hammer.Swipe({
                event: 'swipeh',
                direction: Hammer.DIRECTION_HORIZONTAL
            });

        mc.add( panH );
        mc.add( swipeH ).recognizeWith( panH );

        mc.on('swipeh panh', handleHammer );

        $scope.stripOffset = 0;
        $scope.currentPane = 0;
        $scope.animate = false;
        $scope.slow = false;

        //  bullet business
        //
        $scope.bullets = [];
        $scope.bulletControl = bulletControl;

        for ( var i = 0; i < numPanes; i++ )
            $scope.bullets.push({ opacity: i==0 ? 1 : 0 });

        $scope.bulletControlNav = function( idx ) {

            if ( !$scope.bulletControl )
                return;

            setTimeout(function() {
                showPane( idx, true );
                impedeAutoPlay();
            });

        }


        //  get single pane width in px for
        //  we need compare it to deltaX
        //
        function setPaneW() { paneW = $element[0].offsetWidth; };

        angular.element( document ).ready( setPaneW );
        angular.element( window ).on('load resize orientationchange', setPaneW );
        

        //  perhaps not the best place or
        //  solution for this, but need it
        //  in home view
        //  
        function sizeHitArea( hitArea ) {

            if ( !jQuery )
                return;

            var viewW = jQuery('.view').width(),
                viewH = jQuery('.view').height();

            hitArea.css({
                'width': viewW,
                'height': viewH,
                'margin-left': -viewW / 2,
                'margin-top': -viewH / 2
            });

        }

        function makeHitArea() {

            var hitArea = angular.element('<div class="carousel-hitarea"></div>').appendTo( $element );

            angular.element( window ).on('load resize orientationchange', function(){
                sizeHitArea( hitArea )
            });

            sizeHitArea( hitArea );

            return hitArea;

        }

        if ( hitarea )
            makeHitArea();


        //  auto play intro (home page)
        //  
        $scope.autoplay = autoplay;

        function autoNext() {

            var nextPane = $scope.currentPane+1 >= numPanes ? 0 : $scope.currentPane + 1;
            
            showPane( nextPane, true, true );

        }

        function impedeAutoPlay() {

            if ( autoPlayInt )
                clearInterval( autoPlayInt );

            if ( impedeAutoPlayTimeout )
                clearTimeout( impedeAutoPlayTimeout );

            if ( $scope.autoplay )
                impedeAutoPlayTimeout = setTimeout( initAutoPlay, autoPauseTime * 2 );

        }

        function initAutoPlay() {

            autoPlayInt = setInterval( autoNext, autoPauseTime );

        }

        if ( $scope.autoplay )
            initAutoPlay();


        function showPane( index, animate, slow ) {
            
            $scope.$apply(function(){
                $scope.currentPane = Math.max( 0, Math.min( index, numPanes-1 ) );
            });

            setStripPosition( -100 / numPanes * $scope.currentPane, animate, slow );

        };


        function setStripPosition( percent, animate, slow ) {

            $scope.$apply(function(){
                $scope.animate = animate;
                $scope.slow = slow;
            });

            // $scope.$apply(function(){ $scope.stripOffset = percent; });
            
            if ( animate )
                setTimeout( function() { setStripPositionCSS( percent ) } );
            else
                setStripPositionCSS( percent );                

            $scope.$apply( setPaneState( percent, animate, slow ) );

        };

        function setStripPositionCSS( percent ) {

            /*if( Modernizr.csstransforms )
                $strip.css('transform', 'translate('+ percent +'%,0)');
            
            else*/
                $strip.css('left', ( percent * numPanes ) +'%' /*( paneW * numPanes / 100 * percent ) + 'px'*/ );

        }

        //  Set highlight of bullet indicators
        //  and panes opacity
        //
        function setPaneState( percent, animate, slow ) {

            var progress = percent / singlePaneOffset,
                deviation = progress - $scope.currentPane;

            //  don't mess with neither
            //  first bullet when trying ← prev,
            //  last bullet when trying next →
            //
            if ( 0 > progress || progress > numPanes - 1 )
                return;

            //  final == swipe / pan end
            if ( deviation == 0 )
                $scope.bullets.map( function( b, i ){
                    b.opacity = ( i == $scope.currentPane ? 1 : 0 );
                });

            //  pan ← prev / next →
            else {
                
                var destBulletOpacity = Math.abs( deviation ),
                    currBulletOpacity = 1 - destBulletOpacity;

                $scope.bullets[ $scope.currentPane ].opacity = currBulletOpacity;
                $scope.bullets[ $scope.currentPane + ( 0 < deviation ? 1 : -1 ) ].opacity = destBulletOpacity;

            }

        }


        function next() { return showPane( $scope.currentPane + 1, true ); };
        function prev() { return showPane( $scope.currentPane - 1, true ); };


        function handleHammer( evt ) {
            
            // console.debug( evt );

            impedeAutoPlay();

            evt.preventDefault();

            switch( evt.type ) {

                case 'panh':

                    // console.debug( 'pan: '+( evt.offsetDirection == 4 ? 'next →' : '← prev') );
                    
                    var currentPaneOffset = singlePaneOffset * $scope.currentPane,
                        dragOffset = Math.max( singlePaneOffset, Math.min( -singlePaneOffset, ( 100 / paneW * evt.deltaX ) / numPanes ) );

                    //  resist first & last pane
                    //
                    if (
                        ( $scope.currentPane == 0          && evt.offsetDirection == 2 ) ||
                        ( $scope.currentPane == numPanes-1 && evt.offsetDirection == 4 )
                    )
                        dragOffset *= .2;

                    setStripPosition( currentPaneOffset + dragOffset );

                    // pan finished
                    //
                    if ( evt.isFinal ) {

                        //  more than 50% panned so
                        //  navigate to next/prev
                        //
                        if ( Math.abs( evt.deltaX ) > paneW/2 ) {
                        
                            if ( evt.offsetDirection == 4 )
                                next();

                            else
                                prev();

                        } else
                            showPane( $scope.currentPane, true );

                    }

                    break;

                case 'swipeh':

                    // console.debug( 'swipe: '+( evt.direction == 2 ? 'next →' : '← prev') );

                    //  cancel if more than 50% panned
                    //  to prevent navigating next/prev twice
                    //  
                    if ( Math.abs( evt.deltaX ) > paneW/2 )
                        break;

                    if ( evt.direction == 2 )
                        next();

                    if ( evt.direction == 4 )
                        prev();

            }
        
        };

    };

    /*function carouselController( $scope ) {

    };*/
    
    return ({
        restrict: 'AEC',
        templateUrl: '/angular/partials/carousel.html',
        // transclude: true,
        link: Carousel,
        // controller: carouselController
    });

});
