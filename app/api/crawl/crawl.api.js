'use strict';
const db = require('../../database');
const api = require("express").Router();
const config = require('config');
const crawl_service = require('./crawl.service');
const mongoose = require('mongoose');
const StatusCrawl = mongoose.model('StatusCrawl');
const {info, error} = require('../../services/logger');
const {success, fail} = require("../../utils/response-utils");
const authMiddleware = require('../auth.mid');
const dataCrawl = db.getModel('DataCrawl');

api.post(
    '/crawl',
    authMiddleware,
    async (req, res) => {

        try {
            const {hashtag} = req.body;
            const {project_id} = req.payload;
            crawl_service.getCrawl(hashtag, project_id);
            const status_crawl = await StatusCrawl.findOne({project_id});
            if (status_crawl) {
                status_crawl.is_crawling = true;
                await status_crawl.save();
            } else {
                let statusModel = new StatusCrawl({is_crawling: true, project_id});
                await statusModel.save();
            }
            return res.json(success({message: "Đang tiến hành lấy dữ liêu", project_id, hashtag}));
        }
        catch (err) {
            error(`${req.method} ${req.originalUrl}`, err.message);
            return res.json(fail(err.message));
        }
    }
);
api.get(
    '/crawl/:hashtag_alias',
    authMiddleware,
    async (req, res) => {

        try {
            const {project_id} = req.payload;
            const {hashtag_alias} = req.params;
            const dataModel = await dataCrawl.find({project_id, hashtag_alias});
            const body = {...dataModel};

            return res.json(success(body));
        }
        catch (err) {
            error(`${req.method} ${req.originalUrl}`, err.message);
            return res.json(fail(err.message));
        }
    }
);

module.exports = api;