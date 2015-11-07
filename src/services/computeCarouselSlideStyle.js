(function() {
    'use strict';

    angular
        .module('angular-carousel')
        .service('computeCarouselSlideStyle', ComputeCourselSlideStyle);

    function ComputeCourselSlideStyle(DeviceCapabilities) {
        // compute transition transform properties for a given slide and global offset
        return function (slideIndex, offset, transitionType, vertical) {
            var style = {
                    display: vertical ? 'block' : 'inline-block'
                },
                opacity,
                absoluteLeft = (slideIndex * 100) + offset,
                slideTransformValue = '',
                distance = ((100 - Math.abs(absoluteLeft)) / 100);

            if (vertical === true) {
                slideTransformValue = DeviceCapabilities.has3d ? 'translate3d(0, ' + absoluteLeft + '%, 0)' : 'translate3d(0, ' + absoluteLeft + '%)';
            } else {
                slideTransformValue = DeviceCapabilities.has3d ? 'translate3d(' + absoluteLeft + '%, 0, 0)' : 'translate3d(' + absoluteLeft + '%, 0)';
            }

            if (!DeviceCapabilities.transformProperty) {
                // fallback to default slide if transformProperty is not available
                style['margin-left'] = absoluteLeft + '%';
            } else {
                if (transitionType === 'fadeAndSlide') {
                    style[DeviceCapabilities.transformProperty] = slideTransformValue;
                    opacity = 0;
                    if (Math.abs(absoluteLeft) < 100) {
                        opacity = 0.3 + distance * 0.7;
                    }
                    style.opacity = opacity;
                } else if (transitionType === 'hexagon') {
                    var transformFrom = 100,
                        degrees = 0,
                        maxDegrees = 60 * (distance - 1);

                    transformFrom = offset < (slideIndex * -100) ? 100 : 0;
                    degrees = offset < (slideIndex * -100) ? maxDegrees : -maxDegrees;
                    style[DeviceCapabilities.transformProperty] = slideTransformValue + ' ' + 'rotateY(' + degrees + 'deg)';
                    style[DeviceCapabilities.transformProperty + '-origin'] = transformFrom + '% 50%';
                } else if (transitionType === 'zoom') {
                    style[DeviceCapabilities.transformProperty] = slideTransformValue;
                    var scale = 1;
                    if (Math.abs(absoluteLeft) < 100) {
                        scale = 1 + ((1 - distance) * 2);
                    }
                    style[DeviceCapabilities.transformProperty] += ' scale(' + scale + ')';
                    style[DeviceCapabilities.transformProperty + '-origin'] = '50% 50%';
                    opacity = 0;
                    if (Math.abs(absoluteLeft) < 100) {
                        opacity = 0.3 + distance * 0.7;
                    }
                    style.opacity = opacity;
                } else {
                    style[DeviceCapabilities.transformProperty] = slideTransformValue;
                }
            }
            return style;
        };
    }
})();
