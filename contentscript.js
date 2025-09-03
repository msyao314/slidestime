const config = { attributes: true, childList: true },
    t = {},
    st = '&lt;&lt;',
    en = '&gt;&gt;',
    regexstring = `${st}[\\w_:;^⌃&~$ \\<\\=\\/\\>\\"\\-\\+@!|]+${en}`,
    re = new RegExp(regexstring, 'g'),
    op = {
        '+': function (a, b) { return a - b },
        '-': function (a, b) { return a + b },
        '*': function (a, b) { return a * b },
        '/': function (a, b) { return a / b },
    },
    stoppableIds = {},
    initialized = {},
    cTime = {}

let timeoutId = 0, setSlide, direction = '', distance, presenttime, id, id2, language;

if (window.navigator.languages) {
    language = window.navigator.languages[0];
} else {
    language = window.navigator.userLanguage || window.navigator.language;
}

const clearObject = (obj) => {
    const props = Object.getOwnPropertyNames(obj);
    for (let i = 0; i < props.length; i++) {
        delete obj[props[i]];
    }
}

function getFuncName() {
    return getFuncName.caller.name
}

document.addEventListener("fullscreenchange", function () {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(function () {
        if (document.fullscreenElement) {
            console.log('fullscreenchange')
            setID();
        } else {
            console.log('not fullscreenchange')
            clearObject(initialized)
            clearObject(cTime)
            setSlide = undefined
        }
        timeoutId = 0;

    }, 100);
}, false);

function listenforpresent() {
    if (presenttime) {
        clearTimeout(presenttime);
    }
    presenttime = setTimeout(function () {
        if (document.getElementsByClassName("punch-full-screen-element punch-full-window-overlay").length > 0) {
            setID();
            const preconfig = { childList: true, subtree: false };
            const obs = new MutationObserver(function (e) {
                e.forEach(mutation => {
                    if (mutation.removedNodes && mutation.removedNodes.length > 0) {
                        clearObject(initialized)
                        clearObject(cTime)
                        obs.disconnect()
                    }
                })
            });
            obs.observe(document.getElementsByClassName("punch-full-screen-element punch-full-window-overlay")[0], preconfig);

        } else {
            setSlide = undefined
            listenforpresent()
        }
    }, 100);
}

function setTimerString(str) {
    return setTimeout(this[str], 500);
}

function setID() {
    let slidenumbernode
    const iframe = document.querySelector('iframe.punch-present-iframe')
    if (iframe) {

        slidenumbernode = iframe.contentWindow.document.querySelector('[role="listbox"]  [role="option"][aria-selected="true"]')

        if (!slidenumbernode) {
            slidenumbernode = iframe.contentWindow.document.getElementById(':z') | iframe.contentWindow.document.getElementById(':11');
        }

        if (!slidenumbernode) {
            setTimerString(getFuncName())
            return;
        }

        let start = false;
        if (!setSlide) {
            observer.observe(slidenumbernode, config);
            setSlide = slidenumbernode.innerText
            start = true;
        }

        if (slidenumbernode.innerText != setSlide || start == true) {
            setSlide = slidenumbernode.innerText;

            start = false;
            const txts = iframe.contentWindow.document.getElementsByTagName('text');

            if (txts.length == 0) {
                setSlide = undefined;
                setTimerString(getFuncName())
                return;
            }


            [...txts].forEach((txt, j) => {
                if (txt.innerHTML.length > 0) {
                    updateTime(txt, j)
                }
            })
        }
    }
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.document.addEventListener("keypress", function (event) {
            if (event.key == chrome.i18n.getMessage('stop')) {
                iframe.contentWindow.document.querySelectorAll('.stoppable').forEach(function (element) {
                    if (!element.dataset.stop || element.dataset.stop === 'false') {
                        element.dataset.stop = 'true'
                    } else {
                        element.dataset.stop = 'false'
                    }
                    if (element.dataset.stop === 'false') {
                        //if direction is + reset the endobject?
                        mytime(element)
                    }
                });
            }
            if (event.key == chrome.i18n.getMessage('reset')) {
                iframe.contentWindow.document.querySelectorAll('.stoppable').forEach(function (element) {
                    element.dataset.timestring = element.dataset.original
                    delete element.dataset.endobj
                    element.innerHTML = element.dataset.timestring.replace(/[-\+]/g, '')
                    clearTimeout(stoppableIds[element.id])
                    mytime(element)
                });
            }
        });
    }
}

