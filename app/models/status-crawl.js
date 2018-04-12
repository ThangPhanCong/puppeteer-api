"use strict";

const mongoose = require("mongoose");
const _ = require('lodash');
const Schema = mongoose.Schema;

const StatusCrawlSchema = new Schema({
    is_crawling: {
        type: Boolean,
        required: true
    },
    project_id: {
        type: String,
        required: true
    }
});

const StatusCrawl = mongoose.model("StatusCrawl", StatusCrawlSchema);
module.exports = StatusCrawl;