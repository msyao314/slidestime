var config = { attributes: true, childList: true },
    t = {},
    st = '&lt;&lt;',
    en = '&gt;&gt;',
    regexstring = st + '[\\w_:;^⌃&~$ \\<\\=\\/\\>\\"\\-\\+@!|]+' + en,
    re = new RegExp(regexstring, 'g'),
    op = {
        '+': function (a, b) { return a - b; },
        '-': function (a, b) { return a + b; },
        '*': function (a, b) { return a * b; },
        '/': function (a, b) { return a / b; }
    },
    stoppableIds = {},
    initialized = {},
    cTime = {};

var timeoutId = 0, setSlide, direction = '', distance, presenttime, id, id2, language;

if (window.navigator.languages) {
    language = window.navigator.languages[0];
} else {
    language = window.navigator.userLanguage || window.navigator.language;
}

var clearObject = function (obj) {
    var props = Object.getOwnPropertyNames(obj);
    for (var i = 0; i < props.length; i++) {
        delete obj[props[i]];
    }
};

function getFuncName() {
    return getFuncName.caller.name;
}

document.addEventListener("fullscreenchange", function () {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(function () {
        if (document.fullscreenElement) {
            console.log('fullscreenchange');
            setID();
        } else {
            console.log('not fullscreenchange');
            clearObject(initialized);
            clearObject(cTime);
            setSlide = undefined;
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
            var preconfig = { childList: true, subtree: false };
            var obs = new MutationObserver(function (e) {
                for (var i = 0; i < e.length; i++) {
                    var mutation = e[i];
                    if (mutation.removedNodes && mutation.removedNodes.length > 0) {
                        clearObject(initialized);
                        clearObject(cTime);
                        obs.disconnect();
                    }
                }
            });
            obs.observe(document.getElementsByClassName("punch-full-screen-element punch-full-window-overlay")[0], preconfig);

        } else {
            setSlide = undefined;
            listenforpresent();
        }
    }, 100);
}

function setTimerString(str) {
    return setTimeout(this[str], 500);
}

function setID() {
    var slidenumbernode;
    var iframe = document.querySelector('iframe.punch-present-iframe');
    if (iframe) {
        slidenumbernode = iframe.contentWindow.document.querySelector('[role="listbox"]  [role="option"][aria-selected="true"]');

        if (!slidenumbernode) {
            slidenumbernode = iframe.contentWindow.document.getElementById(':z') || iframe.contentWindow.document.getElementById(':11');
        }

        if (!slidenumbernode) {
            setTimerString(getFuncName());
            return;
        }

        var start = false;
        if (!setSlide) {
            observer.observe(slidenumbernode, config);
            setSlide = slidenumbernode.innerText;
            start = true;
        }

        if (slidenumbernode.innerText != setSlide || start === true) {
            setSlide = slidenumbernode.innerText;
            start = false;
            var txts = iframe.contentWindow.document.getElementsByTagName('text');

            if (txts.length === 0) {
                setSlide = undefined;
                setTimerString(getFuncName());
                return;
            }

            for (var j = 0; j < txts.length; j++) {
                var txt = txts[j];
                if (txt.innerHTML.length > 0) {
                    updateTime(txt, j);
                }
            }
        }
    }
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.document.addEventListener("keypress", function (event) {
            if (event.key == chrome.i18n.getMessage('stop')) {
                var stoppables = iframe.contentWindow.document.querySelectorAll('.stoppable');
                for (var i = 0; i < stoppables.length; i++) {
                    var element = stoppables[i];
                    if (!element.dataset.stop || element.dataset.stop === 'false') {
                        element.dataset.stop = 'true';
                    } else {
                        element.dataset.stop = 'false';
                    }
                    if (element.dataset.stop === 'false') {
                        mytime(element);
                    }
                }
            }
            if (event.key == chrome.i18n.getMessage('reset')) {
                var stoppables = iframe.contentWindow.document.querySelectorAll('.stoppable');
                for (var i = 0; i < stoppables.length; i++) {
                    var element = stoppables[i];
                    element.dataset.timestring = element.dataset.original;
                    delete element.dataset.endobj;
                    element.innerHTML = element.dataset.timestring.replace(/[-\+]/g, '');
                    clearTimeout(stoppableIds[element.id]);
                    mytime(element);
                }
            }
        });
    }
}