function updateTime(element, j) {
    const id = element.parentElement.parentElement.parentElement.parentElement.getAttribute('id');
    let tstring
    element.id = `${id}_${j}`
    element.dataset.parentid = id

    if (!element.dataset.timestring) {
        const matched = element.innerHTML.match(re);

        if (!matched) {
            return
        }
        tstring = matched[0].replace(st, '').replace(en, '')

        element.classList.add('timer')
        const modreg = new RegExp('[0-9a-zA-Z]+', 'g')
        const hasMod = !modreg.test(tstring.slice(-2))


        const chars = String(tstring.match(/[@!$^⌃&~\-+]+/g))
        const mods = chars.slice(-1*(chars.length - 1))
        const mod = hasMod ? mods : ((element && element.hasAttribute('data-modifier')) ? element.getAttribute('data-modifier') : null)
        if (mod) {
            tstring = tstring.slice(0, tstring.length - mod.length);
            element.dataset.modifier = mod
        }
        const dir = tstring.match(/[-\+]/g)

        if ((dir || (mod && !mod.includes('~')))) {
            element.classList.add('stoppable')
            if (mod && mod.includes('$')) {
                element.dataset.stop = 'true'
                element.innerHTML = tstring.replace(/[-\+]/g, '')
            }
        }
        element.dataset.direction = dir ? dir[0] : null

        if (dir && dir.length > 0) {
            tstring = tstring.replace(/[-\+]/g, '') + dir[0]
        }

        if(mod && mod.includes('~')){
            element.dataset.continuous = tstring
        }
        if(new RegExp(/[0-9:]+/g).test(tstring)){
            element.classList.add('stoppable')
        }
        element.dataset.timestring = tstring
        element.dataset.original = tstring
    }
    mytime(element)
}


