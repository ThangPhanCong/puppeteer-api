const puppeteer = require('puppeteer');
const mongoose = require("mongoose");
// const StatusCrawl = mongoose.model("StatusCrawl");
const HashTagCrawl = mongoose.model("HashTagCrawl");
const {createAliasName} = require("../../utils/name-utils");
const email = "thangtheotk";
const password = "thanguet14020610";
process.setMaxListeners(Infinity);

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
        let comment_plus = interactive[i].getElementsByClassName("UFIPagerLink")[0];
        let comment_show = interactive[i].getElementsByClassName("UFICommentBody");

        if (comment_plus && comment_show) {
            _comment = parseFloat(comment_plus.textContent.replace(/[^0-9]/g, ''))
                + parseFloat(comment_show.length);
        } else if (comment_show) {
            _comment = parseFloat(comment_show.length);
        } else if (comment_plus) {
            _comment = parseFloat(comment_plus.textContent.replace(/[^0-9]/g, ''))
        }
        else {
            _comment = "";
        }

        _like = interactive[i].getElementsByClassName("_4arz")[0].textContent;
        if (interactive[i].getElementsByClassName("UFIShareLink")[0]) {
            _share = interactive[i].getElementsByClassName("UFIShareLink")[0].textContent.replace("lượt chia sẻ", "");
        } else {
            _share = ""
        }

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

async function loginFacebook(page, email, password) {
    await page.goto('https://www.facebook.com');
    await page.type('#email', email);
    await page.type('#pass', password);
}

exports.getCrawl = async (hashtag, project_id) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', "--disable-notifications"],
    });
    const page = await browser.newPage();

    //login face
    try {
        const promises = [];
        let all_item = [];

        await loginFacebook(page, email, password);
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

        let parse_links = links.slice(0, 2).length;

        for (let i = 0; i < parse_links; i++) {
            promises.push(await getTitle(links[i], page, i))
        }

        async function getTitle(link, page, key) {
            await page.goto(link, {
                timeout: 3000000
            });
            await page.waitFor(3000);
            const items = await scrapeInfiniteScrollItems(page, extractItems, 100);
            await all_item.push(...items);

            return page;
        }

        await page.on('error', (err) => {
            console.log(err)
        });

        await browser.close();
        console.log(all_item);
        console.log(all_item.length);
        await HashTagCrawl.findOneAndUpdate({project_id},
            {
                $set: {
                    name: hashtag,
                    is_crawled: true,
                    data: [...all_item],
                    hashtag_alias: createAliasName(hashtag || ""),
                }
            },
            );
    } catch (err) {
        console.log(err)
    }

};

