/* global angular */
angular.module('afkl.lazyImage')
    .service('afklSrcSetService', [function() {
        'use strict';

        // throttle function to be used in directive
        function throttle(callback, delay) {
            var last, deferTimer;
            return function() {
                var now = +new Date();
                if (last && now < last + delay) {
                    clearTimeout(deferTimer);
                    deferTimer = setTimeout(function () {
                        last = now;
                        callback();
                    }, delay + last - now);
                } else {
                    last = now;
                    callback();
                }
            };
        }

        /**
         * PUBLIC API
         */
        return {
            throttle: throttle     // RETURNS A THROTTLER FUNCTION
        };


    }]);
