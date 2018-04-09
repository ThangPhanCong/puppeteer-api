const config = require('config');
const rp = require('request-promise');
const emailServerUrl = config.get('url.email_api');

exports.sendEmail = (from, to, subject, content) => {
    const payload = {from, to, subject, content};

    const options = {
        uri: emailServerUrl + "/email",
        method: 'POST',
        body: payload,
        json: true
    };

    return rp(options);
};