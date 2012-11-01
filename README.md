simpleTileServer
================

##How to write your own simple tile server, using Node.js + node-canvas + tileJson:

##tl;dr
Use [node-canvas](https://github.com/LearnBoost/node-canvas) for easy image manipulation, drawing polygons onto the images and so on. Of cause you can also use [GraphicsMagick for node.js](http://aheckmann.github.com/gm/) or [node-imagemagick](https://github.com/rsms/node-imagemagick) for image manipulation, just as you like.

On the client side use [Wax](http://mapbox.com/wax/) to load and display the tiles. You have to provide some [tileJSON](https://github.com/mapbox/tilejson-spec) for the Wax client.

##The TileServer
**INFO:** The TileServer renders the tiles live and for production use you should do some kind of caching **!**

Basic-Setup:

  - I am using [Vagrant](http://vagrantup.com/) for the testserver running an Ubuntu Server Edition
  - Node.js v0.8.5
  - apt-get and make installed! (Thus you can do `make install`)

Ok, let's see how to setup the tile server, if you have apt-get, make, Node.js and npm installed just ran:
```
$ make install
```

A tile is requested by the following URL `http://localhost:8888/tiles/tile_id/{z}/{x}/{y}.png` thus we have to split our image into a grid (our server is doing this on the fly) for further details look at the [tileJSON-spec](https://github.com/mapbox/tilejson-spec). If a specific tile is requested we are calculating the x-,y-position and source-width and -height from the original image and transforming it into a 256x256 image-tile.

```javascript
var fs 		= require('fs'),
	Canvas  = require('canvas'),
	Image   = Canvas.Image,
	o_img   = fs.readFileSync('./static/img/atari2048x2048.png'), // original image data, loaded directly into the memory
	img     = new Image();
	img.src = o_img;

exports.getTile = function (z,x,y,fn) {
	var canvas 		= new Canvas(256,256),
		ctx        	= canvas.getContext('2d'),
		zoom       	= img.width/Math.pow(2,Number(z));

	// check if the requested tile exists
	if ((x*zoom) > img.width || (y*zoom) > img.height) {
		fn('Tile does not exists');
	} else {
		/*
		This is the explanation why cropping works:
		ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
		img = the image element
		sx = source x
		sy = source y
		sw = source width
		sh = source height
		dx = destination x
		dy = destination y
		dw = destination width
		dh = destination height
		*/
		// now, lets draw the tile
		ctx.drawImage(img,(x*zoom),(y*zoom),zoom,zoom,0,0,256,256);
		// and transform it into a binary buffer, so we can
		// deliver it to the client
		canvas.toBuffer(function(err, buf){
			if (err) throw err;
			fn(buf);
		});	
	}
}
``` 
As you can see, without comments only 20 lines of code will do the main image calculation stuff. Now we only have to get connected to the outer world, therefore we span a HTTP-Server (I am using [tako](https://github.com/mikeal/tako) but the native Node HTTPServer or sth. like express will do it as well).
The Wax client is asking for a tileJSON `jsonp` with such a structure:
```javascript
grid({ "tilejson": "2.0.0",
  "tiles": [ "http://tileURL/maybesomeID/{z}/{x}/{y}.png" ] });
``` 
You can imagine that the x and y coordinate is nothing more than tile column and row. Because the image has to be transformed into 256x256 tiles we have for example 4 columns and rows for a 1024x1024 image (`1024/256 = 4`) thus 16 tiles if it is zoomed to the original quality.

If you want to cache and store your image tiles, you should look at the [MBTiles-Spec](https://github.com/mapbox/mbtiles-spec) and go for some structure like this:
```
zoom_level | tile_column | tile_row | tile_data
5          | 13          | 23       | [PNG data]
5          | 13          | 24       | [PNG data]
5          | 14          | 23       | [PNG data]
5          | 14          | 24       | [PNG data]
5          | 15          | 25       | [PNG data]
```
(source: [http://mapbox.com/developers/mbtiles/](http://mapbox.com/developers/mbtiles/))

However the `tileServer.js` for handling incoming http requests and routing looks like this:
```javascript
// Copyright (c) 2012 Johannes Boyne <johannes@boyne.de>
// LICENSE: (The MIT License)
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// used dependencies / modules
// -----------------------------------------------------------------------------
var fs 		= require('fs'),
	request = require('request'),
	path 	= require('path'),
	tako 	= require('tako'),
	app 	= tako(),
	tilegen = require('./tilegen');

// -----------------------------------------------------------------------------
// internal functions
// -----------------------------------------------------------------------------
// Requesting a single tile
function _tileRequested(req, res) {
	tilegen.getTile(req.params.z,req.params.x,req.params.y, function (buf) {
		if (Buffer.isBuffer(buf)) {
			// tile
			res.writeHead(200, {'content-type': 'image/png'});
			res.end(buf);
		} else {
			// tile doesn't exists
			res.writeHead(500, {'content-type': 'text/plain'});
			res.end(buf);
		}
	});
}
// Requesting the tileJSON
function _tileJsonRequested(req, res) {
	var tileJSON = {
		"tilejson": "2.0.0",
		"tiles": ["http://localhost:8888/tiles/tile_id/{z}/{x}/{y}.png"]
	};
	res.writeHead(200, {'content-type': 'application/javascript'});
	res.end('grid('+JSON.stringify(tileJSON)+');');
}

// -----------------------------------------------------------------------------
// routing
// -----------------------------------------------------------------------------
app.route('/tiles/:tile_id/:z/:x/:y.png', _tileRequested);
app.route('/tileJSON/:tile_id.jsonp', _tileJsonRequested);
app.route('/static/*').files(path.join(__dirname,'static'));
app.route('/').files(path.join(__dirname,'static/index.html'))

// -----------------------------------------------------------------------------
// starting the http server
// -----------------------------------------------------------------------------
app.httpServer.listen(8888);
console.log('server started \033[32m (8888) \033[0m');
```

On the client side we only have to provide the following `index.html`
```html
<html>
<head>
	<title>tiles test</title>
	<script src='static/js/libs/wax/ext/modestmaps.min.js'></script>
	<script src='static/js/libs/wax/dist/wax.mm.js'></script>
	<link href='static/js/libs/wax/theme/controls.css' rel='stylesheet' type='text/css' />
</head>
<body>
	<div id="modestmaps-setup"></div>
	<script type="text/javascript">
	var url = 'http://localhost:8888/tileJSON/atari.jsonp';
	wax.tilejson(url, function(tilejson) {
		window.m = new MM.Map('modestmaps-setup',
			new wax.mm.connector(tilejson),
			new MM.Point(512,256));

		wax.mm.zoomer(m, tilejson).appendTo(m.parent);

		window.m.setCenterZoom({ lat: 0, lon: 0 }, 0);
		window.m.setZoomRange(0, 3);
	});
	</script>
</body>
</html>
```

Let's see it in action

  ![atari 0 zoom](http://f.cl.ly/items/142E2l0J1R2K1t0x073A/atari_z0.png)
  ![atari 1 zoom](http://cl.ly/image/0C2M0f0t2W1f/atari_z1.png)
  ![atari 2 zoom](http://cl.ly/image/030f2G300C3v/atari_z2.png)

Image Source: [http://jakenewton.me/category/miscellaneous/game/](http://jakenewton.me/category/miscellaneous/game/)

## License

(The MIT License)

Copyright (c) 2012 Johannes Boyne &lt;johannes@boyne.de&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

