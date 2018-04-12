const puppeteer = require('puppeteer');

function extractItems() {
    const extractedElements = document.querySelectorAll('div._q7o');
    const message = document.getElementsByClassName("userContent");
    // const _id = document.getElementsByClassName("_41je");
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

        // _share = interactive[i].querySelector("._4arz span").textContent;
        // _like =interactiveinteractive[i].getElementsByTagName("span")[9].textContent;
        // _like = interactive[i].getElementsByTagName("span")[9].textContent;
        // _like = interactive[i].querySelector("._4arz span") ? interactive[i].querySelector("._4arz span").textContent : null
        // let parse_comment = _comment.includes("K") ? parseFloat(_comment.replace(",", ".")) * 1000 :
        //     parseFloat(_comment.replace(",", "."));
        // let parse_share = _share.includes("K") ? parseFloat(_share.replace(",", ".")) * 1000 :
        //     parseFloat(_share.replace(",", "."))
        // let parse_like = _like.includes("K") ? parseFloat(_like.replace(",", ".")) * 1000 :
        //     parseFloat(_like.replace(",", "."))

        items.push({
            // id: JSON.parse(_id[i].getAttribute("data-bt")).id,
            message: message[i].textContent.replace('Xem thêm', ""),
            images: _images,
            // like: parse_like,
            comment: _comment,
            // share: parse_share,
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

exports.getCrawl = async () => {
    // Set up browser and page.
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', "--disable-notifications"],
    });
    const page = await browser.newPage();
    page.setViewport({width: 1280, height: 926});

    //login face
    await page.goto('https://www.facebook.com');
    await page.type('#email', 'thangtheotk');
    await page.type('#pass', 'thanguet14020610');
    await page.click("label#loginbutton");
    // await page.waitForNavigation();

    await page.waitFor('input[data-testid=search_input]');

    await page.type('input[data-testid=search_input]', 'áo bóng đá');

    await page.keyboard.press("Enter");
    await page.waitFor(3000);

    await page.mouse.click(460, 57);

    await page.waitFor(6000);
    let page_length = await page.evaluate(`document.querySelectorAll("._32mo").length`)
    let links = [];
    for (let i = 0; i < page_length; i++) {
        await links.push(await page.evaluate(`document.querySelectorAll("._32mo")[${i}].getAttribute("href")`))
    }

    let all_item = []
    for (let j = 0; j < 12; j++) {
        await page.goto(links[j], {
            timeout: 3000000
        });
        const items = await scrapeInfiniteScrollItems(page, extractItems, 100);
        await all_item.push(...items);

        await page.waitFor(3000);
    }


    console.log(all_item);
    console.log(all_item.length);
    return all_item;

};

