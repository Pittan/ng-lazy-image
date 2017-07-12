function dir(o) {
    for (var i in o) console.log(i);
}

/* globals: beforeEach, describe, it, module, inject, expect */
describe("Lazy image:", function() {

    var $document, scope, $compile;

    beforeEach(module('afkl.lazyImage'));

    beforeEach(inject(['$compile', '$rootScope', '$document',
        function(_$compile_, $rootScope, _$document_) {

            scope = $rootScope.$new();
            $document = _$document_;
            $compile = _$compile_;

        }
    ]));

    it('Does it have image attached', function() {

        var el = angular.element('<div afkl-lazy-image="img/foo.png 480w" afkl-lazy-image-options=\'{"nolazy": true}\'></div>');
        $compile(el)(scope);
        scope.$digest();

        expect(el.html()).toBe('<img class="afkl-lazy-image" src="img/foo.png 480w">');
    });

    it('Do we have loading class correctly set/unset', function() {
        var el = angular.element('<div afkl-lazy-image="img/foo.png 340h"></div>');
        $compile(el)(scope);
        scope.$digest();

        expect(el.hasClass('afkl-lazy-image-loading')).toBeDefined();

        window.setTimeout(function() {
            expect(el.html()).toBe('<img class="afkl-lazy-image" src="img/foo.png 340h">');
            expect(el.hasClass('afkl-lazy-image-loading')).toBe(false);
        }, 300);
    });

    it('Does it have an image as background set', function() {
        var el = angular.element('<div afkl-lazy-image="img/foo.png 1x" afkl-lazy-image-options=\'{"background": true}\'></div>');
        $compile(el)(scope);
        scope.$digest();

        expect(el[0].style.backgroundImage).toBeDefined();
    });

    it('Do we have alt set on our image', function() {
        var el = angular.element('<div afkl-lazy-image="img/foo.png" afkl-lazy-image-options=\'{"imgAttrs": [{"alt": "blue bird"}]}\'></div>');
        $compile(el)(scope);
        scope.$digest();

        window.setTimeout(function() {
            expect(el.html()).toBe('<img alt="blue bird" class="afkl-lazy-image" src="img/foo.png">');
        }, 300);
    });

    it('Do we have alternative className on our image', function() {
        var el = angular.element('<div afkl-lazy-image="img/foo.png" afkl-lazy-image-options=\'{"imgAttrs": [{"class": "foo"}]}\'></div>');
        $compile(el)(scope);
        scope.$digest();

        window.setTimeout(function() {
            expect(el.html()).toBe('<img class="foo" src="img/foo.png">');
        }, 300);
    });

    it('No image should be attached', function() {
        var el = angular.element('<div afkl-lazy-image=""></div>');
        $compile(el)(scope);
        scope.$digest();

        expect(el.html()).toBe('');
    });

    it('We only have one image', function() {
        var el = angular.element('<div afkl-lazy-image="img/foo.png 480w, img/foo.png 480w"></div>');
        $compile(el)(scope);
        scope.$digest();

        window.setTimeout(function() {
            expect(el.html()).toBe('<img src="img/foo.png">');
        }, 300);
    });

    it('Does image change after loaded', function() {

        var el = angular.element('<div afkl-lazy-image="{{url}}" afkl-lazy-image-options=\'{"nolazy": true}\'></div>');
        scope.url = "img/foo.png";
        $compile(el)(scope);
        scope.$digest();

        expect(el.html()).toBe('<img class="afkl-lazy-image" src="img/foo.png">');
        scope.url = "img/bar.png";
        scope.$digest();

        expect(el.html()).toBe('<img class="afkl-lazy-image" src="img/bar.png">');
    });

    it('Should remove image when scope is destroyed', function() {
        var el = angular.element('<div afkl-lazy-image="img/foo.png 480w" afkl-lazy-image-options=\'{"offset": 200}\'></div>');
        $compile(el)(scope);
        scope.$digest();

        scope.$destroy();
        expect($document.find('img').length).toBe(0);
    });

});


describe("srcset Service:", function() {

    var SrcSetService, $timeout;

    beforeEach(module('afkl.lazyImage'));

    beforeEach(inject(function(afklSrcSetService, _$timeout_) {
        SrcSetService = afklSrcSetService;
        $timeout = _$timeout_;
    }));


    it('Is my srcset Service available', function() {
        expect(SrcSetService).toBeDefined();
    });

    it('Throttler should be called once in 3 seconds', function() {
        var stub = jasmine.createSpy('throttled');
        var throttled = SrcSetService.throttle(stub, 3000);

        expect(stub).not.toHaveBeenCalled();

        throttled();
        throttled();
        throttled();

        expect(stub).toHaveBeenCalled();
        expect(stub.calls.count()).toBe(1);

        $timeout.flush(1500);

        throttled();

        expect(stub.calls.count()).toBe(1);

        $timeout.flush(3500);

        throttled();
        throttled();

        expect(stub.calls.count()).toBe(1);
    });
});

