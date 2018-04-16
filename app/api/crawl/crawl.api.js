'use strict';
const {createAliasName} = require("../../utils/name-utils");

const db = require('../../database');
const api = require("express").Router();
const config = require('config');
const mongoose = require('mongoose');
const HashTagCrawl = mongoose.model('HashTagCrawl');
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
            const history_hashtag = await HashTagCrawl.find({"hashtag_alias": `${createAliasName(hashtag)}`});

            if (history_hashtag.length && project_id === [...history_hashtag][0].project_id) {
                return res.json(success({
                    message: "Dữ liệu đã có sẵn",
                    project_id,
                    name: hashtag,
                    hashtag_alias: createAliasName(hashtag),
                    is_crawled: true,
                    data: [...history_hashtag]
                }));
            } else {
                let item = {};
                item["name"] = hashtag;
                item["project_id"] = project_id;
                item["is_crawled"] = false;
                item["data"] = [];
                item["hashtag_alias"] = createAliasName(hashtag || "");

                let dataModel = new HashTagCrawl(item);
                await dataModel.save();
                console.log("item", item)
                return res.json(success({message: "Đang lấy dữ liệu vui lòng chờ ít phút!", project_id, hashtag}));
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
            const dataModel = await HashTagCrawl.find({project_id, hashtag_alias});
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
            const {project_id} = req.payload;
            const dataModel = await HashTagCrawl.distinct("hashtag_alias");
            const _project_id = await HashTagCrawl.distinct("project_id");


            if(project_id === _project_id[0]) {
                const body = [...dataModel];
                return res.json(success(body));
            } else {
                return res.json(success({message: "Project này không có hashtag"}));
            }

        }
        catch (err) {
            error(`${req.method} ${req.originalUrl}`, err.message);
            return res.json(fail(err.message));
        }
    }
);

module.exports = api;
