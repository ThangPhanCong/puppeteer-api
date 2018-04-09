'use strict';

const api = require("express").Router();
const config = require('config');
const crawl_service = require('./crawl.service');
const {info, error} = require('../../services/logger');
const {success, fail} = require("../../utils/response-utils");
const authMiddleware = require('../auth.mid');

api.get(
    '/crawl',
    async (req, res) => {

        try {
            const result =  await crawl_service.getCrawl();
            return res.json(success(result));
        }
        catch (err) {
            error(`${req.method} ${req.originalUrl}`, err.message);
            return res.json(fail(err.message));
        }
    }
);

module.exports = api;