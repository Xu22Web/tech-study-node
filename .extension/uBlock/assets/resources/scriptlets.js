/*******************************************************************************

    uBlock Origin - a browser extension to block requests.
    Copyright (C) 2019-present Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBlock

    The scriptlets below are meant to be injected only into a
    web page context.
*/

// Externally added to the private namespace in which scriptlets execute.
/* global scriptletGlobals */

'use strict';

export const builtinScriptlets = [];

/*******************************************************************************

    Helper functions
    
    These are meant to be used as dependencies to injectable scriptlets.

*******************************************************************************/

builtinScriptlets.push({
    name: 'safe-self.fn',
    fn: safeSelf,
});
function safeSelf() {
    if ( scriptletGlobals.has('safeSelf') ) {
        return scriptletGlobals.get('safeSelf');
    }
    const safe = {
        'RegExp': self.RegExp,
        'RegExp_test': self.RegExp.prototype.test,
        'RegExp_exec': self.RegExp.prototype.exec,
        'log': console.log.bind(console),
        'uboLog': function(msg) {
            if ( msg === '' ) { return; }
            this.log(`[uBO] ${msg}`);
        },
    };
    scriptletGlobals.set('safeSelf', safe);
    return safe;
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'pattern-to-regex.fn',
    fn: patternToRegex,
});
function patternToRegex(pattern) {
    if ( pattern === '' ) {
        return /^/;
    }
    if ( pattern.startsWith('/') && pattern.endsWith('/') ) {
        return new RegExp(pattern.slice(1, -1));
    }
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'get-exception-token.fn',
    fn: getExceptionToken,
});
function getExceptionToken() {
    const token =
        String.fromCharCode(Date.now() % 26 + 97) +
        Math.floor(Math.random() * 982451653 + 982451653).toString(36);
    const oe = self.onerror;
    self.onerror = function(msg, ...args) {
        if ( typeof msg === 'string' && msg.includes(token) ) { return true; }
        if ( oe instanceof Function ) {
            return oe.call(this, msg, ...args);
        }
    }.bind();
    return token;
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'should-debug.fn',
    fn: shouldDebug,
});
function shouldDebug(details) {
    if ( details instanceof Object === false ) { return false; }
    return scriptletGlobals.has('canDebug') && details.debug;
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'should-log.fn',
    fn: shouldLog,
});
function shouldLog(details) {
    if ( details instanceof Object === false ) { return false; }
    return scriptletGlobals.has('canDebug') && details.log;
}

/*******************************************************************************

    Injectable scriptlets

    These are meant to be used in the MAIN (webpage) execution world.

*******************************************************************************/

