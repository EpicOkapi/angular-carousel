(function(){
    'use strict';

    angular
        .module('angular-carousel')
        .directive('rnCarouselAutoSlide', CarouselAutoSlide);

    function CarouselAutoSlide($interval){
        return {
            restrict: 'A',
            link: link
        };

        function link(scope, element, attrs){
            var stopAutoPlay = function() {
                if (scope.autoSlider) {
                    $interval.cancel(scope.autoSlider);
                    scope.autoSlider = null;
                }
            };

            var restartTimer = function() {
                scope.autoSlide();
            };

            scope.$watch('carouselIndex', restartTimer);

            if (attrs.hasOwnProperty('rnCarouselPauseOnHover') && attrs.rnCarouselPauseOnHover !== 'false'){
                element.on('mouseenter', stopAutoPlay);
                element.on('mouseleave', restartTimer);
            }

            scope.$on('$destroy', function(){
                stopAutoPlay();
                element.off('mouseenter', stopAutoPlay);
                element.off('mouseleave', restartTimer);
            });
        }
    }
})();
