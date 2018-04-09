"use strict";

let jwt = require("jsonwebtoken");
const config = require('config');
const {fail, unauthorized} = require("../utils/response-utils");

module.exports = (req, res, next) => {
    const access_token = req.headers.authorization;
    const secret = config.get('server.secret');
    jwt.verify(access_token, secret, function (err, decoded) {
        if (err) {
            const unauthorizedRes = unauthorized();
            return res.json(unauthorizedRes);
        } else {
            req.payload = decoded;
            next();
        }
    });
};