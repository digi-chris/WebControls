# WebControls
A lightweight framework bringing Object-Oriented, reusable mixed-format controls to HTML and Javascript

## Overview

Out of frustration over the number of different frameworks there are knocking about, all with their own complexities and weird issues, breaking changes, build workflows, command-line tools and random inexplicable behaviour, I decided that what the world really needed was another framework.

WebControls (working title) is a bit different, however. I don't see it as a full framework, but just a simple helper library to let you create controls that you'll want to reuse throughout your web application.

The idea is that it doesn't rely on any underlying frameworks (other than JavaScript, HTML5 and CSS), can be bolted on top of whatever else you're using, and helps keep your code neat and tidy by packaging each control's HTML and JavaScript up into a single file.

## Usage

A basic, empty control would look like this:

```
<div class="app-control">
    <div data-control="EmptyControl">
    </div>
    <script>
        class EmptyControl extends Control {
            constructor() {
                super();
            }
        }
    </script>
</div>
```

To make a control that shows 'Hello, World!' when a show() method is called, you would write something like this:

```
<div class="app-control">
    <div data-control="HelloControl">
        <div data-name="txtHello" style="display: none;">
            Hello, world!
        </div>
    </div>
    <script>
        class HelloControl extends Control {
            constructor() {
                super();
            }

            show() {
                this.getElement("txtHello").style.display = "";
            }
        }
    </script>
</div>
```

Save this in your controls folder as `HelloControl.html`.
Now, to call up this control and use it on a webpage, you would do something like this:

```
<html>
    <head>
        <title>Really Simply Control Example</title>
    </head>
    <body>
        <!--
            #import HelloControl
        -->
        <script type="text/javascript" src="/js/controls.js"></script>
        <script>
            // create a new HelloControl object
            var hControl = new HelloControl();

            // add it to the document - a control automatically gets an 'element'
            // object providing access to the DOM element for the control.
            document.body.appendChild(hControl.element);
            
            // now make the control do something - show the text
            hControl.show();
        </script>
    </body>
</html>
```

You'll notice in the example above that you can add controls using the #import keyword within a comment. You can also load a control in code with the method `LoadControl(controlName)`. If you want to keep your controls relatively well organised, you can store them in folders, such as:

```
/controls/UI/ModalWindow.html
/controls/UI/Forms/DropDownControl.html
/controls/UI/Forms/TextControl.html
/controls/Data/DataAccess/CompanyDataControl.html
... etc
```

And then your imports would look like this:

```
<!--
    #import UI.ModalWindow
    #import Forms.DropDownControl
    #import Forms.TextControl
    #import Data.DataAccess.CompanyDataControl
-->
```

## Future Developments

Currently this is just a proof-of-concept that I'm using to evaluate how useful this setup could be, but I'm already finding it's helping speed up my work rate.

Next steps are to create a library of commonly-used controls, along with a CDN to allow delivery of minified and bundled versions of these controls, with perhaps two or three CSS themes. The idea would be that you would import just the controls you want, and a bundled and minified version of only the controls you're using will get sent to you.

At the same time, it should always be possible to just copy down the repo and add it into your project directly without any other required setup.
