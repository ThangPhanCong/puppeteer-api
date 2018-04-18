const CronJob = require('cron').CronJob;
require('./models/hashtag');
require('./models/status-crawl');
const crawl_service = require('./api/crawl/crawl.service');
const mongoose = require('mongoose');
const HashTagCrawl = mongoose.model('HashTagCrawl');

async function crawl(ht) {
    try {
        await crawl_service.getCrawl(ht.name, ht.project_id, ht._id);
    } catch (err) {
        console.log(err)
    }
}

async function findHashTag() {
    try {
        const hash_tag = await HashTagCrawl.findOne({"is_crawled": false});
        console.log("show hashtag", hash_tag);

        if (hash_tag) {
            await crawl(hash_tag);
        } else {
            console.log("Hashtag đã được crawl!")
        }
    } catch (err) {
        console.log(err)
    }
}


exports.cronJob = async function cronJob() {
    const job = new CronJob({
        cronTime: '*/3 * * * *',
        onTick: function () {
            console.log('3 minutes');
            findHashTag();
        },
        start: false,
        timeZone: 'Asia/Ho_Chi_Minh'
    });
    job.start();
};