function mytime(element) {
    if (!element) return
    let direction = element.dataset.direction
    let timeString = element.dataset.timestring

    if (cTime[element.dataset.parentid] && element.dataset.modifier &&
        element.dataset.modifier.includes('~') &&
        (element.dataset.direction.includes('+') || element.dataset.direction.includes('-'))) {
        timeString = cTime[element.dataset.parentid]
    }


    const iframe = document.querySelector('iframe.punch-present-iframe')
    if (!iframe) return


    const stop = element.dataset.stop === 'true'
    if (stop) {
        element.dataset.timestring = element.innerHTML + element.dataset.direction
        delete element.dataset.endobj
        return
    }

    let endObj

    if (element.dataset.endobj) {
        endObj = new Date(element.dataset.endobj)
    }
    let d = new Date();



    if (!direction && !element.dataset.direction) {
        const dir = timeString.match(/[-\+]/g)
        if (dir && dir.length > 0) {
            direction = dir[0]
        }
    }

    let type, format

    if (timeString && timeString.includes('|')) {
        const timesplit = timeString.split('|')
        if (timesplit && timesplit.length > 1) {
            format = String(timesplit[1]).trim()
        }
    }
    timeString = timeString.toLowerCase()

    if (timeString.includes(chrome.i18n.getMessage('appTime'))) {
        type = 'time'
    }
    else if (timeString.toLowerCase().includes(chrome.i18n.getMessage('appShortDate')) || (direction && direction.toLowerCase().includes(chrome.i18n.getMessage('appShortDate')))) {
        type = 'shortdate'
    }
    else if (timeString.toLowerCase().includes(chrome.i18n.getMessage('appLongDate')) || (direction && direction.toLowerCase().includes(chrome.i18n.getMessage('appLongDate')))) {
        type = 'longdate'
    }
    else if (timeString.toLowerCase().includes(chrome.i18n.getMessage('appDate')) || (direction && direction.toLowerCase().includes(chrome.i18n.getMessage('appDate')))) {
        type = 'date'
    }

    // console.log('type', type, timeString, d)
    let endseconds, time

    switch (type) {
        case 'time':
            if (!direction) {
                direction = chrome.i18n.getMessage('appTime');
            }

            const noseconds = timeString.includes('^') || timeString.includes('⌃')
            const noampm = timeString.includes('&')
            h = d.getHours();
            m = d.getMinutes();
            s = d.getSeconds();
            ap = "am";

            if (format) {
                time = new DateFormater(d).format(format)
            } else if (language == 'en-US') {
                if (h > 11) { ap = "pm"; }
                if (h > 12) { h = h - 12; }
                if (h == 0) { h = 12; }
                if (m < 10) { m = "0" + m; }
                if (s < 10) { s = "0" + s; }
                time = `${h}:${m}${noseconds ? '' : ':' + s} ${noampm ? '' : ap}`
                //d formatting?
            } else {
                if (m < 10) { m = "0" + m; }
                if (s < 10) { s = "0" + s; }
                time = `${h}:${m}${noseconds ? '' : ':' + s}`
            }
            break;
        case 'shortdate':
            if (!direction) {
                direction = chrome.i18n.getMessage('appShortDate');
            }
            if (format) {
                time = new DateFormater(d).format(format)
            } else {
                const event = new Date();
                const opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
                const date = event.toLocaleDateString(language, opts)
                //console.log('lan, date', language, date,)
                time = date
            }
            break;
        case 'longdate':
            if (!direction) {
                direction = chrome.i18n.getMessage('appLongDate');
            }
            if (format) {
                time = new DateFormater(d).format(format)
            } else {
                const event = new Date();
                const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const date = event.toLocaleDateString(language, opts)
                //console.log('lan, date', language, date,)
                time = date
            }
            break;
        case 'date':
            if (!direction) {
                direction = chrome.i18n.getMessage('appDate');
            }
            if (format) {
                time = new DateFormater(d).format(format)
            } else {
                const event = new Date();
                const opts = { year: 'numeric', month: 'numeric', day: 'numeric' };
                const date = event.toLocaleDateString(language, opts)
                //console.log('lan, date', language, date, timeString, direction)
                time = date
            }
            break;
        default:
            d.setMilliseconds(0);
            // if(!element.classList.contains('stoppable')){
            //     element.classList.add('stoppable')
            // }
            const tm = timeString.match(/[0-9:]+/g)
            let timeArray = tm[0].split(':');


            if (direction != '+' && direction != '-') {
                direction = '-';
            }
            let mins = d.getMinutes()
            let seconds = d.getSeconds()
            let hours = d.getHours()

            if (!endObj || isNaN(endObj)) {

                if (timeArray.length < 3) {
                    mins = op[direction](d.getMinutes(), parseInt(timeArray[0], 10))
                    seconds = op[direction](d.getSeconds(), parseInt(timeArray[1], 10))
                    hours = d.getHours();
                }
                else if (timeArray.length == 3) {
                    hours = op[direction](d.getHours(), parseInt(timeArray[0], 10))
                    mins = op[direction](d.getMinutes(), parseInt(timeArray[1], 10))
                    seconds = op[direction](d.getSeconds(), parseInt(timeArray[2], 10))
                }

                if (seconds >= 60) {
                    mins = op[direction](mins, parseInt(seconds / 60, 10))
                    seconds = seconds % 60;
                }

                if (mins >= 60) {
                    hours = op[direction](hours, parseInt(mins / 60, 10))
                    mins = mins % 60;
                }

                if (hours >= 24) {
                    const days = parseInt(hours / 24, 10);
                    d.setDate(d.getDate() + days);
                }

                d.setSeconds(seconds);
                d.setMinutes(mins);
                d.setHours(hours % 24);
                endObj = d;
                element.dataset.endobj = d
            }


            const endtime = endObj.getTime();
            const now = new Date().getTime();


            if (direction === '-' && now <= endtime) {
                distance = endtime - now;
            }
            else if (direction === '+') { //&& now >= endtime
                distance = now - endtime;
            }

            let days = Math.floor(distance / (1000 * 60 * 60 * 24));
            let hour = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = parseInt((distance % (1000 * 60)) / 1000, 10);
            seconds = seconds < 10 ? '0' + seconds : seconds;
            endseconds = seconds

            if (timeArray && timeArray.length == 2) {
                if (parseInt(days, 10) > 0) {
                    time = `${days}d ${hour}:${minutes}:${seconds}`
                } else {
                    if (parseInt(hour, 10) > 0) {
                        time = `${hour}:${minutes}:${seconds}`
                    } else {
                        time = `${minutes}:${seconds}`
                    }
                }
            } else if (timeArray && timeArray.length == 1) {
                time = minutes;
            }
            else if (timeArray && timeArray.length == 3) {
                if (parseInt(days, 10) > 0) {
                    time = `${days}d ${hour}:${minutes}:${seconds}`
                } else {
                    time = `${hour}:${minutes}:${seconds}`
                }
            }
    }

    if (distance <= 500 && parseInt(endseconds, 10) == 0 && direction == '-') {  //we hit 0:00
        if (element.dataset.modifier) {

            switch (true) {
                case element.dataset.modifier.includes('+'):
                    advance('next', iframe.contentWindow.document.getElementsByClassName('goog-flat-button'))
                    break
                case element.dataset.modifier.includes('-'):
                    advance('previous', iframe.contentWindow.document.getElementsByClassName('goog-flat-button'))
                    break
                case element.dataset.modifier.includes('@'):
                    const aud = iframe.contentWindow.document.querySelectorAll('audio')
                    aud.forEach(a => {
                        a.play()
                    })
                    break
                case element.dataset.modifier.includes('!'):
                    const vids = iframe.contentWindow.document.querySelectorAll('iframe')
                    vids.forEach(v => v.click())
                    break
            }
        }
        element.dataset.stop = 'true'
        return
    }
    // console.log(element, time)
    element.innerHTML = time;

    if (element.dataset.modifier && element.dataset.modifier.includes('~') && (element.dataset.direction.includes('+') || element.dataset.direction.includes('-'))) {
        cTime[element.dataset.parentid] = element.innerHTML + element.dataset.direction
    }

    stoppableIds[element.id] = setTimeout(function () {
        mytime(element)
    }, 50);
}

