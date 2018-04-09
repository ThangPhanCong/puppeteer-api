"use strict";

const jwt = require("jsonwebtoken");

exports.generateAccessToken = (payload, secret, expiresIn = '1d') => {
    return new Promise((resolve, reject) => {
        jwt.sign(payload, secret, {algorithm: "HS256", expiresIn: expiresIn}, function (err, token) {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
};
