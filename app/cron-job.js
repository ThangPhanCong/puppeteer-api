const CronJob = require('cron').CronJob;
require('./models/data-crawl');
require('./models/status-crawl');
const crawl_service = require('./api/crawl/crawl.service');
const mongoose = require('mongoose');
const DataCrawl = mongoose.model('DataCrawl');


async function crawl(ht) {
    await crawl_service.getCrawl(ht);
    await DataCrawl.findOneAndUpdate({project_id: ht.project_id}, {$set: {is_crawled: true}}, {
        returnNewDocument: true,
        new: true
    });
}

exports.cronJob = async function cronJob() {
    const job = new CronJob({
        cronTime: '0 */4 * * * *',
        onTick: function () {
            console.log('4 minutes');
            const hash_tag = DataCrawl.find({"is_crawled": false});
            if(hash_tag.length) {
                hash_tag.forEach((ht) => {
                    console.log("hashtag ne:", ht.hashtag)
                    crawl(ht.hashtag)
                })
            }

        },
        start: false,
        timeZone: 'Asia/Ho_Chi_Minh'
    });
    job.start();
};

