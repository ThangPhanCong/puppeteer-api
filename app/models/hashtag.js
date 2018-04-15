"use strict";

const mongoose = require("mongoose");
const _ = require('lodash');
const Schema = mongoose.Schema;

const HashTagSchema = new Schema({
    data: [],
    project_id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    hashtag_alias: {
        type: String,
        required: true
    },
    is_crawled: {
        type: Boolean,
        required: true
    },
});

const HashTagCrawl = mongoose.model("HashTagCrawl", HashTagSchema);
module.exports = HashTagCrawl;