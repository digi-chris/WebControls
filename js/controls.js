class Control {
    constructor(node) {
        this.__controls = {};
        this._events = {};
        if (node) {
            if (node instanceof Element) {
                this.element = node;
            } else {
                if (!node) {
                    node = 'div';
                }
                this.element = document.createElement(node);
            }
        } else {
            var bElement = document.querySelectorAll("[data-control='" + this.constructor.name + "']")[0];
            if (bElement) {
                this.element = bElement.cloneNode(true);
                this.element.setAttribute("data-control-from", this.constructor.name);
                this.element.removeAttribute("data-control");
            }
        }

        this._controls = [];
        var includes = this.element.querySelectorAll("div[data-include]");
        for (var i = 0; i < includes.length; i++) {
            var args = null;
            if (includes[i].innerText) {
                try {
                    args = JSON.parse(includes[i].innerText);
                }
                catch (error) {
                    console.error("Couldn't parse include JSON:", includes[i].innerText);
                }
            }
            var control = WebControls.__instantiate(includes[i].getAttribute("data-include"), args);
            this._controls.push(control);

            if (includes[i].id) {
                this.__controls[includes[i].id] = control;
            }

            for (var ii = 0; ii < includes[i].classList.length; ii++) {
                control.element.classList.add(includes[i].classList[ii]);
            }
            includes[i].parentNode.replaceChild(control.element, includes[i]);
        }
    }

    removeChildren(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    bind(data) {
        for (var obj in data) {
            var ele = this.getElement(obj);
            if (ele) {
                var dataTransform = ele.getAttribute("data-transform");
                if (this[dataTransform]) {
                    ele.innerHTML = this[dataTransform](data[obj]);
                } else {
                    ele.innerText = data[obj];
                }
            }
        }
    }

    getElement(dataName) {
        var elements = this.element.querySelectorAll("[data-name='" + dataName + "']");
        if (elements.length === 0) {
            //throw "Element '" + dataName + "' does not exist.";
            return null;
        } else if (elements.length === 1) {
            return elements[0];
        } else {
            console.warn("More than one element exists with the data-name '" + dataName + "'. Only the first item found will be returned.");
            return elements[0];
        }
    }

    getControl(dataName) {
        console.log('getControl', dataName, this._controls);
        for (var i = 0; i < this._controls.length; i++) {
            if (this._controls[i].element.parentNode.getAttribute("data-name") === dataName) {
                return this._controls[i];
            }
        }
        return null;
    }

    getControlById(idName) {
        console.log("getControlById");
        console.log(this.__controls);
        if (this.__controls[idName]) {
            return this.__controls[idName];
        }
    }

    addChild(control) {
        this.element.appendChild(control.element);
        control.parent = this;
        this._controls.push(control);
    }

    removeChild(control) {
        for (var i = 0; i < this._controls.length; i++) {
            if (this._controls[i] === control) {
                this.element.removeChild(control.element);
                this._controls.splice(i, 1);
                return;
            }
        }
    }

    addEventListener(eventName, callback) {
        if (!Array.isArray(this._events[eventName])) {
            this._events[eventName] = [];
        }
        this._events[eventName].push(callback);
    }

    triggerEvent(eventName, ...args) {
        var triggered = false;
        if (Array.isArray(this._events[eventName])) {
            this._events[eventName].forEach((item) => {
                item(...args);
                triggered = true;
            });
        }
        return triggered;
    }

    dispose() {
        for (var i = 0; i < this._controls.length; i++) {
            this._controls[i].dispose();
        }
        this._controls = [];

        if (this.element) {
            if (this.element.parentNode) {
                if (this.element.parentNode.contains(this.element)) {
                    this.element.parentNode.removeChild(this.element);
                }
            }
        }
    }
}

class Page extends Control {
    constructor(baseElement) {
        if (baseElement) {
            var clonedElement = baseElement.cloneNode(true);
            super(clonedElement);
        }
        else {
            super();
            var bElement = document.querySelectorAll("[data-control='" + this.constructor.name + "']")[0];
            this.element = bElement.cloneNode(true);
        }
        this.element.classList.remove("app-control");
        this.element.classList.add("app-page");

        // automatically move new pages off-screen (we assume they will be called when required)
        this.element.classList.add("app-page-right");
    }
}

class WebControlsCustomElement extends HTMLElement {
    constructor() {
        super();

        function getParameters(func, name) {
            var args = new RegExp('(?:' + name + '\\s*|^)\\s*\\((.*?)\\)').exec(func.toString().replace(/\n/g, ''))[1].replace(/\/\*.*?\*\//g, '').replace(/ /g, '');
            var argArray = args.split(",");
            return argArray.filter((el) => {
                return el !== null && el !== "";
            });
        }

        console.log('tagname: ' + this.tagName);
        var cName = WebControls.__getControlName(this.tagName);

        if (cName !== null) {
            var args = [];
            if (this.innerHTML) {
                try {
                    args = JSON.parse(this.innerHTML);
                }
                catch {
                    args = [];
                }
            }

            // this is a somewhat flaky attempt at getting argument names for the constructor, so we can find matching attributes
            var classStr = eval(cName).toString();
            classStr = classStr.substring(classStr.indexOf("constructor("));
            var argNames = getParameters(classStr, "constructor");

            for (var i = 0; i < argNames.length; i++) {
                var attrValue = this.getAttribute(argNames[i]);
                if (attrValue !== null) {
                    if (attrValue.startsWith("json::")) {
                        args[i] = JSON.parse(attrValue.substring(6));
                    } else if (attrValue.startsWith("func::")) {
                        args[i] = eval(attrValue.substring(6));
                    } else {
                        args[i] = attrValue;
                    }
                }
            }

            var control = WebControls.__instantiate(cName, args);

            for (var j = 0; j < this.attributes.length; j++) {
                var attr = this.attributes[j];
                if (attr.name.indexOf('on') === 0) {
                    var eventName = attr.name.substring(2);
                    control.addEventListener(eventName, window[attr.value]);
                }
            };

            if (this.id) {
                WebControls.__addControl(this.id, control);
            }

            this.parentNode.replaceChild(control.element, this)
        }
    }
}

var WebControls;

(function () {
    console.log('Loading WebControls...');
    var customElementCount = 0;
    WebControls = this;
    var loadedControls = [];
    var includesDiv = document.createElement("div");
    includesDiv.style.display = "none";
    document.body.insertBefore(includesDiv, document.body.firstChild);

    var controlsScriptTag = document.currentScript;
    var controlsRootURL = controlsScriptTag.getAttribute("src");
    controlsRootURL = controlsRootURL.substring(0, controlsRootURL.lastIndexOf("/") + 1);

    function ParseComments(node, removeAfter) {
        return new Promise((resolve, reject) => {
            var children = node.childNodes;
            var comments = [];
            var imports = [];
            var i;

            for (i = 0; i < children.length; i++) {
                if (children[i].nodeType === 8) {
                    comments.push(children[i]);
                }
            }

            for (i = 0; i < comments.length; i++) {
                var lines = comments[i].nodeValue.replace('\r', '').split('\n');
                for (var l = 0; l < lines.length; l++) {
                    var importIndex = lines[l].indexOf('#import ');
                    if (importIndex > -1) {
                        var importLine = lines[l].substring(importIndex + 8);
                        var importItems = importLine.split(' ');
                        for (var ii = 0; ii < importItems.length; ii++) {
                            if (importItems[ii].length > 0) {
                                imports.push(importItems[ii]);
                            }
                        }
                    }
                }
                if (removeAfter) {
                    node.removeChild(children[i]);
                }
            }

            console.log('imports:', imports);
            var nextImport = (importIndex) => {
                if (importIndex < imports.length) {
                    LoadControl(imports[importIndex], () => {
                        nextImport(importIndex + 1);
                    });
                } else {
                    console.log("import loading complete!");
                    resolve();
                }
            };

            nextImport(0);
        });
    }

    function LoadControls(controlNameArray) {
        return new Promise((resolve, reject) => {
            var getNextControl = (index) => {
                if (index < controlNameArray.length) {
                    LoadControl(controlNameArray[index], () => { getNextControl(index + 1); });
                } else {
                    resolve();
                }
            };
            getNextControl(0);
        });
    }

    function LoadControl(controlName, callback) {
        controlName = controlName.replace(/\./g, '/');
        //console.log('controlName:', controlName);
        if (loadedControls.includes(controlName)) {
            if (callback) {
                callback();
                return;
            }
        }

        loadedControls.push(controlName);
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    //console.log(xhr.responseText);
                    var tempDiv = document.createElement("div");
                    tempDiv.innerHTML = xhr.responseText;

                    var styleElements = tempDiv.getElementsByTagName("style");
                    if (styleElements.length > 0) {
                        var controlCSS = styleElements[0];
                        var css = document.createElement("style");
                        css.type = 'text/css';
                        css.innerHTML = controlCSS.innerHTML;
                        document.getElementsByTagName('head')[0].appendChild(css);
                    }

                    var controlHtml = tempDiv.querySelectorAll("[data-control]")[0];
                    //console.log("controlHTML: ", controlHtml);
                    var controlScript = tempDiv.getElementsByTagName("script")[0];
                    //console.log("controlScript: ", controlScript);
                    var controlDiv = document.createElement("div");
                    controlDiv.className = tempDiv.className;
                    controlDiv.appendChild(controlHtml);
                    var s = document.createElement("script");
                    s.textContent = controlScript.textContent;
                    controlDiv.appendChild(s);
                    includesDiv.appendChild(controlDiv);

                    //let clone = Object.assign(Object.create(Object.getPrototypeOf(WebControlsCustomElement)), WebControlsCustomElement)
                    var custElement = WebControlsCustomElement.toString().replace("WebControlsCustomElement", "WebControlsCustomElement" + customElementCount);
                    //console.log(custElement);
                    var scriptBlock = document.createElement("script");
                    scriptBlock.innerHTML = custElement;
                    document.body.appendChild(scriptBlock);
                    var clone = eval("WebControlsCustomElement" + customElementCount);
                    customElementCount++;
                    //console.log(Object.create(Object.getPrototypeOf(WebControlsCustomElement)));
                    console.log('defining customElement wc-' + controlName.toLowerCase());
                    customElements.define("wc-" + controlName.toLowerCase(), clone);

                    ParseComments(tempDiv, true)
                        .then(() => {
                            if (callback) {
                                callback();
                            }
                        })
                        .catch((err) => {
                            console.error(err);
                            if (callback) {
                                callback();
                            }
                        });
                } else {
                    if (callback) {
                        callback();
                    }
                }
            }
        };

        console.log("Loading controls/" + controlName + ".html");
        xhr.open("GET", controlsRootURL + "../controls/" + controlName + ".html");
        xhr.send();
    }

    this.Import = (controlName) => {
        return new Promise((resolve, reject) => {
            LoadControl(controlName, resolve);
        });
    };

    function AddPage(page) {
        document.body.appendChild(page.element);
        pages.push(page);
        page._controls = [];
        var pageControls = page.element.querySelectorAll('[data-name]');
        for (i = 0; i < pageControls.length; i++) {
            if (pageControls[i].getAttribute('data-name') === "_nav_back") {
                pageControls[i].addEventListener("click", goBack);
            }
            if (page._controls[pageControls[i].getAttribute('data-name')]) {
                //throw "Item " + appControls[i].getAttribute('data-name') + " already exists.";
            }
            else {
                page._controls[pageControls[i].getAttribute('data-name')] = pageControls[i];
            }
        }
    }

    function instantiate(name, a) {
        var c = eval(name);
        if (a) {
            return Reflect.construct(c, a);
        }
        return new c();
    }

    this.__instantiate = instantiate;

    this.__getControlName = (elementName) => {
        elementName = elementName.toLowerCase();
        if (elementName.indexOf('wc-') === 0) {
            elementName = elementName.substring(3);
        }

        for (var i = 0; i < loadedControls.length; i++) {
            if (loadedControls[i].toLowerCase() === elementName) {
                return loadedControls[i];
            }
        }
        return null;
    };

    var __controls = {};

    function LoadIncludes() {
        var includes = document.querySelectorAll("div[data-include]");
        console.log('includes:', includes);
        for (var i = 0; i < includes.length; i++) {
            if (!includesDiv.contains(includes[i])) {
                var args = null;
                if (includes[i].innerText) {
                    try {
                        args = JSON.parse(includes[i].innerText);
                    }
                    catch (error) {
                        console.error("Couldn't parse include JSON:", includes[i].innerText);
                    }
                }
                var controlStyle = includes[i].getAttribute("style");
                var control = instantiate(includes[i].getAttribute("data-include"), args);
                __controls[includes[i].id] = control;
                for (var ii = 0; ii < includes[i].classList.length; ii++) {
                    control.element.classList.add(includes[i].classList[ii]);
                }

                if (controlStyle) {
                    control.element.setAttribute("style", controlStyle);
                }

                console.log(includes[i].attributes);
                for (var j = 0; j < includes[i].attributes.length; j++) {
                    var attr = includes[i].attributes[j];
                    if (attr.name.indexOf('on') === 0) {
                        var eventName = attr.name.substring(2);
                        control.addEventListener(eventName, window[attr.value]);
                    }
                };

                includes[i].parentNode.replaceChild(control.element, includes[i]);
            }
        }
    }

    function __addControl(id, control) {
        if (__controls[id]) {
            throw "Control with id " + id + " already exists!";
        }

        __controls[id] = control;
    }

    this.__addControl = __addControl;

    function getControlById(id) {
        console.log(__controls);
        return __controls[id];
    }

    this.GetControlById = getControlById;

    this.GetControls = () => {
        return __controls;
    };

    var x = document.evaluate('//comment()', document, null, XPathResult.ANY_TYPE, null),
        comment = x.iterateNext();

    var __importTotal = 0;
    var __importCount = 0;

    while (comment) {
        //alert(comment.textContent);
        var lines = comment.textContent.replace('\r', '').split('\n');
        for (var l = 0; l < lines.length; l++) {
            var importIndex = lines[l].indexOf('#import ');
            if (importIndex > -1) {
                var importLine = lines[l].substring(importIndex + 8);
                var importItems = importLine.split(' ');
                for (var ii = 0; ii < importItems.length; ii++) {
                    if (importItems[ii].length > 0) {
                        __importTotal++;
                        LoadControl(importItems[ii], () => {
                            __importCount++;
                            if (__importTotal === __importCount) {
                                console.log("Imports loaded!");
                                setTimeout(
                                    () => {
                                        LoadIncludes();
                                        if (typeof WebControls_Loaded !== "undefined") {
                                            WebControls_Loaded();
                                        }
                                    }, 1);
                            }
                        });
                    }
                }
            }
        }
        comment = x.iterateNext();
    }
})();