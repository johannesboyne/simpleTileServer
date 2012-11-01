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