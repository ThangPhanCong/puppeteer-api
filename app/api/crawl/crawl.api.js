'use strict';
const {createAliasName} = require("../../utils/name-utils");

const db = require('../../database');
const api = require("express").Router();
const config = require('config');
const crawl_service = require('./crawl.service');
const mongoose = require('mongoose');
const StatusCrawl = mongoose.model('StatusCrawl');
const DataCrawl = mongoose.model('DataCrawl');
const {info, error} = require('../../services/logger');
const {success, fail} = require("../../utils/response-utils");
const authMiddleware = require('../auth.mid');


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
            const history_hashtag = await DataCrawl.find({"hashtag_alias": `${createAliasName(hashtag)}`});

            if (history_hashtag.length) {
                return res.json(success({
                    message: "Dữ liệu đã có sẵn",
                    project_id,
                    is_crawled: true,
                    data: [...history_hashtag]
                }));
            } else {
                // const data_crawl = await crawl_service.getCrawl(hashtag, project_id);
                let item = {};
                item.hashtag = hashtag;
                item.project_id = project_id;
                item.is_crawled = false;
                item.hashtag_alias = createAliasName(hashtag || "");

                let dataModel = new DataCrawl(item);
                await dataModel.save();
                return res.json(success({message: "Đang lấy dữ liệu", project_id, hashtag}));
            }


            // -> nếu chưa có thì lấy -> trả về trạng thái đang crawling
            // -> nếu chưa có nhưng đang crawling -> trả về trạng thái đang crawling
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
            const dataModel = await DataCrawl.find({project_id, hashtag_alias});
            const body = [...dataModel];

            return res.json(success(body));
        }
        catch (err) {
            error(`${req.method} ${req.originalUrl}`, err.message);
            return res.json(fail(err.message));
        }
    }
);

api.get(
    '/all-hashtag',
    authMiddleware,
    async (req, res) => {

        try {
            const dataModel = await DataCrawl.distinct("hashtag_alias");
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