function updateTime(element, j) {
    var id = element.parentElement.parentElement.parentElement.parentElement.getAttribute('id');
    var tstring;
    element.id = id + "_" + j;
    element.dataset.parentid = id;

    if (!element.dataset.timestring) {
        var matched = element.innerHTML.match(re);

        if (!matched) {
            return;
        }
        tstring = matched[0].replace(st, '').replace(en, '');

        element.classList.add('timer');
        var modreg = new RegExp('[0-9a-zA-Z]+', 'g');
        var hasMod = !modreg.test(tstring.slice(-2));

        var chars = String(tstring.match(/[@!$^⌃&~\-+]+/g));
        var mods = chars.slice(-1 * (chars.length - 1));
        var mod = hasMod ? mods : ((element && element.hasAttribute('data-modifier')) ? element.getAttribute('data-modifier') : null);
        if (mod) {
            tstring = tstring.slice(0, tstring.length - mod.length);
            element.dataset.modifier = mod;
        }
        var dir = tstring.match(/[-\+]/g);

        if ((dir || (mod && !mod.includes('~')))) {
            element.classList.add('stoppable');
            if (mod && mod.indexOf('$') !== -1) {
                element.dataset.stop = 'true';
                element.innerHTML = tstring.replace(/[-\+]/g, '');
            }
        }
        element.dataset.direction = dir ? dir[0] : null;

        if (dir && dir.length > 0) {
            tstring = tstring.replace(/[-\+]/g, '') + dir[0];
        }

        if (mod && mod.indexOf('~') !== -1) {
            element.dataset.continuous = tstring;
        }
        if (new RegExp(/[0-9:]+/g).test(tstring)) {
            element.classList.add('stoppable');
        }
        element.dataset.timestring = tstring;
        element.dataset.original = tstring;
    }
    mytime(element);
}

