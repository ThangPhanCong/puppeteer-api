const puppeteer = require('puppeteer');
const mongoose = require("mongoose");
const StatusCrawl = mongoose.model("StatusCrawl");
const DataCrawl = mongoose.model("DataCrawl");
const {createAliasName} = require("../../utils/name-utils");
function extractItems() {
    const extractedElements = document.querySelectorAll('div._q7o');
    const message = document.getElementsByClassName("userContent");
    const interactive = document.getElementsByClassName("UFIList");
    const images = document.querySelectorAll('.mtm ._2a2q');
    const items = [];

    for (let i = 0; i < extractedElements.length; i++) {
        let _images = [], _like, _comment, _share;
        if (images[i]) {
            let e = images[i].childNodes;
            e.forEach(function (item) {
                _images.push(item.getAttribute("data-ploi"))
            });
        }
        if (interactive[i].getElementsByClassName("UFICommentBody")) {
            _comment = interactive[i].getElementsByClassName("UFICommentBody").length;
        }
        _like = interactive[i].getElementsByClassName("_4arz")[0].textContent;
        if( interactive[i].getElementsByClassName("UFIShareLink")[0]) {
            _share = interactive[i].getElementsByClassName("UFIShareLink")[0].textContent.replace("lượt chia sẻ", "");
        } else {
            _share = ""
        }
        // let parse_comment = _comment.includes("K") ? parseFloat(_comment.replace(",", ".")) * 1000 :
        //     parseFloat(_comment.replace(",", "."));
        let parse_share = _share.includes("K") ? parseFloat(_share.replace(",", ".")) * 1000 :
            parseFloat(_share.replace(",", "."))
        let parse_like = _like.includes("K") ? parseFloat(_like.replace(",", ".")) * 1000 :
            parseFloat(_like.replace(",", "."))

        items.push({
            message: message[i].textContent.replace('Xem thêm', ""),
            images: _images,
            like: parse_like,
            comment: _comment,
            share: parse_share,
        })

    }
    return items;
}

async function scrapeInfiniteScrollItems(page,
                                         extractItems,
                                         itemTargetCount,
                                         scrollDelay = 2000,) {
    let items = [];
    try {
        let previousHeight;
        while (items.length < itemTargetCount) {
            items = await page.evaluate(extractItems);
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitFor(scrollDelay);
        }

    } catch (e) {
    }
    return items;
}

exports.getCrawl = async (hashtag, project_id) => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', "--disable-notifications"],
    });
    const page = await browser.newPage();

    //login face
    await page.goto('https://www.facebook.com');
    await page.type('#email', 'thangtheotk');
    await page.type('#pass', 'thanguet14020610');
    await page.click("label#loginbutton");
    // await page.waitForNavigation();

    await page.waitFor('input[data-testid=search_input]');

    await page.type('input[data-testid=search_input]', `${hashtag}`);

    await page.keyboard.press("Enter");
    await page.waitFor(3000);

    await page.mouse.click(460, 57);

    await page.waitFor(3000);
    let page_length = await page.evaluate(`document.querySelectorAll("._32mo").length`)
    let links = [];
    for (let i = 0; i < page_length; i++) {
        await links.push(await page.evaluate(`document.querySelectorAll("._32mo")[${i}].getAttribute("href")`))
    }

    const promises = [];
    let all_item = [];
    let parse_links = links.slice(0, 3).length;
    for (let i = 0; i < parse_links; i++) {
        promises.push(await getTitle(links[i], page, i))
    }

    async function getTitle(link, page, key) {
        await page.goto(link);
        await page.waitFor(3000);
        const items = await scrapeInfiniteScrollItems(page, extractItems, 100);
        await all_item.push(...items);

        return page;
    }

    await browser.close();
    console.log(all_item);
    console.log(all_item.length);
   await StatusCrawl.findOneAndUpdate({project_id}, {$set: {is_crawling: false}}, {
        returnNewDocument: true,
        new: true
    })

    all_item.map((item) => {
        item.hashtag = hashtag;
        item.project_id = project_id;
        item.hashtag_alias = createAliasName(hashtag || "");
        let dataModel = new DataCrawl(item);
        dataModel.save();
    });
    return all_item;
};