xdescribe("Image container and window scroll:", function() {

    var $document, scope, $compile, $window;

    function scrollEvent(e) {
        if (document.createEvent) {
            var ev = document.createEvent('HTMLEvents');
            ev.initEvent('scroll', true, true);
            e.dispatchEvent(ev);
        } else {
            var ev = document.createEventObject();
            if (e === $window) {
                document.documentElement.fireEvent('onscroll', ev);
            } else {
                e.fireEvent('onscroll', ev);
            }
        }
    }

    beforeEach(module('afkl.lazyImage'));

    beforeEach(inject(['$compile', '$rootScope', '$document', '$window',
        function(_$compile_, $rootScope, _$document_, _$window_) {

            scope = $rootScope.$new();
            $document = _$document_;
            $compile = _$compile_;
            $window = _$window_;

        }
    ]));

    it('Does lazy image work with custom image container', function() {
        var el = angular.element('<div afkl-image-container class="dd"><p></p><div afkl-lazy-image="img/foo.png 480w"></div></div>');
        var div = el.find('div'),
            p = el.find('p');

        angular.element($document[0].body).append(el);
        el[0].style.height = '200px';
        el[0].style.overflowY = 'scroll';
        p[0].style.height = '400px';
        $compile(el)(scope);
        scope.$digest();

        expect(div.html()).toBe('');

        el[0].scrollTop = 400;
        scrollEvent(el[0]);
        scope.$digest();

        expect(div.html()).toBe('<img class="afkl-lazy-image" src="img/foo.png">');
        el.remove();
    });

/*
    TODO: classes and attributes are different per browser so need to think other test

    it('Does lazy image work with custom image container with positioned images', function() {
        var el = angular.element('<div afkl-image-container class="dd">' +
        '<p></p>' +
        '<div style="position: relative; height: 400px;"><div afkl-lazy-image="img/foo.png 480w" style="position: absolute; height: 400px;"></div></div>' +
        '<div style="position: relative; height: 400px;"><div afkl-lazy-image="img/foo.png 480w" style="position: absolute; height: 400px;"></div></div>' +
        '</div>');
        var div = el.find('div'),
            p = el.find('p');

        angular.element($document[0].body).append(el);
        el[0].style.height = '200px';
        el[0].style.overflowY = 'scroll';
        p[0].style.height = '400px';
        $compile(el)(scope);
        scope.$digest();

        expect(div.html()).toBe('<div afkl-lazy-image="img/foo.png 480w" style="position: absolute; height: 400px;"></div>');

        el[0].scrollTop = 400;
        scrollEvent(el[0]);
        scope.$digest();

        expect(el.html()).toBe('<p style="height: 400px; "></p><div style="position: relative; height: 400px;"><div afkl-lazy-image="img/foo.png 480w" style="position: absolute; height: 400px;" class="afkl-lazy-image-loading"><img alt="" class="afkl-lazy-image" src="img/foo.png"></div></div><div style="position: relative; height: 400px;"><div afkl-lazy-image="img/foo.png 480w" style="position: absolute; height: 400px;" class="afkl-lazy-image-loading"><img alt="" class="afkl-lazy-image" src="img/foo.png"></div></div>');
        el.remove();
    });
*/
    // TODO: this case doesn't work in IE8, due to window scroll event isn't properly fired
    it('Does lazy image work with window', function() {
        var el = angular.element('<div afkl-lazy-image="img/foo.png 480w"></div>');
        var p = angular.element('<p></p>');
        var body = $document[0].body;
        //dir($window);

        angular.element(body).append(p);
        angular.element(body).append(el);
        var height = $window.innerHeight || $window.document.documentElement.clientHeight;
        p[0].style.height = height + 100 + 'px';
        $compile(el)(scope);
        scope.$digest();

        expect(el.html()).toBe('');

        $window.scrollTo ? $window.scrollTo(0, height) : document.documentElement.scrollTo(0, height);
        scrollEvent($window);
        scope.$digest();

        expect(el.html()).toBe('<img class="afkl-lazy-image" src="img/foo.png">');
    });
});

// TODO: TRIGGER RESIZE EVENT