function mytime(element) {
    if (!element) return;
    var direction = element.dataset.direction;
    var timeString = element.dataset.timestring;

    if (cTime[element.dataset.parentid] && element.dataset.modifier &&
        element.dataset.modifier.indexOf('~') !== -1 &&
        (element.dataset.direction.indexOf('+') !== -1 || element.dataset.direction.indexOf('-') !== -1)) {
        timeString = cTime[element.dataset.parentid];
    }

    var iframe = document.querySelector('iframe.punch-present-iframe');
    if (!iframe) return;

    var stop = element.dataset.stop === 'true';
    if (stop) {
        element.dataset.timestring = element.innerHTML + element.dataset.direction;
        delete element.dataset.endobj;
        return;
    }

    var endObj;

    if (element.dataset.endobj) {
        endObj = new Date(element.dataset.endobj);
    }
    var d = new Date();

    if (!direction && !element.dataset.direction) {
        var dir = timeString.match(/[-\+]/g);
        if (dir && dir.length > 0) {
            direction = dir[0];
        }
    }

    var type, format;

    if (timeString && timeString.indexOf('|') !== -1) {
        var timesplit = timeString.split('|');
        if (timesplit && timesplit.length > 1) {
            format = String(timesplit[1]).trim();
        }
    }
    timeString = timeString.toLowerCase();

    if (timeString.indexOf(chrome.i18n.getMessage('appTime')) !== -1) {
        type = 'time';
    }
    else if (timeString.toLowerCase().indexOf(chrome.i18n.getMessage('appShortDate')) !== -1 || (direction && direction.toLowerCase().indexOf(chrome.i18n.getMessage('appShortDate')) !== -1)) {
        type = 'shortdate';
    }
    else if (timeString.toLowerCase().indexOf(chrome.i18n.getMessage('appLongDate')) !== -1 || (direction && direction.toLowerCase().indexOf(chrome.i18n.getMessage('appLongDate')) !== -1)) {
        type = 'longdate';
    }
    else if (timeString.toLowerCase().indexOf(chrome.i18n.getMessage('appDate')) !== -1 || (direction && direction.toLowerCase().indexOf(chrome.i18n.getMessage('appDate')) !== -1)) {
        type = 'date';
    }

    var endseconds, time, h, m, s, ap;
    switch (type) {
        case 'time':
            if (!direction) {
                direction = chrome.i18n.getMessage('appTime');
            }

            var noseconds = timeString.indexOf('^') !== -1 || timeString.indexOf('⌃') !== -1;
            var noampm = timeString.indexOf('&') !== -1;
            h = d.getHours();
            m = d.getMinutes();
            s = d.getSeconds();
            ap = "am";

            if (format) {
                time = (new DateFormater(d)).format(format);
            } else if (language == 'en-US') {
                if (h > 11) { ap = "pm"; }
                if (h > 12) { h = h - 12; }
                if (h == 0) { h = 12; }
                if (m < 10) { m = "0" + m; }
                if (s < 10) { s = "0" + s; }
                time = h + ":" + m + (noseconds ? '' : ':' + s) + (noampm ? '' : ' ' + ap);
            } else {
                if (m < 10) { m = "0" + m; }
                if (s < 10) { s = "0" + s; }
                time = h + ":" + m + (noseconds ? '' : ':' + s);
            }
            break;
        case 'shortdate':
            if (!direction) {
                direction = chrome.i18n.getMessage('appShortDate');
            }
            if (format) {
                time = (new DateFormater(d)).format(format);
            } else {
                var event = new Date();
                var opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
                var date = event.toLocaleDateString(language, opts);
                time = date;
            }
            break;
        case 'longdate':
            if (!direction) {
                direction = chrome.i18n.getMessage('appLongDate');
            }
            if (format) {
                time = (new DateFormater(d)).format(format);
            } else {
                var event = new Date();
                var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var date = event.toLocaleDateString(language, opts);
                time = date;
            }
            break;
        case 'date':
            if (!direction) {
                direction = chrome.i18n.getMessage('appDate');
            }
            if (format) {
                time = (new DateFormater(d)).format(format);
            } else {
                var event = new Date();
                var opts = { year: 'numeric', month: 'numeric', day: 'numeric' };
                var date = event.toLocaleDateString(language, opts);
                time = date;
            }
            break;
        default:
            d.setMilliseconds(0);
            var tm = timeString.match(/[0-9:]+/g);
            var timeArray = tm[0].split(':');

            if (direction != '+' && direction != '-') {
                direction = '-';
            }
            var mins = d.getMinutes();
            var seconds = d.getSeconds();
            var hours = d.getHours();

            if (!endObj || isNaN(endObj)) {
                if (timeArray.length < 3) {
                    mins = op[direction](d.getMinutes(), parseInt(timeArray[0], 10));
                    seconds = op[direction](d.getSeconds(), parseInt(timeArray[1], 10));
                    hours = d.getHours();
                }
                else if (timeArray.length == 3) {
                    hours = op[direction](d.getHours(), parseInt(timeArray[0], 10));
                    mins = op[direction](d.getMinutes(), parseInt(timeArray[1], 10));
                    seconds = op[direction](d.getSeconds(), parseInt(timeArray[2], 10));
                }

                if (seconds >= 60) {
                    mins = op[direction](mins, parseInt(seconds / 60, 10));
                    seconds = seconds % 60;
                }

                if (mins >= 60) {
                    hours = op[direction](hours, parseInt(mins / 60, 10));
                    mins = mins % 60;
                }

                if (hours >= 24) {
                    var days = parseInt(hours / 24, 10);
                    d.setDate(d.getDate() + days);
                }

                d.setSeconds(seconds);
                d.setMinutes(mins);
                d.setHours(hours % 24);
                endObj = d;
                element.dataset.endobj = d;
            }

            var endtime = endObj.getTime();
            var now = (new Date()).getTime();

            if (direction === '-' && now <= endtime) {
                distance = endtime - now;
            }
            else if (direction === '+') {
                distance = now - endtime;
            }

            var days = Math.floor(distance / (1000 * 60 * 60 * 24));
            var hour = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = parseInt((distance % (1000 * 60)) / 1000, 10);
            seconds = seconds < 10 ? '0' + seconds : seconds;
            endseconds = seconds;

            if (timeArray && timeArray.length == 2) {
                if (parseInt(days, 10) > 0) {
                    time = days + "d " + hour + ":" + minutes + ":" + seconds;
                } else {
                    if (parseInt(hour, 10) > 0) {
                        time = hour + ":" + minutes + ":" + seconds;
                    } else {
                        time = minutes + ":" + seconds;
                    }
                }
            } else if (timeArray && timeArray.length == 1) {
                time = minutes;
            }
            else if (timeArray && timeArray.length == 3) {
                if (parseInt(days, 10) > 0) {
                    time = days + "d " + hour + ":" + minutes + ":" + seconds;
                } else {
                    time = hour + ":" + minutes + ":" + seconds;
                }
            }
    }

    if (distance <= 500 && parseInt(endseconds, 10) == 0 && direction == '-') {
        if (element.dataset.modifier) {
            switch (true) {
                case element.dataset.modifier.indexOf('+') !== -1:
                    advance('next', iframe.contentWindow.document.getElementsByClassName('goog-flat-button'));
                    break;
                case element.dataset.modifier.indexOf('-') !== -1:
                    advance('previous', iframe.contentWindow.document.getElementsByClassName('goog-flat-button'));
                    break;
                case element.dataset.modifier.indexOf('@') !== -1:
                    var aud = iframe.contentWindow.document.querySelectorAll('audio');
                    for (var i = 0; i < aud.length; i++) {
                        aud[i].play();
                    }
                    break;
                case element.dataset.modifier.indexOf('!') !== -1:
                    var vids = iframe.contentWindow.document.querySelectorAll('iframe');
                    for (var i = 0; i < vids.length; i++) {
                        vids[i].click();
                    }
                    break;
            }
        }
        element.dataset.stop = 'true';
        return;
    }
    element.innerHTML = time;

    if (element.dataset.modifier && element.dataset.modifier.indexOf('~') !== -1 && (element.dataset.direction.indexOf('+') !== -1 || element.dataset.direction.indexOf('-') !== -1)) {
        cTime[element.dataset.parentid] = element.innerHTML + element.dataset.direction;
    }

    stoppableIds[element.id] = setTimeout(function () {
        mytime(element);
    }, 50);
}

