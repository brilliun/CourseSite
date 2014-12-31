var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var morgan = require('morgan');
var app = express();

var FEEDBACK_FILE = 'feedbacks.log';
var FILE_SIZE_LIMIT = 100 * 1024 * 1024;
var mPrevIP, mPrevSaveTime = 0, mSaveTimeGap = 60 * 1000;

var ACCESS_LOG_FILE = '/access.log';
var accessLogStream = fs.createWriteStream(__dirname + ACCESS_LOG_FILE, {flags: 'a'});

app.set('port', process.env.PORT || 80);

app.use(morgan('combined', {immediate: true, stream: accessLogStream, skip: function(req, res) {var url = req.originalUrl || req.url || ''; return url.length > 1;}}));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));


app.post('/send_feedback', saveFeedback);

var server = app.listen(app.get('port'), function(){
	var uid = parseInt(process.env.SUDO_UID);

	if (uid) process.setuid(uid);
	console.log('Server\'s UID is now ' + process.getuid());

	var host = server.address().address;
	var port = server.address().port;
	console.log( 'Express started at http://%s:%s', host, port);
});

function saveFeedback(req, res) {
	var tCurrentTime = new Date();

	if (mPrevIP === req.ip && (tCurrentTime - mPrevSaveTime) < mSaveTimeGap) {
		res.end();
		return;
	}

	mPrevIP = req.ip;
	mPrevSaveTime = tCurrentTime;

	var feedback = tCurrentTime + '  IP:' + req.ip + '  ' + JSON.stringify(req.body) + '\n';

	if (feedback.length < 1000) {
		fs.stat(FEEDBACK_FILE, function(err, stats) {
			if (!stats || stats.size < FILE_SIZE_LIMIT) {
				fs.appendFile(FEEDBACK_FILE, feedback, function(err) {
					if (err) {
						console.log('Error in saving feedback:' + feedback);
					}
				});
			} else {
				console.log('Feedback file size too large:' + feedback);
			}
		});
	}

	res.status(200);
	res.end();
}
