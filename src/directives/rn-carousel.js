(function() {
    'use strict';

    angular
        .module('angular-carousel')
        .directive('rnCarousel', rnCarousel);

    function rnCarousel(swipe, $window, $document, $parse, $compile, $timeout, $interval, computeCarouselSlideStyle, createStyleString, Tweenable) {
        // internal ids to allow multiple instances
        var carouselId = 0,
        // in absolute pixels, at which distance the slide stick to the edge on release
            rubberTreshold = 3;

        var requestAnimationFrame = $window.requestAnimationFrame || $window.webkitRequestAnimationFrame || $window.mozRequestAnimationFrame;

        function getItemIndex(collection, target, defaultIndex) {
            var result = defaultIndex;
            collection.every(function(item, index) {
                if (angular.equals(item, target)) {
                    result = index;
                    return false;
                }
                return true;
            });
            return result;
        }

        return {
            restrict: 'A',
            scope: true,
            compile: function(tElement, tAttributes) {
                // use the compile phase to customize the DOM
                var firstChild = tElement[0].querySelector('li'),
                    firstChildAttributes = (firstChild) ? firstChild.attributes : [],
                    isRepeatBased = false,
                    isBuffered = false,
                    repeatItem,
                    repeatCollection,
                    isVertical = (tAttributes.rnCarouselVertical !== undefined);

                // try to find an ngRepeat expression
                // at this point, the attributes are not yet normalized so we need to try various syntax
                ['ng-repeat', 'data-ng-repeat', 'ng:repeat', 'x-ng-repeat'].every(function(attr) {
                    var repeatAttribute = firstChildAttributes[attr];
                    if (angular.isDefined(repeatAttribute)) {
                        // ngRepeat regexp extracted from angular 1.2.7 src
                        var exprMatch = repeatAttribute.value.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/),
                            trackProperty = exprMatch[3];

                        repeatItem = exprMatch[1];
                        repeatCollection = exprMatch[2];

                        if (repeatItem) {
                            if (angular.isDefined(tAttributes['rnCarouselBuffered'])) {
                                // update the current ngRepeat expression and add a slice operator if buffered
                                isBuffered = true;
                                repeatAttribute.value = repeatItem + ' in ' + repeatCollection + '|carouselSlice:carouselBufferIndex:carouselBufferSize';
                                if (trackProperty) {
                                    repeatAttribute.value += ' track by ' + trackProperty;
                                }
                            }
                            isRepeatBased = true;
                            return false;
                        }
                    }
                    return true;
                });

                return function(scope, iElement, iAttributes, containerCtrl) {

                    carouselId++;

                    var defaultOptions = {
                        transitionType: iAttributes.rnCarouselTransition || 'slide',
                        transitionEasing: iAttributes.rnCarouselEasing || 'easeTo',
                        transitionDuration: parseInt(iAttributes.rnCarouselDuration, 10) || 300,
                        isSequential: true,
                        autoSlideDuration: 3,
                        bufferSize: 5,
                        /* in container % how much we need to drag to trigger the slide change */
                        moveTreshold: 0.05,
                        defaultIndex: 0
                    };

                    // TODO
                    var options = angular.extend({}, defaultOptions);

                    var pressed,
                        startX,
                        startY,
                        isIndexBound = false,
                        offsetX = 0,
                        offsetY = 0,
                        destinationX,
                        destinationY,
                        swipeMoved = false,
                    //animOnIndexChange = true,
                        currentSlides = [],
                        elWidth = null,
                        elHeight = null,
                        elX = null,
                        elY = null,
                        animateTransitions = true,
                        intialState = true,
                        animating = false,
                        mouseUpBound = false,
                        locked = false;

                    //rn-swipe-disabled =true will only disable swipe events
                    if(iAttributes.rnSwipeDisabled !== "true" && !isVertical) {
                        swipe.bind(iElement, {
                            start: swipeStart,
                            move: swipeMove,
                            end: swipeEnd,
                            cancel: function(event) {
                                swipeEnd({}, event);
                            }
                        });
                    }

                    if(iAttributes.rnSwipeDisabled !== "true" && isVertical){
                        swipe.bind(iElement, {
                            start: swipeStart,
                            move: swipeMoveVertical,
                            end: swipeEnd,
                            cancel: function(event) {
                                swipeEnd({}, event);
                            }
                        });
                    }

                    function getSlidesDOM() {
                        return iElement[0].querySelectorAll('ul[rn-carousel] > li');
                    }

                    function documentMouseUpEvent(event) {
                        // in case we click outside the carousel, trigger a fake swipeEnd
                        swipeMoved = true;
                        swipeEnd({
                            x: event.clientX,
                            y: event.clientY
                        }, event);
                    }

                    function updateSlidesPosition(offset) {
                        // manually apply transformation to carousel childrens
                        // todo : optim : apply only to visible items
                        var x = scope.carouselBufferIndex * 100 + offset;

                        angular.forEach(getSlidesDOM(), function(child, index) {
                            child.style.cssText = createStyleString(computeCarouselSlideStyle(index, x, options.transitionType, isVertical));
                        });
                    }

                    scope.nextSlide = function(slideOptions) {
                        var index = scope.carouselIndex + 1;
                        if (index > currentSlides.length - 1) {
                            index = 0;
                        }
                        if (!locked) {
                            goToSlide(index, slideOptions);
                        }
                    };

                    scope.prevSlide = function(slideOptions) {
                        var index = scope.carouselIndex - 1;
                        if (index < 0) {
                            index = currentSlides.length - 1;
                        }
                        goToSlide(index, slideOptions);
                    };

                    function goToSlide(index, slideOptions) {
                        //console.log('goToSlide', arguments);
                        // move a to the given slide index
                        if (index === undefined) {
                            index = scope.carouselIndex;
                        }

                        slideOptions = slideOptions || {};
                        if (slideOptions.animate === false || options.transitionType === 'none') {
                            locked = false;
                            offsetX = index * -100;
                            scope.carouselIndex = index;
                            updateBufferIndex();
                            return;
                        }

                        locked = true;
                        var tweenable = new Tweenable();

                        if(isVertical){
                            tweenable.tween({
                                from: {
                                    'y': offsetY
                                },
                                to: {
                                    'y': index * -100
                                },
                                duration: options.transitionDuration,
                                easing: options.transitionEasing,
                                step: function (state) {
                                    updateSlidesPosition(state.y);
                                },
                                finish: function () {
                                    scope.$apply(function () {
                                        scope.carouselIndex = index;
                                        offsetY = index * -100;
                                        updateBufferIndex();
                                        $timeout(function () {
                                            locked = false;
                                        }, 0, false);
                                    });
                                }
                            });
                        } else {
                            tweenable.tween({
                                from: {
                                    'x': offsetX
                                },
                                to: {
                                    'x': index * -100
                                },
                                duration: options.transitionDuration,
                                easing: options.transitionEasing,
                                step: function (state) {
                                    updateSlidesPosition(state.x);
                                },
                                finish: function () {
                                    scope.$apply(function () {
                                        scope.carouselIndex = index;
                                        offsetX = index * -100;
                                        updateBufferIndex();
                                        $timeout(function () {
                                            locked = false;
                                        }, 0, false);
                                    });
                                }
                            });
                        }
                    }

                    function getContainerWidth() {
                        var rect = iElement[0].getBoundingClientRect();
                        return rect.width ? rect.width : rect.right - rect.left;
                    }

                    function getContainerHeight() {
                        var rect = iElement[0].getBoundingClientRect();
                        return rect.height ? rect.height : rect.bottom - rect.top;
                    }

                    function updateContainerWidth() {
                        elWidth = getContainerWidth();
                    }

                    function updateContainerHeight(){
                        elHeight = getContainerHeight();
                    }

                    function bindMouseUpEvent() {
                        if (!mouseUpBound) {
                            mouseUpBound = true;
                            $document.bind('mouseup', documentMouseUpEvent);
                        }
                    }

                    function unbindMouseUpEvent() {
                        if (mouseUpBound) {
                            mouseUpBound = false;
                            $document.unbind('mouseup', documentMouseUpEvent);
                        }
                    }

                    function swipeStart(coords, event) {
                        if(locked || currentSlides.length <= 1){
                            return;
                        }

                        updateContainerWidth();
                        updateContainerHeight();

                        elY = iElement[0].querySelector('li').getBoundingClientRect().bottom;
                        elX = iElement[0].querySelector('li').getBoundingClientRect().left;

                        pressed = true;

                        startY = coords.y;
                        startX = coords.x;

                        return false;
                    }

                    function swipeMove(coords, event) {
                        //console.log('swipeMove', coords, event);
                        var x, delta;
                        bindMouseUpEvent();
                        if (pressed) {
                            x = coords.x;
                            delta = startX - x;
                            if (delta > 2 || delta < -2) {
                                swipeMoved = true;
                                var moveOffset = offsetX + (-delta * 100 / elWidth);
                                updateSlidesPosition(moveOffset);
                            }
                        }
                        return false;
                    }

                    function swipeMoveVertical(coords, event){
                        var y, delta;

                        bindMouseUpEvent();

                        if(pressed){
                            y = coords.y;
                            delta = startY - y;

                            if(delta > 2 || delta < -2){
                                swipeMoved = true;

                                var moveOffset = offsetY + (-delta * 100 / elHeight);

                                updateSlidesPosition(moveOffset);
                            }
                        }

                        return false;
                    }

                    var init = true;
                    scope.carouselIndex = 0;

                    if (!isRepeatBased) {
                        // fake array when no ng-repeat
                        currentSlides = [];
                        angular.forEach(getSlidesDOM(), function(node, index) {
                            currentSlides.push({id: index});
                        });
                    }

                    if (iAttributes.rnCarouselControls!==undefined) {
                        // dont use a directive for this
                        var canloop = ((isRepeatBased ? scope.$eval(repeatCollection.replace('::', '')).length : currentSlides.length) > 1) ? angular.isDefined(tAttributes['rnCarouselControlsAllowLoop']) : false;
                        var nextSlideIndexCompareValue = isRepeatBased ? '(' + repeatCollection.replace('::', '') + ').length - 1' : currentSlides.length - 1;
                        var tpl = '<div class="rn-carousel-controls">\n' +
                            '  <span class="rn-carousel-control rn-carousel-control-prev" ng-click="prevSlide()" ng-if="carouselIndex > 0 || ' + canloop + '"></span>\n' +
                            '  <span class="rn-carousel-control rn-carousel-control-next" ng-click="nextSlide()" ng-if="carouselIndex < ' + nextSlideIndexCompareValue + ' || ' + canloop + '"></span>\n' +
                            '</div>';
                        iElement.parent().append($compile(angular.element(tpl))(scope));
                    }

                    if(isVertical){
                        iElement.addClass('rn-carousel-vertical');
                    }

                    if (iAttributes.rnCarouselAutoSlide!==undefined) {
                        var duration = parseInt(iAttributes.rnCarouselAutoSlide, 10) || options.autoSlideDuration;
                        scope.autoSlide = function() {
                            if (scope.autoSlider) {
                                $interval.cancel(scope.autoSlider);
                                scope.autoSlider = null;
                            }
                            scope.autoSlider = $interval(function() {
                                if (!locked && !pressed) {
                                    scope.nextSlide();
                                }
                            }, duration * 1000);
                        };
                    }

                    if (iAttributes.rnCarouselDefaultIndex) {
                        var defaultIndexModel = $parse(iAttributes.rnCarouselDefaultIndex);
                        options.defaultIndex = defaultIndexModel(scope.$parent) || 0;
                    }

                    if (iAttributes.rnCarouselIndex) {
                        var updateParentIndex = function(value) {
                            indexModel.assign(scope.$parent, value);
                        };
                        var indexModel = $parse(iAttributes.rnCarouselIndex);
                        if (angular.isFunction(indexModel.assign)) {
                            /* check if this property is assignable then watch it */
                            scope.$watch('carouselIndex', function(newValue) {
                                updateParentIndex(newValue);
                            });
                            scope.$parent.$watch(indexModel, function(newValue, oldValue) {

                                if (newValue !== undefined && newValue !== null) {
                                    if (currentSlides && currentSlides.length > 0 && newValue >= currentSlides.length) {
                                        newValue = currentSlides.length - 1;
                                        updateParentIndex(newValue);
                                    } else if (currentSlides && newValue < 0) {
                                        newValue = 0;
                                        updateParentIndex(newValue);
                                    }
                                    if (!locked) {
                                        goToSlide(newValue, {
                                            animate: !init
                                        });
                                    }
                                    init = false;
                                }
                            });
                            isIndexBound = true;

                            if (options.defaultIndex) {
                                goToSlide(options.defaultIndex, {
                                    animate: !init
                                });
                            }
                        } else if (!isNaN(iAttributes.rnCarouselIndex)) {
                            /* if user just set an initial number, set it */
                            goToSlide(parseInt(iAttributes.rnCarouselIndex, 10), {
                                animate: false
                            });
                        }
                    } else {
                        goToSlide(options.defaultIndex, {
                            animate: !init
                        });
                        init = false;
                    }

                    if (iAttributes.rnCarouselLocked) {
                        scope.$watch(iAttributes.rnCarouselLocked, function(newValue, oldValue) {
                            // only bind swipe when it's not switched off
                            if(newValue === true) {
                                locked = true;
                            } else {
                                locked = false;
                            }
                        });
                    }

                    if (isRepeatBased) {
                        // use rn-carousel-deep-watch to fight the Angular $watchCollection weakness : https://github.com/angular/angular.js/issues/2621
                        // optional because it have some performance impacts (deep watch)
                        var deepWatch = (iAttributes.rnCarouselDeepWatch!==undefined);

                        scope[deepWatch?'$watch':'$watchCollection'](repeatCollection, function(newValue, oldValue) {
                            //console.log('repeatCollection', currentSlides);
                            currentSlides = newValue;
                            // if deepWatch ON ,manually compare objects to guess the new position
                            if (deepWatch && angular.isArray(newValue)) {
                                var activeElement = oldValue[scope.carouselIndex];
                                var newIndex = getItemIndex(newValue, activeElement, scope.carouselIndex);
                                goToSlide(newIndex, {animate: false});
                            } else {
                                goToSlide(scope.carouselIndex, {animate: false});
                            }
                        }, true);
                    }

                    function swipeEnd(coords, event, forceAnimation) {
                        //  console.log('swipeEnd', 'scope.carouselIndex', scope.carouselIndex);
                        // Prevent clicks on buttons inside slider to trigger "swipeEnd" event on touchend/mouseup
                        // console.log(iAttributes.rnCarouselOnInfiniteScroll);
                        if (event && !swipeMoved) {
                            return;
                        }

                        unbindMouseUpEvent();

                        pressed = false;
                        swipeMoved = false;
                        destinationX = startX - coords.x;
                        destinationY = startY - coords.y;

                        if (destinationX === 0 && destinationY === 0 || locked) {
                            return;
                        }

                        offsetX += (-destinationX * 100 / elWidth);
                        offsetY += (-destinationY * 100 / elHeight);

                        if (options.isSequential) {
                            var minMoveX = options.moveTreshold * elWidth,
                                absMoveX = -destinationX,
                                slidesMoveX = -Math[absMoveX >= 0 ? 'ceil' : 'floor'](absMoveX / elWidth),
                                shouldMoveX = Math.abs(absMoveX) > minMoveX;

                            var minMoveY = options.moveTreshold * elHeight,
                                absMoveY = -destinationY,
                                slidesMoveY = -Math[absMoveY >= 0 ? 'ceil' : 'floor'](absMoveY / elHeight),
                                shouldMoveY = Math.abs(absMoveY) > minMoveY;

                            if (currentSlides && (slidesMoveX + scope.carouselIndex) >= currentSlides.length) {
                                slidesMoveX = currentSlides.length - 1 - scope.carouselIndex;
                            }
                            if ((slidesMoveX + scope.carouselIndex) < 0) {
                                slidesMoveX = -scope.carouselIndex;
                            }

                            if(currentSlides && (slidesMoveY + scope.carouselIndex) >= currentSlides.length) {
                                slidesMoveY = currentSlides.length - 1 - scope.carouselIndex;
                            }

                            if((slidesMoveY + scope.carouselIndex) < 0){
                                slidesMoveY = -scope.carouselIndex;
                            }

                            var moveOffsetX = shouldMoveX ? slidesMoveX : 0,
                                moveOffsetY = shouldMoveY ? slidesMoveY : 0,
                                destination = 0;

                            if(isVertical){
                                destination = (scope.carouselIndex + moveOffsetY);
                                goToSlide(destination);
                                console.log('DestinationY: ' + destination);
                            } else {
                                destination = (scope.carouselIndex + moveOffsetX);
                                goToSlide(destination);
                                console.log('DestinationX: ' + destination);
                            }

                            if(iAttributes.rnCarouselOnInfiniteScrollRight!==undefined && slidesMoveX === 0 && scope.carouselIndex !== 0) {
                                $parse(iAttributes.rnCarouselOnInfiniteScrollRight)(scope)
                                goToSlide(0);
                            }
                            if(iAttributes.rnCarouselOnInfiniteScrollLeft!==undefined && slidesMoveX === 0 && scope.carouselIndex === 0 && moveOffset === 0) {
                                $parse(iAttributes.rnCarouselOnInfiniteScrollLeft)(scope)
                                goToSlide(currentSlides.length);
                            }

                        } else {
                            scope.$apply(function() {
                                if(isVertical){
                                    scope.carouselIndex = parseInt(-offsetY / 100, 10);
                                } else {
                                    scope.carouselIndex = parseInt(-offsetX / 100, 10);
                                }

                                updateBufferIndex();
                            });

                        }

                    }

                    scope.$on('$destroy', function() {
                        unbindMouseUpEvent();
                    });

                    scope.carouselBufferIndex = 0;
                    scope.carouselBufferSize = options.bufferSize;

                    function updateBufferIndex() {
                        // update and cap te buffer index
                        var bufferIndex = 0;
                        var bufferEdgeSize = (scope.carouselBufferSize - 1) / 2;
                        if (isBuffered) {
                            if (scope.carouselIndex <= bufferEdgeSize) {
                                // first buffer part
                                bufferIndex = 0;
                            } else if (currentSlides && currentSlides.length < scope.carouselBufferSize) {
                                // smaller than buffer
                                bufferIndex = 0;
                            } else if (currentSlides && scope.carouselIndex > currentSlides.length - scope.carouselBufferSize) {
                                // last buffer part
                                bufferIndex = currentSlides.length - scope.carouselBufferSize;
                            } else {
                                // compute buffer start
                                bufferIndex = scope.carouselIndex - bufferEdgeSize;
                            }

                            scope.carouselBufferIndex = bufferIndex;
                            $timeout(function() {
                                if(isVertical){
                                    updateSlidesPosition(offsetY);
                                } else {
                                    updateSlidesPosition(offsetX);
                                }
                            }, 0, false);
                        } else {
                            $timeout(function() {
                                if(isVertical){
                                    updateSlidesPosition(offsetY);
                                } else {
                                    updateSlidesPosition(offsetX);
                                }
                            }, 0, false);
                        }
                    }

                    function onOrientationChange() {
                        updateContainerWidth();
                        updateContainerHeight();
                        goToSlide();
                    }

                    // handle orientation change
                    var winEl = angular.element($window);
                    winEl.bind('orientationchange', onOrientationChange);
                    winEl.bind('resize', onOrientationChange);

                    scope.$on('$destroy', function() {
                        unbindMouseUpEvent();
                        winEl.unbind('orientationchange', onOrientationChange);
                        winEl.unbind('resize', onOrientationChange);
                    });
                };
            }
        };
    }
})();
