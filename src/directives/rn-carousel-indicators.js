(function(){
    'use strict';

    angular
        .module('angular-carousel')
        .directive('rnCarouselIndicators', CarouselIndicators)
        .run(run);

    function CarouselIndicators($parse){
        return {
            restrict: 'A',
            scope: {
                slides: '=',
                index: '=rnCarouselIndex'
            },
            templateUrl: 'carousel',
            link: link
        };

        function link(scope, iElement, iAttributes) {
            var indexModel = $parse(iAttributes.rnCarouselIndex);

            scope.goToSlide = function(index) {
                indexModel.assign(scope.$parent.$parent, index);
            };
        }
    }

    function run($templateCache) {
        $templateCache.put('carousel-indicators.html',
            '<div class="rn-carousel-indicator">\n' +
                '<span ng-repeat="slide in slides" ng-class="{active: $index==index}" ng-click="goToSlide($index)">●</span>' +
            '</div>'
        );
    }
})();
