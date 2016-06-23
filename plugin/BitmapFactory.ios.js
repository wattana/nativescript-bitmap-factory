// The MIT License (MIT)
// 
// Copyright (c) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

var BitmapFactoryCommons = require('./BitmapFactory.commons');
var TypeUtils = require("utils/types");

function iOSImage(uiImage) {
    if (!(this instanceof iOSImage)) {
        return new iOSImage(uiImage);
    }

    this._isDisposed = false;
    this._nativeObject = uiImage;
}

// [iOS INTERNAL] __CGImage
Object.defineProperty(iOSImage.prototype, '__CGImage', {
    get: function() { return this._nativeObject.CGImage; }
});

// [iOS INTERNAL] __onImageContext()
iOSImage.prototype.__onImageContext = function(action, tag) {
    var oldImg = this._nativeObject;
    
    UIGraphicsBeginImageContext(CGSizeMake(oldImg.size.width, oldImg.size.height));
    var newImage;
    var result;
    try {
        var context = UIGraphicsGetCurrentContext();

        oldImg.drawInRect(CGRectMake(0, 0,
                                     oldImg.size.width, oldImg.size.height));

        result = action(context, tag, oldImg);

        newImage = UIGraphicsGetImageFromCurrentImageContext();
    }
    finally {
        UIGraphicsEndImageContext();
    }

    CGImageRelease(oldImg.CGImage);
    this._nativeObject = newImage;

    return result;
};

// [iOS INTERNAL] __toIOSColor()
iOSImage.prototype.__toIOSColor = function(color) {
    if (TypeUtils.isNullOrUndefined(color)) {
        return null;
    }
    
    return {
        a: color.a,
        r: color.r,
        g: color.g,
        b: color.b
    };
};

// [INTERNAL] _crop()
iOSImage.prototype._crop = function(leftTop, size) {
    return this.__onImageContext(function(context, tag, oldImage) {
        var rect = CGRectMake(leftTop.x, leftTop.y,
                              size.width, size.height);

        var imageRef = CGImageCreateWithImageInRect(oldImage.CGImage, rect);
        return UIImage(imageRef);
    });
};

// _dispose()
iOSImage.prototype._dispose = function(action, tag) {
    CGImageRelease(this._nativeObject.CGImage);
    this._nativeObject = null;
};

// [INTERNAL] _drawLine()
iOSImage.prototype._drawLine = function(start, end, color) {
    color = this.__toIOSColor(color);

    this.__onImageContext(function(context, tag, oldImage) {
        CGContextSetRGBStrokeColor(context,
                                   color.r, color.g, color.b, color.a);

        CGContextSetLineWidth(context, 1.0);

        CGContextMoveToPoint(context, start.x, start.y);
        CGContextAddLineToPoint(context,
                                end.x, end.y);

        CGContextStrokePath(context);
    });
};

// [INTERNAL] _drawOval()
iOSImage.prototype._drawOval = function(size, leftTop, color, fillColor) {
    color = this.__toIOSColor(color);
    fillColor = this.__toIOSColor(fillColor);

    this.__onImageContext(function(context, tag, oldImage) {
        CGContextSetRGBStrokeColor(context,
                                   color.r, color.g, color.b, color.a);

        var rect = CGRectMake(leftTop.x, leftTop.y,
                              size.width, size.height);

        if (null !== fillColor) {
            CGContextSetRGBFillColor(context,
                                     fillColor.r, fillColor.g, fillColor.b, fillColor.a);

            CGContextFillEllipseInRect(context, rect);
        }
        
        CGContextStrokeEllipseInRect(context, rect);
    });
};

// [INTERNAL] _drawRect()
iOSImage.prototype._drawRect = function(center, size, color, fillColor) {
    color = this.__toIOSColor(color);
    fillColor = this.__toIOSColor(fillColor);

    this.__onImageContext(function(context, tag, oldImage) {
        CGContextSetRGBStrokeColor(context,
                                   color.r, color.g, color.b, color.a);

        var rect = CGRectMake(leftTop.x, leftTop.y,
                              size.width, size.height);

        if (null !== fillColor) {
            CGContextSetRGBFillColor(context,
                                     fillColor.r, fillColor.g, fillColor.b, fillColor.a);

            CGContextFillRect(context, rect);
        }
        
        CGContextStrokeRect(context, rect);
    });
};

// [INTERNAL] _getPoint()
iOSImage.prototype._getPoint = function(coordinates) {
    var pixelData = CGDataProviderCopyData(CGImageGetDataProvider(this.__CGImage));
    var data = CFDataGetBytePtr(pixelData);

    var pixelInfo = ((this.width * coordinates.y) + coordinates.x) * 4;

    var r = data[pixelInfo];
    var g = data[pixelInfo + 1];
    var b = data[pixelInfo + 2];
    var a = data[pixelInfo + 3];

    return (a << 24) | (r << 16) | (g << 8) | b;
};

// [INTERNAL] _setPoint()
iOSImage.prototype._setPoint = function(color, coordinates) {
    color = this.__toIOSColor(color);

    this.__onImageContext(function(context) {
        CGContextSetRGBFillColor(context, color.r, color.g, color.b, color.a);
        
        CGContextFillRect(context, CGRectMake(coordinates.x, coordinates.y,
                                              1, 1));
    });
};

// [INTERNAL] _toObject()
iOSImage.prototype._toObject = function(format, quality) {
    var img = this._nativeObject;

    var imageData = false;
    var mime;
    switch (format) {
        case 1:
            imageData = UIImagePNGRepresentation(img);
            mime = 'image/png';
            break;

        case 2:
            imageData = UIImageJPEGRepresentation(img, quality / 100.0);
            mime = 'image/jpeg';
            break;
    }

    if (false === imageData) {
        throw "Format '" + format + "' is NOT supported!";
    }

    if (TypeUtils.isNullOrUndefined(imageData)) {
        throw "Output image could not be created by iOS!";
    }

    var bitmapData = {};

    var base64 = imageData.base64EncodedStringWithOptions(null);
    
    // base64
    Object.defineProperty(bitmapData, 'base64', {
        get: function() { return base64; }
    });

    // mime
    Object.defineProperty(bitmapData, 'mime', {
        get: function() { return mime; }
    });

    return bitmapData;
}

// height
Object.defineProperty(iOSImage.prototype, 'height', {
    get: function() { return this._nativeObject.size.height; }
});

// isDisposed
Object.defineProperty(iOSImage.prototype, 'isDisposed', {
    get: function() { return this._isDisposed; }
});

// nativeObject
Object.defineProperty(iOSImage.prototype, 'nativeObject', {
    get: function() { return this._nativeObject; }
});

// width
Object.defineProperty(iOSImage.prototype, 'width', {
    get: function() { return this._nativeObject.size.width; }
});

// setup common methods and properties
BitmapFactoryCommons.setupBitmapClass(iOSImage);


function createBitmap(width, height) {
    var img = new interop.Reference();

    UIGraphicsBeginImageContextWithOptions(CGSizeMake(width, height), false, 0.0);
    img = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();

    if (TypeUtils.isNullOrUndefined(img)) {
        throw "Could not create UIImage!";
    }

    return new iOSImage(img);
}
exports.createBitmap = createBitmap;
