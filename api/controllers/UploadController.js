////////////////////////////////
//——————————————————————————————
//	UploadController
//
//	@description	:: Server-side logic for managing Uploaded Files
//	@help 			:: See http://links.sailsjs.org/docs/controllers
//——————————————————————————————
////////////////////////////////

module.exports = {
	
	'get': function(req, res, next) {
		
		var allowedTypes = [

				//	doc
				'txt', 'md', 'mdown', 'rtf', 'csv', 'pdf',
				
				//	image
				'jpg', 'jpeg', 'png', 'svg', 'gif',

				//	video
				'mp4', 'webm', 'flv', 'mov',

				//	audio
				'mp3', 'wav', 'aiff', 'ogg'

			],
			reqPath       = req.params[0],
			routePath     = req.route.path.replace('*', ''), 		// should be /uploads/ 
			uploadDirPath = sails.config.appPath + routePath, 	// should be /path/to/app/uploads/
			filePath      = uploadDirPath + reqPath;


		//	deny directory listing
		if ( !reqPath )
			return res.status(403).json({"status": 403});
		

		var fs = require('fs')
			path = require('path');
		
		fs.exists(filePath, function(exists) {
			

			//	file not found
			if (!exists)
				return res.status(404).json({"status": 404});
			

			fs.stat(filePath, function(err, stats) {


				//	deny sub-directory listing
				if ( stats.isDirectory() )
					return res.status(403).json({"status": 403});


				//	don't read disallowed file types
				if (
					!stats.isFile() ||
					allowedTypes.indexOf( path.extname(filePath).replace(/^./,'') ) == -1
				)
					return res.status(400).json({"status": 400});
			

				var read_stream = fs.createReadStream( filePath );
				
				read_stream.on('open', function() {
					
					read_stream.pipe(res);
				
				});
				
				read_stream.on('error', function(err) {
			
					res.status(400).send(err);
			
				});

			});
			
		});
		
		
	}

};