function advance(mod, buttons) {
    for (var r = 0; r < buttons.length; r++) {
        if (buttons[r].getAttribute('title')) {
            if (buttons[r].getAttribute('title').toLowerCase().indexOf(mod) !== -1) {
                clickelement(buttons[r]);
                break;
            }
        }
    }
}

function clickelement(theButton) {
    var simulateMouseEvent = function (element, eventName, coordX, coordY) {
        element.dispatchEvent(new MouseEvent(eventName, {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: coordX,
            clientY: coordY,
            button: 0
        }));
    };
    var box = theButton.getBoundingClientRect(),
        coordX = box.left + (box.right - box.left) / 2,
        coordY = box.top + (box.bottom - box.top) / 2;

    simulateMouseEvent(theButton, "mousedown", coordX, coordY);
    simulateMouseEvent(theButton, "mouseup", coordX, coordY);
    simulateMouseEvent(theButton, "click", coordX, coordY);
}

var insertedNodes = [];

var callback = function (mutations) {
    for (var m = 0; m < mutations.length; m++) {
        var mutation = mutations[m];
        for (var i = mutation.addedNodes.length - 1; i >= 0; i--) {
            insertedNodes.push(mutation.addedNodes[i]);
            if (mutation.addedNodes[i].nodeName == 'BODY') {
                observer.disconnect();
                observer.observe(document.body, config);
                insertedNodes = [];
                break;
            }
            if (mutation.addedNodes[i].className == 'punch-full-screen-element punch-full-window-overlay') {
                listenforpresent();
                break;
            }
        }
        for (var i = 0; i < mutation.removedNodes.length; i++) {
            if (mutation.removedNodes[i].className == 'punch-full-screen-element punch-full-window-overlay') {
                setSlide = undefined;
                break;
            }
        }
        if (mutation.attributeName == 'aria-selected') {
            var isnumber = new RegExp(/[\d]+/g).test(mutation.target.innerText);
            if (isnumber && !initialized[mutation.target.innerText]) {
                setID();
                initialized[mutation.target.innerText] = true;
            }
        }
    }
};

