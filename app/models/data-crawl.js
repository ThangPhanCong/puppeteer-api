"use strict";

const mongoose = require("mongoose");
const _ = require('lodash');
const Schema = mongoose.Schema;

const DataCrawlSchema = new Schema({
    message: {
        type: String,
    },
    images: [],
    like: {
        type: Number,
    },
    comment: {
        type: Number,
    },
    share: {
        type: Number,
    },
    project_id: {
        type: String,
        required: true
    },
    hashtag: {
        type: String,
        required: true
    },
    hashtag_alias: {
        type: String,
        required: true
    },
});

const DataCrawl = mongoose.model("DataCrawl", DataCrawlSchema);
module.exports = DataCrawl;