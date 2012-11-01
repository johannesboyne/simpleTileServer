describe('hash', function() {
    var mm = com.modestmaps;
    var map, initial_zoom = 10;

    beforeEach(function() {
        var div = document.createElement('div');

        window.location.hash = '';

        map = new mm.Map(div, new mm.TemplatedMapProvider(
            'http://{S}tile.openstreetmap.org/{Z}/{X}/{Y}.png', ['a.']), new com.modestmaps.Point(10, 10));

        wax.mm.hash(map);
    });

    afterEach(function() {
        div = null;
        map.destroy();
    });

    it('should not mess with map movement', function() {
        runs(function() {
          map.setCenterZoom(new mm.Location(25, 25), 2);
        });
        waits(600);
        runs(function() {
          var center = map.getCenter();
          expect(Math.round(center.lat)).toEqual(25);
          expect(Math.round(center.lon)).toEqual(25);
          expect(map.getZoom()).toEqual(2);
        });
    });

    it('sets the right location hash', function() {
        runs(function() {
          map.setCenterZoom(new mm.Location(25, 25), 2);
        });
        waits(1000);
        runs(function() {
          expect(window.location.hash).toEqual('#2.00/25.0/25.0');
        });
    });
});
