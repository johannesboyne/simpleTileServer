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