'use strict';

const api = require("express").Router();
const config = require('config');
const crawl_service = require('./crawl.service');
const mongoose = require('mongoose');
const StatusCrawl = mongoose.model('StatusCrawl');
const {info, error} = require('../../services/logger');
const {success, fail} = require("../../utils/response-utils");
const authMiddleware = require('../auth.mid');

api.get(
    '/check-crawl',
    authMiddleware,
    async (req, res) => {

        try {
            let message = "";
            const {project_id} = req.payload;
            const status_crawl = await StatusCrawl.findOne({project_id});
            if (status_crawl && status_crawl.is_crawling) {
                message = "Đang lấy dữ liệu";
            } else {
                message = "Đã lấy xong dữ liệu"
            }
            return res.json(success({message, is_crawling: status_crawl.is_crawling}));
        }
        catch (err) {
            error(`${req.method} ${req.originalUrl}`, err.message);
            return res.json(fail(err.message));
        }
    }
);

module.exports = api;