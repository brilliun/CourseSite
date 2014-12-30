var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();

var FEEDBACK_FILE = 'feedbacks.log';
var FILE_SIZE_LIMIT = 100 * 1024 * 1024;
var mPrevIP, mPrevSaveTime = 0, mSaveTimeGap = 60 * 1000;

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.post('/send_feedback', saveFeedback);

app.listen(app.get('port'), function(){
	console.log( 'Express started on http://localhost:' +
				 app.get('port') + '; press Ctrl-C to terminate.' 
			   );
});


function saveFeedback(req, res) {
	var tCurrentTime = new Date();

	if (mPrevIP === req.ip && (tCurrentTime - mPrevSaveTime) < mSaveTimeGap) {
		res.end();
		return;
	}

	mPrevIP = req.ip;
	mPrevSaveTime = tCurrentTime;

	console.log(req.ip);
	var feedback = JSON.stringify(req.body) + '\n';

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
