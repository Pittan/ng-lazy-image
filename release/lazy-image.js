/* global angular */
angular.module('afkl.lazyImage', []);
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

/* global angular */
angular.module('afkl.lazyImage')
    .directive('afklImageContainer', function () {
        'use strict';

        return {
            restrict: 'A',
            // We have to use controller instead of link here so that it will always run earlier than nested afklLazyImage directives
            controller: ['$scope', '$element', function ($scope, $element) {
                $element.data('afklImageContainer', $element);
            }]
        };
    })

    .directive('afklLazyImage', ['$rootScope', '$window', '$timeout', 'afklSrcSetService', '$parse', function ($rootScope, $window, $timeout, srcSetService, $parse) {
        'use strict';

        return {
            restrict: 'A',
            link: function (scope, element, attrs) {

                var _concatImgAttrs = function (imgAttrs) {

                    var result = [];
                    var CLASSNAME = 'afkl-lazy-image';
                    var setClass = false;

                    if (!!options.imgAttrs) {
                        result = Array.prototype.map.call(imgAttrs, function(item) {
                            for (var key in item) {
                                if (item.hasOwnProperty(key)) {

                                    // TODO: TITLE CAN COME LATER (FROM DATA MODEL)
                                    var value = item[key];
                                    if (key === 'class') {
                                        setClass = true;
                                        value = value + ' ' + CLASSNAME;
                                    }
                                    return String.prototype.concat.call(key, '="', value, '"');
                                }
                            }
                        });
                    }

                    if (!setClass) {
                        result.push('class="' + CLASSNAME + '"');
                    }

                    return result.join(' ');
                };

                // CONFIGURATION VARS
                var $container = element.inheritedData('afklImageContainer');
                if (!$container) {
                    $container = angular.element(attrs.afklLazyImageContainer || $window);
                }

                var loaded = false;
                var timeout;

                var images = attrs.afklLazyImage; // srcset attributes
                var options = attrs.afklLazyImageOptions ? $parse(attrs.afklLazyImageOptions)(scope) : {}; // options (background, offset)

                var img = null; // Angular element to image which will be placed
                var currentImage = null; // current image url
                var offset = options.offset ? options.offset : 50; // default offset
                var imgAttrs = _concatImgAttrs(options.imgAttrs); // all image attributes like class, title, onerror

                var LOADING = 'afkl-lazy-image-loading';

                attrs.afklLazyImageLoaded = false;

                var _containerScrollTop = function () {
                    // See if we can use jQuery, with extra check
                    // TODO: check if number is returned
                    if ($container.scrollTop) {
                        var scrollTopPosition = $container.scrollTop();
                        if (scrollTopPosition) {
                            return scrollTopPosition;
                        }
                    }

                    var c = $container[0];
                    if (c.pageYOffset !== undefined) {
                        return c.pageYOffset;
                    }
                    else if (c.scrollTop !== undefined) {
                        return c.scrollTop;
                    }

                    return document.documentElement.scrollTop || 0;
                };

                var _containerInnerHeight = function () {
                    if ($container.innerHeight) {
                        return $container.innerHeight();
                    }

                    var c = $container[0];
                    if (c.innerHeight !== undefined) {
                        return c.innerHeight;
                    } else if (c.clientHeight !== undefined) {
                        return c.clientHeight;
                    }

                    return document.documentElement.clientHeight || 0;
                };

                // Begin with offset and update on resize
                var _elementOffset = function () {
                    if (element.offset) {
                        return element.offset().top;
                    }
                    var box = element[0].getBoundingClientRect();
                    return box.top + _containerScrollTop() - document.documentElement.clientTop;
                };


                var _elementOffsetContainer = function () {
                    if (element.offset) {
                        return element.offset().top - $container.offset().top;
                    }
                    return element[0].getBoundingClientRect().top - $container[0].getBoundingClientRect().top;
                };

                // Update url of our image
                var _setImage = function () {
                    if (options.background) {
                        element[0].style.backgroundImage = 'url("' + currentImage +'")';
                    } else if (!!img) {
                        img[0].src = currentImage;
                    }
                };

                // Append image to DOM
                var _placeImage = function () {

                    loaded = true;
                    // What is my best image available
                    var hasImage = images;

                    if (hasImage) {
                        // we have to make an image if background is false (default)
                        if (!options.background) {

                            if (!img) {
                                element.addClass(LOADING);
                                img = angular.element('<img ' + imgAttrs + ' />');
                                img.one('load', _loaded);
                                img.one('error', _error);
                                // remove loading class when image is acually loaded
                                element.append(img);
                            }

                        }

                        // set correct src/url
                        _checkIfNewImage();
                    }

                    // Element is added to dom, no need to listen to scroll anymore
                    $container.off('scroll', _onViewChange);

                };

                // Check on resize if actually a new image is best fit, if so then apply it
                var _checkIfNewImage = function () {
                    if (loaded) {
                        var newImage = images;
                        
                        if (newImage !== currentImage) {
                            // update current url
                            currentImage = newImage;

                            // TODO: loading state...

                            // update image url
                            _setImage();
                        }
                    }
                };

                // First update our begin offset
                _checkIfNewImage();

                var _loaded = function () {

                    attrs.$set('afklLazyImageLoaded', 'done');

                    element.removeClass(LOADING);

                    _eventsOffAfterLoading();

                };

                var _error = function () {

                    attrs.$set('afklLazyImageLoaded', 'fail');

                };

                // Check if the container is in view for the first time. Utilized by the scroll and resize events.
                var _onViewChange = function () {
                    // only do stuff when not set already
                    if (!loaded) {

                        // Config vars
                        var remaining, shouldLoad, windowBottom;

                        var height = _containerInnerHeight();
                        var scroll = _containerScrollTop();

                        var elOffset = $container[0] === $window ? _elementOffset() : _elementOffsetContainer();
                        windowBottom = $container[0] === $window ? height + scroll : height;

                        remaining = elOffset - windowBottom;

                        // Is our top of our image container in bottom of our viewport?
                        //console.log($container[0].className, _elementOffset(), _elementPosition(), height, scroll, remaining, elOffset);
                        shouldLoad = remaining <= offset;


                        // Append image first time when it comes into our view, after that only resizing can have influence
                        if (shouldLoad) {

                            _placeImage();
                        }
                    }
                };

                var _onViewChangeThrottled = srcSetService.throttle(_onViewChange, 800);

                // Remove events after loading
                var _eventsOffAfterLoading = function() {

                    $timeout.cancel(timeout);

                    if ($container[0] !== $window) {
                        $container.off('scroll', _onViewChangeThrottled);
                    }

                    timeout = undefined;
                };

                // Remove events for total destroy
                var _eventsOff = function() {

                    $timeout.cancel(timeout);

                    if ($container[0] !== $window) {
                        $container.off('scroll', _onViewChangeThrottled);
                    }

                    // remove image being placed
                    if (img) {
                        img.remove();
                    }

                    img = timeout = currentImage = undefined;
                };

                // if container is not window, set events for container as well
                if ($container[0] !== $window) {
                    $container.on('scroll', _onViewChangeThrottled);
                }

                // events for image change
                attrs.$observe('afklLazyImage', function () {
                    images = attrs.afklLazyImage;
                    if (loaded) {
                        _placeImage();
                    }
                });

                // Image should be directly placed
                if (options.nolazy) {
                    _placeImage();
                }

                // Remove all events when destroy takes place
                scope.$on('$destroy', function () {
                    // remove our events and image
                    return _eventsOff();
                });
                return _onViewChange();

            }
        };

}]);
