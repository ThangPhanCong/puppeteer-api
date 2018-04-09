const puppeteer = require('puppeteer');

function extractItems() {
    const extractedElements = document.querySelectorAll('div._q7o');
    const message = document.getElementsByClassName("userContent");
    const _id = document.getElementsByClassName("_41je");
    const interactive = document.querySelectorAll("div._57w");
    const images = document.querySelectorAll('div._2a2q');
    const items = [];

    for (let i = 0; i < extractedElements.length; i++) {
        let _images = [], _like, _comment, _share;
        if (images[i]) {
            let e = images[i].childNodes;
            e.forEach(function (item) {
                _images.push(item.getAttribute("data-ploi"))
            });
        }

        _comment = interactive[i].getElementsByTagName("a")[0].textContent;
        _share = interactive[i].getElementsByTagName("a")[1].textContent;
        _like = interactive[i].getElementsByTagName("span")[9].textContent;

        let parse_comment = _comment.includes("K") ? parseFloat(_comment.replace(",", ".")) * 1000 :
            parseFloat(_comment.replace(",", "."));
        let parse_share = _share.includes("K") ? parseFloat(_share.replace(",", ".")) * 1000 :
            parseFloat(_share.replace(",", "."))
        let parse_like = _like.includes("K") ? parseFloat(_like.replace(",", ".")) * 1000 :
            parseFloat(_like.replace(",", "."))

        items.push({
            id: JSON.parse(_id[i].getAttribute("data-bt")).id,
            message: message[i].textContent.replace('Xem thêm', ""),
            images: _images,
            like: parse_like,
            comment: parse_comment,
            share: parse_share,
        })

    }
    return items;
}

async function scrapeInfiniteScrollItems(page,
                                         extractItems,) {
    let items = [];
    try {


        items = await page.evaluate(extractItems);

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
    // await page.addScriptTag({url: "https://code.jquery.com/jquery-3.2.1.min.js"})
    //login face
    await page.goto('https://www.facebook.com');
    await page.type('#email', 'thangtheotk');
    await page.type('#pass', 'thanguet14020610');
    await page.click("label#loginbutton");
    await page.waitForNavigation();

    //ko login face
    await page.goto('https://www.facebook.com/hashtag/aobongda?');


    // console.log("email ne:", email)
    await page.evaluate('window.scrollTo(0, 3065)');
    await page.waitFor(3000);
    await page.waitForSelector('footer._2kir');

    await page.click("footer._2kir")
    await page.waitFor(6000);
    // let el = await page.evaluate('document.querySelector(".uiScrollableAreaBody")');

    await page.mouse.click(264, 125);
    for (let i = 0; i < 5; i++) {
        await page.keyboard.press("End");
        await page.waitFor(2000);
    }


    await page.waitFor(3000);

    const items = await scrapeInfiniteScrollItems(page, extractItems);
    console.log(items);
    console.log(items.length);
    return items;
    // await browser.close();
};

