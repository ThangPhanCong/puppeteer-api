const puppeteer = require('puppeteer');
const fs = require('fs');

function extractItems() {
    const extractedElements = document.querySelectorAll('div._q7o');
    const message = document.getElementsByClassName("userContent");
    const images = document.querySelectorAll('div._2a2q');

    const items = [];

    for (let i = 0; i < extractedElements.length; i++) {
        let _images = []
        if (images[i]) {
            let e = images[i].childNodes;
            e.forEach(function (item) {
                _images.push(item.getAttribute("data-ploi"))
            });
        }

        items.push({
            message: message[i].textContent.replace('Xem thêm', ""),
            images: _images
        })
    }
    return items;
}

async function scrapeInfiniteScrollItems(page,
                                         extractItems,
                                         itemTargetCount,
                                         scrollDelay = 1000,) {
    let items = [];
    try {
        let previousHeight;

        while (items.length < itemTargetCount) {
            items = await page.evaluate(extractItems);

            // let ele = await page.evaluate('document.querySelector(".uiScrollableAreaBody").scrollHeight');
            previousHeight = await page.evaluate('document.querySelector(".uiScrollableAreaBody").scrollHeight');
            await page.evaluate('window.scrollTo(0, document.querySelector(".uiScrollableAreaBody").scrollHeight)');

            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitFor(scrollDelay);
        }
    } catch (e) {
    }
    return items;
}

(async () => {
    // Set up browser and page.
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', "--disable-notifications"],
    });
    const page = await browser.newPage();
    await page.addScriptTag({url: "https://code.jquery.com/jquery-3.2.1.min.js"})
    //login face
    // await page.goto('https://www.facebook.com');
    // await page.type('#email', 'thangtheotk');
    // await page.type('#pass', 'thanguet14020610');
    // await page.click("label#loginbutton");
    // await page.waitForNavigation();

    //ko login face
    await page.goto('https://www.facebook.com/hashtag/aobongda?');


    // console.log("email ne:", email)
    await page.evaluate('window.scrollTo(0, 3065)');
    await page.waitFor(3000);
    await page.waitForSelector('footer._2kir');

    await page.click("footer._2kir")
    await page.waitFor(3000);
    let el = await page.evaluate('document.querySelector(".uiScrollableAreaBody")');

    await page.mouse.click(264, 125);
    for(let i =0; i <40; i ++) {
        await page.keyboard.press("End");
        await page.waitFor(2000);
    }


    await page.waitFor(3000);

    const items = await scrapeInfiniteScrollItems(page, extractItems, 100);
    // fs.writeFileSync('./ok.txt', items.join('\n') + '\n');
    console.log(items)
    console.log(items.length)
    // await browser.close();
})();