function advance(mod, buttons) {
    for (var r = 0; r < buttons.length; r++) {
        if (buttons[r].getAttribute('title')) {
            if (buttons[r].getAttribute('title').toLowerCase().includes(mod)) {
                clickelement(buttons[r])
                break;
            }
        }
    }
}

function clickelement(theButton) {
    const simulateMouseEvent = function (element, eventName, coordX, coordY) {
        element.dispatchEvent(new MouseEvent(eventName, {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: coordX,
            clientY: coordY,
            button: 0
        }));
    };
    const box = theButton.getBoundingClientRect(),
        coordX = box.left + (box.right - box.left) / 2,
        coordY = box.top + (box.bottom - box.top) / 2;

    simulateMouseEvent(theButton, "mousedown", coordX, coordY);
    simulateMouseEvent(theButton, "mouseup", coordX, coordY);
    simulateMouseEvent(theButton, "click", coordX, coordY);
}

// Callback function to execute when mutations are observed
var insertedNodes = [];

const callback = function (mutations) {
    mutations.forEach(function (mutation) {
        for (var i = mutation.addedNodes.length - 1; i >= 0; i--) {
            insertedNodes.push(mutation.addedNodes[i]);
            if (mutation.addedNodes[i].nodeName == 'BODY') {
                observer.disconnect()
                observer.observe(document.body, config);
                insertedNodes = []
                break
            }
            if (mutation.addedNodes[i].className == 'punch-full-screen-element punch-full-window-overlay') {
                listenforpresent()
                break
            }
        }
        for (var i = 0; i < mutation.removedNodes.length; i++) {
            if (mutation.removedNodes[i].className == 'punch-full-screen-element punch-full-window-overlay') {
                setSlide = undefined
                break
            }
        }
        if (mutation.attributeName == 'aria-selected') {
            const isnumber = new RegExp(/[\d]+/g).test(mutation.target.innerText)
            if (isnumber && !initialized[mutation.target.innerText]) {
                setID()
                initialized[mutation.target.innerText] = true
            }
        }
    })
};

