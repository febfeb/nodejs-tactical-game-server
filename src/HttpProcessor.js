class HttpProcessor {
    constructor(app, http){
        app.get('/', this.onRoot);
        app.get('/jquery.js', this.onJquery);
        app.get('/jquery-ui.js', this.onJqueryUi);

        http.listen(8080, function () {
            console.log('listening on *:' + 8080);
        });
    }

    onRoot (req, res) {
        const resolve = require('path').resolve;
        res.sendFile(resolve('./files/console.html'));
    }

    onJquery (req, res) {
        const resolve = require('path').resolve;
        res.sendFile(resolve('./files/jquery.js'));
    }

    onJqueryUi (req, res) {
        const resolve = require('path').resolve;
        res.sendFile(resolve('./files/jquery.ui.js'));
    }
}

module.exports = HttpProcessor;