var observer = new MutationObserver(callback);
observer.observe(document.documentElement, config);

// ES5 DateFormater
function DateFormater(dateObj) {
    Date.call(this);
    if (dateObj && dateObj instanceof Date) {
        this.setTime(dateObj.getTime());
    }
    this.optionsobj = {
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
        }
    };
    this.formatstring = '';
}
DateFormater.prototype = Object.create(Date.prototype);
DateFormater.prototype.constructor = DateFormater;

DateFormater.prototype.format = function (string, locale) {
    if (typeof locale === 'undefined') locale = 'en-us';
    this.formatstring = string;
    this._replacement(string, locale);
    return this.formatstring;
};

DateFormater.prototype._replacement = function (str, locale) {
    if (typeof locale === 'undefined') locale = 'en-us';
    var self = this;
    var formatstring = this.formatstring;
    var optionsobj = this.optionsobj;
    var keys = Object.keys(optionsobj);

    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var options = {};
        var regex = new RegExp('[' + k + ']+', 'g');
        var m = String(str.match(regex));
        if (m.indexOf('h') !== -1) {
            options.hour12 = true;
        }
        if (m.indexOf('H') !== -1) {
            options.hour12 = false;
        }
        var key = optionsobj[k].keys[m.length - 1];
        var value = optionsobj[k].values[m.length - 1];
        if (!value || !key) {
            continue;
        }
        options[key] = value;

        var newstr = new Intl.DateTimeFormat(locale, options).format(this);
        if (value === '2-digit') {
            newstr = this.pad(newstr);
        }
        if (m.indexOf('h') !== -1) {
            var ampmmatch = String(str.match(/[t]+/g));
            var hours = String(newstr.match(/\d/g).join(''));
            var ampm = String(newstr.match(/[a-zA-Z]+/g)).slice(0, ampmmatch.length);
            formatstring = formatstring.replace(m, hours);
            formatstring = formatstring.replace(ampmmatch, ampm);
            this.formatstring = formatstring;
            continue;
        }
        formatstring = formatstring.replace(m, newstr);
        this.formatstring = formatstring;
    }
    return this.formatstring;
};

DateFormater.prototype.isLeapYear = function () {
    var year = this.getFullYear();
    if ((year & 3) != 0) return false;
    return ((year % 100) != 0 || (year % 400) == 0);
};

DateFormater.prototype.getDOY = function () {
    var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var mn = this.getMonth();
    var dn = this.getDate();
    var dayOfYear = dayCount[mn] + dn;
    if (mn > 1 && this.isLeapYear()) dayOfYear++;
    return dayOfYear;
};

DateFormater.prototype.pad = function (number) {
    var int = parseInt(number);
    var str = number.replace(/[0-9]+/g, '');
    return (int < 10 ? '0' : '') + int + str;
};