builtinScriptlets.push({
    name: 'abort-current-script.js',
    aliases: [ 'acs.js', 'abort-current-inline-script.js', 'acis.js' ],
    fn: abortCurrentScript,
    dependencies: [
        'pattern-to-regex.fn',
        'get-exception-token.fn',
        'safe-self.fn',
        'should-debug.fn',
        'should-log.fn',
    ],
});
// Issues to mind before changing anything:
//  https://github.com/uBlockOrigin/uBlock-issues/issues/2154
function abortCurrentScript(
    arg1 = '',
    arg2 = '',
    arg3 = ''
) {
    const details = typeof arg1 !== 'object'
        ? { target: arg1, needle: arg2, context: arg3 }
        : arg1;
    const { target = '', needle = '', context = '' } = details;
    if ( typeof target !== 'string' ) { return; }
    if ( target === '' ) { return; }
    const safe = safeSelf();
    const reNeedle = patternToRegex(needle);
    const reContext = patternToRegex(context);
    const thisScript = document.currentScript;
    const chain = target.split('.');
    let owner = window;
    let prop;
    for (;;) {
        prop = chain.shift();
        if ( chain.length === 0 ) { break; }
        owner = owner[prop];
        if ( owner instanceof Object === false ) { return; }
    }
    let value;
    let desc = Object.getOwnPropertyDescriptor(owner, prop);
    if (
        desc instanceof Object === false ||
        desc.get instanceof Function === false
    ) {
        value = owner[prop];
        desc = undefined;
    }
    const log = shouldLog(details);
    const debug = shouldDebug(details);
    const exceptionToken = getExceptionToken();
    const scriptTexts = new WeakMap();
    const getScriptText = elem => {
        let text = elem.textContent;
        if ( text.trim() !== '' ) { return text; }
        if ( scriptTexts.has(elem) ) { return scriptTexts.get(elem); }
        const [ , mime, content ] =
            /^data:([^,]*),(.+)$/.exec(elem.src.trim()) ||
            [ '', '', '' ];
        try {
            switch ( true ) {
            case mime.endsWith(';base64'):
                text = self.atob(content);
                break;
            default:
                text = self.decodeURIComponent(content);
                break;
            }
        } catch(ex) {
        }
        scriptTexts.set(elem, text);
        return text;
    };
    const validate = ( ) => {
        if ( debug ) { debugger; }  // jshint ignore: line
        const e = document.currentScript;
        if ( e instanceof HTMLScriptElement === false ) { return; }
        if ( e === thisScript ) { return; }
        if ( e.src !== '' && log ) { safe.uboLog(`src: ${e.src}`); }
        if ( reContext.test(e.src) === false ) { return; }
        const scriptText = getScriptText(e);
        if ( log ) { safe.uboLog(`script text: ${scriptText}`); }
        if ( reNeedle.test(scriptText) === false ) { return; }
        throw new ReferenceError(exceptionToken);
    };
    if ( debug ) { debugger; }  // jshint ignore: line
    try {
        Object.defineProperty(owner, prop, {
            get: function() {
                validate();
                return desc instanceof Object
                    ? desc.get.call(owner)
                    : value;
            },
            set: function(a) {
                validate();
                if ( desc instanceof Object ) {
                    desc.set.call(owner, a);
                } else {
                    value = a;
                }
            }
        });
    } catch(ex) {
        if ( log ) { safe.uboLog(ex); }
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'abort-on-property-read.js',
    aliases: [ 'aopr.js' ],
    fn: abortOnPropertyRead,
    dependencies: [
        'get-exception-token.fn',
    ],
});
function abortOnPropertyRead(
    chain = ''
) {
    if ( typeof chain !== 'string' ) { return; }
    if ( chain === '' ) { return; }
    const exceptionToken = getExceptionToken();
    const abort = function() {
        throw new ReferenceError(exceptionToken);
    };
    const makeProxy = function(owner, chain) {
        const pos = chain.indexOf('.');
        if ( pos === -1 ) {
            const desc = Object.getOwnPropertyDescriptor(owner, chain);
            if ( !desc || desc.get !== abort ) {
                Object.defineProperty(owner, chain, {
                    get: abort,
                    set: function(){}
                });
            }
            return;
        }
        const prop = chain.slice(0, pos);
        let v = owner[prop];
        chain = chain.slice(pos + 1);
        if ( v ) {
            makeProxy(v, chain);
            return;
        }
        const desc = Object.getOwnPropertyDescriptor(owner, prop);
        if ( desc && desc.set !== undefined ) { return; }
        Object.defineProperty(owner, prop, {
            get: function() { return v; },
            set: function(a) {
                v = a;
                if ( a instanceof Object ) {
                    makeProxy(a, chain);
                }
            }
        });
    };
    const owner = window;
    makeProxy(owner, chain);
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'abort-on-property-write.js',
    aliases: [ 'aopw.js' ],
    fn: abortOnPropertyWrite,
    dependencies: [
        'get-exception-token.fn',
    ],
});
function abortOnPropertyWrite(
    prop = ''
) {
    if ( typeof prop !== 'string' ) { return; }
    if ( prop === '' ) { return; }
    const exceptionToken = getExceptionToken();
    let owner = window;
    for (;;) {
        const pos = prop.indexOf('.');
        if ( pos === -1 ) { break; }
        owner = owner[prop.slice(0, pos)];
        if ( owner instanceof Object === false ) { return; }
        prop = prop.slice(pos + 1);
    }
    delete owner[prop];
    Object.defineProperty(owner, prop, {
        set: function() {
            throw new ReferenceError(exceptionToken);
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'abort-on-stack-trace.js',
    aliases: [ 'aost.js' ],
    fn: abortOnStackTrace,
    dependencies: [
        'get-exception-token.fn',
        'pattern-to-regex.fn',
        'safe-self.fn',
    ],
});
// Status is currently experimental
function abortOnStackTrace(
    chain = '',
    needle = '',
    logLevel = ''
) {
    if ( typeof chain !== 'string' ) { return; }
    const safe = safeSelf();
    const reNeedle = patternToRegex(needle);
    const exceptionToken = getExceptionToken();
    const ErrorCtor = self.Error;
    const mustAbort = function(err) {
        let docURL = self.location.href;
        const pos = docURL.indexOf('#');
        if ( pos !== -1 ) {
            docURL = docURL.slice(0, pos);
        }
        // Normalize stack trace
        const reLine = /(.*?@)?(\S+)(:\d+):\d+\)?$/;
        const lines = [];
        for ( let line of err.stack.split(/[\n\r]+/) ) {
            if ( line.includes(exceptionToken) ) { continue; }
            line = line.trim();
            let match = safe.RegExp_exec.call(reLine, line);
            if ( match === null ) { continue; }
            let url = match[2];
            if ( url.startsWith('(') ) { url = url.slice(1); }
            if ( url === docURL ) {
                url = 'inlineScript';
            } else if ( url.startsWith('<anonymous>') ) {
                url = 'injectedScript';
            }
            let fn = match[1] !== undefined
                ? match[1].slice(0, -1)
                : line.slice(0, match.index).trim();
            if ( fn.startsWith('at') ) { fn = fn.slice(2).trim(); }
            let rowcol = match[3];
            lines.push(' ' + `${fn} ${url}${rowcol}:1`.trim());
        }
        lines[0] = `stackDepth:${lines.length-1}`;
        const stack = lines.join('\t');
        const r = safe.RegExp_test.call(reNeedle, stack);
        if (
            logLevel === '1' ||
            logLevel === '2' && r ||
            logLevel === '3' && !r
        ) {
            safe.uboLog(stack.replace(/\t/g, '\n'));
        }
        return r;
    };
    const makeProxy = function(owner, chain) {
        const pos = chain.indexOf('.');
        if ( pos === -1 ) {
            let v = owner[chain];
            Object.defineProperty(owner, chain, {
                get: function() {
                    if ( mustAbort(new ErrorCtor(exceptionToken)) ) {
                        throw new ReferenceError(exceptionToken);
                    }
                    return v;
                },
                set: function(a) {
                    if ( mustAbort(new ErrorCtor(exceptionToken)) ) {
                        throw new ReferenceError(exceptionToken);
                    }
                    v = a;
                },
            });
            return;
        }
        const prop = chain.slice(0, pos);
        let v = owner[prop];
        chain = chain.slice(pos + 1);
        if ( v ) {
            makeProxy(v, chain);
            return;
        }
        const desc = Object.getOwnPropertyDescriptor(owner, prop);
        if ( desc && desc.set !== undefined ) { return; }
        Object.defineProperty(owner, prop, {
            get: function() { return v; },
            set: function(a) {
                v = a;
                if ( a instanceof Object ) {
                    makeProxy(a, chain);
                }
            }
        });
    };
    const owner = window;
    makeProxy(owner, chain);
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'addEventListener-defuser.js',
    aliases: [ 'aeld.js' ],
    fn: addEventListenerDefuser,
    dependencies: [
        'pattern-to-regex.fn',
        'safe-self.fn',
        'should-debug.fn',
        'should-log.fn',
    ],
});
// https://github.com/uBlockOrigin/uAssets/issues/9123#issuecomment-848255120
function addEventListenerDefuser(
    arg1 = '',
    arg2 = ''
) {
    const details = typeof arg1 !== 'object'
        ? { type: arg1, pattern: arg2 }
        : arg1;
    let { type = '', pattern = '' } = details;
    if ( typeof type !== 'string' ) { return; }
    if ( typeof pattern !== 'string' ) { return; }
    const safe = safeSelf();
    const reType = patternToRegex(type);
    const rePattern = patternToRegex(pattern);
    const log = shouldLog(details);
    const debug = shouldDebug(details);
    const proto = self.EventTarget.prototype;
    proto.addEventListener = new Proxy(proto.addEventListener, {
        apply: function(target, thisArg, args) {
            let type, handler;
            try {
                type = String(args[0]);
                handler = String(args[1]);
            } catch(ex) {
            }
            const matchesType = safe.RegExp_test.call(reType, type);
            const matchesHandler = safe.RegExp_test.call(rePattern, handler);
            const matchesEither = matchesType || matchesHandler;
            const matchesBoth = matchesType && matchesHandler;
            if ( log === 1 && matchesBoth || log === 2 && matchesEither || log === 3 ) {
                safe.uboLog(`addEventListener('${type}', ${handler})`);
            }
            if ( debug === 1 && matchesBoth || debug === 2 && matchesEither ) {
                debugger; // jshint ignore:line
            }
            if ( matchesBoth ) { return; }
            return Reflect.apply(target, thisArg, args);
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'json-prune.js',
    fn: jsonPrune,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
//  When no "prune paths" argument is provided, the scriptlet is
//  used for logging purpose and the "needle paths" argument is
//  used to filter logging output.
//
//  https://github.com/uBlockOrigin/uBlock-issues/issues/1545
//  - Add support for "remove everything if needle matches" case
function jsonPrune(
    rawPrunePaths = '',
    rawNeedlePaths = ''
) {
    if ( typeof rawPrunePaths !== 'string' ) { return; }
    const prunePaths = rawPrunePaths !== ''
        ? rawPrunePaths.split(/ +/)
        : [];
    let needlePaths;
    let log, reLogNeedle;
    if ( prunePaths.length !== 0 ) {
        needlePaths = prunePaths.length !== 0 && rawNeedlePaths !== ''
            ? rawNeedlePaths.split(/ +/)
            : [];
    } else {
        log = console.log.bind(console);
        reLogNeedle = patternToRegex(rawNeedlePaths);
    }
    const findOwner = function(root, path, prune = false) {
        let owner = root;
        let chain = path;
        for (;;) {
            if ( typeof owner !== 'object' || owner === null  ) {
                return false;
            }
            const pos = chain.indexOf('.');
            if ( pos === -1 ) {
                if ( prune === false ) {
                    return owner.hasOwnProperty(chain);
                }
                if ( chain === '*' ) {
                    for ( const key in owner ) {
                        if ( owner.hasOwnProperty(key) === false ) { continue; }
                        delete owner[key];
                    }
                } else if ( owner.hasOwnProperty(chain) ) {
                    delete owner[chain];
                }
                return true;
            }
            const prop = chain.slice(0, pos);
            if (
                prop === '[]' && Array.isArray(owner) ||
                prop === '*' && owner instanceof Object
            ) {
                const next = chain.slice(pos + 1);
                let found = false;
                for ( const key of Object.keys(owner) ) {
                    found = findOwner(owner[key], next, prune) || found;
                }
                return found;
            }
            if ( owner.hasOwnProperty(prop) === false ) { return false; }
            owner = owner[prop];
            chain = chain.slice(pos + 1);
        }
    };
    const mustProcess = function(root) {
        for ( const needlePath of needlePaths ) {
            if ( findOwner(root, needlePath) === false ) {
                return false;
            }
        }
        return true;
    };
    const pruner = function(o) {
        if ( log !== undefined ) {
            const json = JSON.stringify(o, null, 2);
            if ( reLogNeedle.test(json) ) {
                log('uBO:', location.hostname, json);
            }
            return o;
        }
        if ( mustProcess(o) === false ) { return o; }
        for ( const path of prunePaths ) {
            findOwner(o, path, true);
        }
        return o;
    };
    JSON.parse = new Proxy(JSON.parse, {
        apply: function() {
            return pruner(Reflect.apply(...arguments));
        },
    });
    Response.prototype.json = new Proxy(Response.prototype.json, {
        apply: function() {
            return Reflect.apply(...arguments).then(o => pruner(o));
        },
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'nano-setInterval-booster.js',
    aliases: [ 'nano-sib.js' ],
    fn: nanoSetIntervalBooster,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
// Imported from:
// https://github.com/NanoAdblocker/NanoFilters/blob/1f3be7211bb0809c5106996f52564bf10c4525f7/NanoFiltersSource/NanoResources.txt#L126
//
// Speed up or down setInterval, 3 optional arguments.
//      The payload matcher, a string literal or a JavaScript RegExp, defaults
//      to match all.
// delayMatcher
//      The delay matcher, an integer, defaults to 1000.
//      Use `*` to match any delay.
// boostRatio - The delay multiplier when there is a match, 0.5 speeds up by
//      2 times and 2 slows down by 2 times, defaults to 0.05 or speed up
//      20 times. Speed up and down both cap at 50 times.
function nanoSetIntervalBooster(
    needleArg = '',
    delayArg = '',
    boostArg = ''
) {
    if ( typeof needleArg !== 'string' ) { return; }
    const reNeedle = patternToRegex(needleArg);
    let delay = delayArg !== '*' ? parseInt(delayArg, 10) : -1;
    if ( isNaN(delay) || isFinite(delay) === false ) { delay = 1000; }
    let boost = parseFloat(boostArg);
    boost = isNaN(boost) === false && isFinite(boost)
        ? Math.min(Math.max(boost, 0.02), 50)
        : 0.05;
    self.setInterval = new Proxy(self.setInterval, {
        apply: function(target, thisArg, args) {
            const [ a, b ] = args;
            if (
                (delay === -1 || b === delay) &&
                reNeedle.test(a.toString())
            ) {
                args[1] = b * boost;
            }
            return target.apply(thisArg, args);
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'nano-setTimeout-booster.js',
    aliases: [ 'nano-stb.js' ],
    fn: nanoSetTimeoutBooster,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
// Imported from:
// https://github.com/NanoAdblocker/NanoFilters/blob/1f3be7211bb0809c5106996f52564bf10c4525f7/NanoFiltersSource/NanoResources.txt#L82
//
// Speed up or down setTimeout, 3 optional arguments.
// funcMatcher
//      The payload matcher, a string literal or a JavaScript RegExp, defaults
//      to match all.
// delayMatcher
//      The delay matcher, an integer, defaults to 1000.
//      Use `*` to match any delay.
// boostRatio - The delay multiplier when there is a match, 0.5 speeds up by
//      2 times and 2 slows down by 2 times, defaults to 0.05 or speed up
//      20 times. Speed up and down both cap at 50 times.
function nanoSetTimeoutBooster(
    needleArg = '',
    delayArg = '',
    boostArg = ''
) {
    if ( typeof needleArg !== 'string' ) { return; }
    const reNeedle = patternToRegex(needleArg);
    let delay = delayArg !== '*' ? parseInt(delayArg, 10) : -1;
    if ( isNaN(delay) || isFinite(delay) === false ) { delay = 1000; }
    let boost = parseFloat(boostArg);
    boost = isNaN(boost) === false && isFinite(boost)
        ? Math.min(Math.max(boost, 0.02), 50)
        : 0.05;
    self.setTimeout = new Proxy(self.setTimeout, {
        apply: function(target, thisArg, args) {
            const [ a, b ] = args;
            if (
                (delay === -1 || b === delay) &&
                reNeedle.test(a.toString())
            ) {
                args[1] = b * boost;
            }
            return target.apply(thisArg, args);
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'noeval-if.js',
    fn: noEvalIf,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
function noEvalIf(
    needle = ''
) {
    if ( typeof needle !== 'string' ) { return; }
    const reNeedle = patternToRegex(needle);
    window.eval = new Proxy(window.eval, {  // jshint ignore: line
        apply: function(target, thisArg, args) {
            const a = args[0];
            if ( reNeedle.test(a.toString()) ) { return; }
            return target.apply(thisArg, args);
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'no-fetch-if.js',
    fn: noFetchIf,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
function noFetchIf(
    arg1 = '',
) {
    if ( typeof arg1 !== 'string' ) { return; }
    const needles = [];
    for ( const condition of arg1.split(/\s+/) ) {
        if ( condition === '' ) { continue; }
        const pos = condition.indexOf(':');
        let key, value;
        if ( pos !== -1 ) {
            key = condition.slice(0, pos);
            value = condition.slice(pos + 1);
        } else {
            key = 'url';
            value = condition;
        }
        needles.push({ key, re: patternToRegex(value) });
    }
    const log = needles.length === 0 ? console.log.bind(console) : undefined;
    self.fetch = new Proxy(self.fetch, {
        apply: function(target, thisArg, args) {
            let proceed = true;
            try {
                let details;
                if ( args[0] instanceof self.Request ) {
                    details = args[0];
                } else {
                    details = Object.assign({ url: args[0] }, args[1]);
                }
                const props = new Map();
                for ( const prop in details ) {
                    let v = details[prop];
                    if ( typeof v !== 'string' ) {
                        try { v = JSON.stringify(v); }
                        catch(ex) { }
                    }
                    if ( typeof v !== 'string' ) { continue; }
                    props.set(prop, v);
                }
                if ( log !== undefined ) {
                    const out = Array.from(props)
                                     .map(a => `${a[0]}:${a[1]}`)
                                     .join(' ');
                    log(`uBO: fetch(${out})`);
                }
                proceed = needles.length === 0;
                for ( const { key, re } of needles ) {
                    if (
                        props.has(key) === false ||
                        re.test(props.get(key)) === false
                    ) {
                        proceed = true;
                        break;
                    }
                }
            } catch(ex) {
            }
            return proceed
                ? Reflect.apply(target, thisArg, args)
                : Promise.resolve(new Response());
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'refresh-defuser.js',
    fn: refreshDefuser,
});
// https://www.reddit.com/r/uBlockOrigin/comments/q0frv0/while_reading_a_sports_article_i_was_redirected/hf7wo9v/
function refreshDefuser(
    arg1 = ''
) {
    if ( typeof arg1 !== 'string' ) { return; }
    const defuse = ( ) => {
        const meta = document.querySelector('meta[http-equiv="refresh" i][content]');
        if ( meta === null ) { return; }
        const s = arg1 === ''
            ? meta.getAttribute('content')
            : arg1;
        const ms = Math.max(parseFloat(s) || 0, 0) * 1000;
        setTimeout(( ) => { window.stop(); }, ms);
    };
    if ( document.readyState === 'loading' ) {
        document.addEventListener('DOMContentLoaded', defuse, { once: true });
    } else {
        defuse();
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'remove-attr.js',
    aliases: [ 'ra.js' ],
    fn: removeAttr,
});
function removeAttr(
    token = '',
    selector = '',
    behavior = ''
) {
    if ( typeof token !== 'string' ) { return; }
    if ( token === '' ) { return; }
    const tokens = token.split(/\s*\|\s*/);
    if ( selector === '' ) {
        selector = `[${tokens.join('],[')}]`;
    }
    let timer;
    const rmattr = ( ) => {
        timer = undefined;
        try {
            const nodes = document.querySelectorAll(selector);
            for ( const node of nodes ) {
                for ( const attr of tokens ) {
                    node.removeAttribute(attr);
                }
            }
        } catch(ex) {
        }
    };
    const mutationHandler = mutations => {
        if ( timer !== undefined ) { return; }
        let skip = true;
        for ( let i = 0; i < mutations.length && skip; i++ ) {
            const { type, addedNodes, removedNodes } = mutations[i];
            if ( type === 'attributes' ) { skip = false; }
            for ( let j = 0; j < addedNodes.length && skip; j++ ) {
                if ( addedNodes[j].nodeType === 1 ) { skip = false; break; }
            }
            for ( let j = 0; j < removedNodes.length && skip; j++ ) {
                if ( removedNodes[j].nodeType === 1 ) { skip = false; break; }
            }
        }
        if ( skip ) { return; }
        timer = self.requestIdleCallback(rmattr, { timeout: 17 });
    };
    const start = ( ) => {
        rmattr();
        if ( /\bstay\b/.test(behavior) === false ) { return; }
        const observer = new MutationObserver(mutationHandler);
        observer.observe(document, {
            attributes: true,
            attributeFilter: tokens,
            childList: true,
            subtree: true,
        });
    };
    if ( document.readyState !== 'complete' && /\bcomplete\b/.test(behavior) ) {
        self.addEventListener('load', start, { once: true });
    } else if ( document.readyState !== 'loading' || /\basap\b/.test(behavior) ) {
        start();
    } else {
        self.addEventListener('DOMContentLoaded', start, { once: true });
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'remove-class.js',
    aliases: [ 'rc.js' ],
    fn: removeClass,
});
function removeClass(
    token = '',
    selector = '',
    behavior = ''
) {
    if ( typeof token !== 'string' ) { return; }
    if ( token === '' ) { return; }
    const tokens = token.split(/\s*\|\s*/);
    if ( selector === '' ) {
        selector = '.' + tokens.map(a => CSS.escape(a)).join(',.');
    }
    let timer;
    const rmclass = function() {
        timer = undefined;
        try {
            const nodes = document.querySelectorAll(selector);
            for ( const node of nodes ) {
                node.classList.remove(...tokens);
            }
        } catch(ex) {
        }
    };
    const mutationHandler = mutations => {
        if ( timer !== undefined ) { return; }
        let skip = true;
        for ( let i = 0; i < mutations.length && skip; i++ ) {
            const { type, addedNodes, removedNodes } = mutations[i];
            if ( type === 'attributes' ) { skip = false; }
            for ( let j = 0; j < addedNodes.length && skip; j++ ) {
                if ( addedNodes[j].nodeType === 1 ) { skip = false; break; }
            }
            for ( let j = 0; j < removedNodes.length && skip; j++ ) {
                if ( removedNodes[j].nodeType === 1 ) { skip = false; break; }
            }
        }
        if ( skip ) { return; }
        timer = self.requestIdleCallback(rmclass, { timeout: 67 });
    };
    const start = ( ) => {
        rmclass();
        if ( /\bstay\b/.test(behavior) === false ) { return; }
        const observer = new MutationObserver(mutationHandler);
        observer.observe(document, {
            attributes: true,
            attributeFilter: [ 'class' ],
            childList: true,
            subtree: true,
        });
    };
    if ( document.readyState !== 'complete' && /\bcomplete\b/.test(behavior) ) {
        self.addEventListener('load', start, { once: true });
    } else if ( document.readyState === 'loading' ) {
        self.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'no-requestAnimationFrame-if.js',
    aliases: [ 'norafif.js' ],
    fn: noRequestAnimationFrameIf,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
function noRequestAnimationFrameIf(
    needle = ''
) {
    if ( typeof needle !== 'string' ) { return; }
    const needleNot = needle.charAt(0) === '!';
    if ( needleNot ) { needle = needle.slice(1); }
    const log = needleNot === false && needle === '' ? console.log : undefined;
    const reNeedle = patternToRegex(needle);
    window.requestAnimationFrame = new Proxy(window.requestAnimationFrame, {
        apply: function(target, thisArg, args) {
            const a = String(args[0]);
            let defuse = false;
            if ( log !== undefined ) {
                log('uBO: requestAnimationFrame("%s")', a);
            } else {
                defuse = reNeedle.test(a) !== needleNot;
            }
            if ( defuse ) {
                args[0] = function(){};
            }
            return target.apply(thisArg, args);
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'set-constant.js',
    aliases: [ 'set.js' ],
    fn: setConstant,
});
function setConstant(
    arg1 = '',
    arg2 = '',
    arg3 = 0
) {
    const details = typeof arg1 !== 'object'
        ? { prop: arg1, value: arg2, runAt: parseInt(arg3, 10) || 0 }
        : arg1;
    const { prop: chain = '', value: cValue = '' } = details;
    if ( typeof chain !== 'string' ) { return; }
    if ( chain === '' ) { return; }
    function setConstant(chain, cValue) {
        const trappedProp = (( ) => {
            const pos = chain.lastIndexOf('.');
            if ( pos === -1 ) { return chain; }
            return chain.slice(pos+1);
        })();
        if ( trappedProp === '' ) { return; }
        const thisScript = document.currentScript;
        const objectDefineProperty = Object.defineProperty.bind(Object);
        const cloakFunc = fn => {
            objectDefineProperty(fn, 'name', { value: trappedProp });
            const proxy = new Proxy(fn, {
                defineProperty(target, prop) {
                    if ( prop !== 'toString' ) {
                        return Reflect.deleteProperty(...arguments);
                    }
                    return true;
                },
                deleteProperty(target, prop) {
                    if ( prop !== 'toString' ) {
                        return Reflect.deleteProperty(...arguments);
                    }
                    return true;
                },
                get(target, prop) {
                    if ( prop === 'toString' ) {
                        return function() {
                            return `function ${trappedProp}() { [native code] }`;
                        }.bind(null);
                    }
                    return Reflect.get(...arguments);
                },
            });
            return proxy;
        };
        if ( cValue === 'undefined' ) {
            cValue = undefined;
        } else if ( cValue === 'false' ) {
            cValue = false;
        } else if ( cValue === 'true' ) {
            cValue = true;
        } else if ( cValue === 'null' ) {
            cValue = null;
        } else if ( cValue === "''" ) {
            cValue = '';
        } else if ( cValue === '[]' ) {
            cValue = [];
        } else if ( cValue === '{}' ) {
            cValue = {};
        } else if ( cValue === 'noopFunc' ) {
            cValue = cloakFunc(function(){});
        } else if ( cValue === 'trueFunc' ) {
            cValue = cloakFunc(function(){ return true; });
        } else if ( cValue === 'falseFunc' ) {
            cValue = cloakFunc(function(){ return false; });
        } else if ( /^\d+$/.test(cValue) ) {
            cValue = parseFloat(cValue);
            if ( isNaN(cValue) ) { return; }
            if ( Math.abs(cValue) > 0x7FFF ) { return; }
        } else {
            return;
        }
        let aborted = false;
        const mustAbort = function(v) {
            if ( aborted ) { return true; }
            aborted =
                (v !== undefined && v !== null) &&
                (cValue !== undefined && cValue !== null) &&
                (typeof v !== typeof cValue);
            return aborted;
        };
        // https://github.com/uBlockOrigin/uBlock-issues/issues/156
        //   Support multiple trappers for the same property.
        const trapProp = function(owner, prop, configurable, handler) {
            if ( handler.init(configurable ? owner[prop] : cValue) === false ) { return; }
            const odesc = Object.getOwnPropertyDescriptor(owner, prop);
            let prevGetter, prevSetter;
            if ( odesc instanceof Object ) {
                owner[prop] = cValue;
                if ( odesc.get instanceof Function ) {
                    prevGetter = odesc.get;
                }
                if ( odesc.set instanceof Function ) {
                    prevSetter = odesc.set;
                }
            }
            try {
                objectDefineProperty(owner, prop, {
                    configurable,
                    get() {
                        if ( prevGetter !== undefined ) {
                            prevGetter();
                        }
                        return handler.getter(); // cValue
                    },
                    set(a) {
                        if ( prevSetter !== undefined ) {
                            prevSetter(a);
                        }
                        handler.setter(a);
                    }
                });
            } catch(ex) {
            }
        };
        const trapChain = function(owner, chain) {
            const pos = chain.indexOf('.');
            if ( pos === -1 ) {
                trapProp(owner, chain, false, {
                    v: undefined,
                    init: function(v) {
                        if ( mustAbort(v) ) { return false; }
                        this.v = v;
                        return true;
                    },
                    getter: function() {
                        return document.currentScript === thisScript
                            ? this.v
                            : cValue;
                    },
                    setter: function(a) {
                        if ( mustAbort(a) === false ) { return; }
                        cValue = a;
                    }
                });
                return;
            }
            const prop = chain.slice(0, pos);
            const v = owner[prop];
            chain = chain.slice(pos + 1);
            if ( v instanceof Object || typeof v === 'object' && v !== null ) {
                trapChain(v, chain);
                return;
            }
            trapProp(owner, prop, true, {
                v: undefined,
                init: function(v) {
                    this.v = v;
                    return true;
                },
                getter: function() {
                    return this.v;
                },
                setter: function(a) {
                    this.v = a;
                    if ( a instanceof Object ) {
                        trapChain(a, chain);
                    }
                }
            });
        };
        trapChain(window, chain);
    }
    const runAt = details.runAt;
    if ( runAt === 0 ) {
        setConstant(chain, cValue); return;
    }
    const docReadyState = ( ) => {
        return ({ loading: 1, interactive: 2, complete: 3, })[document.readyState] || 0;
    };
    if ( docReadyState() >= runAt ) {
        setConstant(chain, cValue); return;
    }
    const onReadyStateChange = ( ) => {
        if ( docReadyState() < runAt ) { return; }
        setConstant(chain, cValue);
        document.removeEventListener('readystatechange', onReadyStateChange);
    };
    document.addEventListener('readystatechange', onReadyStateChange);
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'no-setInterval-if.js',
    aliases: [ 'nosiif.js' ],
    fn: noSetIntervalIf,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
function noSetIntervalIf(
    needle = '',
    delay = ''
) {
    if ( typeof needle !== 'string' ) { return; }
    const needleNot = needle.charAt(0) === '!';
    if ( needleNot ) { needle = needle.slice(1); }
    if ( delay === '' ) { delay = undefined; }
    let delayNot = false;
    if ( delay !== undefined ) {
        delayNot = delay.charAt(0) === '!';
        if ( delayNot ) { delay = delay.slice(1); }
        delay = parseInt(delay, 10);
    }
    const log = needleNot === false && needle === '' && delay === undefined
        ? console.log
        : undefined;
    const reNeedle = patternToRegex(needle);
    window.setInterval = new Proxy(window.setInterval, {
        apply: function(target, thisArg, args) {
            const a = String(args[0]);
            const b = args[1];
            if ( log !== undefined ) {
                log('uBO: setInterval("%s", %s)', a, b);
            } else {
                let defuse;
                if ( needle !== '' ) {
                    defuse = reNeedle.test(a) !== needleNot;
                }
                if ( defuse !== false && delay !== undefined ) {
                    defuse = (b === delay || isNaN(b) && isNaN(delay) ) !== delayNot;
                }
                if ( defuse ) {
                    args[0] = function(){};
                }
            }
            return target.apply(thisArg, args);
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'no-setTimeout-if.js',
    aliases: [ 'nostif.js', 'setTimeout-defuser.js' ],
    fn: noSetTimeoutIf,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
function noSetTimeoutIf(
    needle = '',
    delay = ''
) {
    if ( typeof needle !== 'string' ) { return; }
    const needleNot = needle.charAt(0) === '!';
    if ( needleNot ) { needle = needle.slice(1); }
    if ( delay === '' ) { delay = undefined; }
    let delayNot = false;
    if ( delay !== undefined ) {
        delayNot = delay.charAt(0) === '!';
        if ( delayNot ) { delay = delay.slice(1); }
        delay = parseInt(delay, 10);
    }
    const log = needleNot === false && needle === '' && delay === undefined
        ? console.log
        : undefined;
    const reNeedle = patternToRegex(needle);
    window.setTimeout = new Proxy(window.setTimeout, {
        apply: function(target, thisArg, args) {
            const a = String(args[0]);
            const b = args[1];
            if ( log !== undefined ) {
                log('uBO: setTimeout("%s", %s)', a, b);
            } else {
                let defuse;
                if ( needle !== '' ) {
                    defuse = reNeedle.test(a) !== needleNot;
                }
                if ( defuse !== false && delay !== undefined ) {
                    defuse = (b === delay || isNaN(b) && isNaN(delay) ) !== delayNot;
                }
                if ( defuse ) {
                    args[0] = function(){};
                }
            }
            return target.apply(thisArg, args);
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'webrtc-if.js',
    fn: webrtcIf,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
function webrtcIf(
    good = ''
) {
    if ( typeof good !== 'string' ) { return; }
    const reGood = patternToRegex(good);
    const rtcName = window.RTCPeerConnection
        ? 'RTCPeerConnection'
        : (window.webkitRTCPeerConnection ? 'webkitRTCPeerConnection' : '');
    if ( rtcName === '' ) { return; }
    const log = console.log.bind(console);
    const neuteredPeerConnections = new WeakSet();
    const isGoodConfig = function(instance, config) {
        if ( neuteredPeerConnections.has(instance) ) { return false; }
        if ( config instanceof Object === false ) { return true; }
        if ( Array.isArray(config.iceServers) === false ) { return true; }
        for ( const server of config.iceServers ) {
            const urls = typeof server.urls === 'string'
                ? [ server.urls ]
                : server.urls;
            if ( Array.isArray(urls) ) {
                for ( const url of urls ) {
                    if ( reGood.test(url) ) { return true; }
                }
            }
            if ( typeof server.username === 'string' ) {
                if ( reGood.test(server.username) ) { return true; }
            }
            if ( typeof server.credential === 'string' ) {
                if ( reGood.test(server.credential) ) { return true; }
            }
        }
        neuteredPeerConnections.add(instance);
        return false;
    };
    const peerConnectionCtor = window[rtcName];
    const peerConnectionProto = peerConnectionCtor.prototype;
    peerConnectionProto.createDataChannel =
        new Proxy(peerConnectionProto.createDataChannel, {
            apply: function(target, thisArg, args) {
                if ( isGoodConfig(target, args[1]) === false ) {
                    log('uBO:', args[1]);
                    return Reflect.apply(target, thisArg, args.slice(0, 1));
                }
                return Reflect.apply(target, thisArg, args);
            },
        });
    window[rtcName] =
        new Proxy(peerConnectionCtor, {
            construct: function(target, args) {
                if ( isGoodConfig(target, args[0]) === false ) {
                    log('uBO:', args[0]);
                    return Reflect.construct(target);
                }
                return Reflect.construct(target, args);
            }
        });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'no-xhr-if.js',
    fn: noXhrIf,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
function noXhrIf(
    arg1 = ''
) {
    if ( typeof arg1 !== 'string' ) { return; }
    const xhrInstances = new WeakMap();
    const needles = [];
    for ( const condition of arg1.split(/\s+/) ) {
        if ( condition === '' ) { continue; }
        const pos = condition.indexOf(':');
        let key, value;
        if ( pos !== -1 ) {
            key = condition.slice(0, pos);
            value = condition.slice(pos + 1);
        } else {
            key = 'url';
            value = condition;
        }
        needles.push({ key, re: patternToRegex(value) });
    }
    const log = needles.length === 0 ? console.log.bind(console) : undefined;
    self.XMLHttpRequest = class extends self.XMLHttpRequest {
        open(...args) {
            if ( log !== undefined ) {
                log(`uBO: xhr.open(${args.join(', ')})`);
            } else {
                const argNames = [ 'method', 'url' ];
                const haystack = new Map();
                for ( let i = 0; i < args.length && i < argNames.length; i++  ) {
                    haystack.set(argNames[i], args[i]);
                }
                if ( haystack.size !== 0 ) {
                    let matches = true;
                    for ( const { key, re } of needles ) {
                        matches = re.test(haystack.get(key) || '');
                        if ( matches === false ) { break; }
                    }
                    if ( matches ) {
                        xhrInstances.set(this, haystack);
                    }
                }
            }
            return super.open(...args);
        }
        send(...args) {
            const haystack = xhrInstances.get(this);
            if ( haystack === undefined ) {
                return super.send(...args);
            }
            Object.defineProperties(this, {
                readyState: { value: 4, writable: false },
                response: { value: '', writable: false },
                responseText: { value: '', writable: false },
                responseURL: { value: haystack.get('url'), writable: false },
                responseXML: { value: '', writable: false },
                status: { value: 200, writable: false },
                statusText: { value: 'OK', writable: false },
            });
            this.dispatchEvent(new Event('readystatechange'));
            this.dispatchEvent(new Event('load'));
            this.dispatchEvent(new Event('loadend'));
        }
    };
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'window-close-if.js',
    fn: windowCloseIf,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
// https://github.com/uBlockOrigin/uAssets/issues/10323#issuecomment-992312847
// https://github.com/AdguardTeam/Scriptlets/issues/158
// https://github.com/uBlockOrigin/uBlock-issues/discussions/2270
function windowCloseIf(
    arg1 = ''
) {
    if ( typeof arg1 !== 'string' ) { return; }
    let subject = '';
    if ( /^\/.*\/$/.test(arg1) ) {
        subject = window.location.href;
    } else if ( arg1 !== '' ) {
        subject = `${window.location.pathname}${window.location.search}`;
    }
    try {
        const re = patternToRegex(arg1);
        if ( re.test(subject) ) {
            window.close();
        }
    } catch(ex) {
        console.log(ex);
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'window.name-defuser.js',
    fn: windowNameDefuser,
});
// https://github.com/gorhill/uBlock/issues/1228
function windowNameDefuser() {
    if ( window === window.top ) {
        window.name = '';
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'overlay-buster.js',
    fn: overlayBuster,
});
// Experimental: Generic nuisance overlay buster.
// if this works well and proves to be useful, this may end up
// as a stock tool in uBO's popup panel.
function overlayBuster() {
    if ( window !== window.top ) { return; }
    var tstart;
    var ttl = 30000;
    var delay = 0;
    var delayStep = 50;
    var buster = function() {
        var docEl = document.documentElement,
            bodyEl = document.body,
            vw = Math.min(docEl.clientWidth, window.innerWidth),
            vh = Math.min(docEl.clientHeight, window.innerHeight),
            tol = Math.min(vw, vh) * 0.05,
            el = document.elementFromPoint(vw/2, vh/2),
            style, rect;
        for (;;) {
            if ( el === null || el.parentNode === null || el === bodyEl ) {
                break;
            }
            style = window.getComputedStyle(el);
            if ( parseInt(style.zIndex, 10) >= 1000 || style.position === 'fixed' ) {
                rect = el.getBoundingClientRect();
                if ( rect.left <= tol && rect.top <= tol && (vw - rect.right) <= tol && (vh - rect.bottom) < tol ) {
                    el.parentNode.removeChild(el);
                    tstart = Date.now();
                    el = document.elementFromPoint(vw/2, vh/2);
                    bodyEl.style.setProperty('overflow', 'auto', 'important');
                    docEl.style.setProperty('overflow', 'auto', 'important');
                    continue;
                }
            }
            el = el.parentNode;
        }
        if ( (Date.now() - tstart) < ttl ) {
            delay = Math.min(delay + delayStep, 1000);
            setTimeout(buster, delay);
        }
    };
    var domReady = function(ev) {
        if ( ev ) {
            document.removeEventListener(ev.type, domReady);
        }
        tstart = Date.now();
        setTimeout(buster, delay);
    };
    if ( document.readyState === 'loading' ) {
        document.addEventListener('DOMContentLoaded', domReady);
    } else {
        domReady();
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'alert-buster.js',
    fn: alertBuster,
});
// https://github.com/uBlockOrigin/uAssets/issues/8
function alertBuster() {
    window.alert = new Proxy(window.alert, {
        apply: function(a) {
            console.info(a);
        },
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'nowebrtc.js',
    fn: noWebrtc,
});
// Prevent web pages from using RTCPeerConnection(), and report attempts in console.
function noWebrtc() {
    var rtcName = window.RTCPeerConnection ? 'RTCPeerConnection' : (
        window.webkitRTCPeerConnection ? 'webkitRTCPeerConnection' : ''
    );
    if ( rtcName === '' ) { return; }
    var log = console.log.bind(console);
    var pc = function(cfg) {
        log('Document tried to create an RTCPeerConnection: %o', cfg);
    };
    const noop = function() {
    };
    pc.prototype = {
        close: noop,
        createDataChannel: noop,
        createOffer: noop,
        setRemoteDescription: noop,
        toString: function() {
            return '[object RTCPeerConnection]';
        }
    };
    var z = window[rtcName];
    window[rtcName] = pc.bind(window);
    if ( z.prototype ) {
        z.prototype.createDataChannel = function() {
            return {
                close: function() {},
                send: function() {}
            };
        }.bind(null);
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'golem.de.js',
    fn: golemDe,
});
// https://github.com/uBlockOrigin/uAssets/issues/88
function golemDe() {
    const rael = window.addEventListener;
    window.addEventListener = function(a, b) {
        rael(...arguments);
        let haystack;
        try {
            haystack = b.toString();
        } catch(ex) {
        }
        if (
            typeof haystack === 'string' &&
            /^\s*function\s*\(\)\s*\{\s*window\.clearTimeout\(r\)\s*\}\s*$/.test(haystack)
        ) {
            b();
        }
    }.bind(window);
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'adfly-defuser.js',
    fn: adflyDefuser,
});
// https://github.com/reek/anti-adblock-killer/issues/3774#issuecomment-348536138
// https://github.com/uBlockOrigin/uAssets/issues/883
function adflyDefuser() {
    // Based on AdsBypasser
    // License:
    //   https://github.com/adsbypasser/adsbypasser/blob/master/LICENSE
    var isDigit = /^\d$/;
    var handler = function(encodedURL) {
        var var1 = "", var2 = "", i;
        for (i = 0; i < encodedURL.length; i++) {
            if (i % 2 === 0) {
                var1 = var1 + encodedURL.charAt(i);
            } else {
                var2 = encodedURL.charAt(i) + var2;
            }
        }
        var data = (var1 + var2).split("");
        for (i = 0; i < data.length; i++) {
            if (isDigit.test(data[i])) {
                for (var ii = i + 1; ii < data.length; ii++) {
                    if (isDigit.test(data[ii])) {
                        var temp = parseInt(data[i],10) ^ parseInt(data[ii],10);
                        if (temp < 10) {
                            data[i] = temp.toString();
                        }
                        i = ii;
                        break;
                    }
                }
            }
        }
        data = data.join("");
        var decodedURL = window.atob(data).slice(16, -16);
        window.stop();
        window.onbeforeunload = null;
        window.location.href = decodedURL;
    };
    try {
        var val;
        var flag = true;
        window.Object.defineProperty(window, "ysmm", {
            configurable: false,
            set: function(value) {
                if (flag) {
                    flag = false;
                    try {
                        if (typeof value === "string") {
                            handler(value);
                        }
                    } catch (err) { }
                }
                val = value;
            },
            get: function() {
                return val;
            }
        });
    } catch (err) {
        window.console.error("Failed to set up Adfly bypasser!");
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'disable-newtab-links.js',
    fn: disableNewtabLinks,
});
// https://github.com/uBlockOrigin/uAssets/issues/913
function disableNewtabLinks() {
    document.addEventListener('click', function(ev) {
        var target = ev.target;
        while ( target !== null ) {
            if ( target.localName === 'a' && target.hasAttribute('target') ) {
                ev.stopPropagation();
                ev.preventDefault();
                break;
            }
            target = target.parentNode;
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'cookie-remover.js',
    fn: cookieRemover,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
// https://github.com/NanoAdblocker/NanoFilters/issues/149
function cookieRemover(
    needle = ''
) {
    if ( typeof needle !== 'string' ) { return; }
    const reName = patternToRegex(needle);
    const removeCookie = function() {
        document.cookie.split(';').forEach(cookieStr => {
            let pos = cookieStr.indexOf('=');
            if ( pos === -1 ) { return; }
            let cookieName = cookieStr.slice(0, pos).trim();
            if ( !reName.test(cookieName) ) { return; }
            let part1 = cookieName + '=';
            let part2a = '; domain=' + document.location.hostname;
            let part2b = '; domain=.' + document.location.hostname;
            let part2c, part2d;
            let domain = document.domain;
            if ( domain ) {
                if ( domain !== document.location.hostname ) {
                    part2c = '; domain=.' + domain;
                }
                if ( domain.startsWith('www.') ) {
                    part2d = '; domain=' + domain.replace('www', '');
                }
            }
            let part3 = '; path=/';
            let part4 = '; Max-Age=-1000; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = part1 + part4;
            document.cookie = part1 + part2a + part4;
            document.cookie = part1 + part2b + part4;
            document.cookie = part1 + part3 + part4;
            document.cookie = part1 + part2a + part3 + part4;
            document.cookie = part1 + part2b + part3 + part4;
            if ( part2c !== undefined ) {
                document.cookie = part1 + part2c + part3 + part4;
            }
            if ( part2d !== undefined ) {
                document.cookie = part1 + part2d + part3 + part4;
            }
        });
    };
    removeCookie();
    window.addEventListener('beforeunload', removeCookie);
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'xml-prune.js',
    fn: xmlPrune,
    dependencies: [
        'pattern-to-regex.fn',
    ],
});
function xmlPrune(
    selector = '',
    selectorCheck = '',
    urlPattern = ''
) {
    if ( typeof selector !== 'string' ) { return; }
    if ( selector === '' ) { return; }
    const reUrl = patternToRegex(urlPattern);
    const pruner = text => {
        if ( (/^\s*</.test(text) && />\s*$/.test(text)) === false ) {
            return text;
        }
        try {
            const xmlParser = new DOMParser();
            const xmlDoc = xmlParser.parseFromString(text, 'text/xml');
            if ( selectorCheck !== '' && xmlDoc.querySelector(selectorCheck) === null ) {
                return text;
            }
            const elems = xmlDoc.querySelectorAll(selector);
            if ( elems.length !== 0 ) {
                for ( const elem of elems ) {
                    elem.remove();
                }
                const serializer = new XMLSerializer();
                text = serializer.serializeToString(xmlDoc);
            }
        } catch(ex) {
        }
        return text;
    };
    const urlFromArg = arg => {
        if ( typeof arg === 'string' ) { return arg; }
        if ( arg instanceof Request ) { return arg.url; }
        return String(arg);
    };
    const realFetch = self.fetch;
    self.fetch = new Proxy(self.fetch, {
        apply: function(target, thisArg, args) {
            if ( reUrl.test(urlFromArg(args[0])) === false ) {
                return Reflect.apply(target, thisArg, args);
            }
            return realFetch(...args).then(realResponse =>
                realResponse.text().then(text =>
                    new Response(pruner(text), {
                        status: realResponse.status,
                        statusText: realResponse.statusText,
                        headers: realResponse.headers,
                    })
                )
            );
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'm3u-prune.js',
    fn: m3uPrune,
});
// https://en.wikipedia.org/wiki/M3U
function m3uPrune(
    m3uPattern = '',
    urlPattern = ''
) {
    if ( typeof m3uPattern !== 'string' ) { return; }
    const regexFromArg = arg => {
        if ( arg === '' ) { return /^/; }
        const match = /^\/(.+)\/([gms]*)$/.exec(arg);
        if ( match !== null ) {
            let flags = match[2] || '';
            if ( flags.includes('m') ) { flags += 's'; }
            return new RegExp(match[1], flags);
        }
        return new RegExp(
            arg.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*+/g, '.*?')
        );
    };
    const reM3u = regexFromArg(m3uPattern);
    const reUrl = regexFromArg(urlPattern);
    const pruneSpliceoutBlock = (lines, i) => {
        if ( lines[i].startsWith('#EXT-X-CUE:TYPE="SpliceOut"') === false ) {
            return false;
        }
        lines[i] = undefined; i += 1;
        if ( lines[i].startsWith('#EXT-X-ASSET:CAID') ) {
            lines[i] = undefined; i += 1;
        }
        if ( lines[i].startsWith('#EXT-X-SCTE35:') ) {
            lines[i] = undefined; i += 1;
        }
        if ( lines[i].startsWith('#EXT-X-CUE-IN') ) {
            lines[i] = undefined; i += 1;
        }
        if ( lines[i].startsWith('#EXT-X-SCTE35:') ) {
            lines[i] = undefined; i += 1;
        }
        return true;
    };
    const pruneInfBlock = (lines, i) => {
        if ( lines[i].startsWith('#EXTINF') === false ) { return false; }
        if ( reM3u.test(lines[i+1]) === false ) { return false; }
        lines[i] = lines[i+1] = undefined; i += 2;
        if ( lines[i].startsWith('#EXT-X-DISCONTINUITY') ) {
            lines[i] = undefined; i += 1;
        }
        return true;
    };
    const pruner = text => {
        if ( (/^\s*#EXTM3U/.test(text)) === false ) { return text; }
        if ( reM3u.multiline ) {
            reM3u.lastIndex = 0;
            for (;;) {
                const match = reM3u.exec(text);
                if ( match === null ) { break; }
                const before = text.slice(0, match.index);
                if ( before.length === 0 || /[\n\r]+\s*$/.test(before) ) {
                    const after = text.slice(match.index + match[0].length);
                    if ( after.length === 0 || /^\s*[\n\r]+/.test(after) ) {
                        text = before.trim() + '\n' + after.trim();
                        reM3u.lastIndex = before.length + 1;
                    }
                }
                if ( reM3u.global === false ) { break; }
            }
        }
        const lines = text.split(/\n\r|\n|\r/);
        for ( let i = 0; i < lines.length; i++ ) {
            if ( lines[i] === undefined ) { continue; }
            if ( pruneSpliceoutBlock(lines, i) ) { continue; }
            if ( pruneInfBlock(lines, i) ) { continue; }
        }
        return lines.filter(l => l !== undefined).join('\n');
    };
    const urlFromArg = arg => {
        if ( typeof arg === 'string' ) { return arg; }
        if ( arg instanceof Request ) { return arg.url; }
        return String(arg);
    };
    const realFetch = self.fetch;
    self.fetch = new Proxy(self.fetch, {
        apply: function(target, thisArg, args) {
            if ( reUrl.test(urlFromArg(args[0])) === false ) {
                return Reflect.apply(target, thisArg, args);
            }
            return realFetch(...args).then(realResponse =>
                realResponse.text().then(text =>
                    new Response(pruner(text), {
                        status: realResponse.status,
                        statusText: realResponse.statusText,
                        headers: realResponse.headers,
                    })
                )
            );
        }
    });
    self.XMLHttpRequest.prototype.open = new Proxy(self.XMLHttpRequest.prototype.open, {
        apply: async (target, thisArg, args) => {
            if ( reUrl.test(urlFromArg(args[1])) === false ) {
                return Reflect.apply(target, thisArg, args);
            }
            thisArg.addEventListener('readystatechange', function() {
                if ( thisArg.readyState !== 4 ) { return; }
                const type = thisArg.responseType;
                if ( type !== '' && type !== 'text' ) { return; }
                const textin = thisArg.responseText;
                const textout = pruner(textin);
                if ( textout === textin ) { return; }
                Object.defineProperty(thisArg, 'response', { value: textout });
                Object.defineProperty(thisArg, 'responseText', { value: textout });
            });
            return Reflect.apply(target, thisArg, args);
        }
    });
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'href-sanitizer.js',
    fn: hrefSanitizer,
});
function hrefSanitizer(
    selector = '',
    source = ''
) {
    if ( typeof selector !== 'string' ) { return; }
    if ( selector === '' ) { return; }
    if ( source === '' ) { source = 'text'; }
    const sanitizeCopycats = (href, text) => {
        let elems = [];
        try {
            elems = document.querySelectorAll(`a[href="${href}"`);
        }
        catch(ex) {
        }
        for ( const elem of elems ) {
            elem.setAttribute('href', text);
        }
    };
    const extractText = (elem, source) => {
        if ( /^\[.*\]$/.test(source) ) {
            return elem.getAttribute(source.slice(1,-1).trim()) || '';
        }
        if ( source !== 'text' ) { return ''; }
        const text = elem.textContent
            .replace(/^[^\x21-\x7e]+/, '') // remove leading invalid characters
            .replace(/[^\x21-\x7e]+$/, '') // remove trailing invalid characters
            ;
        if ( /^https:\/\/./.test(text) === false ) { return ''; }
        if ( /[^\x21-\x7e]/.test(text) ) { return ''; }
        return text;
    };
    const sanitize = ( ) => {
        let elems = [];
        try {
            elems = document.querySelectorAll(selector);
        }
        catch(ex) {
            return false;
        }
        for ( const elem of elems ) {
            if ( elem.localName !== 'a' ) { continue; }
            if ( elem.hasAttribute('href') === false ) { continue; }
            const href = elem.getAttribute('href');
            const text = extractText(elem, source);
            if ( text === '' ) { continue; }
            if ( href === text ) { continue; }
            elem.setAttribute('href', text);
            sanitizeCopycats(href, text);
        }
        return true;
    };
    let observer, timer;
    const onDomChanged = mutations => {
        if ( timer !== undefined ) { return; }
        let shouldSanitize = false;
        for ( const mutation of mutations ) {
            if ( mutation.addedNodes.length === 0 ) { continue; }
            for ( const node of mutation.addedNodes ) {
                if ( node.nodeType !== 1 ) { continue; }
                shouldSanitize = true;
                break;
            }
            if ( shouldSanitize ) { break; }
        }
        if ( shouldSanitize === false ) { return; }
        timer = self.requestAnimationFrame(( ) => {
            timer = undefined;
            sanitize();
        });
    };
    const start = ( ) => {
        if ( sanitize() === false ) { return; }
        observer = new MutationObserver(onDomChanged);
        observer.observe(document.body, {
            subtree: true,
            childList: true,
        });
    };
    if ( document.readyState === 'loading' ) {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
}

/******************************************************************************/

builtinScriptlets.push({
    name: 'call-nothrow.js',
    fn: callNothrow,
});
function callNothrow(
    chain = ''
) {
    if ( typeof chain !== 'string' ) { return; }
    if ( chain === '' ) { return; }
    const parts = chain.split('.');
    let owner = window, prop;
    for (;;) {
        prop = parts.shift();
        if ( parts.length === 0 ) { break; }
        owner = owner[prop];
        if ( owner instanceof Object === false ) { return; }
    }
    if ( prop === '' ) { return; }
    const fn = owner[prop];
    if ( typeof fn !== 'function' ) { return; }
    owner[prop] = new Proxy(fn, {
        apply: function(...args) {
            let r;
            try {
                r = Reflect.apply(...args);
            } catch(ex) {
            }
            return r;
        },
    });
}

/******************************************************************************/
