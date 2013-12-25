

// brew install graphicsmagick
// export AWS_ACCESS_KEY_ID="bla"
// export AWS_SECRET_ACCESS_KEY="bla"
// forever client.js

// {
// 	"name":"monocle",
// 	"aws":{
// 		"Bucket":"SomeBucket"
// 	},
// 	"capture":{
// 		"threshold":0.006,
// 		"name":"capture.jpg",
// 		"prev_name":"prev_capture.jpg"
// 	},
// 	"last":{
// 		"count":40,
// 		"name":"040.jpg"
// 	}
// }

var imagesnap = require('imagesnap');
var fs = require('fs');
var AWS = require('aws-sdk');
var gm = require('gm');
var s3 = new AWS.S3();

var config_filename = 'config.json';
var config_path = './'+config_filename;
var config = require(config_path);


var pad = function (str, max) {
	str = String(str);
  return str.length < max ? pad("0" + str, max) : str;
}

// var Camelot = require('camelot');

// var camelot = new Camelot( {
//   'rotate' : '180',
//   'flip' : 'v'
// });

// camelot.on('frame', function (image) {
//   console.log('frame received!');
// });

// camelot.on('error', function (err) {
//   console.log(err);
// });

// camelot.grab( {
//   'title' : 'Camelot',
//   'font' : 'Arial:24',
//   'frequency' : 1    
// });

// console.log(config)

config.last.count = config.last.count+1;
config.last.name = pad(config.last.count, 3)+'.jpg';


var update_config = function (config_data) {
	
	var config_string = JSON.stringify(config_data);

	fs.writeFile(config_path, config_string, function(err) {
		if(err) {
		  console.log(err);
		} else {
		  s3.client.putObject({
		    Bucket: config.aws.Bucket,
		    Key: config.name+'/'+config_filename,
		    Body: config_string,
		    ACL:'public-read'
		  }, function (res) {
		    // console.log('Successfully uploaded config file.');
		  });
		}
	});
}

var backup_file_for_comparison = function () {
	fs.createReadStream(config.capture.name).pipe(fs.createWriteStream(config.capture.prev_name));
}

var snap = function () {

	var imageStream = fs.createWriteStream(config.capture.name);
	var cheese = imagesnap()

	cheese.pipe(imageStream);

	cheese.on('end', function() {

		// resemble(config.capture.name).compareTo(config.capture.prev_name).onComplete(function(data){
		gm.compare(config.capture.name, config.capture.prev_name, function (err, isEqual, equality, raw) {
		  if (err) throw err;

		  // console.log('Actual equality: %d', equality);

		  if ( equality > config.capture.threshold ) {

			  fs.readFile(config.capture.name, function (err, data) {
				  if (err) { throw err; }

				  s3.client.putObject({
				    Bucket: config.aws.Bucket,
				    Key: config.name+'/'+config.last.name,
				    Body: data,
				    ACL:'public-read'
				  }, function (res) {
				    
				    console.log('Successfully uploaded file '+ config.last.name);
				    update_config(config);
				    backup_file_for_comparison();

				  });

				});

		  } else {
		  	console.log('Images are equal... skipping.')
		  }

		});

	});

}


snap();