const observer = new MutationObserver(callback);
observer.observe(document.documentElement, config);

class DateFormater extends Date {
    optionsobj = {
        s: {
            keys: ['second', 'second'],
            values: ['numeric', '2-digit']
        },
        'm': {
            keys: ['minute', 'minute'],
            values: ['numeric', '2-digit']
        },
        'h': {
            keys: ['hour', 'hour'],
            values: ['numeric', '2-digit']
        },
        'H': {
            keys: ['hour', 'hour'],
            values: ['numeric', '2-digit']
        },
        z: {
            keys: ['timeZone', 'timeZone'],
            values: ['short', 'long']
        },
        g: {
            keys: ['era', 'era'],
            values: ['short', 'long']
        },
        d: {
            keys: ['day', 'day', 'weekday', 'weekday'],
            values: ['numeric', '2-digit', 'short', 'long']
        },
        'M': {
            keys: ['month', 'month', 'month', 'month'],
            values: ['numeric', '2-digit', 'short', 'long']
        },
        y: {
            keys: [, 'year', , 'year'],
            values: [, '2-digit', , 'numeric']
        },
    }

    formatstring = ''
    format(string, locale = 'en-us') {
        this.formatstring = string
        this._replacement(string, locale)
        return this.formatstring
    }

    _replacement(str, locale = 'en-us') {

        Object.keys(this.optionsobj).forEach(k => {
            const options = {}
            const regex = new RegExp(`[${k}]+`, 'g');
            const m = String(str.match(regex))
            if (m.includes('h')) {
                options.hour12 = true
            }
            if (m.includes('H')) {
                options.hour12 = false
            }
            const key = this.optionsobj[k].keys[m.length - 1]
            const value = this.optionsobj[k].values[m.length - 1]
            if (!value || !key) {
                return
            }
            options[key] = value

            // console.log('options', options)
            let newstr = new Intl.DateTimeFormat(locale, options).format(this)
            // console.log('newstr', newstr)
            if (value === '2-digit') {
                newstr = this.pad(newstr)
            }
            if (m.includes('h')) {
                const ampmmatch = String(str.match(/[t]+/g))
                const hours = String(newstr.match(/\d/g).join(''))
                const ampm = String(newstr.match(/[a-zA-Z]+/g)).slice(0, ampmmatch.length)
                this.formatstring = this.formatstring.replace(m, hours)
                this.formatstring = this.formatstring.replace(ampmmatch, ampm)
                return this.formatstring
            }
            this.formatstring = this.formatstring.replace(m, newstr)
        })
        return this.formatstring
    }

    isLeapYear() {
        const year = this.getFullYear();
        if ((year & 3) != 0) return false;
        return ((year % 100) != 0 || (year % 400) == 0);
    }

    getDOY() {
        const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        const mn = this.getMonth();
        const dn = this.getDate();
        const dayOfYear = dayCount[mn] + dn;
        if (mn > 1 && this.isLeapYear()) dayOfYear++;
        return dayOfYear;
    }
    pad(number) {
        const int = parseInt(number)
        const str = number.replace(/[0-9]+/g, '')
        return (int < 10 ? '0' : '') + int + str
    }
}