const art = require('ascii-art');
const ffmpeg = require('ffmpeg');
const rimraf = require('rimraf');
const padStart = require('string.prototype.padstart');
const replaceAll = require('string.prototype.replaceall');
const fs = require('fs');


const argv = require('yargs')
  .scriptName("vid-to-subs")
  .usage('$0 [args] <vidpath>')
  .help('h').alias('h', 'help')
  .argv


function index_to_timestamp(index) {
  if (index == 0) return "00:00:00,001";
  const last_millis = ["00", "33", "66"][index % 3];
  const tenth_milli = (Math.floor(index/3)%10).toString();
  const seconds = padStart(Math.floor(index/30)%60,2,"0");
  const minutes = padStart(Math.floor(index/30/60)%60,2,"0");
  const hours = padStart(Math.floor(index/30/60/60),2,"0");
  return `${hours}:${minutes}:${seconds},${tenth_milli}${last_millis}`;
}

try {
  rimraf.sync('./frames');
} catch (err) {}
fs.mkdirSync('./frames');

const vidpath = argv['_'][0];
var files = [];

try {
	var process = new ffmpeg(vidpath);
	process.then(function (video) {
		// Callback mode
		video.fnExtractFrameToJPG('./frames', {
			frame_rate : 30,
      file_name : "%06d.jpg"
		}, function (error, files) {
			if (!error) {
        const sub_promises = files.map(file => {
          return art.image({
            posterize: true,
            stippled: true,
            background: true,
            filepath: file,
            threshold: 96,
            width: 32,
            height: 32
          });
        });

        Promise.all(sub_promises).then(subs => {
          const srt_text = subs.map((sub, index) => {
            //console.log(sub);
            return (index + 1) + "\n" +
            index_to_timestamp(index) + " --> " + index_to_timestamp(index + 1) + "\n" +
            replaceAll(sub,/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,'')
          }).join("\n");

          fs.writeFile("output.srt", srt_text, "utf8", (err) => console.log(err));
        }).catch(error => console.log('Error: ' + error));
      }
      else {
        console.log(error);
      }
		});
	}, function (err) {
		console.log('Error: ' + err);
	});
} catch (e) {
	console.log(e.code);
	console.log(e.msg);
}
