'use strict';

const crypto = require('crypto');

exports.generateFbAppSecret = (access_token, app_secret) => {
    return crypto.createHmac('sha256', app_secret)
        .update(access_token)
        .digest('hex');
};
