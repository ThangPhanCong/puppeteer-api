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

// 1. tăng khoảng timeout của nginx lên (1000ms -> 5000ms) // ko khôn ngoan lắm

// 2. Tạo công việc bất đồng bộ và check trạng thái định kì
/*
 - Gửi yêu cầu crawl 1 hashtag bất kì -> server sẽ trả lại trạng thái tiếp nhận yêu cầu
 - Tạo 1 cronjob (1 công việc định kì) check xem có kết quả chưa -> server trả về kết quả (đang crawl hoặc đã có dữ liệu)
 */

api.post(
    '/crawl',
    authMiddleware,
    async (req, res) => {

        try {
            const {hashtag} = req.body;
            const {project_id} = req.payload;

            // check hashtag đấy đã có trong csdl hay chưa
            // -> nếu có rồi thì trả về

            // -> nếu chưa có thì lấy -> trả về trạng thái đang crawling
            // -> nếu chưa có nhưng đang crawling -> trả về trạng thái đang crawling

            await crawl_service.getCrawl(hashtag, project_id);
            // const status_crawl = await StatusCrawl.findOne({project_id});

            // if (status_crawl) {
            //     status_crawl.is_crawling = true;
            //     await status_crawl.save();
            // } else {
            //     let statusModel = new StatusCrawl({is_crawling: true, project_id});
            //     await statusModel.save();
            // }
            return res.json(success({message: "Đã lấy xong dữ liệu", project_id, hashtag}));
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
            const body = [...dataModel];

            return res.json(success(body));
        }
        catch (err) {
            error(`${req.method} ${req.originalUrl}`, err.message);
            return res.json(fail(err.message));
        }
    }
);

module.exports = api;
