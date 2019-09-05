class Control {
    constructor(node) {
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
            }
        }

        this._controls = [];
        var includes = this.element.querySelectorAll("div[data-include]");
        for (var i = 0; i < includes.length; i++) {
            var obj = eval('new ' + includes[i].getAttribute("data-include") + '()');
            this._controls.push(obj);
            includes[i].appendChild(obj.element);
        }
    }

    getElement(dataName) {
        var elements = this.element.querySelectorAll("[data-name='" + dataName + "']");
        if (elements.length === 0) {
            throw "Element '" + dataName + "' does not exist.";
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

    dispose() {
        for (var i = 0; i < this._controls.length; i++) {
            this._controls[i].dispose();
        }
        this._controls = [];

        if (this.element) {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
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

var includesDiv = document.createElement("div");
includesDiv.style.display = "none";
document.body.appendChild(includesDiv);

function LoadControl(controlName) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            //console.log(xhr.responseText);
            var tempDiv = document.createElement("div");
            tempDiv.innerHTML = xhr.responseText;
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
        }
    };

    console.log("Loading controls/" + controlName + ".html");
    xhr.open("GET", "controls/" + controlName + ".html");
    xhr.send();
}

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