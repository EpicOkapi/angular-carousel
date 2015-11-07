(function(){
    'use strict';

    angular
        .module('angular-carousel')
        .service('createStyleString', CreateStyleString);

    function CreateStyleString() {
        return function(object) {
            var styles = [];

            angular.forEach(object, function(value, key) {
                styles.push(key + ':' + value);
            });

            return styles.join(';');
        };
    }
})();
