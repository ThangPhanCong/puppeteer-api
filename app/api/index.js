"use strict";

const api = require("express").Router();
const Glob = require('glob');

api.get("/", (req, res) => {
    res.json({
        "msg": "Welcome to Advertisement server"
    });
});

const apis = Glob.sync("**/*.api.js");
apis.forEach((subApi) => api.use(require('../../' + subApi)));

module.exports = api;